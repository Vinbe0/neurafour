import React, { useState } from 'react';
import { X, Crown, Check, ShieldCheck, Loader2 } from 'lucide-react';
import type { UserProfile } from '../types';
import { playClick, playUnlock } from '../sound';

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
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(profile.isPro);

  if (!isOpen) return null;

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Format card number with spaces every 4 digits
    const val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = val.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      setCardNumber(parts.join(' '));
    } else {
      setCardNumber(val);
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (val.length >= 2) {
      setExpiry(val.substring(0, 2) + '/' + val.substring(2, 4));
    } else {
      setExpiry(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber.length < 15 || expiry.length < 5 || cvv.length < 3 || name.length < 3) {
      alert('Пожалуйста, заполните все реквизиты карты / Please fill in all credit card details.');
      return;
    }

    playClick();
    setIsProcessing(true);

    // Simulate payment transaction
    setTimeout(() => {
      setIsProcessing(false);
      setSuccess(true);
      onActivatePro();
      playUnlock();
    }, 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ border: '1px solid var(--accent-gold)' }}>
        <button className="modal-close" onClick={() => { playClick(); onClose(); }}>
          <X size={20} />
        </button>

        {success ? (
          /* SUCCESS STATE */
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(243, 156, 18, 0.2), rgba(255, 0, 127, 0.2))',
              border: '2px solid var(--accent-gold)',
              boxShadow: '0 0 20px var(--accent-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              animation: 'pulse-winning-token 1.5s infinite alternate'
            }}>
              <Crown size={40} style={{ color: 'var(--accent-gold)' }} />
            </div>

            <h2 className="display-font" style={{ fontSize: '1.8rem', color: 'var(--accent-gold)', textShadow: '0 0 10px rgba(243,156,18,0.5)', marginBottom: '10px' }}>
              ДОБРО ПОЖАЛОВАТЬ В PRO!
            </h2>
            <p className="display-font" style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', letterSpacing: '0.1em', marginBottom: '25px' }}>
              ACCESS GRANTED • NEURAFOUR ELITE
            </p>

            <div className="glass-panel" style={{ padding: '20px', background: 'rgba(0,0,0,0.3)', marginBottom: '25px', textAlign: 'left' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                <Check size={18} style={{ color: 'var(--accent-green)' }} />
                <span style={{ fontSize: '0.9rem' }}>Мгновенная разблокировка <b>всех скинов</b> в магазине!</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                <Check size={18} style={{ color: 'var(--accent-green)' }} />
                <span style={{ fontSize: '0.9rem' }}><b>Супер-Гроссмейстер Коуч</b> (глубокий анализ ходов ИИ)</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Check size={18} style={{ color: 'var(--accent-green)' }} />
                <span style={{ fontSize: '0.9rem' }}><b>Золотой никнейм</b> и корона в таблице лидеров!</span>
              </div>
            </div>

            <button className="glass-button active" onClick={() => { playClick(); onClose(); }} style={{ width: '100%', justifyContent: 'center' }}>
              НАЧАТЬ АРЕНУ / ENTER ARENA
            </button>
          </div>
        ) : (
          /* PAYMENT FORM STATE */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
              <Crown className="neon-text-pink" size={32} style={{ color: 'var(--accent-gold)', filter: 'drop-shadow(0 0 8px rgba(243,156,18,0.8))' }} />
              <div>
                <h2 className="display-font" style={{ fontSize: '1.5rem', color: 'var(--accent-gold)' }}>
                  NEURAFOUR PRO
                </h2>
                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
                  Unlock the full cyber strategy potential
                </span>
              </div>
            </div>

            {/* Benefits list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px', marginTop: '15px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ background: 'rgba(243, 156, 18, 0.2)', padding: '4px', borderRadius: '4px', marginTop: '2px' }}>
                  <Check size={14} style={{ color: 'var(--accent-gold)' }} />
                </div>
                <div>
                  <h4 className="display-font" style={{ fontSize: '0.8rem', color: '#fff' }}>Все премиум скины доски и фишек / All Premium Skins</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Космический обсидиан, Королевское золото, Ретро-аркада — без трат CP.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ background: 'rgba(243, 156, 18, 0.2)', padding: '4px', borderRadius: '4px', marginTop: '2px' }}>
                  <Check size={14} style={{ color: 'var(--accent-gold)' }} />
                </div>
                <div>
                  <h4 className="display-font" style={{ fontSize: '0.8rem', color: '#fff' }}>Гроссмейстерский ИИ-Коуч / Masterclass AI Coach</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Глубокий анализ партий с помощью ИИ глубиной в 6 ходов для оттачивания стратегии.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ background: 'rgba(243, 156, 18, 0.2)', padding: '4px', borderRadius: '4px', marginTop: '2px' }}>
                  <Check size={14} style={{ color: 'var(--accent-gold)' }} />
                </div>
                <div>
                  <h4 className="display-font" style={{ fontSize: '0.8rem', color: '#fff' }}>Корона Лидеров / Leaderboard Golden Tag</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Выделитесь в своем городе! Золотая рамка и корона в таблицах Алматы и мира.</p>
                </div>
              </div>
            </div>

            {/* Neon Checkout form */}
            <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '20px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(243, 156, 18, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <span className="display-font" style={{ fontSize: '0.85rem', color: 'var(--accent-gold)' }}>ОДНОКРАТНАЯ ПОКУПКА / LIFETIME ACCESS</span>
                <span className="display-font" style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold' }}>$9.99</span>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="cyber-label">Номер Карты / Card Number</label>
                <input
                  type="text"
                  maxLength={19}
                  className="cyber-input"
                  style={{ border: '1px solid rgba(243, 156, 18, 0.3)' }}
                  placeholder="4000 1234 5678 9010"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' }}>
                <div>
                  <label className="cyber-label">Срок действия / Expiry</label>
                  <input
                    type="text"
                    maxLength={5}
                    className="cyber-input"
                    style={{ border: '1px solid rgba(243, 156, 18, 0.3)' }}
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={handleExpiryChange}
                    required
                  />
                </div>
                <div>
                  <label className="cyber-label">CVV / Security Code</label>
                  <input
                    type="password"
                    maxLength={3}
                    className="cyber-input"
                    style={{ border: '1px solid rgba(243, 156, 18, 0.3)' }}
                    placeholder="***"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, ''))}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="cyber-label">Владелец Карты / Cardholder Name</label>
                <input
                  type="text"
                  className="cyber-input"
                  style={{ border: '1px solid rgba(243, 156, 18, 0.3)', textTransform: 'uppercase' }}
                  placeholder="IVAN IVANOV"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="glass-button active"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-pink))',
                  border: '1px solid var(--accent-gold)',
                  boxShadow: '0 0 10px rgba(243, 156, 18, 0.4)',
                  padding: '12px',
                  opacity: isProcessing ? 0.7 : 1,
                  cursor: isProcessing ? 'not-allowed' : 'pointer'
                }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={16} style={{ animation: 'rotate-dash 1.5s linear infinite' }} />
                    <span>ТРАНЗАКЦИЯ... / PROCESSING...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>ОПЛАТИТЬ $9.99 / PAY $9.99</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
