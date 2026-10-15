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

// Every page Traefik's errors middleware can ask for: /<name>.html.
const NAMES = ["401", "403", "404", "429", "500", "502", "503", "504", "error"];

// The pages share one template and one stylesheet, and ci/pages.test.ts holds each of them to
// its title, heading, status line and "nothing external". The browser proves the wiring once
// per kind of page: 503 stands in for the polling pages (502, 504 differ by status code and
// word), 404 for the static ones (401, 403, 500 and error differ by text and button).
const POLL = { path: "/503.html", heading: /service not ready/i, code: 503 };
const STATIC = { path: "/404.html", heading: /page not found/i };

test("every error page is served with 200, no-store and the security headers", async ({
	request,
}) => {
	for (const name of NAMES) {
		const res = await request.get(`${c.url}/${name}.html`);
		expect(res.status(), name).toBe(200);
		expect(res.headers()["content-type"], name).toContain("text/html");
		expect(res.headers()["cache-control"], name).toBe("no-store");
		expect(res.headers()["x-content-type-options"], name).toBe("nosniff");
		expect(res.headers()["referrer-policy"], name).toBe("strict-origin-when-cross-origin");
		expect(res.headers()["content-security-policy"], name).toContain("default-src 'none'");
		expect(res.headers().server, name).toBeUndefined();
	}
});

for (const p of [POLL, STATIC]) {
	test.describe(p.path, () => {
		test("renders its heading and status line and requests nothing outside the container", async ({
			page,
		}) => {
			const requested: string[] = [];
			page.on("request", (r) => requested.push(r.url()));
			await page.goto(c.url + p.path);
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(p.heading);
			await expect(page.getByRole("status")).toBeVisible();
			expect(requested.every((u) => u.startsWith(c.url) || u.startsWith("data:"))).toBe(true);
		});

		for (const scheme of ["dark", "light"] as const) {
			test(`has no axe violations (${scheme})`, async ({ page }) => {
				await page.emulateMedia({ colorScheme: scheme });
				await page.goto(c.url + p.path);
				const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
				expect(results.violations).toEqual([]);
			});
		}
	});
}

test.describe(POLL.path, () => {
	test("reloads once the status stops being an error", async ({ page }) => {
		await page.goto(c.url + POLL.path);
		await page.route(c.url + POLL.path, (route) =>
			route.fulfill({ status: 200, body: "<p>live</p>" }),
		);
		await page.getByRole("button", { name: /retry now/i }).click();
		await expect(page.getByText("live")).toBeVisible();
	});

	test("keeps polling while the error persists", async ({ page }) => {
		await page.goto(c.url + POLL.path);
		let polls = 0;
		await page.route(c.url + POLL.path, (route) => {
			polls += 1;
			return route.fulfill({ status: POLL.code, body: "still down" });
		});
		await page.getByRole("button", { name: /retry now/i }).click();
		await expect(page.getByRole("status")).toContainText(/still (starting|unavailable)/i);
		expect(polls).toBe(1);
		await expect(page.getByRole("button", { name: /retry now/i })).toBeEnabled();
	});
});

test.describe(STATIC.path, () => {
	test("never asks the server again", async ({ page }) => {
		const requested: string[] = [];
		page.on("request", (r) => requested.push(r.url()));
		await page.goto(c.url + STATIC.path);
		await page.waitForTimeout(2500);
		expect(requested).toEqual([c.url + STATIC.path]);
	});
});

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
