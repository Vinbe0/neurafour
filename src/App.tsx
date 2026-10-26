import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { GameArea } from './components/GameArea';
import { CoachPanel } from './components/CoachPanel';
import { ProfileModal } from './components/ProfileModal';
import { ProModal } from './components/ProModal';
import { ShopModal } from './components/ShopModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { AuthModal } from './components/AuthModal';
import type { UserProfile, MatchHistoryItem, MoveAnalysis, ChatMessage, RoomMove } from './types';
import { playClick, playAlert, playUnlock, setMuted } from './sound';
import {
  activateProOnSupabase,
  fetchProfileFromSupabase,
  fetchProfileRowFromSupabase,
  recordMatchOnSupabase,
  spendPointsOnSupabase,
  syncProfileToSupabase,
} from './services/database';
import type { RemoteProfileRow } from './services/database';
import { supabase } from './utils/supabase';
import type { Session } from '@supabase/supabase-js';
import { CodeXml } from 'lucide-react';
import { useI18n } from './i18n';
import type { Lang } from './i18n';
import { useToast } from './toast';

const STORAGE_PROFILE_KEY = 'neurafour_user_profile_v2';
const STORAGE_HISTORY_KEY = 'neurafour_match_history_v2';

// Server messages are sent as "Russian / English"; show the half that matches the UI language
const pickServerText = (message: string, lang: Lang) => {
  const [ru, en] = message.split(' / ');
  return (lang === 'ru' ? ru : en ?? ru).trim();
};

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

// The online room this tab is in, kept for the session so a page reload can rejoin it
const STORAGE_ROOM_KEY = 'neurafour_room';

interface SavedRoom {
  roomCode: string;
  token: string;
}

const loadSavedRoom = (): SavedRoom | null => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_ROOM_KEY) ?? 'null');
    return saved && typeof saved.roomCode === 'string' && typeof saved.token === 'string' ? saved : null;
  } catch {
    return null;
  }
};

const saveRoom = (room: SavedRoom | null) => {
  try {
    if (room) sessionStorage.setItem(STORAGE_ROOM_KEY, JSON.stringify(room));
    else sessionStorage.removeItem(STORAGE_ROOM_KEY);
  } catch {
    // without storage the game still works, it just cannot be rejoined after a reload
  }
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
  const { t, lang } = useI18n();
  const notify = useToast();

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

  // WebSocket Multiplayer Networking
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [side, setSide] = useState<'red' | 'yellow' | null>(null);
  const [opponent, setOpponent] = useState<{ username: string; avatar: string } | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [opponentWantsRestart, setOpponentWantsRestart] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  // Moves of an online game restored after a page reload, replayed by GameArea
  const [restoredMoves, setRestoredMoves] = useState<RoomMove[] | null>(null);
  const rejoinAttempted = useRef(false);

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
    if (!supabase) return;

    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);

      if (data.session?.user.id) {
        const remoteProfile = await fetchProfileFromSupabase(data.session.user.id);
        if (!active) return;

        if (remoteProfile) {
          setProfile(remoteProfile);
          localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(remoteProfile));
        } else {
          await syncProfileToSupabase(profileRef.current, data.session.user.id);
        }
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);

      if (nextSession?.user.id) {
        const remoteProfile = await fetchProfileFromSupabase(nextSession.user.id);
        if (remoteProfile) {
          setProfile(remoteProfile);
          localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(remoteProfile));
        } else {
          await syncProfileToSupabase(profileRef.current, nextSession.user.id);
        }
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
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

  // ----------------------------------------------------
  // WebSocket Multiplayer matchmaking orchestrator
  // ----------------------------------------------------

  const connectWebSocket = (customCode: string | null, action: 'create' | 'join' | 'rejoin') => {
    setConnectionError(null);
    try {
      // Use the hosted server when configured, otherwise the local one on port 5001
      const wsUrl = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:5001`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Connected to NeuraFour multiplayer server');
        
        if (action === 'create') {
          ws.send(JSON.stringify({
            type: 'create_room',
            username: profile.username,
            avatar: profile.avatar,
          }));
        } else if (action === 'join' && customCode) {
          ws.send(JSON.stringify({
            type: 'join_room',
            roomCode: customCode,
            username: profile.username,
            avatar: profile.avatar,
          }));
        } else if (action === 'rejoin') {
          const saved = loadSavedRoom();
          if (saved) ws.send(JSON.stringify({ type: 'rejoin_room', ...saved }));
        }
      };

      // Once in a room, server errors (e.g. "not your turn") are shown but do not disconnect
      let inRoom = false;

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);

        switch (data.type) {
          case 'room_created': {
            inRoom = true;
            saveRoom({ roomCode: data.roomCode, token: data.token });
            setRoomCode(data.roomCode);
            setSide('red');
            setChatHistory([]);
            break;
          }

          case 'room_joined': {
            inRoom = true;
            saveRoom({ roomCode: data.roomCode, token: data.token });
            setRoomCode(data.roomCode);
            setSide('yellow');
            setOpponent(data.opponent);
            setChatHistory(data.chatHistory || []);
            break;
          }

          case 'room_rejoined': {
            inRoom = true;
            setRoomCode(data.roomCode);
            setSide(data.side);
            setOpponent(data.opponent);
            setChatHistory(data.chatHistory || []);
            setRestoredMoves(data.moves);
            notify(t('mp.rejoined', { code: data.roomCode }), 'success');
            break;
          }

          case 'opponent_disconnected': {
            playAlert();
            notify(t('mp.opponentDisconnected', { seconds: data.graceSeconds }), 'info');
            break;
          }

          case 'opponent_reconnected': {
            notify(t('mp.opponentReconnected'), 'success');
            break;
          }

          case 'opponent_joined': {
            setOpponent(data.opponent);
            playUnlock(); // sound chime alert
            break;
          }

          case 'opponent_left': {
            playAlert();
            notify(pickServerText(data.message, lang), 'error');
            // Graceful network exit reset
            saveRoom(null);
            resetSocketMatch();
            break;
          }

          case 'chat_received': {
            setChatHistory((prev) => [...prev, data.message]);
            break;
          }

          case 'opponent_wants_restart': {
            setOpponentWantsRestart(true);
            playAlert();
            break;
          }

          case 'game_restarted': {
            setOpponentWantsRestart(false);
            break;
          }

          case 'error': {
            if (action === 'rejoin' && !inRoom) {
              // The saved room has closed meanwhile: forget it quietly
              saveRoom(null);
              ws.close();
              break;
            }
            playAlert();
            notify(pickServerText(data.message, lang), 'error');
            if (!inRoom) {
              setConnectionError(pickServerText(data.message, lang));
              ws.close();
            }
            break;
          }
        }
      };

      ws.onclose = () => {
        console.log('WebSocket network channel disconnected');
        resetSocketMatch();
      };

      ws.onerror = (err) => {
        console.error('WebSocket encountered an error', err);
        setConnectionError(t('mp.serverError'));
        resetSocketMatch();
      };

      setSocket(ws);
    } catch (e) {
      console.error('Failed to initiate socket connection', e);
      setConnectionError(t('mp.serverError'));
      resetSocketMatch();
    }
  };

  const resetSocketMatch = () => {
    setSocket(null);
    setRoomCode(null);
    setSide(null);
    setOpponent(null);
    setChatHistory([]);
    setOpponentWantsRestart(false);
  };

  const sendChatMessage = (text: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'chat',
        username: profile.username,
        avatar: profile.avatar,
        text,
      }));
    }
  };

  const sendMove = (col: number) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'make_move',
        column: col,
      }));
    }
  };

  const sendRestartRequest = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'restart_request' }));
      playClick();
      notify(t('mp.restartSent'), 'success');
    }
  };

  const sendRestartConfirm = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'restart_confirm' }));
      setOpponentWantsRestart(false);
      playClick();
    }
  };

  const handleLeaveLobby = () => {
    playClick();
    if (socket) {
      // Tell the server this is on purpose, so it closes the room instead of holding the seat
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'leave_room' }));
      socket.close();
    }
    saveRoom(null);
    resetSocketMatch();
  };

  // After a page reload, rejoin the online game this tab was in
  useEffect(() => {
    if (rejoinAttempted.current || !loadSavedRoom()) return;
    rejoinAttempted.current = true;
    connectWebSocket(null, 'rejoin');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Safe window close handler
  useEffect(() => {
    return () => {
      if (socket) socket.close();
    };
  }, [socket]);

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
          <CoachPanel
            analyses={coachAnalyses}
            isPro={profile.isPro}
            onOpenPro={() => setIsProOpen(true)}
            onClose={() => {
              playClick();
              setCoachAnalyses(null);
            }}
          />
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
            roomCode={roomCode}
            side={side}
            opponent={opponent}
            chatHistory={chatHistory}
            socket={socket}
            onConnectWebSocket={connectWebSocket}
            onSendChatMessage={sendChatMessage}
            onLeaveLobby={handleLeaveLobby}
            onSendMove={sendMove}
            onSendRestart={sendRestartRequest}
            onSendRestartConfirm={sendRestartConfirm}
            opponentWantsRestart={opponentWantsRestart}
            connectionError={connectionError}
            restoredMoves={restoredMoves}
          />
        </div>
      </main>

      {/* MODALS DISPLAY PORTALS */}
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

      <ProModal
        isOpen={isProOpen}
        onClose={() => setIsProOpen(false)}
        profile={profile}
        onActivatePro={handleActivatePro}
      />

      <ShopModal
        isOpen={isShopOpen}
        onClose={() => setIsShopOpen(false)}
        profile={profile}
        onUnlockSkin={handleUnlockSkin}
        onEquipSkin={handleEquipSkin}
      />

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        profile={profile}
        accountUserId={session?.user.id ?? null}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

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
