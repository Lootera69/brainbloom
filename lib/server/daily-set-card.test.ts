import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DailySetCard } from '@/features/home/components/DailySetCard';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/store/user-store', () => ({ useUserStore: (selector: (state: object) => unknown) => selector({
  tier: 'free', subscriptionExpiry: null, dailyPuzzleStreak: 0, dailySetDate: null, dailySetCompletedIds: [],
}) }));
vi.mock('@/store/ui-store', () => ({ useUIStore: (selector: (state: object) => unknown) => selector({ setShowShop: vi.fn() }) }));

beforeEach(() => vi.stubGlobal('React', React));
afterEach(() => vi.unstubAllGlobals());

const render = (props: Partial<React.ComponentProps<typeof DailySetCard>> = {}) => renderToStaticMarkup(
  React.createElement(DailySetCard, { set: [], categories: [], onCategoriesChange: () => {}, ...props }),
);

it('distinguishes a failed request from a successfully loaded empty Daily Set', () => {
  const failed = render({ error: 'Reconnect and retry.', onRetry: () => {} });
  expect(failed).toContain('role="alert"');
  expect(failed).toContain('load your Daily Set');
  expect(failed).toContain('Retry Daily Set');
  expect(failed).not.toContain('No daily set yet');
  expect(failed).not.toContain('A fresh set of puzzles will appear here soon.');
  expect(failed).not.toContain('0/0');
  const empty = render();
  expect(empty).toContain('No daily set yet');
  expect(empty).not.toContain('role="alert"');
});

it('keeps the loading placeholder while a saved login and its puzzles are being restored', () => {
  const loading = render({ loading: true });
  expect(loading).toContain('animate-pulse');
  expect(loading).not.toContain('No daily set yet');
  expect(loading).not.toContain('0/0');
  expect(loading).not.toContain('Retry Daily Set');
});
