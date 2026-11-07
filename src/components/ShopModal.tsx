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

// 'cyber-neon' is kept as the id of the default skin so saved profiles still match
const SKINS: SkinItem[] = [
  {
    id: 'cyber-neon',
    name: 'Classic',
    nameRu: 'Классика',
    price: 0,
    boardColor: '#23407a',
    redColor: '#e5484d',
    yellowColor: '#f2c037',
    description: 'Red and yellow discs on a deep blue board, the way the game is meant to look.',
    descriptionRu: 'Красные и жёлтые фишки на тёмно-синей доске — классический вид игры.',
  },
  {
    id: 'retro-arcade',
    name: 'Retro Arcade',
    nameRu: 'Ретро-аркада',
    price: 150,
    boardColor: '#3c2405',
    redColor: '#d90429',
    yellowColor: '#ffb703',
    description: 'Flat square tokens and a double-bordered cabinet, straight out of an arcade.',
    descriptionRu: 'Плоские квадратные фишки и рамка игрового автомата.',
  },
  {
    id: 'space-obsidian',
    name: 'Cosmic Obsidian',
    nameRu: 'Космический обсидиан',
    price: 250,
    boardColor: '#11131a',
    redColor: '#9d4edd',
    yellowColor: '#fb8500',
    description: 'Violet and amber discs on a starry obsidian board.',
    descriptionRu: 'Фиолетовые и янтарные фишки на звёздной обсидиановой доске.',
  },
  {
    id: 'royal-gold',
    name: 'Royal Gold',
    nameRu: 'Королевское золото',
    price: 450,
    boardColor: '#f3f1ea',
    redColor: '#1b4332',
    yellowColor: '#d4af37',
    description: 'Emerald and gold discs on a marble board with a gilded edge.',
    descriptionRu: 'Изумрудные и золотые фишки на мраморной доске с позолоченной каймой.',
  },
];

// Board skins: buy with CyberPoints, then equip
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
      onEquipSkin(skin.id);
    } else if (profile.points >= skin.price) {
      onUnlockSkin(skin.id, skin.price);
      playUnlock();
    } else {
      notify(t('shop.notEnough'), 'error');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content shop-modal">
        <button className="modal-close" onClick={() => { playClick(); onClose(); }} aria-label={t('auth.close')}>
          <X size={18} />
        </button>

        <div className="dialog-title">
          <div className="dialog-icon"><ShoppingBag size={18} /></div>
          <div>
            <h2>{t('shop.title')}</h2>
            <p>{t('shop.subtitle')}</p>
          </div>
        </div>

        <div className="shop-balance">
          <span>{t('shop.balance')}</span>
          <strong><Coins size={14} /> {profile.points} CP</strong>
        </div>

        <div className="shop-list contained-scroll">
          {SKINS.map((skin) => {
            const isUnlocked = profile.unlockedSkins.includes(skin.id) || profile.isPro;
            const isActive = profile.activeSkin === skin.id;

            return (
              <div key={skin.id} className={`shop-item ${isActive ? 'active' : ''}`}>
                <div className="shop-preview" style={{ background: skin.boardColor }} aria-hidden="true">
                  <span style={{ background: skin.redColor }} />
                  <span style={{ background: skin.yellowColor }} />
                </div>

                <div className="shop-info">
                  <h3>
                    {lang === 'ru' ? skin.nameRu : skin.name}
                    {profile.isPro && skin.price > 0 && (
                      <span className="badge pro"><Crown size={9} /> {t('shop.proUnlock')}</span>
                    )}
                  </h3>
                  <p>{lang === 'ru' ? skin.descriptionRu : skin.description}</p>
                </div>

                <button
                  className={`btn ${isActive ? 'primary' : ''} shop-action`}
                  onClick={() => handleAction(skin)}
                  aria-pressed={isUnlocked ? isActive : undefined}
                >
                  {isActive ? (
                    <><Check size={13} /> {t('shop.active')}</>
                  ) : isUnlocked ? (
                    t('shop.equip')
                  ) : (
                    <><Coins size={13} /> {skin.price} CP</>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
