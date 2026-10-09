import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "test",
	globalSetup: "./test/global-setup.ts",
	// Every spec starts its own container on a random port, so files can run side by side.
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: 0,
	// CI also writes the JUnit file and the HTML report that the reports page publishes.
	reporter: process.env.CI
		? [
				["github"],
				["list"],
				["junit", { outputFile: "reports/e2e.xml" }],
				["html", { open: "never", outputFolder: "playwright-report" }],
			]
		: "list",
	use: { trace: "retain-on-failure" },
});
