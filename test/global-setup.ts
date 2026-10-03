import { execFileSync } from "node:child_process";
import { IMAGE } from "./container";

// Build the image from the working tree unless CI hands one in through IMAGE, so the tests
// always run against what the Dockerfile produces, never a stale local tag.
export default function globalSetup() {
	if (process.env.IMAGE) return;
	execFileSync("docker", ["build", "--quiet", "-t", IMAGE, "."], { stdio: "inherit" });
}
