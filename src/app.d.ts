// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { User, Session } from '$lib/db/schema';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			requestId?: string;
			user: User | null;
			session: Session | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
