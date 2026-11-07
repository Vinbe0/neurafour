import React, { useEffect, useMemo, useState } from 'react';
import { X, Trophy, MapPin, Search, Crown, Database } from 'lucide-react';
import type { UserProfile, LeaderboardItem } from '../types';
import { playClick } from '../sound';
import { useI18n } from '../i18n';
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
  const { t } = useI18n();
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

  const uniqueCities = useMemo(() => {
    const cities = new Set(['Global', profile.city, ...remoteLeaderboard.map((item) => item.city)]);
    return Array.from(cities);
  }, [profile.city, remoteLeaderboard]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content leaderboard-modal">
        <button className="modal-close" onClick={() => { playClick(); onClose(); }} aria-label={t('auth.close')}>
          <X size={18} />
        </button>

        <div className="dialog-title">
          <div className="dialog-icon"><Trophy size={18} /></div>
          <div>
            <h2>{t('lb.title')}</h2>
            <p>{t('lb.subtitle')}</p>
          </div>
        </div>

        <div className={`db-status ${isLive ? 'live' : 'fallback'}`}>
          <Database size={14} />
          <span>{isLoading ? t('lb.loading') : isLive ? t('lb.live') : t('lb.offline')}</span>
        </div>

        <div className="lb-filters">
          <div className="lb-search">
            <Search size={14} />
            <input
              type="text"
              placeholder={t('lb.search')}
              aria-label={t('lb.search')}
              className="input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            aria-label={t('lb.city')}
            className="input lb-city"
            value={selectedCity}
            onChange={(e) => { playClick(); setSelectedCity(e.target.value); }}
          >
            {uniqueCities.map((c) => (
              <option key={c} value={c}>{c === 'Global' ? t('lb.global') : c}</option>
            ))}
          </select>
        </div>

        <ol className="lb-list contained-scroll" aria-label={t('lb.title')}>
          {filteredList.map((player, idx) => {
            const isSelf = player.username === profile.username;
            return (
              <li key={player.username + idx} className={`lb-row ${isSelf ? 'self' : ''} ${idx < 3 ? `top-${idx + 1}` : ''}`}>
                <span className="lb-rank">{idx + 1}</span>
                <span className="lb-avatar">{player.avatar}</span>
                <div className="lb-player">
                  <strong>
                    {player.username}
                    {player.isPro && <span className="badge pro"><Crown size={9} /> PRO</span>}
                  </strong>
                  <span><MapPin size={10} /> {player.city}</span>
                </div>
                <span className="lb-points">{player.points} <small>CP</small></span>
              </li>
            );
          })}
          {!isLoading && filteredList.length === 0 && <li className="lb-empty">{t('lb.none')}</li>}
        </ol>
      </div>
    </div>
  );
};
