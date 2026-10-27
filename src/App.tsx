import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { GameArea } from './components/GameArea';
import { useMultiplayer } from './hooks/useMultiplayer';
import type { UserProfile, MatchHistoryItem, MoveAnalysis } from './types';
import { playClick, setMuted } from './sound';
import {
  activateProOnSupabase,
  fetchProfileFromSupabase,
  fetchProfileRowFromSupabase,
  recordMatchOnSupabase,
  spendPointsOnSupabase,
  syncProfileToSupabase,
} from './services/database';
import type { RemoteProfileRow } from './services/database';
import { getSupabase, hasStoredSession, whenSupabaseLoads } from './utils/supabase';
import type { Session } from '@supabase/supabase-js';
import { CodeXml } from 'lucide-react';
import { useI18n } from './i18n';

const STORAGE_PROFILE_KEY = 'neurafour_user_profile_v2';
const STORAGE_HISTORY_KEY = 'neurafour_match_history_v2';


// Screens opened on demand are loaded on demand, keeping the first download small
const CoachPanel = lazy(() => import('./components/CoachPanel').then((m) => ({ default: m.CoachPanel })));
const ProfileModal = lazy(() => import('./components/ProfileModal').then((m) => ({ default: m.ProfileModal })));
const ProModal = lazy(() => import('./components/ProModal').then((m) => ({ default: m.ProModal })));
const ShopModal = lazy(() => import('./components/ShopModal').then((m) => ({ default: m.ShopModal })));
const LeaderboardModal = lazy(() => import('./components/LeaderboardModal').then((m) => ({ default: m.LeaderboardModal })));
const AuthModal = lazy(() => import('./components/AuthModal').then((m) => ({ default: m.AuthModal })));


const STORAGE_THEME_KEY = 'neurafour_theme';

// Saved choice first, then the system setting; index.html applies the same rule before
// React loads so the page never flashes the wrong theme
const loadTheme = (): 'dark' | 'light' => {
  try {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // storage unavailable: fall back to the system setting
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

const ALL_SKINS = ['cyber-neon', 'retro-arcade', 'space-obsidian', 'royal-gold'];

const DEFAULT_PROFILE: UserProfile = {
  username: 'NetRunner_1',
  city: 'Almaty (Алматы)',
  avatar: '🤖',
  points: 150, // Starting point balance to let them explore the shop
  isPro: false,
  unlockedSkins: ['cyber-neon'],
  activeSkin: 'cyber-neon',
  stats: {
    wins: 0,
    losses: 0,
    draws: 0,
  },
};

function App() {
  const { t } = useI18n();

  // Profiles & Stats state
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const profileRef = useRef<UserProfile>(DEFAULT_PROFILE);
  const [matchHistory, setMatchHistory] = useState<MatchHistoryItem[]>([]);

  // Page navigation & active view states
  const [activeTab, setActiveTab] = useState('game');
  const [coachAnalyses, setCoachAnalyses] = useState<MoveAnalysis[] | null>(null);

  // Modals visibility toggles
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProOpen, setIsProOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  // Control configurations
  const [isMutedState, setIsMutedState] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(loadTheme);

  const multiplayer = useMultiplayer(profile);


  // Load profile progress from LocalStorage on launch
  useEffect(() => {
    try {
      const storedProfile = localStorage.getItem(STORAGE_PROFILE_KEY);
      if (storedProfile) {
        setProfile(JSON.parse(storedProfile));
      }
      
      const storedHistory = localStorage.getItem(STORAGE_HISTORY_KEY);
      if (storedHistory) {
        setMatchHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error('Failed to load local storage save progress', e);
    }

  }, []);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_THEME_KEY, theme);
    } catch {
      // the theme still applies for this visit
    }
  }, [theme]);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    // Load the signed-in player's profile, or create it from the local one
    const loadAccount = async (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);
      const userId = nextSession?.user.id;
      if (!userId) return;

      const remoteProfile = await fetchProfileFromSupabase(userId);
      if (!active) return;
      if (remoteProfile) {
        setProfile(remoteProfile);
        localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(remoteProfile));
      } else {
        await syncProfileToSupabase(profileRef.current, userId);
      }
    };

    // Follow sign-ins and sign-outs as soon as the Supabase client exists. It is
    // loaded now only if this browser has a saved session; otherwise it loads when
    // the player opens sign-in or the leaderboard.
    whenSupabaseLoads((supabase) => {
      if (!active) return;
      const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        void loadAccount(nextSession);
      });
      unsubscribe = () => listener.subscription.unsubscribe();
    });
    if (hasStoredSession()) void getSupabase();

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Sync profile edits to LocalStorage
  const handleUpdateProfile = (updates: Partial<UserProfile>) => {
    const updated = { ...profile, ...updates };
    setProfile(updated);
    localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(updated));
    void syncProfileToSupabase(updated, session?.user.id);
  };

  // Signed-in players: the server owns points, stats and PRO. The UI updates right away
  // (optimistically), then takes the server's numbers, or reloads them if a call failed.
  const applyServerProfile = (row: RemoteProfileRow) => {
    setProfile((current) => {
      const updated: UserProfile = {
        ...current,
        points: row.points,
        isPro: row.is_pro,
        stats: { wins: row.wins, losses: row.losses, draws: row.draws },
        unlockedSkins: row.is_pro ? ALL_SKINS : current.unlockedSkins,
      };
      localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const syncScore = async (call: () => Promise<RemoteProfileRow | null>) => {
    const userId = session?.user.id;
    if (!userId) return;
    const row = await call();
    if (row) {
      applyServerProfile(row);
      return;
    }
    const remote = await fetchProfileRowFromSupabase(userId);
    if (remote) applyServerProfile(remote);
  };

  // Add historical match card
  const handleAddMatchHistory = (match: MatchHistoryItem) => {
    const updatedHistory = [match, ...matchHistory].slice(0, 20); // Keep last 20
    setMatchHistory(updatedHistory);
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(updatedHistory));
    void syncScore(() => recordMatchOnSupabase(match));
  };

  // Hints and skins cost points; `item` is 'hint' or 'skin:<id>'
  const handleSpendPoints = (item: string, cost: number, updates: Partial<UserProfile> = {}) => {
    if (profile.points < cost) return false;
    handleUpdateProfile({ ...updates, points: profile.points - cost });
    void syncScore(() => spendPointsOnSupabase(item));
    return true;
  };

  const handleSignOut = async () => {
    playClick();
    const supabase = await getSupabase();
    await supabase?.auth.signOut();
    setSession(null);
  };

  // Sound muter sync
  const handleSetMuted = (muted: boolean) => {
    setIsMutedState(muted);
    setMuted(muted);
  };

  // Pro features activation
  const handleActivatePro = () => {
    // Unlocks all skins and activates PRO
    handleUpdateProfile({ isPro: true, unlockedSkins: ALL_SKINS });
    void syncScore(activateProOnSupabase);
  };

  // Shop item purchase
  const handleUnlockSkin = (skinId: string, price: number) => {
    handleSpendPoints(`skin:${skinId}`, price, {
      unlockedSkins: [...profile.unlockedSkins, skinId],
      activeSkin: skinId,
    });
  };

  // Shop item equip
  const handleEquipSkin = (skinId: string) => {
    handleUpdateProfile({ activeSkin: skinId });
  };


  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Premium dashboard navigation */}
      <Header
        profile={profile}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setCoachAnalyses(null); // Clear coach reviewing view when changing tabs
        }}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenPro={() => setIsProOpen(true)}
        onOpenShop={() => setIsShopOpen(true)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        isMuted={isMutedState}
        setIsMuted={handleSetMuted}
        theme={theme}
        setTheme={setTheme}
        accountEmail={session?.user.email ?? null}
      />

      {/* Main content body routing */}
      <main style={{ flex: 1 }}>
        {/* The game stays mounted (just hidden) during the review, so the finished board is still there afterwards */}
        {coachAnalyses && (
          <Suspense fallback={null}>
            <CoachPanel
              analyses={coachAnalyses}
              isPro={profile.isPro}
              onOpenPro={() => setIsProOpen(true)}
              onClose={() => {
                playClick();
                setCoachAnalyses(null);
              }}
            />
          </Suspense>
        )}
        <div hidden={!!coachAnalyses}>
          <GameArea
            isActive={!coachAnalyses}
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            onSpendPoints={handleSpendPoints}
            onAddMatchHistory={handleAddMatchHistory}
            isMuted={isMutedState}
            onOpenPro={() => setIsProOpen(true)}
            onOpenCoach={(evaluations) => setCoachAnalyses(evaluations)}
            roomCode={multiplayer.roomCode}
            side={multiplayer.side}
            opponent={multiplayer.opponent}
            chatHistory={multiplayer.chatHistory}
            socket={multiplayer.socket}
            onConnectWebSocket={multiplayer.connect}
            onSendChatMessage={multiplayer.sendChatMessage}
            onLeaveLobby={multiplayer.leave}
            onSendMove={multiplayer.sendMove}
            onSendRestart={multiplayer.sendRestartRequest}
            onSendRestartConfirm={multiplayer.sendRestartConfirm}
            opponentWantsRestart={multiplayer.opponentWantsRestart}
            connectionError={multiplayer.connectionError}
            restoredMoves={multiplayer.restoredMoves}
          />
        </div>
      </main>

      {/* Dialogs: each one is downloaded and mounted only while open */}
      <Suspense fallback={null}>
        {isProfileOpen && (
          <ProfileModal
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            matchHistory={matchHistory}
            accountEmail={session?.user.email ?? null}
            onOpenAuth={() => setIsAuthOpen(true)}
            onSignOut={handleSignOut}
          />
        )}

        {isProOpen && (
          <ProModal
            isOpen={isProOpen}
            onClose={() => setIsProOpen(false)}
            profile={profile}
            onActivatePro={handleActivatePro}
          />
        )}

        {isShopOpen && (
          <ShopModal
            isOpen={isShopOpen}
            onClose={() => setIsShopOpen(false)}
            profile={profile}
            onUnlockSkin={handleUnlockSkin}
            onEquipSkin={handleEquipSkin}
          />
        )}

        {isLeaderboardOpen && (
          <LeaderboardModal
            isOpen={isLeaderboardOpen}
            onClose={() => setIsLeaderboardOpen(false)}
            profile={profile}
            accountUserId={session?.user.id ?? null}
          />
        )}

        {isAuthOpen && (
          <AuthModal
            isOpen={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
          />
        )}
      </Suspense>

      {/* Footer bar */}
      <footer className="app-footer">
        <span>{t('footer.text')}</span>
        <a href="https://github.com/Vinbe0/neurafour" target="_blank" rel="noreferrer">
          <CodeXml size={14} />
          {t('footer.source')}
        </a>
      </footer>

    </div>
  );
}

export default App;
