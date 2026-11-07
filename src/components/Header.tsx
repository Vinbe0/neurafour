import React from 'react';
import { Coins, Crown, LogIn, Volume2, VolumeX, Sun, Moon } from 'lucide-react';
import type { UserProfile } from '../types';
import { playClick } from '../sound';
import { useI18n } from '../i18n';
import { Avatar } from './Avatar';

interface HeaderProps {
  profile: UserProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenProfile: () => void;
  onOpenPro: () => void;
  onOpenShop: () => void;
  onOpenLeaderboard: () => void;
  onOpenAuth: () => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  accountEmail: string | null;
}

// Logo: a winning diagonal of four discs on the board
const LogoMark = () => (
  <svg className="logo-mark" viewBox="0 0 28 28" aria-hidden="true">
    <rect width="28" height="28" rx="7" />
    <circle cx="6" cy="22" r="2.7" />
    <circle cx="11.3" cy="16.7" r="2.7" />
    <circle cx="16.7" cy="11.3" r="2.7" />
    <circle cx="22" cy="6" r="2.7" />
  </svg>
);

// Slim top bar: brand and navigation on the left, account and settings on the right
export const Header: React.FC<HeaderProps> = ({
  profile,
  activeTab,
  setActiveTab,
  onOpenProfile,
  onOpenPro,
  onOpenShop,
  onOpenLeaderboard,
  onOpenAuth,
  isMuted,
  setIsMuted,
  theme,
  setTheme,
  accountEmail,
}) => {
  const { t, lang, setLang } = useI18n();

  const toggleMuted = () => {
    playClick();
    setIsMuted(!isMuted);
  };

  const toggleTheme = () => {
    playClick();
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const toggleLang = () => {
    playClick();
    setLang(lang === 'en' ? 'ru' : 'en');
  };

  const goToGame = () => {
    playClick();
    setActiveTab('game');
  };

  const goHome = () => {
    playClick();
    setActiveTab('home');
  };

  return (
    <header className="app-header">
      <div className="header-inner">
        <button className="header-brand" onClick={goHome} title={t('nav.home')}>
          <LogoMark />
          <span>NeuraFour</span>
        </button>

        <nav className="header-nav">
          <button className="nav-link" aria-current={activeTab === 'game' ? 'page' : undefined} onClick={goToGame}>
            {t('nav.play')}
          </button>
          <button className="nav-link" onClick={onOpenLeaderboard}>
            {t('nav.leaderboard')}
          </button>
          <button className="nav-link" onClick={onOpenShop}>
            {t('nav.shop')}
          </button>
        </nav>

        <div className="header-actions">
          <span className="header-points" title="CyberPoints">
            <Coins size={14} />
            <strong>{profile.points}</strong>
            <span>CP</span>
          </span>

          {profile.isPro ? (
            <button className="badge pro header-pro-badge" onClick={onOpenPro}>
              <Crown size={11} />
              PRO
            </button>
          ) : (
            <button className="btn small header-upgrade" onClick={onOpenPro}>
              <Crown size={13} />
              <span>{t('header.upgrade')}</span>
            </button>
          )}

          <div className="header-toggles">
            <button
              className="btn ghost icon-button"
              onClick={toggleMuted}
              title={isMuted ? t('header.unmute') : t('header.mute')}
              aria-label={isMuted ? t('header.unmute') : t('header.mute')}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            <button
              className="btn ghost icon-button"
              onClick={toggleTheme}
              title={theme === 'dark' ? t('header.lightTheme') : t('header.darkTheme')}
              aria-label={theme === 'dark' ? t('header.lightTheme') : t('header.darkTheme')}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              className="btn ghost lang-button"
              onClick={toggleLang}
              title={t('header.language')}
              // The accessible name includes the visible "RU"/"EN" so voice control can find it
              aria-label={`${t('header.language')}: ${lang === 'en' ? 'RU' : 'EN'}`}
            >
              {lang === 'en' ? 'RU' : 'EN'}
            </button>
          </div>

          {!accountEmail && (
            <button
              className="btn small"
              onClick={() => { playClick(); onOpenAuth(); }}
              title={t('header.signInTitle')}
            >
              <LogIn size={13} />
              <span>{t('header.signIn')}</span>
            </button>
          )}

          <button
            onClick={onOpenProfile}
            className="header-profile tooltip"
            data-tooltip={accountEmail ? accountEmail : t('header.guest')}
          >
            <span className={profile.isPro ? 'profile-avatar pro' : 'profile-avatar'}><Avatar value={profile.avatar} size={14} /></span>
            <span className="profile-name">{profile.username}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
