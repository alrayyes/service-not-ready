import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { stripComments } from "./caddyfile";

// Comments out, or a directive commented out would still satisfy every check below.
const caddyfile = stripComments(readFileSync(new URL("../Caddyfile", import.meta.url), "utf8"));

test("a directive that is commented out does not count", () => {
	const sample = ["handle {", '\t# error "service not ready" 503', "}"].join("\n");
	expect(stripComments(sample)).not.toContain("error");
});

test("a trailing comment is dropped but its directive stays", () => {
	expect(stripComments("encode zstd gzip # both")).toBe("encode zstd gzip");
});

// The block of a directive, found by its opening line and the matching closing brace.
const block = (opening: string): string => {
	const start = caddyfile.indexOf(opening);
	if (start < 0) throw new Error(`no ${opening} in the Caddyfile`);
	let depth = 0;
	for (let i = caddyfile.indexOf("{", start); i < caddyfile.length; i++) {
		if (caddyfile[i] === "{") depth++;
		if (caddyfile[i] === "}" && --depth === 0) return caddyfile.slice(start, i + 1);
	}
	throw new Error(`${opening} is not closed`);
};

// What test/service.spec.ts used to assert once per path, method, Host and encoding in a
// container. Each of those is one directive, so reading the directive proves it for all of
// them; the container keeps one request to prove Caddy honours it.

test("the site has no host or method matcher, so every Host is served", () => {
	expect(caddyfile).toMatch(/^:\{\$LISTEN_PORT:8080\} \{$/m);
	expect(caddyfile).not.toMatch(/^\s*@\w+\s+(method|host)\b/m);
});

test("the catch-all handle raises a 503 for any path and method", () => {
	const catchAll = block("\thandle {");
	expect(catchAll).toContain('error "service not ready" 503');
});

test("the fallback is served from handle_errors with Retry-After and the 503 page", () => {
	const errors = block("\thandle_errors {");
	expect(errors).toContain("rewrite * /503.html");
	expect(errors).toContain('header Retry-After "{$RETRY_AFTER:30}"');
	expect(errors).toContain("import headers");
});

test.each(["\thandle @page {", "\thandle_errors {"])(
	"%s compresses with zstd and gzip",
	(opening) => {
		expect(block(opening)).toContain("encode zstd gzip");
	},
);

test("the shared headers are no-store, nosniff, a strict CSP, and hide the server", () => {
	const headers = block("(headers)");
	expect(headers).toContain('Cache-Control "no-store"');
	expect(headers).toContain("X-Content-Type-Options nosniff");
	expect(headers).toContain("Referrer-Policy strict-origin-when-cross-origin");
	expect(headers).toContain("default-src 'none'");
	expect(headers).toContain("frame-ancestors 'none'");
	expect(headers).toContain("-Server");
});
