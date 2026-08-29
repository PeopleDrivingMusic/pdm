import { describe, it, expect } from 'vitest';
import { artists } from './artist';
import { tracks } from './catalog';
import { subscriptions } from './finance';

describe('external-origin columns', () => {
	it('lets an artist exist with no PDM user', () => {
		expect(artists.userId.notNull).toBe(false);
	});

	it('defaults every pre-existing artist to native origin', () => {
		expect(artists.origin.notNull).toBe(true);
		expect(artists.origin.default).toBe('native');
	});

	it('carries the source identity and the attribution link', () => {
		expect(artists.externalId.name).toBe('external_id');
		expect(artists.externalUrl.name).toBe('external_url');
	});

	it('leaves claimedAt nullable so null means unclaimed', () => {
		expect(artists.claimedAt.notNull).toBe(false);
	});

	it('defaults every pre-existing track to r2 audio', () => {
		expect(tracks.audioSource.notNull).toBe(true);
		expect(tracks.audioSource.default).toBe('r2');
	});

	it('keeps the track source id for idempotent re-import', () => {
		expect(tracks.externalId.name).toBe('external_id');
	});

	it('defaults every pre-existing subscription to paid', () => {
		expect(subscriptions.kind.notNull).toBe(true);
		expect(subscriptions.kind.default).toBe('paid');
	});
});
