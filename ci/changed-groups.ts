// Works out which CI checks a change touches, from the changed file names on stdin
// (one per line). Prints `<group>=true|false` lines for $GITHUB_OUTPUT.
// Each group lists the files its job reads, its tool config and the workflow itself.

const groups = {
	// pages/ and src/ are in lint because the drift test (bun test ./ci) compares them, and
	// README.md and codecov.yml because that suite checks them.
	lint: [
		/\.(ts|json)$/,
		/^bun\.lock$/,
		/^\.editorconfig$/,
		/^README\.md$/,
		/^codecov\.yml$/,
		/^lefthook\.yml$/,
		/^(pages|src)\//,
	],
	dockerfile: [/^Dockerfile$/, /^\.dockerignore$/, /^\.hadolint\.yaml$/],
	// The docs Vale reads (scripts/lint-prose.sh), its config and its vocabulary.
	prose: [
		/^(README|CONTRIBUTING|SECURITY)\.md$/,
		/^\.vale\.ini$/,
		/^styles\//,
		/^scripts\/lint-prose\.sh$/,
	],
	// Every Markdown file the three tiers lint (not the generated changelog or tool-installed
	// files), their configs and the scripts they run.
	markdown: [
		/^(?!CHANGELOG\.md$|\.claude\/|openspec\/).*\.md$/,
		/^\.(prettierrc|prettierignore|markdownlint-cli2\.yaml|ltex\.json)$/,
		/^scripts\/lint-grammar\.sh$/,
		/^(package\.json|bun\.lock)$/,
	],
	test: [
		/^(Dockerfile|Caddyfile|\.dockerignore)$/,
		/^(pages|src)\//,
		/^scripts\/build-pages\.ts$/,
		/^test\//,
		/^playwright\.config\.ts$/,
		/^package\.json$/,
		/^bun\.lock$/,
	],
};

const workflow = ".github/workflows/ci.yml";

export function changedGroups(files: string[]) {
	const all = files.includes(workflow);
	return Object.fromEntries(
		Object.entries(groups).map(([name, patterns]) => [
			name,
			all || files.some((file) => patterns.some((p) => p.test(file))),
		]),
	) as Record<keyof typeof groups, boolean>;
}

if (import.meta.main) {
	const files = (await Bun.stdin.text()).split("\n").filter(Boolean);
	for (const [name, changed] of Object.entries(changedGroups(files))) {
		console.log(`${name}=${changed}`);
	}
}
