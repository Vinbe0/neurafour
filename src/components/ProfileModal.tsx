import React, { useState } from 'react';
import { CheckCircle, Coins, Flame, History, LogIn, LogOut, MapPin, Save, ShieldAlert, Trophy, User, X } from 'lucide-react';
import type { UserProfile, MatchHistoryItem } from '../types';
import { playClick } from '../sound';

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
        <button className="modal-close" onClick={() => { playClick(); onClose(); }} aria-label="Закрыть профиль">
          <X size={20} />
        </button>

        <section className="account-hero">
          <div className="account-avatar-preview">{avatar}</div>
          <div className="account-identity">
            <span className="account-kicker">Аккаунт игрока</span>
            <h2>{username || profile.username}</h2>
            <div className="account-meta">
              <span><MapPin size={14} /> {city}</span>
              <span><Coins size={14} /> {profile.points} CP</span>
              <span className={profile.isPro ? 'pro-active' : ''}>{profile.isPro ? 'PRO active' : 'Free plan'}</span>
            </div>
          </div>
        </section>

        <section className={`account-auth-card ${accountEmail ? 'signed-in' : 'guest'}`}>
          <div>
            <strong>{accountEmail ? 'Аккаунт подключен' : 'Гостевой режим'}</strong>
            <span>
              {accountEmail
                ? `${accountEmail} · прогресс синхронизируется с Supabase`
                : 'Создайте аккаунт, чтобы попасть в реальный глобальный рейтинг и сохранить прогресс.'}
            </span>
          </div>
          {accountEmail ? (
            <button onClick={onSignOut}>
              <LogOut size={15} />
              Выйти
            </button>
          ) : (
            <button onClick={() => { playClick(); onOpenAuth(); }}>
              <LogIn size={15} />
              Войти
            </button>
          )}
        </section>

        <section className="account-level-card">
          <div>
            <span>Уровень {playerLevel}</span>
            <strong>{nextLevelAt - profile.points > 0 ? `${nextLevelAt - profile.points} CP до следующего уровня` : 'Новый уровень доступен'}</strong>
          </div>
          <div className="account-progress" aria-label={`Прогресс уровня ${levelProgress}%`}>
            <span style={{ width: `${levelProgress}%` }} />
          </div>
        </section>

        <section className="account-grid">
          <div className="account-edit-card">
            <h3><User size={17} /> Настройки</h3>

            <label className="cyber-label">Никнейм</label>
            <input
              type="text"
              className="cyber-input"
              value={username}
              maxLength={18}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите никнейм"
            />

            <label className="cyber-label">Город для рейтинга</label>
            <select
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

            <label className="cyber-label">Аватар</label>
            <div className="avatar-grid">
              {AVATARS.map((av) => (
                <button
                  key={av}
                  className={avatar === av ? 'selected' : ''}
                  onClick={() => { playClick(); setAvatar(av); }}
                  aria-label={`Выбрать аватар ${av}`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          <div className="account-stats-card">
            <h3><Trophy size={17} /> Статистика</h3>
            <div className="account-stats-grid">
              <StatTile icon={<History size={17} />} label="Матчи" value={totalMatches} />
              <StatTile icon={<CheckCircle size={17} />} label="Победы" value={profile.stats.wins} tone="good" />
              <StatTile icon={<ShieldAlert size={17} />} label="Поражения" value={profile.stats.losses} tone="bad" />
              <StatTile icon={<Flame size={17} />} label="Винрейт" value={`${winRate}%`} tone="gold" />
            </div>
          </div>
        </section>

        <section className="account-history-card">
          <div className="account-section-title">
            <h3>История матчей</h3>
            <span>{matchHistory.length ? `Последние ${matchHistory.length}` : 'Пока пусто'}</span>
          </div>

          <div className="contained-scroll match-history-list">
            {matchHistory.length === 0 ? (
              <div className="empty-history">
                Сыграйте матч против ИИ или друга, чтобы здесь появилась динамика прогресса.
              </div>
            ) : (
              matchHistory.map((match) => (
                <article key={match.id} className={`history-row ${match.result}`}>
                  <div>
                    <strong>{match.result === 'win' ? 'Победа' : match.result === 'loss' ? 'Поражение' : 'Ничья'}</strong>
                    <span>
                      {match.mode === 'ai' ? `ИИ (${match.difficulty})` : match.mode === 'local' ? 'Локальная игра' : 'Мультиплеер'} · {match.opponent}
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
          Сохранить профиль
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
