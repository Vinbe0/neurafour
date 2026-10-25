import React from 'react';
import { X, Coins, ShoppingBag, Check, Crown } from 'lucide-react';
import type { UserProfile, SkinItem } from '../types';
import { playClick, playUnlock } from '../sound';
import { useI18n } from '../i18n';
import { useToast } from '../toast';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onUnlockSkin: (skinId: string, price: number) => void;
  onEquipSkin: (skinId: string) => void;
}

const SKINS: SkinItem[] = [
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    nameRu: 'Кибер-Неон',
    price: 0,
    boardClass: 'skin-neon',
    redColor: 'var(--accent-pink)',
    yellowColor: 'var(--accent-cyan)',
    redGlow: '0 0 10px rgba(255, 0, 127, 0.6)',
    yellowGlow: '0 0 10px rgba(0, 240, 255, 0.6)',
    description: 'Neon cyan vs hot pink checker set locked inside a carbon-fiber grid.',
    descriptionRu: 'Неоновые розовые и голубые фишки внутри кибернетического темно-фиолетового каркаса.'
  },
  {
    id: 'retro-arcade',
    name: 'Retro Arcade',
    nameRu: 'Ретро-Аркада',
    price: 150,
    boardClass: 'skin-retro',
    redColor: '#d90429',
    yellowColor: '#ffb703',
    redGlow: 'none',
    yellowGlow: 'none',
    description: 'Flat retro red and yellow tokens, complete with sharp arcade edges and a double board border.',
    descriptionRu: 'Плоские ретро-фишки красного и желтого цветов, угловатые края и винтажная двойная рамка.'
  },
  {
    id: 'space-obsidian',
    name: 'Cosmic Obsidian',
    nameRu: 'Космический Обсидиан',
    price: 250,
    boardClass: 'skin-obsidian',
    redColor: '#9d4edd',
    yellowColor: '#fb8500',
    redGlow: '0 0 12px rgba(157, 78, 221, 0.8)',
    yellowGlow: '0 0 12px rgba(251, 133, 0, 0.8)',
    description: 'Astral purple and glowing solar tokens falling behind deep obsidian stone sprinkled with stars.',
    descriptionRu: 'Астрально-фиолетовые и солнечные оранжевые фишки, падающие за обсидиановый звездный корпус.'
  },
  {
    id: 'royal-gold',
    name: 'Royal Gold',
    nameRu: 'Королевское Золото',
    price: 450,
    boardClass: 'skin-gold',
    redColor: '#1b4332',
    yellowColor: '#ffe600',
    redGlow: '0 0 10px rgba(27, 67, 50, 0.4)',
    yellowGlow: '0 0 12px rgba(212, 175, 55, 0.8)',
    description: 'Deep forest emerald checkers battling glowing 24k gold, within a luxury white marble board.',
    descriptionRu: 'Изумрудные и золотые глянцевые фишки внутри белой мраморной доски с позолоченной каймой.'
  }
];

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUnlockSkin,
  onEquipSkin,
}) => {
  const { t, lang } = useI18n();
  const notify = useToast();
  if (!isOpen) return null;

  const handleAction = (skin: SkinItem) => {
    playClick();
    const isUnlocked = profile.unlockedSkins.includes(skin.id) || profile.isPro;

    if (isUnlocked) {
      // Equip skin
      onEquipSkin(skin.id);
    } else {
      // Try to purchase skin
      if (profile.points >= skin.price) {
        onUnlockSkin(skin.id, skin.price);
        playUnlock();
      } else {
        notify(t('shop.notEnough'), 'error');
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ border: '1px solid var(--accent-pink)', maxWidth: '640px' }}>
        <button className="modal-close" onClick={() => { playClick(); onClose(); }} aria-label={t('auth.close')}>
          <X size={20} />
        </button>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <ShoppingBag className="neon-text-pink" size={30} style={{ animation: 'blink-glow 2s infinite' }} />
          <div>
            <h2 className="display-font" style={{ fontSize: '1.6rem', color: 'var(--accent-pink)' }}>
              {t('shop.title')}
            </h2>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
              {t('shop.subtitle')}
            </span>
          </div>
        </div>

        {/* Currency preview */}
        <div className="glass-panel" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid var(--panel-border)',
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <span className="display-font" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {t('shop.balance')}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Coins size={18} className="neon-text-cyan" />
            <span className="display-font" style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
              {profile.points} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>CP</span>
            </span>
          </div>
        </div>

        {/* Grid listing skins */}
        <div className="contained-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '380px' }}>
          {SKINS.map((skin) => {
            const isUnlocked = profile.unlockedSkins.includes(skin.id) || profile.isPro;
            const isActive = profile.activeSkin === skin.id;

            return (
              <div
                key={skin.id}
                className="glass-panel"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '15px 20px',
                  background: 'rgba(0,0,0,0.2)',
                  border: isActive ? '1px solid var(--accent-pink)' : '1px solid rgba(255,255,255,0.05)',
                  boxShadow: isActive ? 'var(--glow-pink)' : 'none',
                  borderRadius: '12px',
                  gap: '15px'
                }}
              >
                {/* Visual skin preview */}
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '8px',
                  background: skin.id === 'cyber-neon' ? '#150b2b' : skin.id === 'retro-arcade' ? '#3c2405' : skin.id === 'space-obsidian' ? '#0c0d12' : '#f8f9fa',
                  border: skin.id === 'cyber-neon' ? '2px solid var(--accent-pink)' : skin.id === 'retro-arcade' ? '2px solid #f39c12' : skin.id === 'space-obsidian' ? '2px solid var(--accent-purple)' : '2px solid #d4af37',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  position: 'relative'
                }}>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: skin.redColor,
                    boxShadow: skin.redGlow !== 'none' ? skin.redGlow : 'none',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }} />
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: skin.yellowColor,
                    boxShadow: skin.yellowGlow !== 'none' ? skin.yellowGlow : 'none',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }} />
                </div>

                {/* Skin Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 className="display-font" style={{ fontSize: '1rem', fontWeight: 'bold' }}>{lang === 'ru' ? skin.nameRu : skin.name}</h3>
                    {profile.isPro && skin.price > 0 && (
                      <span className="cyber-badge pro" style={{ padding: '0px 6px', fontSize: '0.6rem', transform: 'scale(0.9)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                        <Crown size={8} /> {t('shop.proUnlock')}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.25' }}>
                    {lang === 'ru' ? skin.descriptionRu : skin.description}
                  </p>
                </div>

                {/* Purchase/Equip Button */}
                <div>
                  <button
                    className={`glass-button ${isActive ? 'active' : ''}`}
                    onClick={() => handleAction(skin)}
                    style={{
                      fontSize: '0.75rem',
                      padding: '8px 16px',
                      minWidth: '120px',
                      justifyContent: 'center',
                      borderColor: !isUnlocked ? 'rgba(243, 156, 18, 0.4)' : isActive ? 'var(--accent-pink)' : 'rgba(255,255,255,0.1)'
                    }}
                  >
                    {isActive ? (
                      <>
                        <Check size={12} />
                        <span>{t('shop.active')}</span>
                      </>
                    ) : isUnlocked ? (
                      <span>{t('shop.equip')}</span>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Coins size={12} className="neon-text-cyan" />
                        <span>{skin.price} CP</span>
                      </div>
                    )}
                  </button>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
