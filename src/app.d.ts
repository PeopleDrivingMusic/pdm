// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { User, Session } from '$lib/db/schema';

type SafeUser = Omit<User, 'hashedPassword'>;

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			requestId?: string;
			user: SafeUser | null;
			session: Session | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
