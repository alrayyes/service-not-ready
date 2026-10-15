import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { exec, inspect, logs, type Running, ready, start, stop } from "./container";

let c: Running;

test.beforeAll(async () => {
	c = start();
	await ready(c.url);
});
test.afterAll(() => stop(c.name));

// Which paths, methods and Hosts get a 503, and the headers and compression on it, are
// single Caddyfile directives and are asserted in ci/caddyfile.test.ts. These requests prove
// Caddy honours them.
test.describe("every request is a 503", () => {
	test("GET /", async ({ request }) => {
		const res = await request.get(c.url);
		expect(res.status()).toBe(503);
		expect(res.headers()["retry-after"]).toBe("30");
		expect(res.headers()["cache-control"]).toBe("no-store");
		expect(res.headers()["content-type"]).toContain("text/html");
		expect(await res.text()).toContain("Service not ready");
	});

	test("a POST to any other Host", async ({ request }) => {
		const res = await request.post(`${c.url}/anything?with=query`, {
			headers: { Host: "example.com" },
		});
		expect(res.status()).toBe(503);
		expect(res.headers()["retry-after"]).toBe("30");
	});
});

test.describe("response headers", () => {
	test("carry the security headers and hide the server", async ({ request }) => {
		const h = (await request.get(c.url)).headers();
		expect(h["x-content-type-options"]).toBe("nosniff");
		expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
		expect(h["content-security-policy"]).toContain("default-src 'none'");
		expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
		expect(h.server).toBeUndefined();
	});

	test("compresses with zstd", async ({ request }) => {
		const res = await request.get(c.url, {
			headers: { "Accept-Encoding": "zstd" },
			// Playwright would transparently decode and hide the header's effect otherwise.
			failOnStatusCode: false,
		});
		expect(res.headers()["content-encoding"]).toBe("zstd");
	});
});

test.describe("hardening", () => {
	test("runs as a non-root user", () => {
		expect(exec(c.name, "id", "-u")).not.toBe("0");
		expect(inspect(c.name, "{{.Config.User}}")).toBe("nobody:nobody");
	});

	test("has a read-only root filesystem", () => {
		expect(inspect(c.name, "{{.HostConfig.ReadonlyRootfs}}")).toBe("true");
		expect(() => exec(c.name, "touch", "/etc/should-not-work")).toThrow();
	});

	test("runs with the memory and CPU limits the README documents", () => {
		expect(inspect(c.name, "{{.HostConfig.Memory}}")).toBe("67108864");
		expect(inspect(c.name, "{{.HostConfig.NanoCpus}}")).toBe("500000000");
		const readme = readFileSync("README.md", "utf8");
		for (const setting of ["--memory 64m", "--cpus 0.5", "mem_limit: 64m", "cpus: 0.5"]) {
			expect(readme, setting).toContain(setting);
		}
	});

	test("starts without filesystem or permission errors", () => {
		const out = logs(c.name);
		expect(out).not.toMatch(/read-only file system|permission denied|operation not permitted/i);
	});

	test("reports healthy", async () => {
		const deadline = Date.now() + 30_000;
		let status = "";
		while (Date.now() < deadline) {
			status = inspect(c.name, "{{.State.Health.Status}}");
			if (status === "healthy") break;
			await new Promise((r) => setTimeout(r, 500));
		}
		expect(status).toBe("healthy");
	});
});

test.describe("configuration", () => {
	test("RETRY_AFTER and LISTEN_PORT override the defaults", async ({ request }) => {
		const custom = start({ env: { RETRY_AFTER: "120", LISTEN_PORT: "9090" }, containerPort: 9090 });
		try {
			await ready(custom.url);
			const res = await request.get(custom.url);
			expect(res.status()).toBe(503);
			expect(res.headers()["retry-after"]).toBe("120");
		} finally {
			stop(custom.name);
		}
	});
});
