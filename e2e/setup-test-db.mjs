import { execFileSync } from 'node:child_process';
import postgres from 'postgres';
import { ADMIN_DATABASE_URL, TEST_DATABASE_URL, TEST_DB_NAME } from './test-db.mjs';

// Spins up the ephemeral e2e database right before the Playwright run:
//   1. DROP + CREATE a fresh `pdm_e2e` (nothing lingers between runs)
//   2. apply the real migration history via drizzle-kit (trustworthy since the
//      journal drift fixed in PR #35 / issue #25 — no more docker exec pg_dump
//      into a named container, which doesn't exist once local dev runs on
//      `supabase start` instead of docker-compose Postgres)
// The database is dropped again in e2e/global-teardown.ts.

const admin = postgres(ADMIN_DATABASE_URL, { max: 1 });
try {
	await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB_NAME} WITH (FORCE)`);
	await admin.unsafe(`CREATE DATABASE ${TEST_DB_NAME}`);
} finally {
	await admin.end();
}

execFileSync('yarn', ['drizzle-kit', 'migrate'], {
	stdio: 'inherit',
	shell: true,
	env: { ...process.env, DIRECT_DATABASE_URL: TEST_DATABASE_URL }
});

console.log(`[e2e] test database ${TEST_DB_NAME} created and migrated`);
