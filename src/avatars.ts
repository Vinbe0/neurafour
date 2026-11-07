import { Bot, Brain, Cpu, Crown, Dna, Ghost, Orbit, Rocket, Shield, Target, User, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Avatars are stored as icon names. Profiles saved before this change hold emoji,
// so those are mapped to the matching icon when read.

export const AVATAR_ICONS: Record<string, LucideIcon> = {
  bot: Bot,
  brain: Brain,
  zap: Zap,
  dna: Dna,
  ghost: Ghost,
  rocket: Rocket,
  orbit: Orbit,
  crown: Crown,
  shield: Shield,
  target: Target,
  user: User,
  cpu: Cpu,
};

// The ones a player can pick in their profile
export const PICKABLE_AVATARS = ['bot', 'brain', 'zap', 'dna', 'ghost', 'rocket', 'orbit', 'crown', 'shield', 'target'];

export const DEFAULT_AVATAR = 'bot';

const LEGACY_EMOJI: Record<string, string> = {
  '🤖': 'bot',
  '🧠': 'brain',
  '⚡': 'zap',
  '🧬': 'dna',
  '👾': 'ghost',
  '🚀': 'rocket',
  '🛸': 'orbit',
  '👑': 'crown',
  '🛡️': 'shield',
  '🛡': 'shield',
  '🎯': 'target',
  '👤': 'user',
};

// Any stored value (icon name, old emoji, or something unexpected) to a known icon name
export const normalizeAvatar = (value: string | null | undefined): string => {
  if (value && AVATAR_ICONS[value]) return value;
  if (value && LEGACY_EMOJI[value]) return LEGACY_EMOJI[value];
  return DEFAULT_AVATAR;
};
