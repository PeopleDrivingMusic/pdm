import { hash, verify } from "@node-rs/argon2";

/**
 * Hashes a password using Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
	return hash(password, {
		// RFC 9106 recommended parameters for interactive authentication
		memoryCost: 19456, // 19 MiB
		timeCost: 2, // 2 iterations
		outputLen: 32, // 32 bytes
		parallelism: 1, // 1 thread
	});
}

/**
 * Verifies a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return verify(hash, password);
}
