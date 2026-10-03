import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { type Running, ready, start, stop } from "./container";

let c: Running;

test.beforeAll(async () => {
	c = start();
	await ready(c.url);
});
test.afterAll(() => stop(c.name));

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test("page makes no external requests and has no meta refresh", async ({ page }) => {
	const requested: string[] = [];
	page.on("request", (r) => requested.push(r.url()));
	await page.goto(c.url);
	await expect(page.locator("#status")).toBeVisible();
	expect(requested.every((u) => u.startsWith(c.url) || u.startsWith("data:"))).toBe(true);
	await expect(page.locator('meta[http-equiv="refresh" i]')).toHaveCount(0);
	expect(await page.locator("link[rel=stylesheet], script[src], img[src]").count()).toBe(0);
});

test("announces its status politely and offers a retry button", async ({ page }) => {
	await page.goto(c.url);
	await expect(page.locator('[aria-live="polite"]').first()).toBeAttached();
	await expect(page.getByRole("button", { name: /retry now/i })).toBeVisible();
	await expect(page.getByRole("status")).toContainText(/checking again in \d+s/);
});

test("reloads once the service stops answering 503", async ({ page }) => {
	await page.goto(c.url);
	// First poll after the click answers 200, as the real service would.
	await page.route(`${c.url}/`, (route) => route.fulfill({ status: 200, body: "<p>live</p>" }));
	await page.getByRole("button", { name: /retry now/i }).click();
	await expect(page.getByText("live")).toBeVisible();
});

test("keeps polling while the service still answers 503", async ({ page }) => {
	await page.goto(c.url);
	let polls = 0;
	await page.route(`${c.url}/`, (route) => {
		polls += 1;
		return route.fulfill({ status: 503, body: "still down" });
	});
	await page.getByRole("button", { name: /retry now/i }).click();
	await expect(page.getByRole("status")).toContainText(/still starting/i);
	expect(polls).toBe(1);
	await expect(page.getByRole("button", { name: /retry now/i })).toBeEnabled();
});

for (const scheme of ["dark", "light"] as const) {
	for (const motion of ["no-preference", "reduce"] as const) {
		test(`has no axe violations (${scheme}, motion: ${motion})`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: scheme, reducedMotion: motion });
			await page.goto(c.url);
			const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
			expect(results.violations).toEqual([]);
		});
	}
}

test("honours prefers-color-scheme", async ({ page }) => {
	const bg = async (scheme: "dark" | "light") => {
		await page.emulateMedia({ colorScheme: scheme });
		await page.goto(c.url);
		return page.locator("main").evaluate((el) => getComputedStyle(el).backgroundColor);
	};
	expect(await bg("dark")).not.toBe(await bg("light"));
});

test("honours prefers-reduced-motion", async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto(c.url);
	const animation = await page
		.locator("#status i")
		.evaluate((el) => getComputedStyle(el).animationName);
	expect(animation).toBe("none");
});
