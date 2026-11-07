import { AVATAR_ICONS, normalizeAvatar } from '../avatars';

interface AvatarProps {
  value: string | null | undefined;
  size?: number;
}

// Renders just the icon; the surrounding element provides the circle and colours
export const Avatar = ({ value, size = 16 }: AvatarProps) => {
  const Icon = AVATAR_ICONS[normalizeAvatar(value)];
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
};
