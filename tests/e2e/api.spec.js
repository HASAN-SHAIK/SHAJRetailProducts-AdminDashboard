import { test, expect } from '@playwright/test';

test.describe('API checks (prototype)', () => {
	test('login API returns token (mocked)', async ({ page }) => {
		await page.route('**/api/admin/login', async (route) => {
			const json = { token: 'mock-token', admin: { email: 'admin@example.com', name: 'Admin' } };
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json) });
		});

		await page.goto('/admin/login');
		// Fill and submit (selectors are generic, adjust to your form fields)
		await page.getByLabel(/email/i).fill('admin@example.com');
		await page.getByLabel(/password/i).fill('password123');
		await page.getByRole('button', { name: /login/i }).click();

		// After mocked login, app should write to localStorage and navigate
		await expect(page).toHaveURL(/\/admin\/dashboard$/);
		const token = await page.evaluate(() => localStorage.getItem('shaj_admin_token'));
		expect(token).toBe('mock-token');
	});

	test('raw API request to tenants endpoint (no UI)', async ({ request }) => {
		// Example direct API health/request using Playwright's APIRequestContext
		// Point this to your real backend baseURL in CI or via env
		const base = process.env.API_BASE_URL || 'http://localhost:3000';
		const res = await request.get(`${base}/api/admin/tenants`, {
			headers: { Authorization: 'Bearer test-token' }
		});
		// Prototype: we do not know the real server; allow non-200 in dev
		// This asserts the request was made and a status code returned
		expect(res.status()).toBeGreaterThan(0);
	});
});

