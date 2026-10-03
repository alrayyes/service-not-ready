import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "test",
	globalSetup: "./test/global-setup.ts",
	// Every spec starts its own container on a random port, so files can run side by side.
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: 0,
	reporter: process.env.CI ? [["github"], ["list"]] : "list",
	use: { trace: "retain-on-failure" },
});
