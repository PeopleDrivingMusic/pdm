import postgres from 'postgres';
import { ADMIN_DATABASE_URL, TEST_DB_NAME } from './test-db.mjs';

// Drops the ephemeral e2e database after the whole run, so nothing persists.
export default async function globalTeardown() {
	const admin = postgres(ADMIN_DATABASE_URL, { max: 1 });
	try {
		await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB_NAME} WITH (FORCE)`);
	} finally {
		await admin.end();
	}
}
