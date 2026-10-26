import type { LeaderboardItem, MatchHistoryItem, UserProfile } from '../types';
import { getSupabase } from '../utils/supabase';

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

export const fetchProfileRowFromSupabase = async (userId: string): Promise<RemoteProfileRow | null> => {
  const supabase = await getSupabase();
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

  return (data as RemoteProfileRow | null) ?? null;
};

export const fetchProfileFromSupabase = async (userId: string): Promise<UserProfile | null> => {
  const row = await fetchProfileRowFromSupabase(userId);
  return row ? mapRemoteProfile(row) : null;
};

// Saves the fields a player may edit. Points, stats and PRO are never sent from the
// browser: they change only through the record_match, spend_points and activate_pro
// database functions (supabase/migrations/*_server_side_scoring.sql).
export const syncProfileToSupabase = async (profile: UserProfile, authenticatedUserId?: string) => {
  const supabase = await getSupabase();
  if (!supabase) return { ok: false, reason: 'not_configured' };
  if (!authenticatedUserId) return { ok: false, reason: 'guest_profile' };

  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: getPlayerId(authenticatedUserId),
        username: profile.username,
        city: profile.city,
        avatar: profile.avatar,
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

// Calls one of the scoring functions and returns the updated profile row, or null on failure
const callScoringFunction = async (name: string, args: Record<string, unknown>): Promise<RemoteProfileRow | null> => {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    console.warn(`Supabase ${name} failed:`, error.message);
    return null;
  }
  return data as RemoteProfileRow;
};

// The server decides how many points the result is worth
export const recordMatchOnSupabase = (match: MatchHistoryItem) =>
  callScoringFunction('record_match', {
    p_mode: match.mode,
    p_difficulty: match.difficulty ?? null,
    p_result: match.result,
    p_opponent: match.opponent,
  });

// `item` is 'hint' or 'skin:<id>'; prices are set on the server
export const spendPointsOnSupabase = (item: string) => callScoringFunction('spend_points', { p_item: item });

export const activateProOnSupabase = () => callScoringFunction('activate_pro', {});

export const fetchLeaderboardFromSupabase = async (): Promise<LeaderboardItem[]> => {
  const supabase = await getSupabase();
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
