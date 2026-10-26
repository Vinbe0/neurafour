import React from 'react';
import { Brain, Coins, Crown, LogIn, Volume2, VolumeX, Sun, Moon, Trophy, ShoppingBag, Gamepad2, Languages } from 'lucide-react';
import type { UserProfile } from '../types';
import { playClick } from '../sound';
import { useI18n } from '../i18n';

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
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const toggleLang = () => {
    playClick();
    setLang(lang === 'en' ? 'ru' : 'en');
  };

  const handleTabClick = (tab: string) => {
    playClick();
    setActiveTab(tab);
  };

  return (
    <header className="app-header glass-panel">
      {/* Brand Logo */}
      <button className="header-brand" onClick={() => handleTabClick('game')} aria-label={t('header.openGame')}>
        <Brain className="brand-icon" size={32} />
        <div>
          <h1 className="display-font">
            NEURAFOUR
          </h1>
          <span>
            {t('header.tagline')}
          </span>
        </div>
      </button>

      {/* Main Navigation Tabs */}
      <nav className="header-nav">
        <button
          className={`glass-button ${activeTab === 'game' ? 'active' : ''}`}
          onClick={() => handleTabClick('game')}
        >
          <Gamepad2 size={14} />
          <span className="display-font">{t('nav.play')}</span>
        </button>
        <button
          className="glass-button"
          onClick={onOpenLeaderboard}
        >
          <Trophy size={14} className="neon-text-cyan" />
          <span className="display-font">{t('nav.leaderboard')}</span>
        </button>
        <button
          className="glass-button"
          onClick={onOpenShop}
        >
          <ShoppingBag size={14} className="neon-text-pink" />
          <span className="display-font">{t('nav.shop')}</span>
        </button>
      </nav>

      {/* Profile & Controls */}
      <div className="header-actions">
        
        {/* Currency tracker */}
        <div className="header-points glass-panel">
          <Coins size={16} className="neon-text-cyan" />
          <span className="display-font">
            {profile.points} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CP</span>
          </span>
        </div>

        {/* Pro Banner / Upgrader */}
        {profile.isPro ? (
          <button className="header-pro-badge cyber-badge pro" onClick={onOpenPro}>
            <Crown size={14} />
            <span>PRO</span>
          </button>
        ) : (
          <button 
            className="glass-button pink header-upgrade"
            onClick={onOpenPro}
          >
            <Crown size={12} className="neon-text-pink" />
            <span>{t('header.upgrade')}</span>
          </button>
        )}

        {/* Action Toggles */}
        <div className="header-toggles">
          {/* Audio toggle */}
          <button 
            className="glass-button icon-button" 
            onClick={toggleMuted}
            title={isMuted ? t('header.unmute') : t('header.mute')}
            aria-label={isMuted ? t('header.unmute') : t('header.mute')}
          >
            {isMuted ? <VolumeX size={16} className="neon-text-pink" /> : <Volume2 size={16} className="neon-text-cyan" />}
          </button>

          {/* Theme toggle */}
          <button 
            className="glass-button icon-button" 
            onClick={toggleTheme}
            title={theme === 'dark' ? t('header.lightTheme') : t('header.darkTheme')}
            aria-label={theme === 'dark' ? t('header.lightTheme') : t('header.darkTheme')}
          >
            {theme === 'dark' ? <Sun size={16} className="neon-text-cyan" /> : <Moon size={16} className="neon-text-pink" />}
          </button>

          {/* Language toggle */}
          <button
            className="glass-button lang-button"
            onClick={toggleLang}
            title={t('header.language')}
            aria-label={t('header.language')}
          >
            <Languages size={14} />
            <span>{lang === 'en' ? 'RU' : 'EN'}</span>
          </button>
        </div>

        {!accountEmail && (
          <button
            className="glass-button auth-nav-button"
            onClick={() => { playClick(); onOpenAuth(); }}
            title={t('header.signInTitle')}
          >
            <LogIn size={14} />
            <span>{t('header.signIn')}</span>
          </button>
        )}

        {/* Profile indicator */}
        <button 
          onClick={onOpenProfile}
          className="header-profile tooltip"
          data-tooltip={accountEmail ? accountEmail : t('header.guest')}
        >
          <div className={profile.isPro ? 'profile-avatar pro' : 'profile-avatar'}>
            {profile.avatar}
          </div>
          <span>
            {profile.username}
          </span>
        </button>

      </div>
    </header>
  );
};
