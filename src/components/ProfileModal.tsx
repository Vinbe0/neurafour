import React, { useState } from 'react';
import { CheckCircle, Coins, Flame, History, LogIn, LogOut, MapPin, Save, ShieldAlert, Trophy, User, X } from 'lucide-react';
import type { UserProfile, MatchHistoryItem } from '../types';
import { playClick } from '../sound';
import { useI18n } from '../i18n';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  matchHistory: MatchHistoryItem[];
  accountEmail: string | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

const AVATARS = ['🤖', '🧠', '⚡', '🧬', '👾', '🚀', '🛸', '👑', '🛡️', '🎯'];
const CITIES = ['Almaty (Алматы)', 'Astana (Астана)', 'Moscow (Москва)', 'London', 'San Francisco', 'Tokyo'];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
  matchHistory,
  accountEmail,
  onOpenAuth,
  onSignOut,
}) => {
  const { t } = useI18n();
  const [username, setUsername] = useState(profile.username);
  const [city, setCity] = useState(profile.city);
  const [avatar, setAvatar] = useState(profile.avatar);

  if (!isOpen) return null;

  const totalMatches = profile.stats.wins + profile.stats.losses + profile.stats.draws;
  const winRate = totalMatches > 0 ? Math.round((profile.stats.wins / totalMatches) * 100) : 0;
  const playerLevel = Math.max(1, Math.floor(profile.points / 120) + 1);
  const nextLevelAt = playerLevel * 120;
  const previousLevelAt = (playerLevel - 1) * 120;
  const levelProgress = Math.min(100, Math.round(((profile.points - previousLevelAt) / (nextLevelAt - previousLevelAt)) * 100));

  const handleSave = () => {
    playClick();
    onUpdateProfile({
      username: username.trim() || profile.username,
      city,
      avatar,
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content account-modal glass-panel">
        <button className="modal-close" onClick={() => { playClick(); onClose(); }} aria-label={t('auth.close')}>
          <X size={20} />
        </button>

        <section className="account-hero">
          <div className="account-avatar-preview">{avatar}</div>
          <div className="account-identity">
            <span className="account-kicker">{t('profile.kicker')}</span>
            <h2>{username || profile.username}</h2>
            <div className="account-meta">
              <span><MapPin size={14} /> {city}</span>
              <span><Coins size={14} /> {profile.points} CP</span>
              <span className={profile.isPro ? 'pro-active' : ''}>{profile.isPro ? t('profile.proActive') : t('profile.free')}</span>
            </div>
          </div>
        </section>

        <section className={`account-auth-card ${accountEmail ? 'signed-in' : 'guest'}`}>
          <div>
            <strong>{accountEmail ? t('profile.connected') : t('profile.guestMode')}</strong>
            <span>
              {accountEmail
                ? t('profile.synced', { email: accountEmail })
                : t('profile.guestBody')}
            </span>
          </div>
          {accountEmail ? (
            <button onClick={onSignOut}>
              <LogOut size={15} />
              {t('profile.signOut')}
            </button>
          ) : (
            <button onClick={() => { playClick(); onOpenAuth(); }}>
              <LogIn size={15} />
              {t('header.signIn')}
            </button>
          )}
        </section>

        <section className="account-level-card">
          <div>
            <span>{t('profile.level', { n: playerLevel })}</span>
            <strong>{nextLevelAt - profile.points > 0 ? t('profile.toNext', { cp: nextLevelAt - profile.points }) : t('profile.levelUp')}</strong>
          </div>
          <div
            className="account-progress"
            role="progressbar"
            aria-label={t('profile.level', { n: playerLevel })}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={levelProgress}
          >
            <span style={{ width: `${levelProgress}%` }} />
          </div>
        </section>

        <section className="account-grid">
          <div className="account-edit-card">
            <h3><User size={17} /> {t('profile.settings')}</h3>

            <label className="cyber-label" htmlFor="profile-nickname">{t('profile.nickname')}</label>
            <input
              id="profile-nickname"
              type="text"
              className="cyber-input"
              value={username}
              maxLength={18}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('profile.nicknamePlaceholder')}
            />

            <label className="cyber-label" htmlFor="profile-city">{t('profile.city')}</label>
            <select
              id="profile-city"
              className="cyber-input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <span className="cyber-label" id="profile-avatar-label">{t('profile.avatar')}</span>
            <div className="avatar-grid" role="group" aria-labelledby="profile-avatar-label">
              {AVATARS.map((av) => (
                <button
                  key={av}
                  className={avatar === av ? 'selected' : ''}
                  onClick={() => { playClick(); setAvatar(av); }}
                  aria-label={`${t('profile.avatar')} ${av}`}
                  aria-pressed={avatar === av}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          <div className="account-stats-card">
            <h3><Trophy size={17} /> {t('profile.stats')}</h3>
            <div className="account-stats-grid">
              <StatTile icon={<History size={17} />} label={t('profile.matches')} value={totalMatches} />
              <StatTile icon={<CheckCircle size={17} />} label={t('profile.wins')} value={profile.stats.wins} tone="good" />
              <StatTile icon={<ShieldAlert size={17} />} label={t('profile.losses')} value={profile.stats.losses} tone="bad" />
              <StatTile icon={<Flame size={17} />} label={t('profile.winRate')} value={`${winRate}%`} tone="gold" />
            </div>
          </div>
        </section>

        <section className="account-history-card">
          <div className="account-section-title">
            <h3>{t('profile.history')}</h3>
            <span>{matchHistory.length ? t('profile.lastN', { n: matchHistory.length }) : t('profile.empty')}</span>
          </div>

          <div className="contained-scroll match-history-list">
            {matchHistory.length === 0 ? (
              <div className="empty-history">
                {t('profile.emptyBody')}
              </div>
            ) : (
              matchHistory.map((match) => (
                <article key={match.id} className={`history-row ${match.result}`}>
                  <div>
                    <strong>{match.result === 'win' ? t('profile.win') : match.result === 'loss' ? t('profile.loss') : t('profile.draw')}</strong>
                    <span>
                      {match.mode === 'ai' ? `${t('player.ai')} · ${t(`settings.${match.difficulty ?? 'medium'}`)}` : `${match.mode === 'local' ? t('profile.modeLocal') : t('profile.modeOnline')} · ${match.opponent}`}
                    </span>
                  </div>
                  <div>
                    <b>+{match.pointsEarned} CP</b>
                    <small>{match.date}</small>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <button className="glass-button active account-save" onClick={handleSave}>
          <Save size={16} />
          {t('profile.save')}
        </button>
      </div>
    </div>
  );
};

function StatTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone?: 'good' | 'bad' | 'gold';
}) {
  return (
    <div className={`stat-tile ${tone ?? ''}`}>
      {icon}
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
