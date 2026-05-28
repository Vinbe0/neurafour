# NeuraFour

NeuraFour — современная веб-платформа для игры в «Четыре в ряд», сделанная не как простая учебная сетка, а как прототип игрового сервиса с удержанием, прогрессом и обучением.

## Коротко о продукте

Я сделал интерактивную платформу для быстрых дуэлей в Connect Four: игрок может играть локально, против ИИ или с другом через WebSocket-комнату. После партии доступен AI Coach, который разбирает ходы, показывает ошибки, рекомендуемые колонки и помогает понять, где была упущена победа или защита.

Продукт рассчитан на людей, которым нужна не просто разовая браузерная игра, а понятный и приятный способ тренировать стратегическое мышление: школьников, начинающих игроков, друзей для коротких онлайн-матчей и пользователей, которым интересен соревновательный прогресс.

Ценность сервиса в том, что он соединяет игру, обучение и мотивацию возвращаться: профиль игрока, история матчей, очки CyberPoints, магазин скинов, лидерборд по городам, подсказки, анализ партии и PRO-модель создают основу для полноценного игрового продукта.

## Что реализовано

- Полные правила Connect Four: падение фишек по колонке, очередность ходов, запрет хода в заполненную колонку, победа по горизонтали, вертикали и диагонали.
- Режимы игры: против ИИ, локальная игра на одном экране, мультиплеер с другом по коду комнаты.
- ИИ с тремя сложностями: easy, medium, hard на основе minimax и alpha-beta pruning.
- AI Coach после партии: оценка ходов, поиск грубых ошибок, сравнение сыгранной и рекомендованной колонки.
- Профиль игрока: никнейм, город, аватар, статистика, история матчей, уровень и прогресс.
- Лидерборд: глобальный и по городам, включая текущего пользователя.
- Магазин скинов и CyberPoints как игровой цикл прогресса.
- PRO-модаль как прототип монетизации.
- Темная и светлая темы, адаптивная верстка, звуки и визуальная подсветка победной линии.

## Технологии

- React
- TypeScript
- Vite
- Express
- WebSocket (`ws`)
- Supabase для глобального рейтинга и истории матчей
- LocalStorage как офлайн-кэш профиля, истории и прогресса

## Запуск

```bash
npm install
npm run dev
```

Клиент запускается через Vite, WebSocket-сервер используется для мультиплеера.

Если порт сервера занят, остановите процесс на `5001` или запустите сервер на другом порту через переменную окружения `PORT`.

## Деплой на GitHub Pages

Это Vite/React-приложение нельзя публиковать через GitHub Pages как `main / root`: в таком режиме GitHub отдает исходный `index.html`, где подключается `/src/main.tsx`, а браузер не умеет запускать TypeScript напрямую. Поэтому появляется белый экран.

Правильный вариант уже добавлен в проект: GitHub Actions workflow `.github/workflows/deploy.yml`.

Настройка в GitHub:

1. Откройте репозиторий на GitHub.
2. Перейдите в `Settings → Pages`.
3. В `Build and deployment` выберите `Source: GitHub Actions`.
4. Сделайте push в ветку `main`.
5. Дождитесь завершения workflow `Deploy to GitHub Pages`.

После этого GitHub Pages будет публиковать собранную папку `dist`, а не исходники из root.

Важно: GitHub Pages размещает только статический фронтенд. Локальный WebSocket-сервер из `server/server.js` на Pages работать не будет. Для онлайн-мультиплеера нужен отдельный backend-хостинг, например Render, Railway, Fly.io или VPS.

## Supabase

В проект добавлен клиент Supabase. Переменные окружения лежат в `.env.local`:

```env
VITE_SUPABASE_URL=https://blbwyltfaavrtodudprg.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_vP8Q4hBpKD0HySSs-O6YFw_iqhMKcgp
```

Чтобы глобальный рейтинг стал реальным, создайте таблицы в Supabase SQL Editor:

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  city text not null,
  avatar text not null,
  points integer not null default 0,
  is_pro boolean not null default false,
  wins integer not null default 0,
  losses integer not null default 0,
  draws integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.matches (
  id text primary key,
  player_id uuid not null references public.profiles(id) on delete cascade,
  username text not null,
  opponent text not null,
  mode text not null,
  difficulty text,
  result text not null,
  points_earned integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.matches enable row level security;

create policy "Public leaderboard read"
on public.profiles for select
using (true);

create policy "Users create own profile"
on public.profiles for insert
with check (auth.uid() = id);

create policy "Users update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users insert own matches"
on public.matches for insert
with check (auth.uid() = player_id);

create policy "Users read own matches"
on public.matches for select
using (auth.uid() = player_id);
```

После этого зарегистрированный пользователь будет синхронизироваться в `profiles`, матчи будут сохраняться в `matches`, а таблица лидеров будет читать реальные данные из Supabase.

Для удобного тестирования можно в Supabase отключить обязательное подтверждение email: Authentication → Providers → Email → Confirm email. Если подтверждение включено, после регистрации нужно подтвердить письмо перед входом.

## Почему это выделяется

Обычные реализации Connect Four заканчиваются на поле 7x6. Здесь игра упакована как сервис: есть прогресс, разбор ошибок, социальный слой, кастомизация и идея монетизации. Это показывает не только реализацию правил, но и продуктовый подход: пользователь должен понимать, зачем возвращаться после первой партии.
