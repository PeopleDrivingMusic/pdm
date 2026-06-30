import { describe, it, expect } from 'vitest';
import {
	validateAudioUpload,
	validateImageUpload,
	MAX_AUDIO_SIZE,
	MAX_IMAGE_SIZE
} from './validation';

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
