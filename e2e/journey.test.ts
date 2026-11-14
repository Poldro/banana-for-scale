import { expect, test, type Page } from '@playwright/test';

const heading = (page: Page) => page.getByRole('heading', { level: 2 });

test('starts at the banana with a hint', async ({ page }) => {
	await page.goto('/');
	await expect(heading(page)).toHaveText('A banana');
	await expect(page.getByText('Scroll or swipe')).toBeVisible();
	await expect(page.getByText('Evan-Amos')).toBeVisible();
});

test('a deep link opens the matching stop', async ({ page }) => {
	await page.goto('/#earth');
	await expect(heading(page)).toHaveText(/Earth/);
	await expect(page).toHaveTitle(/Earth/);
});

test('an unknown hash falls back to the banana', async ({ page }) => {
	await page.goto('/#not-a-level');
	await expect(heading(page)).toHaveText('A banana');
});

test('the ruler jumps to a stop and updates the URL', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: /^The observable universe/ }).click();
	await expect(heading(page)).toHaveText('The observable universe');
	await expect(page).toHaveURL(/#universe$/);
});

test('the neighbour links step one stop down and up, with size ratios', async ({ page }) => {
	await page.goto('/');
	const down = page.getByRole('button', { name: /^A honey bee .* 13 times smaller$/ });
	const up = page.getByRole('button', { name: /^A human .* times bigger$/ });
	await expect(up).toBeVisible();
	await down.click();
	await expect(heading(page)).toHaveText('A honey bee');
	await page.getByRole('button', { name: /^A banana .* times bigger$/ }).click();
	await expect(heading(page)).toHaveText('A banana');
});

test('the smallest and largest stops only link inwards', async ({ page }) => {
	await page.goto('/#planck');
	await expect(page.getByRole('button', { name: /times smaller$/ })).toHaveCount(0);
	await page.goto('/#universe');
	await expect(page.getByRole('button', { name: /times bigger$/ })).toHaveCount(0);
});

test.describe('desktop input', () => {
	test.skip(({ isMobile }) => isMobile, 'keyboard and wheel are desktop inputs');

	test('keyboard moves one stop at a time and Home/End reach the ends', async ({ page }) => {
		await page.goto('/');
		await page.keyboard.press('ArrowUp');
		await expect(heading(page)).toHaveText(/human/i);
		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('ArrowDown');
		await expect(heading(page)).toHaveText(/bee/i);
		await page.keyboard.press('End');
		await expect(heading(page)).toHaveText(/Planck/);
		await page.keyboard.press('Home');
		await expect(heading(page)).toHaveText('The observable universe');
	});

	test('scrolling down dives smaller and hides the hint', async ({ page }) => {
		await page.goto('/');
		await page.mouse.move(400, 300);
		await page.mouse.wheel(0, 300);
		await expect(page.getByText('Scroll or swipe')).toBeHidden();
		await expect(heading(page)).not.toHaveText('A banana');
		await expect(page).not.toHaveURL(/#banana$/);
	});
});

test('credits page lists every image with its license', async ({ page }) => {
	await page.goto('/credits');
	const rows = page.locator('table').first().locator('tbody tr');
	await expect(rows).toHaveCount(34);
	await expect(page.locator('table').nth(1).locator('tbody tr')).toHaveCount(27);
	await expect(page.getByRole('link', { name: 'CC0' }).first()).toBeVisible();
	await expect(page.getByRole('link', { name: 'CC BY-SA 3.0' }).first()).toBeVisible();
	await page.getByRole('link', { name: 'Back to the banana' }).click();
	await expect(heading(page)).toHaveText('A banana');
});

test('renders without console errors', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
	await page.goto('/#atom');
	await page.waitForTimeout(500);
	expect(errors).toEqual([]);
});
