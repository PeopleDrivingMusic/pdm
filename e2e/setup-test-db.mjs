import { execFileSync } from 'node:child_process';
import postgres from 'postgres';
import {
	ADMIN_DATABASE_URL,
	DB_USER,
	DEV_DB_NAME,
	POSTGRES_CONTAINER,
	TEST_DB_NAME
} from './test-db.mjs';

// Spins up the ephemeral e2e database right before the Playwright run:
//   1. DROP + CREATE a fresh `pdm_e2e` (nothing lingers between runs)
//   2. clone the current dev schema into it via pg_dump -> psql (the dev DB is
//      the source of truth for the live schema; drizzle-kit's journal is out of
//      sync so we don't rely on migrate here)
// The database is dropped again in e2e/global-teardown.ts.

const admin = postgres(ADMIN_DATABASE_URL, { max: 1 });
try {
	await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB_NAME} WITH (FORCE)`);
	await admin.unsafe(`CREATE DATABASE ${TEST_DB_NAME}`);
} finally {
	await admin.end();
}

// docker args are passed as an array (no outer shell). The `sh -c` pipeline runs
// inside the container because pg_dump | psql needs a shell; the interpolated
// names come from local .env config, not user input.
const clonePipeline = `pg_dump -U ${DB_USER} -d ${DEV_DB_NAME} --schema-only --no-owner --no-privileges | psql -U ${DB_USER} -d ${TEST_DB_NAME} -q`;
execFileSync('docker', ['exec', POSTGRES_CONTAINER, 'sh', '-c', clonePipeline], {
	stdio: 'inherit'
});

console.log(`[e2e] test database ${TEST_DB_NAME} created and schema cloned`);
