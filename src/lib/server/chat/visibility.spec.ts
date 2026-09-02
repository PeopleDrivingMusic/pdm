import { describe, it, expect } from 'vitest';
import { canReadChatContent } from './visibility';

// One predicate, two call sites: the history endpoint (`ChatService.getMessages`) and the
// live stream (`chat.remote.ts`). They were separate booleans before S2a, which is exactly
// how a room ends up readable in one and masked in the other.
describe('canReadChatContent', () => {
	const base = { isSubscriber: false, isOwner: false, isSeeded: false };

	it('refuses a stranger on a native room', () => {
		expect(canReadChatContent(base)).toBe(false);
	});

	it('admits a subscriber', () => {
		expect(canReadChatContent({ ...base, isSubscriber: true })).toBe(true);
	});

	it('admits the artist who owns the room', () => {
		// An artist cannot subscribe to themselves.
		expect(canReadChatContent({ ...base, isOwner: true })).toBe(true);
	});

	it('admits anyone on a seeded room', () => {
		// Nobody owns a seeded page and nobody can subscribe to it for chat access yet,
		// so gating reads would leave the room permanently empty and invisible.
		expect(canReadChatContent({ ...base, isSeeded: true })).toBe(true);
	});
});
