import { describe, it, expect, vi } from 'vitest';
import { presence } from './presence';

describe('presence', () => {
	it('reports zero online for a room nobody has joined', () => {
		expect(presence.snapshot('empty-room')).toEqual({ onlineCount: 0, artistOnline: false });
	});

	it('counts joins and reflects leaves', () => {
		const leave1 = presence.join(
			'room-1',
			{ connectionId: 'c1', userId: 'u1', isArtist: false },
			() => {}
		);
		const leave2 = presence.join(
			'room-1',
			{ connectionId: 'c2', userId: 'u2', isArtist: false },
			() => {}
		);

		expect(presence.snapshot('room-1')).toEqual({ onlineCount: 2, artistOnline: false });

		leave1();
		expect(presence.snapshot('room-1')).toEqual({ onlineCount: 1, artistOnline: false });

		leave2();
		expect(presence.snapshot('room-1')).toEqual({ onlineCount: 0, artistOnline: false });
	});

	it('flags artistOnline when the artist-owner connection is present', () => {
		const leaveArtist = presence.join(
			'room-2',
			{ connectionId: 'c1', userId: 'owner1', isArtist: true },
			() => {}
		);
		expect(presence.snapshot('room-2').artistOnline).toBe(true);

		leaveArtist();
		expect(presence.snapshot('room-2').artistOnline).toBe(false);
	});

	it('notifies other room members when someone joins or leaves', () => {
		const onChange1 = vi.fn();
		presence.join('room-3', { connectionId: 'c1', userId: 'u1', isArtist: false }, onChange1);

		const leave2 = presence.join(
			'room-3',
			{ connectionId: 'c2', userId: 'u2', isArtist: false },
			() => {}
		);
		expect(onChange1).toHaveBeenCalledWith({ onlineCount: 2, artistOnline: false });

		onChange1.mockClear();
		leave2();
		expect(onChange1).toHaveBeenCalledWith({ onlineCount: 1, artistOnline: false });
	});

	it('does not notify a member after they themselves have left', () => {
		const onChange1 = vi.fn();
		const leave1 = presence.join(
			'room-4',
			{ connectionId: 'c1', userId: 'u1', isArtist: false },
			onChange1
		);
		leave1();
		onChange1.mockClear();

		presence.join('room-4', { connectionId: 'c2', userId: 'u2', isArtist: false }, () => {});
		expect(onChange1).not.toHaveBeenCalled();
	});

	it('keeps rooms independent', () => {
		presence.join('room-5a', { connectionId: 'c1', userId: 'u1', isArtist: false }, () => {});
		expect(presence.snapshot('room-5b')).toEqual({ onlineCount: 0, artistOnline: false });
	});
});
