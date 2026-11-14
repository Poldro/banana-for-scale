import { expect, test } from '@playwright/test';

// One stop per family of model: procedural, point cloud, glTF, texture, heightmap.
const SAMPLE = ['proton', 'ribosome', 'banana', 'saturn-v', 'everest', 'moon', 'outer-planets', 'milky-way', 'universe'];

for (const id of SAMPLE) {
	test(`renders #${id} without console errors`, async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(e.message));
		page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
		await page.goto(`/#${id}`);
		await page.waitForTimeout(800);
		expect(errors).toEqual([]);
	});
}

test.describe('3D models', () => {
	test('shows the rotate hint and model credit on a modelled stop', async ({ page }) => {
		await page.goto('/#banana');
		await expect(page.getByText('drag sideways or ←/→ to rotate')).toBeVisible();
		await expect(page.getByRole('link', { name: /Poly Haven/ })).toBeVisible();
	});

	test('the 3D switch falls back to the photo and is remembered', async ({ page }) => {
		await page.goto('/#banana');
		const toggle = page.getByRole('button', { name: '3D' });
		await expect(toggle).toHaveAttribute('aria-pressed', 'true');
		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-pressed', 'false');
		await expect(page.getByText('drag sideways or ←/→ to rotate')).toBeHidden();
		await page.reload();
		await expect(page.getByRole('button', { name: '3D' })).toHaveAttribute('aria-pressed', 'false');
	});
});
