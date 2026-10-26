import React, { useState } from 'react';
import { Lock, LogIn, Mail, UserPlus, X } from 'lucide-react';
import { getSupabase } from '../utils/supabase';
import { playClick, playUnlock } from '../sound';
import { useI18n } from '../i18n';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);

    const supabase = await getSupabase();
    if (!supabase) {
      setStatus(t('auth.notConfigured'));
      return;
    }

    if (password.length < 6) {
      setStatus(t('auth.shortPassword'));
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setStatus(t('auth.mismatch'));
      return;
    }

    setIsSubmitting(true);
    playClick();

    const response = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    setIsSubmitting(false);

    if (response.error) {
      setStatus(response.error.message);
      return;
    }

    playUnlock();

    if (mode === 'signup' && !response.data.session) {
      setStatus(t('auth.checkEmail'));
      return;
    }

    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content auth-modal glass-panel">
        <button className="modal-close" onClick={() => { playClick(); onClose(); }} aria-label={t('auth.close')}>
          <X size={20} />
        </button>

        <div className="auth-hero">
          <div className="auth-icon">
            {mode === 'signin' ? <LogIn size={28} /> : <UserPlus size={28} />}
          </div>
          <span>NeuraFour ID</span>
          <h2>{mode === 'signin' ? t('auth.signInTitle') : t('auth.signUpTitle')}</h2>
          <p>
            {t('auth.body')}
          </p>
        </div>

        <div className="auth-tabs">
          <button className={mode === 'signin' ? 'active' : ''} onClick={() => { playClick(); setMode('signin'); setStatus(null); }}>
            {t('auth.signIn')}
          </button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => { playClick(); setMode('signup'); setStatus(null); }}>
            {t('auth.signUp')}
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <div>
              <Mail size={16} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label>
            <span>{t('auth.password')}</span>
            <div>
              <Lock size={16} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
              />
            </div>
          </label>

          {mode === 'signup' && (
            <label>
              <span>{t('auth.repeat')}</span>
              <div>
                <Lock size={16} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder={t('auth.repeatPlaceholder')}
                  autoComplete="new-password"
                  required
                />
              </div>
            </label>
          )}

          {status && <div className="auth-status">{status}</div>}

          <button className="glass-button active auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('auth.processing') : mode === 'signin' ? t('auth.signIn') : t('auth.signUpTitle')}
          </button>
        </form>
      </div>
    </div>
  );
};
