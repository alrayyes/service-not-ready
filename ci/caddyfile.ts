// Caddyfile text without its comments, so a directive that has been commented out can't
// satisfy a check that reads the file. A comment starts at a # that opens a token.
export const stripComments = (text: string): string =>
	text
		.split("\n")
		.map((line) => line.replace(/(^|\s)#.*$/, "").trimEnd())
		.join("\n");
