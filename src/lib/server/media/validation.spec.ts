import { describe, it, expect } from 'vitest';
import {
	validateAudioUpload,
	validateImageUpload,
	assertPartCount,
	MAX_AUDIO_SIZE,
	MAX_IMAGE_SIZE,
	MAX_MULTIPART_PARTS
} from './validation';

// Local literal mirrors R2_MULTIPART_PART_SIZE; importing R2Service would pull
// $env/static/private + the S3 client into a pure unit test.
const PART_SIZE = 8 * 1024 * 1024;

describe('validateAudioUpload', () => {
	it('accepts a valid mp3 within size', () => {
		expect(validateAudioUpload({ contentType: 'audio/mpeg', size: 1024 })).toEqual({ ok: true });
	});
	it('rejects a non-audio content type', () => {
		const result = validateAudioUpload({ contentType: 'application/pdf', size: 1024 });
		expect(result.ok).toBe(false);
	});
	it('rejects audio over the max size', () => {
		const result = validateAudioUpload({ contentType: 'audio/mpeg', size: MAX_AUDIO_SIZE + 1 });
		expect(result.ok).toBe(false);
	});
	it('rejects zero / non-finite size', () => {
		expect(validateAudioUpload({ contentType: 'audio/mpeg', size: 0 }).ok).toBe(false);
		expect(validateAudioUpload({ contentType: 'audio/mpeg', size: NaN }).ok).toBe(false);
	});
});

describe('validateImageUpload', () => {
	it('accepts a valid jpeg within size', () => {
		expect(validateImageUpload({ contentType: 'image/jpeg', size: 1024 })).toEqual({ ok: true });
	});
	it('rejects an unsupported image format', () => {
		expect(validateImageUpload({ contentType: 'image/gif', size: 1024 }).ok).toBe(false);
	});
	it('rejects image over the max size', () => {
		expect(validateImageUpload({ contentType: 'image/png', size: MAX_IMAGE_SIZE + 1 }).ok).toBe(
			false
		);
	});
});

describe('assertPartCount', () => {
	it('passes for a normal file', () => {
		expect(() => assertPartCount(50 * 1024 * 1024, PART_SIZE)).not.toThrow();
	});
	it('throws when part count exceeds the cap', () => {
		const oversize = (MAX_MULTIPART_PARTS + 1) * PART_SIZE;
		expect(() => assertPartCount(oversize, PART_SIZE)).toThrow('maximum part count');
	});
});
