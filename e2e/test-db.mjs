import { config } from 'dotenv';

// Shared config for the ephemeral e2e database. Derives everything from the dev
// DATABASE_URL (.env) by swapping the database name, so nothing is hardcoded.
config();

const base = process.env.DATABASE_URL;
if (!base) throw new Error('DATABASE_URL is required to derive the e2e test database');

const url = new URL(base);

export const DEV_DB_NAME = url.pathname.slice(1);
export const DB_USER = url.username;
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
/** Postgres container name, used to clone the schema via pg_dump. Overridable. */
export const POSTGRES_CONTAINER = process.env.E2E_PG_CONTAINER || 'pdm-postgres';
