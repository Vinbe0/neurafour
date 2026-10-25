import React, { useState } from 'react';
import { X, Crown, Check, Info, Loader2, Palette, Brain } from 'lucide-react';
import type { UserProfile } from '../types';
import { playClick, playUnlock } from '../sound';
import { useI18n } from '../i18n';

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onActivatePro: () => void;
}

export const ProModal: React.FC<ProModalProps> = ({
  isOpen,
  onClose,
  profile,
  onActivatePro,
}) => {
  const { t } = useI18n();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleActivate = () => {
    playClick();
    setIsProcessing(true);

    // Short delay so the activation feels deliberate
    setTimeout(() => {
      setIsProcessing(false);
      onActivatePro();
      playUnlock();
    }, 700);
  };

  const perks = [
    { icon: <Palette size={16} />, title: t('pro.skinsTitle'), body: t('pro.skinsBody') },
    { icon: <Brain size={16} />, title: t('pro.coachTitle'), body: t('pro.coachBody') },
    { icon: <Crown size={16} />, title: t('pro.crownTitle'), body: t('pro.crownBody') },
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content pro-modal glass-panel">
        <button className="modal-close" onClick={() => { playClick(); onClose(); }} aria-label={t('auth.close')}>
          <X size={20} />
        </button>

        {profile.isPro ? (
          <div className="pro-success">
            <div className="pro-crown">
              <Crown size={40} />
            </div>
            <h2 className="display-font">{t('pro.welcome')}</h2>
            <p className="pro-granted">{t('pro.granted')}</p>

            <ul className="pro-checklist">
              <li><Check size={18} /> {t('pro.perkSkins')}</li>
              <li><Check size={18} /> {t('pro.perkCoach')}</li>
              <li><Check size={18} /> {t('pro.perkCrown')}</li>
            </ul>

            <button className="glass-button active pro-cta" onClick={() => { playClick(); onClose(); }}>
              {t('pro.continue')}
            </button>
          </div>
        ) : (
          <div>
            <div className="pro-header">
              <Crown size={32} />
              <div>
                <h2 className="display-font">NeuraFour PRO</h2>
                <span>{t('pro.subtitle')}</span>
              </div>
            </div>

            <div className="pro-perks">
              {perks.map((perk) => (
                <div key={perk.title} className="pro-perk">
                  <div className="pro-perk-icon">{perk.icon}</div>
                  <div>
                    <h4 className="display-font">{perk.title}</h4>
                    <p>{perk.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pro-demo-note">
              <Info size={16} />
              <div>
                <strong>{t('pro.demoTitle')}</strong>
                <span>{t('pro.demoBody')}</span>
              </div>
            </div>

            <button
              className="glass-button active pro-cta"
              onClick={handleActivate}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>{t('pro.activating')}</span>
                </>
              ) : (
                <>
                  <Crown size={16} />
                  <span>{t('pro.activate')}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
