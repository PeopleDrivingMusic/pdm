import { env } from '$env/dynamic/private';
import { Google } from 'arctic';
import { dev } from '$app/environment';

export const google = new Google(
	env.GOOGLE_CLIENT_ID ?? '',
	env.GOOGLE_CLIENT_SECRET ?? '',
	dev
		? 'http://localhost:5173/login/google/callback'
		: 'https://your-production-domain.com/login/google/callback' // TODO:update for production
);
