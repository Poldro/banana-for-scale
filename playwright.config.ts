import { defineConfig, devices } from '@playwright/test';

const PORT = 4318;

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: true,
	retries: process.env.CI ? 1 : 0,
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: 'retain-on-failure'
	},
	webServer: {
		command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
		port: PORT,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	},
	projects: [
		// Headless Chromium has no GPU, so these run the photo fallback.
		{ name: 'desktop', testIgnore: /models/, use: { ...devices['Desktop Chrome'] } },
		{ name: 'mobile', testIgnore: /models/, use: { ...devices['Pixel 7'] } },
		{
			// Software WebGL is slow, so only the 3D tests use it.
			name: '3d',
			testMatch: /models/,
			use: {
				...devices['Desktop Chrome'],
				launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }
			}
		}
	]
});
