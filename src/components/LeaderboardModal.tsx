import React, { useEffect, useMemo, useState } from 'react';
import { X, Trophy, MapPin, Search, Crown, Database } from 'lucide-react';
import type { UserProfile, LeaderboardItem } from '../types';
import { playClick } from '../sound';
import { fetchLeaderboardFromSupabase, syncProfileToSupabase } from '../services/database';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  accountUserId: string | null;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  profile,
  accountUserId,
}) => {
  const [selectedCity, setSelectedCity] = useState('Global');
  const [searchQuery, setSearchQuery] = useState('');
  const [remoteLeaderboard, setRemoteLeaderboard] = useState<LeaderboardItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const loadLeaderboard = async () => {
      setIsLoading(true);
      await syncProfileToSupabase(profile, accountUserId ?? undefined);
      const remoteRows = await fetchLeaderboardFromSupabase();
      if (cancelled) return;
      setRemoteLeaderboard(remoteRows);
      setIsLive(remoteRows.length > 0);
      setIsLoading(false);
    };

    void loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [isOpen, profile, accountUserId]);

  const listWithUser: LeaderboardItem[] = useMemo(() => {
    const currentUser: LeaderboardItem = {
      username: profile.username,
      city: profile.city,
      avatar: profile.avatar,
      points: profile.points,
      isPro: profile.isPro,
    };

    const withoutCurrentUser = remoteLeaderboard.filter((item) => (
      item.username !== profile.username || item.city !== profile.city
    ));

    return [currentUser, ...withoutCurrentUser];
  }, [profile, remoteLeaderboard]);

  // Filter based on city
  let filteredList = listWithUser;
  if (selectedCity !== 'Global') {
    filteredList = listWithUser.filter(item => item.city === selectedCity);
  }

  // Filter based on search query
  if (searchQuery.trim() !== '') {
    filteredList = filteredList.filter(item => 
      item.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Sort descending by points
  filteredList.sort((a, b) => b.points - a.points);

  const getRankBadge = (idx: number) => {
    if (idx === 0) return '🥇';
    if (idx === 1) return '🥈';
    if (idx === 2) return '🥉';
    return `#${idx + 1}`;
  };

  const getRankColor = (idx: number) => {
    if (idx === 0) return 'var(--accent-gold)';
    if (idx === 1) return '#c0c0c0'; // silver
    if (idx === 2) return '#cd7f32'; // bronze
    return 'var(--text-secondary)';
  };

  const uniqueCities = useMemo(() => {
    const cities = new Set(['Global', profile.city, ...remoteLeaderboard.map((item) => item.city)]);
    return Array.from(cities);
  }, [profile.city, remoteLeaderboard]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ border: '1px solid var(--accent-cyan)', maxWidth: '620px' }}>
        <button className="modal-close" onClick={() => { playClick(); onClose(); }}>
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Trophy className="neon-text-cyan" size={30} style={{ animation: 'blink-glow 2s infinite' }} />
          <div>
            <h2 className="display-font" style={{ fontSize: '1.6rem', color: 'var(--accent-cyan)' }}>
              ТАБЛИЦА ЛИДЕРОВ / LEADERBOARD
            </h2>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
              Top strategy hackers around the world
            </span>
          </div>
        </div>

        <div className={`db-status ${isLive ? 'live' : 'fallback'}`}>
          <Database size={14} />
          <span>
            {isLoading
              ? 'Загрузка реального рейтинга из Supabase...'
              : isLive
              ? 'Live Supabase рейтинг: данные читаются из таблицы profiles.'
              : 'Supabase подключен в коде. Создайте таблицы из README, чтобы рейтинг стал глобальным.'}
          </span>
        </div>

        {/* Search and City Selectors */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Поиск хакера... / Search..."
              className="cyber-input"
              style={{ paddingLeft: '36px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ minWidth: '180px' }}>
            <select
              className="cyber-input"
              value={selectedCity}
              onChange={(e) => { playClick(); setSelectedCity(e.target.value); }}
              style={{ cursor: 'pointer' }}
            >
              {uniqueCities.map((c) => (
                <option key={c} value={c} style={{ background: '#150b2b' }}>
                  {c === 'Global' ? '🌍 Глобальный / Global' : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* User context card */}
        <div className="glass-panel" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(157, 78, 221, 0.1))',
          border: '1px dashed var(--accent-cyan)',
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '1.5rem' }}>{profile.avatar}</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span className="display-font" style={{ fontWeight: 'bold' }}>{profile.username}</span>
                {profile.isPro && <Crown size={12} style={{ color: 'var(--accent-gold)' }} />}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={10} />
                <span>{profile.city}</span>
              </div>
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', textAlign: 'right' }}>Ваш ранг / Your Score</span>
            <span className="display-font" style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
              {profile.points} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>CP</span>
            </span>
          </div>
        </div>

        {/* Leaderboard list container */}
        <div className="contained-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px' }}>
          {filteredList.map((player, idx) => {
            const isSelf = player.username === profile.username;
            return (
              <div
                key={player.username + idx}
                className="glass-panel"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 20px',
                  background: isSelf ? 'rgba(0, 240, 255, 0.08)' : 'rgba(0,0,0,0.15)',
                  border: isSelf ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '10px',
                  boxShadow: isSelf ? '0 0 10px rgba(0, 240, 255, 0.15)' : 'none',
                }}
              >
                {/* Placement Rank */}
                <div
                  className="display-font"
                  style={{
                    width: '45px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    color: getRankColor(idx),
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {getRankBadge(idx)}
                </div>

                {/* Avatar and Username */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.1rem',
                    border: player.isPro ? '2px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.1)',
                  }}>
                    {player.avatar}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span
                        style={{
                          fontWeight: 600,
                          color: isSelf ? 'var(--accent-cyan)' : 'inherit',
                          textShadow: player.isPro ? '0 0 5px rgba(243, 156, 18, 0.3)' : 'none'
                        }}
                      >
                        {player.username}
                      </span>
                      {player.isPro && (
                        <span className="cyber-badge pro" style={{ padding: '0px 4px', fontSize: '0.6rem', transform: 'scale(0.85)' }}>
                          PRO
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <MapPin size={8} />
                      <span>{player.city}</span>
                    </div>
                  </div>
                </div>

                {/* Points */}
                <div className="display-font" style={{ fontWeight: 'bold', color: isSelf ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                  {player.points} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>CP</span>
                </div>
              </div>
            );
          })}
          {!isLoading && filteredList.length === 0 && (
            <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Игроки не найдены.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
