import { defineConfig } from '@playwright/test';
import { TEST_DATABASE_URL } from './e2e/test-db.mjs';

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		// The app-under-test talks to the ephemeral e2e database, never the dev DB.
		// Playwright merges this over process.env, so only the override is needed
		// (dotenv in the app won't clobber an already-set DATABASE_URL).
		env: { DATABASE_URL: TEST_DATABASE_URL }
	},
	globalTeardown: './e2e/global-teardown.ts',
	testDir: 'e2e'
});
