import { describe, expect, it } from 'vitest';
import { DEFAULT_AVATAR, PICKABLE_AVATARS, normalizeAvatar } from './avatars';

describe('normalizeAvatar', () => {
  it('keeps icon names as they are', () => {
    for (const name of PICKABLE_AVATARS) expect(normalizeAvatar(name)).toBe(name);
  });

  it('maps the emoji older profiles stored to the matching icon', () => {
    expect(normalizeAvatar('🤖')).toBe('bot');
    expect(normalizeAvatar('🚀')).toBe('rocket');
    expect(normalizeAvatar('🛡️')).toBe('shield');
    expect(normalizeAvatar('👤')).toBe('user');
  });

  it('falls back to the default for anything unknown', () => {
    expect(normalizeAvatar('🍕')).toBe(DEFAULT_AVATAR);
    expect(normalizeAvatar('')).toBe(DEFAULT_AVATAR);
    expect(normalizeAvatar(undefined)).toBe(DEFAULT_AVATAR);
  });
});
