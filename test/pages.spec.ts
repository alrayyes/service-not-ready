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

// Every page Traefik's errors middleware can ask for: /<name>.html. `poll` pages wait for
// the service to come back; the rest never ask the server again.
const PAGES = [
	{ name: "401", heading: /sign in required/i, poll: false },
	{ name: "403", heading: /access denied/i, poll: false },
	{ name: "404", heading: /page not found/i, poll: false },
	{ name: "429", heading: /slow down/i, poll: false },
	{ name: "500", heading: /something broke/i, poll: false },
	{ name: "502", heading: /bad gateway/i, poll: true, code: 502 },
	{ name: "503", heading: /service not ready/i, poll: true, code: 503 },
	{ name: "504", heading: /gateway timeout/i, poll: true, code: 504 },
	{ name: "error", heading: /something went wrong/i, poll: false },
] as const;

for (const p of PAGES) {
	test.describe(`/${p.name}.html`, () => {
		const path = `/${p.name}.html`;

		test("is served with 200, no-store and the security headers", async ({ request }) => {
			const res = await request.get(c.url + path);
			expect(res.status()).toBe(200);
			expect(res.headers()["content-type"]).toContain("text/html");
			expect(res.headers()["cache-control"]).toBe("no-store");
			expect(res.headers()["x-content-type-options"]).toBe("nosniff");
			expect(res.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
			expect(res.headers()["content-security-policy"]).toContain("default-src 'none'");
			expect(res.headers().server).toBeUndefined();
		});

		test("is one file with no external requests and a polite status line", async ({ page }) => {
			const requested: string[] = [];
			page.on("request", (r) => requested.push(r.url()));
			await page.goto(c.url + path);
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(p.heading);
			await expect(page.getByRole("status")).toBeVisible();
			expect(requested.every((u) => u.startsWith(c.url) || u.startsWith("data:"))).toBe(true);
			await expect(page.locator('meta[http-equiv="refresh" i]')).toHaveCount(0);
			expect(await page.locator("link[rel=stylesheet], script[src], img[src]").count()).toBe(0);
		});

		for (const scheme of ["dark", "light"] as const) {
			test(`has no axe violations (${scheme})`, async ({ page }) => {
				await page.emulateMedia({ colorScheme: scheme });
				await page.goto(c.url + path);
				const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
				expect(results.violations).toEqual([]);
			});
		}

		if (p.poll) {
			test("reloads once the status stops being an error", async ({ page }) => {
				await page.goto(c.url + path);
				await page.route(c.url + path, (route) =>
					route.fulfill({ status: 200, body: "<p>live</p>" }),
				);
				await page.getByRole("button", { name: /retry now/i }).click();
				await expect(page.getByText("live")).toBeVisible();
			});

			test("keeps polling while the error persists", async ({ page }) => {
				await page.goto(c.url + path);
				await page.route(c.url + path, (route) =>
					route.fulfill({ status: p.code, body: "still down" }),
				);
				await page.getByRole("button", { name: /retry now/i }).click();
				await expect(page.getByRole("status")).toContainText(/still (starting|unavailable)/i);
			});
		} else if (p.name !== "429") {
			test("never asks the server again", async ({ page }) => {
				const requested: string[] = [];
				page.on("request", (r) => requested.push(r.url()));
				await page.goto(c.url + path);
				await page.waitForTimeout(2500);
				expect(requested).toEqual([c.url + path]);
			});
		}
	});
}

test.describe("/429.html", () => {
	test("counts down from the Retry-After header", async ({ page }) => {
		await page.route(`${c.url}/429.html`, (route) =>
			route.request().resourceType() === "document"
				? route.continue()
				: route.fulfill({ status: 429, headers: { "Retry-After": "7" }, body: "slow" }),
		);
		await page.goto(`${c.url}/429.html`);
		await expect(page.getByRole("status")).toContainText(/try again in [1-7]s/);
	});

	test("shows no countdown without Retry-After", async ({ page }) => {
		await page.goto(`${c.url}/429.html`);
		await expect(page.getByRole("status")).not.toContainText(/try again in \d+s/);
	});
});

test("any other path is still the 503 catch-all", async ({ request }) => {
	for (const path of ["/", "/nope.html", "/404", "/a/404.html", "/error"]) {
		const res = await request.get(c.url + path);
		expect(res.status(), path).toBe(503);
		expect(res.headers()["retry-after"]).toBe("30");
	}
});
