import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type Lang = 'en' | 'ru';

const STORAGE_LANG_KEY = 'neurafour_lang';

const en = {
  // Header
  'nav.play': 'Play',
  'nav.leaderboard': 'Leaderboard',
  'nav.shop': 'Shop',
  'header.tagline': 'AI Strategy Arena',
  'header.openGame': 'Open game',
  'header.upgrade': 'Upgrade',
  'header.mute': 'Mute sound',
  'header.unmute': 'Turn sound on',
  'header.lightTheme': 'Light theme',
  'header.darkTheme': 'Dark theme',
  'header.signIn': 'Sign in',
  'header.signInTitle': 'Sign in or create an account',
  'header.guest': 'Guest profile',
  'header.language': 'Switch language',

  // Game modes
  'mode.ai': 'vs AI',
  'mode.local': 'Local',
  'mode.online': 'Online 1v1',

  // Status
  'status.label': 'Match status',
  'status.yourTurn': 'Your turn',
  'status.aiThinking': 'AI is thinking',
  'status.redTurn': "Red's turn",
  'status.blueTurn': "Blue's turn",
  'status.opponentTurn': "Opponent's turn",
  'status.youWin': 'You win!',
  'status.aiWins': 'AI wins',
  'status.redWins': 'Red wins!',
  'status.blueWins': 'Blue wins!',
  'status.opponentWins': 'Opponent wins',
  'status.draw': 'Draw',

  // Players
  'player.you': 'You',
  'player.ai': 'AI',
  'player.red': 'Red',
  'player.blue': 'Blue',
  'player.opponent': 'Opponent',
  'player.localOpponent': 'Local player',

  // Controls
  'controls.hint': 'Hint',
  'controls.hintCost': 'Hint · 15 CP',
  'controls.hintTitlePro': 'Free AI hint (PRO)',
  'controls.hintTitle': 'AI hint, costs 15 CP',
  'controls.notEnoughHint': 'Not enough CyberPoints. A hint costs 15 CP, or upgrade to PRO.',
  'controls.undo': 'Undo',
  'controls.undoTitle': 'Take back your last move',
  'controls.restart': 'New game',
  'controls.keyboard': 'Keys 1–7 or ← → and Enter to play · U to undo',

  // Settings
  'settings.difficulty': 'AI difficulty',
  'settings.easy': 'Easy',
  'settings.medium': 'Medium',
  'settings.hard': 'Hard',
  'settings.expert': 'Expert',
  'settings.firstMove': 'First move',
  'settings.youFirst': 'You',
  'settings.aiFirst': 'AI',

  // Move list
  'moves.title': 'Moves',
  'moves.empty': 'No moves yet. Drop a token to start.',
  'moves.column': 'Column {col}',

  // Coach prompt
  'coachPrompt.title': 'Review with the AI Coach',
  'coachPrompt.body': 'See every move graded, where you missed a win or a block, and what the engine would have played.',
  'coachPrompt.button': 'Open review',
  'coachPrompt.analyzing': 'Analyzing…',

  // Multiplayer in-game
  'mp.opponentRestart': 'Your opponent wants a rematch',
  'mp.acceptRestart': 'Accept rematch',
  'mp.restartSent': 'Rematch request sent to your opponent.',
  'mp.serverError': 'Could not reach the multiplayer server. Try again in a moment.',

  // Lobby
  'lobby.title': 'Multiplayer duel',
  'lobby.subtitle': 'Play a friend in real time. Create a private room or join one with a code.',
  'lobby.connecting': 'Connecting…',
  'lobby.hostTitle': 'Host a game',
  'lobby.hostBody': 'Get a room link and send it to a friend to join instantly.',
  'lobby.hostButton': 'Create room',
  'lobby.joinTitle': 'Join a game',
  'lobby.roomCode': 'Room code',
  'lobby.joinButton': 'Join',
  'lobby.serverNote': 'Online play needs the multiplayer server. Locally, run `npm run server` (port 5001).',
  'lobby.leave': 'Leave',
  'lobby.room': 'Room',
  'lobby.copied': 'Link copied',
  'lobby.copy': 'Copy invite link',
  'lobby.players': 'Players',
  'lobby.host': 'Host · Red',
  'lobby.guest': 'Guest · Blue',
  'lobby.waiting': 'Waiting for an opponent…',
  'lobby.chat': 'Chat',
  'lobby.chatEmpty': 'No messages yet. Say hi!',
  'lobby.chatPlaceholder': 'Say something…',
  'lobby.send': 'Send message',

  // Coach panel
  'coach.unavailable': 'Analysis unavailable',
  'coach.unavailableBody': 'Finish at least one move before opening the coach.',
  'coach.backToGame': 'Back to game',
  'coach.game': 'Game',
  'coach.kicker': 'AI Coach',
  'coach.title': 'Post-game review',
  'coach.subtitle': 'Move-by-move decisions, missed threats, and better alternatives.',
  'coach.deeper': 'Deeper review',
  'coach.sharp': 'Sharp game',
  'coach.solid': 'Solid game',
  'coach.training': 'Training game',
  'coach.analyzed': '{count} moves analyzed',
  'coach.proTitle': 'PRO review',
  'coach.proBody': 'Unlock a deeper search and every skin.',
  'coach.upgrade': 'Upgrade',
  'coach.prev': 'Previous move',
  'coach.next': 'Next move',
  'coach.move': 'Move {n}',
  'coach.played': 'Played',
  'coach.recommended': 'Recommended',
  'coach.noLegal': 'No legal move',
  'coach.evalShift': 'Eval shift',
  'coach.boardTitle': 'Position after move',
  'coach.boardHint': 'P = move played, R = engine recommendation (ghost).',
  'grade.perfect': 'Perfect',
  'grade.great': 'Great',
  'grade.good': 'Good',
  'grade.mistake': 'Inaccuracy',
  'grade.blunder': 'Blunder',

  // Auth
  'auth.close': 'Close',
  'auth.notConfigured': 'Accounts are not configured on this deployment.',
  'auth.shortPassword': 'Password must be at least 6 characters.',
  'auth.mismatch': 'Passwords do not match.',
  'auth.checkEmail': 'Account created. Check your email to confirm it.',
  'auth.signInTitle': 'Sign in',
  'auth.signUpTitle': 'Create account',
  'auth.body': 'Save your progress and match history, and appear on the global leaderboard.',
  'auth.signIn': 'Sign in',
  'auth.signUp': 'Sign up',
  'auth.password': 'Password',
  'auth.passwordPlaceholder': 'At least 6 characters',
  'auth.repeat': 'Repeat password',
  'auth.repeatPlaceholder': 'Password again',
  'auth.processing': 'Working…',

  // Profile
  'profile.kicker': 'Player profile',
  'profile.proActive': 'PRO active',
  'profile.free': 'Free plan',
  'profile.connected': 'Account connected',
  'profile.guestMode': 'Guest mode',
  'profile.synced': '{email} · progress syncs to the cloud',
  'profile.guestBody': 'Create an account to join the global leaderboard and keep your progress.',
  'profile.signOut': 'Sign out',
  'profile.level': 'Level {n}',
  'profile.toNext': '{cp} CP to next level',
  'profile.levelUp': 'New level reached',
  'profile.settings': 'Settings',
  'profile.nickname': 'Nickname',
  'profile.nicknamePlaceholder': 'Enter a nickname',
  'profile.city': 'Leaderboard city',
  'profile.avatar': 'Avatar',
  'profile.stats': 'Stats',
  'profile.matches': 'Games',
  'profile.wins': 'Wins',
  'profile.losses': 'Losses',
  'profile.winRate': 'Win rate',
  'profile.history': 'Match history',
  'profile.lastN': 'Last {n}',
  'profile.empty': 'Nothing yet',
  'profile.emptyBody': 'Play a game against the AI or a friend and it will show up here.',
  'profile.win': 'Win',
  'profile.loss': 'Loss',
  'profile.draw': 'Draw',
  'profile.modeLocal': 'Local game',
  'profile.modeOnline': 'Online',
  'profile.save': 'Save profile',

  // Shop
  'shop.title': 'Skin shop',
  'shop.subtitle': 'Unlock boards and tokens with CyberPoints',
  'shop.balance': 'Balance',
  'shop.active': 'Active',
  'shop.equip': 'Equip',
  'shop.proUnlock': 'PRO',
  'shop.notEnough': 'Not enough CyberPoints. Win games against the AI or online to earn more.',

  // Pro
  'pro.welcome': 'Welcome to PRO!',
  'pro.granted': 'All features unlocked',
  'pro.perkSkins': 'Every skin in the shop',
  'pro.perkCoach': 'Deeper AI Coach analysis',
  'pro.perkCrown': 'Gold crown on the leaderboard',
  'pro.continue': 'Back to the game',
  'pro.subtitle': 'Get the most out of NeuraFour',
  'pro.skinsTitle': 'All premium skins',
  'pro.skinsBody': 'Space Obsidian, Royal Gold and Retro Arcade without spending CP.',
  'pro.coachTitle': 'Deeper AI Coach',
  'pro.coachBody': 'Game analysis searches 6 moves ahead instead of 4.',
  'pro.crownTitle': 'Leaderboard crown',
  'pro.crownBody': 'Stand out with a gold frame and crown in the rankings.',
  'pro.demoTitle': 'Demo mode',
  'pro.demoBody': 'This is a portfolio project, so PRO is free. No payment is taken.',
  'pro.activate': 'Activate PRO for free',
  'pro.activating': 'Activating…',

  // Leaderboard
  'lb.title': 'Leaderboard',
  'lb.subtitle': 'Top players around the world',
  'lb.loading': 'Loading the live leaderboard…',
  'lb.live': 'Live leaderboard from the database.',
  'lb.offline': 'Offline mode: only your local profile is shown.',
  'lb.search': 'Search players…',
  'lb.global': '🌍 Global',
  'lb.yourScore': 'Your score',
  'lb.none': 'No players found.',

  // Footer
  'footer.text': 'NeuraFour · Built with React, TypeScript and a minimax AI',
  'footer.source': 'Source on GitHub',
};

export type TranslationKey = keyof typeof en;

const ru: Record<TranslationKey, string> = {
  'nav.play': 'Игра',
  'nav.leaderboard': 'Рейтинг',
  'nav.shop': 'Магазин',
  'header.tagline': 'Арена стратегии с ИИ',
  'header.openGame': 'Открыть игру',
  'header.upgrade': 'PRO',
  'header.mute': 'Выключить звук',
  'header.unmute': 'Включить звук',
  'header.lightTheme': 'Светлая тема',
  'header.darkTheme': 'Тёмная тема',
  'header.signIn': 'Войти',
  'header.signInTitle': 'Войти или создать аккаунт',
  'header.guest': 'Гостевой профиль',
  'header.language': 'Сменить язык',

  'mode.ai': 'Против ИИ',
  'mode.local': 'Вдвоём',
  'mode.online': 'Онлайн 1v1',

  'status.label': 'Статус партии',
  'status.yourTurn': 'Ваш ход',
  'status.aiThinking': 'ИИ думает',
  'status.redTurn': 'Ход красных',
  'status.blueTurn': 'Ход синих',
  'status.opponentTurn': 'Ход соперника',
  'status.youWin': 'Вы победили!',
  'status.aiWins': 'Победил ИИ',
  'status.redWins': 'Победили красные!',
  'status.blueWins': 'Победили синие!',
  'status.opponentWins': 'Победил соперник',
  'status.draw': 'Ничья',

  'player.you': 'Вы',
  'player.ai': 'ИИ',
  'player.red': 'Красные',
  'player.blue': 'Синие',
  'player.opponent': 'Соперник',
  'player.localOpponent': 'Второй игрок',

  'controls.hint': 'Подсказка',
  'controls.hintCost': 'Подсказка · 15 CP',
  'controls.hintTitlePro': 'Бесплатная подсказка ИИ (PRO)',
  'controls.hintTitle': 'Подсказка ИИ, стоит 15 CP',
  'controls.notEnoughHint': 'Недостаточно CyberPoints. Подсказка стоит 15 CP, или перейдите на PRO.',
  'controls.undo': 'Отменить',
  'controls.undoTitle': 'Отменить последний ход',
  'controls.restart': 'Новая игра',
  'controls.keyboard': 'Клавиши 1–7 или ← → и Enter · U — отмена хода',

  'settings.difficulty': 'Сложность ИИ',
  'settings.easy': 'Легко',
  'settings.medium': 'Средне',
  'settings.hard': 'Сложно',
  'settings.expert': 'Эксперт',
  'settings.firstMove': 'Первый ход',
  'settings.youFirst': 'Вы',
  'settings.aiFirst': 'ИИ',

  'moves.title': 'Ходы',
  'moves.empty': 'Ходов пока нет. Бросьте фишку, чтобы начать.',
  'moves.column': 'Колонка {col}',

  'coachPrompt.title': 'Разбор с ИИ-коучем',
  'coachPrompt.body': 'Оценка каждого хода: где вы упустили победу или защиту и как сыграл бы движок.',
  'coachPrompt.button': 'Открыть разбор',
  'coachPrompt.analyzing': 'Анализ…',

  'mp.opponentRestart': 'Соперник предлагает реванш',
  'mp.acceptRestart': 'Принять реванш',
  'mp.restartSent': 'Запрос на реванш отправлен сопернику.',
  'mp.serverError': 'Не удалось подключиться к серверу мультиплеера. Попробуйте чуть позже.',

  'lobby.title': 'Сетевая дуэль',
  'lobby.subtitle': 'Играйте с другом в реальном времени. Создайте комнату или войдите по коду.',
  'lobby.connecting': 'Подключение…',
  'lobby.hostTitle': 'Создать игру',
  'lobby.hostBody': 'Получите ссылку на комнату и отправьте её другу.',
  'lobby.hostButton': 'Создать комнату',
  'lobby.joinTitle': 'Войти в игру',
  'lobby.roomCode': 'Код комнаты',
  'lobby.joinButton': 'Подключиться',
  'lobby.serverNote': 'Для онлайн-игры нужен сервер мультиплеера. Локально: `npm run server` (порт 5001).',
  'lobby.leave': 'Выйти',
  'lobby.room': 'Комната',
  'lobby.copied': 'Ссылка скопирована',
  'lobby.copy': 'Скопировать ссылку',
  'lobby.players': 'Игроки',
  'lobby.host': 'Хозяин · Красные',
  'lobby.guest': 'Гость · Синие',
  'lobby.waiting': 'Ожидание соперника…',
  'lobby.chat': 'Чат',
  'lobby.chatEmpty': 'Сообщений пока нет. Поздоровайтесь!',
  'lobby.chatPlaceholder': 'Напишите сообщение…',
  'lobby.send': 'Отправить сообщение',

  'coach.unavailable': 'Анализ недоступен',
  'coach.unavailableBody': 'Сделайте хотя бы один ход, чтобы открыть разбор.',
  'coach.backToGame': 'Вернуться к игре',
  'coach.game': 'Игра',
  'coach.kicker': 'ИИ-коуч',
  'coach.title': 'Разбор партии',
  'coach.subtitle': 'Решения по ходам, упущенные угрозы и лучшие варианты.',
  'coach.deeper': 'Глубже анализ',
  'coach.sharp': 'Острая партия',
  'coach.solid': 'Уверенная партия',
  'coach.training': 'Тренировочная партия',
  'coach.analyzed': 'Проанализировано ходов: {count}',
  'coach.proTitle': 'PRO-разбор',
  'coach.proBody': 'Более глубокий поиск и все скины.',
  'coach.upgrade': 'Перейти на PRO',
  'coach.prev': 'Предыдущий ход',
  'coach.next': 'Следующий ход',
  'coach.move': 'Ход {n}',
  'coach.played': 'Сыграно',
  'coach.recommended': 'Рекомендовано',
  'coach.noLegal': 'Нет хода',
  'coach.evalShift': 'Изменение оценки',
  'coach.boardTitle': 'Позиция после хода',
  'coach.boardHint': 'P — сыгранный ход, R — рекомендация движка (полупрозрачная).',
  'grade.perfect': 'Идеально',
  'grade.great': 'Отлично',
  'grade.good': 'Хорошо',
  'grade.mistake': 'Неточность',
  'grade.blunder': 'Грубая ошибка',

  'auth.close': 'Закрыть',
  'auth.notConfigured': 'Аккаунты не настроены в этой сборке.',
  'auth.shortPassword': 'Пароль должен содержать минимум 6 символов.',
  'auth.mismatch': 'Пароли не совпадают.',
  'auth.checkEmail': 'Аккаунт создан. Подтвердите его по ссылке из письма.',
  'auth.signInTitle': 'Вход в аккаунт',
  'auth.signUpTitle': 'Создать аккаунт',
  'auth.body': 'Сохраняйте прогресс и историю матчей и участвуйте в глобальном рейтинге.',
  'auth.signIn': 'Войти',
  'auth.signUp': 'Регистрация',
  'auth.password': 'Пароль',
  'auth.passwordPlaceholder': 'Минимум 6 символов',
  'auth.repeat': 'Повторите пароль',
  'auth.repeatPlaceholder': 'Ещё раз пароль',
  'auth.processing': 'Обработка…',

  'profile.kicker': 'Профиль игрока',
  'profile.proActive': 'PRO активен',
  'profile.free': 'Бесплатный план',
  'profile.connected': 'Аккаунт подключён',
  'profile.guestMode': 'Гостевой режим',
  'profile.synced': '{email} · прогресс синхронизируется с облаком',
  'profile.guestBody': 'Создайте аккаунт, чтобы попасть в глобальный рейтинг и сохранить прогресс.',
  'profile.signOut': 'Выйти',
  'profile.level': 'Уровень {n}',
  'profile.toNext': '{cp} CP до следующего уровня',
  'profile.levelUp': 'Новый уровень достигнут',
  'profile.settings': 'Настройки',
  'profile.nickname': 'Никнейм',
  'profile.nicknamePlaceholder': 'Введите никнейм',
  'profile.city': 'Город для рейтинга',
  'profile.avatar': 'Аватар',
  'profile.stats': 'Статистика',
  'profile.matches': 'Матчи',
  'profile.wins': 'Победы',
  'profile.losses': 'Поражения',
  'profile.winRate': 'Винрейт',
  'profile.history': 'История матчей',
  'profile.lastN': 'Последние {n}',
  'profile.empty': 'Пока пусто',
  'profile.emptyBody': 'Сыграйте против ИИ или друга, и матч появится здесь.',
  'profile.win': 'Победа',
  'profile.loss': 'Поражение',
  'profile.draw': 'Ничья',
  'profile.modeLocal': 'Локальная игра',
  'profile.modeOnline': 'Онлайн',
  'profile.save': 'Сохранить профиль',

  'shop.title': 'Магазин скинов',
  'shop.subtitle': 'Открывайте доски и фишки за CyberPoints',
  'shop.balance': 'Баланс',
  'shop.active': 'Активен',
  'shop.equip': 'Выбрать',
  'shop.proUnlock': 'PRO',
  'shop.notEnough': 'Недостаточно CyberPoints. Побеждайте ИИ или соперников онлайн, чтобы заработать больше.',

  'pro.welcome': 'Добро пожаловать в PRO!',
  'pro.granted': 'Все функции открыты',
  'pro.perkSkins': 'Все скины в магазине',
  'pro.perkCoach': 'Более глубокий анализ ИИ-коуча',
  'pro.perkCrown': 'Золотая корона в рейтинге',
  'pro.continue': 'Вернуться к игре',
  'pro.subtitle': 'Получите максимум от NeuraFour',
  'pro.skinsTitle': 'Все премиум-скины',
  'pro.skinsBody': 'Космический обсидиан, Королевское золото и Ретро-аркада без трат CP.',
  'pro.coachTitle': 'Глубокий ИИ-коуч',
  'pro.coachBody': 'Анализ партии просчитывает 6 ходов вперёд вместо 4.',
  'pro.crownTitle': 'Корона в рейтинге',
  'pro.crownBody': 'Выделяйтесь золотой рамкой и короной в таблице лидеров.',
  'pro.demoTitle': 'Демо-режим',
  'pro.demoBody': 'Это портфолио-проект, поэтому PRO бесплатен. Оплата не взимается.',
  'pro.activate': 'Активировать PRO бесплатно',
  'pro.activating': 'Активация…',

  'lb.title': 'Таблица лидеров',
  'lb.subtitle': 'Лучшие игроки со всего мира',
  'lb.loading': 'Загрузка рейтинга…',
  'lb.live': 'Рейтинг загружен из базы данных.',
  'lb.offline': 'Офлайн-режим: показан только ваш локальный профиль.',
  'lb.search': 'Поиск игроков…',
  'lb.global': '🌍 Весь мир',
  'lb.yourScore': 'Ваши очки',
  'lb.none': 'Игроки не найдены.',

  'footer.text': 'NeuraFour · React, TypeScript и ИИ на минимаксе',
  'footer.source': 'Исходный код на GitHub',
};

const dictionaries: Record<Lang, Record<TranslationKey, string>> = { en, ru };

export type TFunction = (key: TranslationKey, vars?: Record<string, string | number>) => string;

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TFunction;
}

const I18nContext = createContext<I18nValue | null>(null);

const detectLang = (): Lang => {
  try {
    const stored = localStorage.getItem(STORAGE_LANG_KEY);
    if (stored === 'en' || stored === 'ru') return stored;
  } catch {
    // storage unavailable, fall through to browser language
  }
  return navigator.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
};

// eslint-disable-next-line react-refresh/only-export-components
export const translate = (lang: Lang, key: TranslationKey, vars?: Record<string, string | number>) => {
  let text = dictionaries[lang][key] ?? en[key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replace(`{${name}}`, String(value));
    }
  }
  return text;
};

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(detectLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_LANG_KEY, next);
    } catch {
      // ignore: language still changes for this visit
    }
  }, []);

  const value = useMemo<I18nValue>(() => ({
    lang,
    setLang,
    t: (key, vars) => translate(lang, key, vars),
  }), [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
};
