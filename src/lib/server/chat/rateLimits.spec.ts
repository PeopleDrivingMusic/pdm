import { describe, it, expect, beforeEach } from 'vitest';
import { chatRoomWriteLimiter, chatGlobalWriteLimiter, chatWriteKey } from './rateLimits';

beforeEach(() => {
	chatRoomWriteLimiter.reset();
	chatGlobalWriteLimiter.reset();
});

describe('chatRoomWriteLimiter', () => {
	it('meters one user per room, not one user overall', () => {
		for (let i = 0; i < 10; i++) {
			expect(chatRoomWriteLimiter.check(chatWriteKey('u1', 'room-a'))).toBe(true);
		}
		expect(chatRoomWriteLimiter.check(chatWriteKey('u1', 'room-a'))).toBe(false);
		// A different room is a different bucket — an artist's own fans must not be
		// throttled by what someone said in an unrelated room.
		expect(chatRoomWriteLimiter.check(chatWriteKey('u1', 'room-b'))).toBe(true);
	});

	it('keys one user apart from another in the same room', () => {
		for (let i = 0; i < 10; i++) chatRoomWriteLimiter.check(chatWriteKey('u1', 'room-a'));
		expect(chatRoomWriteLimiter.check(chatWriteKey('u2', 'room-a'))).toBe(true);
	});
});

describe('chatGlobalWriteLimiter', () => {
	it('caps a user across every room combined', () => {
		// Without this, the per-room allowance multiplies by the number of seeded rooms:
		// hundreds of pages times 10 messages a minute each, from one account.
		let allowed = 0;
		for (let room = 0; room < 20; room++) {
			for (let i = 0; i < 10; i++) {
				if (chatGlobalWriteLimiter.check('u1')) allowed++;
			}
		}
		expect(allowed).toBe(30);
	});

	it('meters each user separately', () => {
		for (let i = 0; i < 30; i++) chatGlobalWriteLimiter.check('u1');
		expect(chatGlobalWriteLimiter.check('u2')).toBe(true);
	});
});
