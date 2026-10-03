import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";

export const IMAGE = process.env.IMAGE ?? "service-not-ready:test";

export interface Options {
	env?: Record<string, string>;
	containerPort?: number;
}

export interface Running {
	name: string;
	url: string;
}

const docker = (...args: string[]) => execFileSync("docker", args, { encoding: "utf8" }).trim();

// The runtime settings the README tells an operator to use. Tests run the image exactly like
// this, so a setting the image needs but the README forgot shows up as a failing test.
const HARDENED = [
	"--read-only",
	"--tmpfs",
	"/config:mode=1777",
	"--tmpfs",
	"/data:mode=1777",
	"--cap-drop=ALL",
	"--cap-add=NET_BIND_SERVICE",
	"--security-opt=no-new-privileges:true",
];

export function start({ env = {}, containerPort = 8080 }: Options = {}): Running {
	const name = `snr-${randomBytes(4).toString("hex")}`;
	const envArgs = Object.entries(env).flatMap(([k, v]) => ["-e", `${k}=${v}`]);
	docker(
		"run",
		"-d",
		"--name",
		name,
		...HARDENED,
		...envArgs,
		"-p",
		`127.0.0.1::${containerPort}`,
		IMAGE,
	);
	const port = docker("port", name, `${containerPort}/tcp`).split("\n")[0].split(":").pop();
	return { name, url: `http://127.0.0.1:${port}` };
}

export function stop(name: string) {
	docker("rm", "-f", name);
}

export const logs = (name: string) => docker("logs", name);
export const inspect = (name: string, format: string) => docker("inspect", "-f", format, name);
export const exec = (name: string, ...cmd: string[]) => docker("exec", name, ...cmd);

// Poll until the server answers, so a test never races Caddy's startup.
export async function ready(url: string, timeoutMs = 15_000) {
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		try {
			await fetch(url);
			return;
		} catch (err) {
			if (Date.now() > deadline) throw err;
			await new Promise((r) => setTimeout(r, 200));
		}
	}
}
