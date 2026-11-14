import { defineConfig, devices } from '@playwright/test';

const PORT = 4318;

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: true,
	retries: process.env.CI ? 1 : 0,
	use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
	webServer: {
		command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
		port: PORT,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	},
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		{ name: 'mobile', use: { ...devices['Pixel 7'] } }
	]
});
