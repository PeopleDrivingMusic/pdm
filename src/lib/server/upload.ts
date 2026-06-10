import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';

const UPLOAD_DIR = 'static/uploads';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export interface UploadResult {
	success: boolean;
	path?: string; // Relative path for DB storage
	url?: string; // URL for serving the file
	error?: string;
}

/**
 * Ensure upload directories exist
 */
function ensureUploadDir(subDir?: string) {
	const dirPath = subDir ? path.join(UPLOAD_DIR, subDir) : UPLOAD_DIR;
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
	}
	return dirPath;
}

/**
 * Generate unique filename with original extension
 */
function generateFileName(originalName: string): string {
	const ext = path.extname(originalName);
	const id = nanoid(12);
	return `${id}${ext}`;
}

function getSafeExtension(originalName: string): string {
	return path.extname(originalName).toLowerCase();
}

/**
 * Validate file type
 */
function validateFileType(file: File, allowedTypes: string[]): boolean {
	return allowedTypes.some((type) => {
		if (type.endsWith('/*')) {
			const prefix = type.split('/')[0];
			return file.type.startsWith(prefix + '/');
		}
		return file.type === type;
	});
}

/**
 * Upload a file to the static directory
 */
export async function uploadFile(
	file: File | null | undefined,
	options: {
		subDir?: string;
		allowedTypes?: string[];
		maxSize?: number;
		fileName?: string;
	} = {}
): Promise<UploadResult> {
	if (!file) {
		return { success: false, error: 'No file provided' };
	}

	const { subDir = '', allowedTypes = [], maxSize = MAX_FILE_SIZE, fileName } = options;

	// Validate file size
	if (file.size > maxSize) {
		return {
			success: false,
			error: `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`
		};
	}

	// Validate file type
	if (allowedTypes.length > 0 && !validateFileType(file, allowedTypes)) {
		return {
			success: false,
			error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
		};
	}

	try {
		// Ensure directory exists
		const uploadDir = ensureUploadDir(subDir);

		// Generate unique filename
		const resolvedFileName = fileName ?? generateFileName(file.name);
		const filePath = path.join(uploadDir, resolvedFileName);

		// Write file to disk
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		fs.writeFileSync(filePath, buffer);

		// Generate relative path for DB
		const relativePath = subDir ? `${subDir}/${resolvedFileName}` : resolvedFileName;
		const url = `/uploads/${relativePath}`;

		return {
			success: true,
			path: relativePath,
			url
		};
	} catch (error) {
		console.error('Error uploading file:', error);
		return {
			success: false,
			error: 'Failed to upload file'
		};
	}
}

/**
 * Delete a file from the static directory
 */
export function deleteFile(relativePath: string): boolean {
	try {
		const filePath = path.join(UPLOAD_DIR, relativePath);
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
			return true;
		}
		return false;
	} catch (error) {
		console.error('Error deleting file:', error);
		return false;
	}
}

/**
 * Upload an image file (convenience function)
 */
export async function uploadImage(
	file: File | null | undefined,
	subDir = 'images',
	fileName?: string
) {
	return uploadFile(file, {
		subDir,
		allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
		maxSize: 5 * 1024 * 1024, // 5MB
		fileName
	});
}

/**
 * Upload an audio file (convenience function)
 */
export async function uploadAudio(
	file: File | null | undefined,
	subDir = 'audio',
	fileName?: string
) {
	return uploadFile(file, {
		subDir,
		allowedTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave'],
		maxSize: 50 * 1024 * 1024, // 50MB
		fileName
	});
}

export function buildSourceAudioFileName(file: File) {
	return `source${getSafeExtension(file.name)}`;
}

export function buildCoverFileName(id: string, file: File) {
	return `${id}${getSafeExtension(file.name)}`;
}
