/**
 * Turning a failed `fetch` into copy a user can act on. Endpoints answer with a
 * machine-readable `{ error: '<code>' }`; each feature owns its own code→copy map
 * and this module does the plumbing. Shared because every feature needs it —
 * comments today, fan chat and likes next.
 */

export const GENERIC_ERROR = 'Something went wrong. Please try again.';

/** Read the `{ error }` code off a failed JSON response, if there is one. */
export async function readErrorCode(response: Response): Promise<string | null> {
	try {
		const body = await response.json();
		return typeof body?.error === 'string' ? body.error : null;
	} catch {
		return null;
	}
}

/**
 * Resolve a code against a feature's copy map. Pass the map with `satisfies
 * Record<YourCodeUnion, string>` so a new code can't be forgotten.
 */
export function messageForCode(
	code: string | null,
	copy: Record<string, string>,
	fallback = GENERIC_ERROR
): string {
	return (code && copy[code]) || fallback;
}

/** Read a failed response and resolve it to user-facing copy in one step. */
export async function errorMessage(
	response: Response,
	copy: Record<string, string>,
	fallback = GENERIC_ERROR
): Promise<string> {
	return messageForCode(await readErrorCode(response), copy, fallback);
}
