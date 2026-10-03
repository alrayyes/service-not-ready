# Contributing

The [README](README.md) is for whoever runs the image. This file is for whoever changes it.

## Getting set up

- [bun](https://bun.sh) 1.4 or newer, for the test tooling.
- Docker, running. The tests build the image and start containers.

```sh
bun install
bunx playwright install chromium
```

## Everyday commands

```sh
bun run test      # build the image, run it hardened, check headers, hardening and the page
bun run lint      # biome check .
bun run format    # biome check --write .

docker run --rm -i hadolint/hadolint < Dockerfile
```

`bun run test` builds `service-not-ready:test` from the working tree. Set `IMAGE=<ref>` to test an image you already built or pulled instead.

## How it fits together

Three files make the image: `Dockerfile`, `Caddyfile` and `503.html`. The `Caddyfile` raises a 503 for every request and serves `503.html` from `handle_errors`, which is the only place Caddy lets a file go out with a non-200 status.

The tests in `test/` start the image with the same flags the README documents (read-only root, tmpfs, `cap_drop: ALL` plus `NET_BIND_SERVICE`). If a change needs another runtime setting, the tests fail until the README and `test/container.ts` both say so.

`503.html` must stay one file with no external requests. A test fails on any request that leaves the origin. It also runs an axe-core scan in dark and light, with and without reduced motion.

## The README screenshot

`bun run screenshot [file]` shoots the page from the image (`IMAGE`, default `service-not-ready:test`) at a fixed size, dark scheme and reduced motion. The release job runs it against the image it just published and attaches `screenshot.png` to the release. The README embeds `releases/latest/download/screenshot.png`, so it updates on release with no commit. Change `test/screenshot.ts` if the shot should look different.

## Prose style

`scripts/lint-prose.sh` runs [Vale](https://vale.sh) over `README.md`, `CONTRIBUTING.md` and `SECURITY.md`, from the official `jdkato/vale` image when `vale` isn't installed (it needs Docker). Style is advice, so warnings print and only error-level rules, such as a misspelled product name, fail. A new product name or term goes in `styles/config/vocabularies/House/accept.txt`. The `prose` CI job runs the same script in the same image.

## CI path filtering

On a pull request, `lint`, `dockerfile`, `test` and `prose` run only when files they cover change, so a README edit builds nothing. `ci/changed-groups.ts` holds the file lists (`bun test ./ci` covers them), and editing `ci.yml` runs all four. The secret scan, audit and commit lint always run, and a push to `main` runs everything. Add a file a job reads to its list, or the job skips a change that could break it.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/), checked by commitlint in CI. Only changes to `Dockerfile`, `Caddyfile` and `503.html` ship, so only those take `feat:`, `fix:` or `perf:`. Tests, docs and CI changes are `test:`, `docs:` or `ci:` and cut no release.

## Branching, review and release

Every change goes through a pull request. Branch protection is on for `main`. Squash-merge once checks are green and delete the branch. The pull request title has to be a Conventional Commit too.

[release-please](https://github.com/googleapis/release-please) keeps a release pull request open. Merging it tags the release, and the same workflow run builds and pushes the image to `ghcr.io/alrayyes/service-not-ready` with that tag and `latest`. Nobody picks a version by hand.
