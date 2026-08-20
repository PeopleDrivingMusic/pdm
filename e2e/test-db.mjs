import { config } from 'dotenv';

// Shared config for the ephemeral e2e database. Derives everything from
// DIRECT_DATABASE_URL (.env), not DATABASE_URL — CREATE/DROP DATABASE and
// drizzle-kit migrate both need a session-capable connection, same reasoning as
// drizzle.config.ts. Nothing is hardcoded.
config();

const base = process.env.DIRECT_DATABASE_URL;
if (!base) throw new Error('DIRECT_DATABASE_URL is required to derive the e2e test database');

export const TEST_DB_NAME = 'pdm_e2e';

function withDatabase(name) {
	const next = new URL(base);
	next.pathname = `/${name}`;
	return next.toString();
}

/** Connection URL for the throwaway test database. */
export const TEST_DATABASE_URL = withDatabase(TEST_DB_NAME);
/** Connection URL to the maintenance DB, used to CREATE/DROP the test database. */
export const ADMIN_DATABASE_URL = withDatabase('postgres');
