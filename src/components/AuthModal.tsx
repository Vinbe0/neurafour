import React, { useState } from 'react';
import { Lock, LogIn, Mail, UserPlus, X } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { playClick, playUnlock } from '../sound';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
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

    if (!supabase) {
      setStatus('Supabase не настроен. Проверьте .env.local.');
      return;
    }

    if (password.length < 6) {
      setStatus('Пароль должен содержать минимум 6 символов.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setStatus('Пароли не совпадают.');
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
      setStatus('Аккаунт создан. Проверьте email для подтверждения входа.');
      return;
    }

    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content auth-modal glass-panel">
        <button className="modal-close" onClick={() => { playClick(); onClose(); }} aria-label="Закрыть авторизацию">
          <X size={20} />
        </button>

        <div className="auth-hero">
          <div className="auth-icon">
            {mode === 'signin' ? <LogIn size={28} /> : <UserPlus size={28} />}
          </div>
          <span>NeuraFour ID</span>
          <h2>{mode === 'signin' ? 'Вход в аккаунт' : 'Создать аккаунт'}</h2>
          <p>
            Сохраняйте прогресс, историю матчей и участвуйте в реальном глобальном рейтинге.
          </p>
        </div>

        <div className="auth-tabs">
          <button className={mode === 'signin' ? 'active' : ''} onClick={() => { playClick(); setMode('signin'); setStatus(null); }}>
            Войти
          </button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => { playClick(); setMode('signup'); setStatus(null); }}>
            Регистрация
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
            <span>Пароль</span>
            <div>
              <Lock size={16} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Минимум 6 символов"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
              />
            </div>
          </label>

          {mode === 'signup' && (
            <label>
              <span>Повторите пароль</span>
              <div>
                <Lock size={16} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Еще раз пароль"
                  autoComplete="new-password"
                  required
                />
              </div>
            </label>
          )}

          {status && <div className="auth-status">{status}</div>}

          <button className="glass-button active auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Обработка...' : mode === 'signin' ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>
      </div>
    </div>
  );
};
