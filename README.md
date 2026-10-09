# service-not-ready

[![CI](https://github.com/alrayyes/service-not-ready/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/alrayyes/service-not-ready/actions/workflows/ci.yml)
[![Codecov](https://codecov.io/gh/alrayyes/service-not-ready/graph/badge.svg)](https://codecov.io/gh/alrayyes/service-not-ready)
[![Latest release](https://img.shields.io/github/v/release/alrayyes/service-not-ready)](https://github.com/alrayyes/service-not-ready/releases/latest)
[![License: GPL-3.0-only](https://img.shields.io/github/license/alrayyes/service-not-ready)](LICENSE)

Error pages for when the thing behind your reverse proxy isn't answering. By default, it answers every request with a `503`, tells clients to retry in 30 seconds, and shows a page that checks again on its own and loads the real service the moment it stops answering 503. It also carries a page in the same look for each error a proxy can produce (401, 403, 404, 429, 500, 502, 504 and a generic one), for a proxy's error middleware to ask for by status.

It's one Caddy container with the pages baked in. No bind mounts, no external requests, no JavaScript or CSS from anywhere else: each page is a single file.

Image: `ghcr.io/alrayyes/service-not-ready`

![The service not ready page: a neon cityscape behind a card reading "Service not ready", a checking-again countdown and a Retry now button.](https://github.com/alrayyes/service-not-ready/releases/latest/download/screenshot-503.png)

## Requirements

- Docker (or any OCI runtime) to run the image.
- A reverse proxy in front of it that can route to a fallback, if you want it to stand in for a real service.

## Usage

```sh
docker run -d --name service-not-ready \
  --read-only \
  --tmpfs /config:mode=1777 \
  --tmpfs /data:mode=1777 \
  --cap-drop=ALL --cap-add=NET_BIND_SERVICE \
  --security-opt=no-new-privileges:true \
  --memory 64m --cpus 0.5 \
  -p 8080:8080 \
  ghcr.io/alrayyes/service-not-ready:latest

curl -i http://127.0.0.1:8080/
```

Pin a version and digest in anything you deploy. Each release prints the pinned form in its workflow log, and `docker pull` shows the digest.

### Compose

```yaml
services:
  service-not-ready:
    image: ghcr.io/alrayyes/service-not-ready:v0.1.0@sha256:<digest>
    read_only: true
    tmpfs:
      - /config:mode=1777
      - /data:mode=1777
    cap_drop: [ALL]
    cap_add: [NET_BIND_SERVICE]
    security_opt:
      - no-new-privileges:true
    mem_limit: 64m
    cpus: 0.5
    restart: always
    # The image has a HEALTHCHECK already. Put the proxy's own settings (labels, networks)
    # here. Tell it to send traffic to port 8080: the base image exposes 80, 443 and 2019
    # as well, so single-port auto-detection can't pick one.
```

Why each setting is there:

- **`read_only` and the two `tmpfs` mounts.** Caddy writes its autosaved config to `/config` and its state to `/data` even with nothing to manage. Docker's default tmpfs isn't writable by `nobody`, so each needs `mode=1777`. Without the mode you get "permission denied" errors in the log, though the page still serves.
- **`cap_add: NET_BIND_SERVICE`.** The image only binds port 8080, but `/usr/bin/caddy` carries the `cap_net_bind_service` file capability. With `no-new-privileges` and everything else dropped, the kernel refuses to exec it (`operation not permitted`) and the container restart-loops. Verified against `caddy:2-alpine` 2.11.6.
- **`--memory 64m` and `--cpus 0.5`.** An unbounded container can starve the host if something goes wrong in it, and a fallback shouldn't be able to take down the machine it's covering for. Caddy serving these pages sits well under both. Raise them if you put a lot of traffic on it.
- **Runs as `nobody:nobody`.** That's baked in. Nothing to set.

## Configuration

| Variable      | Default | What it does                                                          |
| ------------- | ------- | --------------------------------------------------------------------- |
| `LISTEN_PORT` | `8080`  | Port Caddy binds. Keep it above 1024.                                 |
| `RETRY_AFTER` | `30`    | Seconds in the `Retry-After` header. The page polls at this interval. |

## Pages for other errors

The catch-all above is the default. The image also carries a page in the same look for each error a reverse proxy can produce, served at `/<name>.html`:

| Path          | Meaning                    | Waits for the service?         |
| ------------- | -------------------------- | ------------------------------ |
| `/404.html`   | No router matched the host | no                             |
| `/401.html`   | Authentication required    | no                             |
| `/403.html`   | Access denied              | no                             |
| `/429.html`   | Rate limited               | counts down from `Retry-After` |
| `/500.html`   | Error from the backend     | no                             |
| `/502.html`   | Bad gateway                | yes, polls and reloads         |
| `/503.html`   | Service not ready          | yes, polls and reloads         |
| `/504.html`   | Gateway timeout            | yes, polls and reloads         |
| `/error.html` | Any other 4xx or 5xx       | no                             |

Requested directly, these answer `200` with `Cache-Control: no-store` and the same security headers as the catch-all. Any other path still answers `503` with `Retry-After`. Only the names above are special.

### Every page

Each release attaches a fresh screenshot of every page, taken from the image it published.

**`/401.html`**

![Sign in required (401).](https://github.com/alrayyes/service-not-ready/releases/latest/download/screenshot-401.png)

**`/403.html`**

![Access denied (403).](https://github.com/alrayyes/service-not-ready/releases/latest/download/screenshot-403.png)

**`/404.html`**

![Page not found (404).](https://github.com/alrayyes/service-not-ready/releases/latest/download/screenshot-404.png)

**`/429.html`**

![Slow down (429), with a countdown.](https://github.com/alrayyes/service-not-ready/releases/latest/download/screenshot-429.png)

**`/500.html`**

![Something broke (500).](https://github.com/alrayyes/service-not-ready/releases/latest/download/screenshot-500.png)

**`/502.html`**

![Bad gateway (502), which polls for the service.](https://github.com/alrayyes/service-not-ready/releases/latest/download/screenshot-502.png)

**`/503.html`**

![Service not ready (503), which polls for the service.](https://github.com/alrayyes/service-not-ready/releases/latest/download/screenshot-503.png)

**`/504.html`**

![Gateway timeout (504), which polls for the service.](https://github.com/alrayyes/service-not-ready/releases/latest/download/screenshot-504.png)

**`/error.html`**

![Something went wrong, the page for any other 4xx or 5xx.](https://github.com/alrayyes/service-not-ready/releases/latest/download/screenshot-error.png)

### With Traefik's `errors` middleware

Traefik asks this service for `/{status}.html` and returns the body with the original status code, so the visitor sees a `404` page with a `404` status:

```yaml
http:
  middlewares:
    error-pages:
      errors:
        status: ["401", "403", "404", "429", "500", "502", "503", "504"]
        service: service-not-ready
        query: "/{status}.html"
  services:
    service-not-ready:
      loadBalancer:
        servers:
          - url: http://service-not-ready:8080
```

List only statuses that have a page: a status like `418` would ask for `/418.html`, which isn't one, and get the `503` catch-all. For the rest of the 4xx and 5xx range, add a second `errors` middleware with `query: "/error.html"`.

The polling pages (502, 503, 504) check their own URL, so they reload when the original service answers. Opened directly they get a `200`, which counts as recovered, so they reload on the next check.

## What it serves

Every path, method and `Host` except those page names gets the same answer: status `503`, `Retry-After`, `Cache-Control: no-store`, the page body, and `X-Content-Type-Options`, `Referrer-Policy` and `Content-Security-Policy` headers. The `Server` header is removed and responses are compressed with zstd or gzip when the client accepts them.

The page body is `/503.html`. Nothing is "not found" on a fallback, so a request for `/favicon.ico` or any other path is a request to a service that isn't ready, and gets the same `503`. Only the names in [Pages for other errors](#pages-for-other-errors) are special.

The page polls its own URL with `fetch(location.href, { cache: "no-store" })` and reloads when the status is anything but 503. It has no meta refresh, a visible status line in a polite live region, and a Retry button. It follows `prefers-color-scheme` (a dark neon theme and a light one) and `prefers-reduced-motion`.

### Healthcheck

The image's `HEALTHCHECK` passes when the server answers `503`. A fallback that returns 200 would be the broken one, so `wget`'s usual "non-2xx is a failure" is the wrong signal. It checks `127.0.0.1` on `LISTEN_PORT`, not `localhost`, because busybox `wget` tries `::1` first and is refused by an IPv4-only listener.

## Reports

Every push to `main` that passes CI publishes its reports:

- [Index](https://apis.ryankes.eu/service-not-ready/reports/), with the commit and date.
- Tests: [unit](https://apis.ryankes.eu/service-not-ready/reports/tests/unit.xml) and [end-to-end](https://apis.ryankes.eu/service-not-ready/reports/tests/e2e.xml) results as JUnit XML, and the [Playwright report](https://apis.ryankes.eu/service-not-ready/reports/tests/playwright/index.html).
- Coverage: the [HTML view](https://apis.ryankes.eu/service-not-ready/reports/coverage/), [Cobertura `coverage.xml`](https://apis.ryankes.eu/service-not-ready/reports/coverage/coverage.xml) and [`lcov.info`](https://apis.ryankes.eu/service-not-ready/reports/coverage/lcov.info). It covers only the unit tests of the tooling in `ci/`, since the Playwright tests drive a container.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[GPL-3.0-only](LICENSE).
