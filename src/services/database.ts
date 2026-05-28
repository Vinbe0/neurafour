import type { LeaderboardItem, MatchHistoryItem, UserProfile } from '../types';
import { supabase } from '../utils/supabase';

const PLAYER_ID_KEY = 'neurafour_player_id_v1';

export interface RemoteProfileRow {
  id: string;
  username: string;
  city: string;
  avatar: string;
  points: number;
  is_pro: boolean;
  wins: number;
  losses: number;
  draws: number;
  updated_at?: string;
}

export const getPlayerId = (authenticatedUserId?: string) => {
  if (authenticatedUserId) return authenticatedUserId;

  let playerId = localStorage.getItem(PLAYER_ID_KEY);
  if (!playerId) {
    playerId = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, playerId);
  }
  return playerId;
};

export const mapRemoteProfile = (row: RemoteProfileRow): UserProfile => ({
  username: row.username,
  city: row.city,
  avatar: row.avatar,
  points: row.points,
  isPro: row.is_pro,
  unlockedSkins: row.is_pro
    ? ['cyber-neon', 'retro-arcade', 'space-obsidian', 'royal-gold']
    : ['cyber-neon'],
  activeSkin: 'cyber-neon',
  stats: {
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
  },
});

export const fetchProfileFromSupabase = async (userId: string): Promise<UserProfile | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, city, avatar, points, is_pro, wins, losses, draws, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Supabase profile load failed:', error.message);
    return null;
  }

  return data ? mapRemoteProfile(data as RemoteProfileRow) : null;
};

export const syncProfileToSupabase = async (profile: UserProfile, authenticatedUserId?: string) => {
  if (!supabase) return { ok: false, reason: 'not_configured' };
  if (!authenticatedUserId) return { ok: false, reason: 'guest_profile' };

  const playerId = getPlayerId(authenticatedUserId);
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: playerId,
        username: profile.username,
        city: profile.city,
        avatar: profile.avatar,
        points: profile.points,
        is_pro: profile.isPro,
        wins: profile.stats.wins,
        losses: profile.stats.losses,
        draws: profile.stats.draws,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (error) {
    console.warn('Supabase profile sync failed:', error.message);
    return { ok: false, reason: error.message };
  }

  return { ok: true };
};

export const saveMatchToSupabase = async (
  profile: UserProfile,
  match: MatchHistoryItem,
  authenticatedUserId?: string
) => {
  if (!supabase) return { ok: false, reason: 'not_configured' };
  if (!authenticatedUserId) return { ok: false, reason: 'guest_match' };

  const playerId = getPlayerId(authenticatedUserId);
  const { error } = await supabase.from('matches').insert({
    id: match.id,
    player_id: playerId,
    username: profile.username,
    opponent: match.opponent,
    mode: match.mode,
    difficulty: match.difficulty ?? null,
    result: match.result,
    points_earned: match.pointsEarned,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.warn('Supabase match save failed:', error.message);
    return { ok: false, reason: error.message };
  }

  return { ok: true };
};

export const fetchLeaderboardFromSupabase = async (): Promise<LeaderboardItem[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('username, city, avatar, points, is_pro')
    .order('points', { ascending: false })
    .limit(100);

  if (error) {
    console.warn('Supabase leaderboard load failed:', error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    username: row.username,
    city: row.city,
    avatar: row.avatar,
    points: row.points,
    isPro: row.is_pro,
  }));
};
