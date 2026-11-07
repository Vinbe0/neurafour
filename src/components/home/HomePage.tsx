import React from 'react';
import { ArrowRight, Bot, Cpu, Gauge, GraduationCap, Swords, Users, Wifi, Zap, Brain, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { StartPreset } from '../../types';
import type { TranslationKey } from '../../i18n';
import { useI18n } from '../../i18n';
import { playClick } from '../../sound';
import { DemoGame } from './DemoGame';

interface HomePageProps {
  onStart: (preset: StartPreset) => void;
}

interface QuickStart {
  preset: StartPreset;
  icon: LucideIcon;
  title: TranslationKey;
  detail: TranslationKey;
}

// Like a chess site's quick pairing: one click starts a game with these settings
const QUICK_STARTS: QuickStart[] = [
  { preset: { mode: 'ai', difficulty: 'easy' }, icon: Bot, title: 'settings.easy', detail: 'home.easyDetail' },
  { preset: { mode: 'ai', difficulty: 'medium' }, icon: Brain, title: 'settings.medium', detail: 'home.mediumDetail' },
  { preset: { mode: 'ai', difficulty: 'hard' }, icon: Target, title: 'settings.hard', detail: 'home.hardDetail' },
  { preset: { mode: 'ai', difficulty: 'expert' }, icon: Zap, title: 'settings.expert', detail: 'home.expertDetail' },
  { preset: { mode: 'local' }, icon: Users, title: 'home.localTitle', detail: 'home.localDetail' },
  { preset: { mode: 'multiplayer' }, icon: Wifi, title: 'home.onlineTitle', detail: 'home.onlineDetail' },
];

const FEATURES: { icon: LucideIcon; title: TranslationKey; body: TranslationKey }[] = [
  { icon: Cpu, title: 'home.featureEngineTitle', body: 'home.featureEngineBody' },
  { icon: Gauge, title: 'home.featureEvalTitle', body: 'home.featureEvalBody' },
  { icon: GraduationCap, title: 'home.featureCoachTitle', body: 'home.featureCoachBody' },
  { icon: Swords, title: 'home.featureOnlineTitle', body: 'home.featureOnlineBody' },
];

// Landing page: what NeuraFour is, a live engine game, and one-click ways to start playing
export const HomePage: React.FC<HomePageProps> = ({ onStart }) => {
  const { t } = useI18n();

  const start = (preset: StartPreset) => {
    playClick();
    onStart(preset);
  };

  return (
    <div className="home">
      <section className="home-hero">
        <div className="hero-copy">
          <span className="hero-eyebrow">{t('home.eyebrow')}</span>
          <h1>{t('home.title')}</h1>
          <p className="hero-lead">{t('home.lead')}</p>

          <div className="hero-actions">
            <button className="btn primary hero-cta" onClick={() => start({ mode: 'ai', difficulty: 'medium' })}>
              <Bot size={16} />
              {t('home.playAi')}
              <ArrowRight size={15} />
            </button>
            <button className="btn hero-cta" onClick={() => start({ mode: 'multiplayer' })}>
              <Wifi size={16} />
              {t('home.playFriend')}
            </button>
          </div>

          <dl className="hero-stats">
            <div><dt>14+</dt><dd>{t('home.statDepth')}</dd></div>
            <div><dt>4</dt><dd>{t('home.statLevels')}</dd></div>
            <div><dt>EN · RU</dt><dd>{t('home.statLanguages')}</dd></div>
          </dl>
        </div>

        <DemoGame />
      </section>

      <section className="home-section" aria-labelledby="quick-start-title">
        <div className="section-heading">
          <h2 id="quick-start-title">{t('home.quickTitle')}</h2>
          <p>{t('home.quickLead')}</p>
        </div>
        <div className="quick-grid">
          {QUICK_STARTS.map(({ preset, icon: Icon, title, detail }) => (
            <button key={title} className="quick-tile" onClick={() => start(preset)}>
              <span className="quick-icon"><Icon size={18} /></span>
              <span className="quick-title">{t(title)}</span>
              <span className="quick-detail">{t(detail)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="home-section" aria-labelledby="features-title">
        <div className="section-heading">
          <h2 id="features-title">{t('home.featuresTitle')}</h2>
          <p>{t('home.featuresLead')}</p>
        </div>
        <div className="feature-grid">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <article key={title} className="feature-card">
              <span className="feature-icon"><Icon size={18} /></span>
              <h3>{t(title)}</h3>
              <p>{t(body)}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
