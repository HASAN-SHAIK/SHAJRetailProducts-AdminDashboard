// @ts-check
/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
	useWorkerFixtures: true,
	timeout: 30_000,
	expect: {
		timeout: 5_000
	},
	testDir: 'tests/e2e',
	retries: process.env.CI ? 2 : 0,
	fullyParallel: true,
	reporter: [['html', { open: 'never' }], ['list']],
	use: {
		baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
	},
	projects: [
		{ name: 'chromium', use: { browserName: 'chromium' } },
		{ name: 'firefox', use: { browserName: 'firefox' } },
		{ name: 'webkit', use: { browserName: 'webkit' } },
	],
	webServer: {
		command: 'npm run dev',
		port: 5173,
		reuseExistingServer: !process.env.CI,
		timeout: 60_000
	}
};

export default config;

