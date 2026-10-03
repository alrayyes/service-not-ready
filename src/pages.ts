import { readFileSync } from "node:fs";

const read = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8");

type Kind = "poll" | "back" | "reload" | "countdown";

interface Page {
	name: string;
	kind: Kind;
	title: string;
	tag: string;
	heading: string;
	ja: string;
	en: string;
	text: string;
	msg: string;
	button?: string;
	footer: string;
	// poll pages only: the status they wait out and the word for "not up yet".
	code?: number;
	state?: string;
}

const poll = (code: number, state: string) => ({
	kind: "poll" as const,
	code,
	state,
	msg: "checking again in 30s",
	button: "RETRY NOW",
});

export const PAGES: Page[] = [
	{
		name: "401",
		kind: "back",
		title: "Sign in required (401)",
		tag: "AUTH // LOCKED",
		heading: "Sign in required",
		ja: "認証",
		en: "locked",
		text: "This address needs a login. Sign in with the credentials you were given, then open it again.",
		msg: "nothing to wait for here",
		footer: "ERR 401 // unauthorized",
	},
	{
		name: "403",
		kind: "back",
		title: "Access denied (403)",
		tag: "ACCESS // DENIED",
		heading: "Access denied",
		ja: "拒否",
		en: "forbidden",
		text: "You're not allowed to open this address from here. Waiting won't change that.",
		msg: "nothing to wait for here",
		footer: "ERR 403 // forbidden",
	},
	{
		name: "404",
		kind: "back",
		title: "Page not found (404)",
		tag: "ROUTE // LOST",
		heading: "Page not found",
		ja: "見つかりません",
		en: "not found",
		text: "Nothing answers at this address. Check the link. The site may not exist, or may be offline.",
		msg: "nothing to wait for here",
		footer: "ERR 404 // not found",
	},
	{
		name: "429",
		kind: "countdown",
		title: "Slow down (429)",
		tag: "RATE // LIMITED",
		heading: "Slow down",
		ja: "待機",
		en: "cooling down",
		text: "Too many requests came from your connection. Wait a moment, then try again.",
		msg: "wait a moment, then try again",
		footer: "ERR 429 // too many requests",
	},
	{
		name: "500",
		kind: "reload",
		title: "Something broke (500)",
		tag: "FAULT // SERVER",
		heading: "Something broke",
		ja: "故障",
		en: "fault",
		text: "The service hit an error while handling your request. Try again in a bit.",
		msg: "something went wrong on our side",
		footer: "ERR 500 // internal error",
	},
	{
		name: "502",
		...poll(502, "unavailable"),
		title: "Bad gateway (502)",
		tag: "UPSTREAM // DOWN",
		heading: "Bad gateway",
		ja: "不良",
		en: "upstream down",
		text: "The service behind this address isn't answering properly. This page checks again every 30 seconds and loads it when it does.",
		footer: "ERR 502 // bad gateway",
	},
	{
		name: "503",
		...poll(503, "starting"),
		title: "Service not ready (503)",
		tag: "SYS_INIT // BOOTING",
		heading: "Service not ready",
		ja: "準備中",
		en: "booting",
		text: "The container is starting. This page checks again every 30 seconds and loads the service as soon as it answers.",
		footer: "ERR 503 // temporarily unavailable",
	},
	{
		name: "504",
		...poll(504, "unavailable"),
		title: "Gateway timeout (504)",
		tag: "UPSTREAM // TIMEOUT",
		heading: "Gateway timeout",
		ja: "時間切れ",
		en: "timed out",
		text: "The service took too long to answer. This page checks again every 30 seconds and loads it when it does.",
		footer: "ERR 504 // gateway timeout",
	},
	{
		name: "error",
		kind: "reload",
		title: "Something went wrong",
		tag: "FAULT // UNKNOWN",
		heading: "Something went wrong",
		ja: "異常",
		en: "error",
		text: "The request couldn't be completed. Try again in a bit.",
		msg: "something went wrong",
		footer: "ERR // unexpected error",
	},
];

const BEHAVIOUR: Record<Kind, string> = {
	poll: read("poll.js"),
	countdown: read("countdown.js"),
	reload: read("reload.js").replace("{{action}}", "location.reload()"),
	back: read("reload.js").replace(
		"{{action}}",
		"(history.length > 1 ? history.back() : location.reload())",
	),
};

const fill = (text: string, values: Record<string, string>) =>
	text.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? "");

// One self-contained file per page: the shared template with this page's text and the one
// behaviour it needs, so nothing is fetched and nothing unused ships.
export function render(page: Page): string {
	const button = page.button ?? (page.kind === "back" ? "GO BACK" : "TRY AGAIN");
	const values = {
		...page,
		code: String(page.code ?? ""),
		state: page.state ?? "",
		button,
		announce: page.kind === "poll" ? "Checking again every 30 seconds." : page.msg,
	};
	const behaviour = fill(BEHAVIOUR[page.kind], values);
	return fill(read("template.html"), { ...values, BEHAVIOR: "" }).replace("/*BEHAVIOR*/", () =>
		behaviour.trimStart(),
	);
}
