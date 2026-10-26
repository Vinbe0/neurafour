export type PlayerType = 'red' | 'yellow';

export type CellType = PlayerType | null;

export type BoardType = CellType[][]; // 6 rows, 7 columns: BoardType[row][col]

export type GameMode = 'local' | 'ai' | 'multiplayer';

// One move of an online game, as the server records it
export interface RoomMove {
  column: number;
  player: PlayerType;
}

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type GameStatus = 'lobby' | 'playing' | 'draw' | 'win' | 'analysis';

export type MoveGrade = 'blunder' | 'mistake' | 'good' | 'great' | 'perfect';

export interface MoveAnalysis {
  turn: number;
  player: PlayerType;
  column: number;
  evalBefore: number;
  evalAfter: number;
  grade: MoveGrade;
  commentary: { en: string; ru: string };
  recommendedColumn: number;
  boardStateBefore: BoardType;
  boardStateAfter: BoardType;
}

export interface UserStats {
  wins: number;
  losses: number;
  draws: number;
}

export interface UserProfile {
  username: string;
  city: string;
  avatar: string;
  points: number;
  isPro: boolean;
  unlockedSkins: string[];
  activeSkin: string;
  stats: UserStats;
}

export interface MatchHistoryItem {
  id: string;
  date: string;
  opponent: string;
  mode: GameMode;
  difficulty?: AIDifficulty;
  result: 'win' | 'loss' | 'draw';
  pointsEarned: number;
}

export interface ChatMessage {
  id: string;
  username: string;
  avatar: string;
  text: string;
  time: string;
}

export interface LeaderboardItem {
  username: string;
  city: string;
  avatar: string;
  points: number;
  isPro: boolean;
}

export interface SkinItem {
  id: string;
  name: string;
  nameRu: string;
  price: number;
  boardClass: string;
  redColor: string;
  yellowColor: string;
  redGlow: string;
  yellowGlow: string;
  description: string;
  descriptionRu: string;
}
