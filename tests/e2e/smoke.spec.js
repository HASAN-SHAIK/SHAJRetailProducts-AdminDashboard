import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard - Smoke', () => {
	test('redirects to login when not authenticated', async ({ page }) => {
		await page.goto('/admin/dashboard');
		await expect(page).toHaveURL(/\/admin\/login$/);
		// Basic login form presence
		await expect(page.getByRole('heading', { level: 1 }).or(page.getByText(/admin login/i))).toBeVisible();
	});

	test('can open dashboard when token exists in localStorage', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('shaj_admin_token', 'test-token');
			localStorage.setItem('shaj_admin_profile', JSON.stringify({ name: 'Test Admin', email: 'test@example.com' }));
		});
		await page.goto('/admin/dashboard');
		await expect(page).toHaveURL(/\/admin\/dashboard$/);
		// Sidebar/topbar presence
		await expect(page.getByRole('navigation')).toBeVisible();
		await expect(page.getByRole('banner').or(page.getByText(/dashboard/i))).toBeVisible();
	});

	test('sidebar navigation works', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('shaj_admin_token', 'test-token');
			localStorage.setItem('shaj_admin_profile', JSON.stringify({ name: 'Test Admin', email: 'test@example.com' }));
		});
		await page.goto('/admin/dashboard');

		// Attempt to navigate to a few routes
		const links = [
			{ label: /tenants/i, path: /\/admin\/tenants$/ },
			{ label: /reports/i, path: /\/admin\/reports$/ },
			{ label: /payments/i, path: /\/admin\/payments$/ },
		];

		for (const { label, path } of links) {
			await page.getByRole('link', { name: label }).first().click();
			await expect(page).toHaveURL(path);
		}
	});
});

