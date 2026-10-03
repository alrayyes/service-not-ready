# service-not-ready

A "service not ready" page for when the thing behind your reverse proxy is still starting. It answers every request with a `503`, tells clients to retry in 30 seconds, and shows a page that checks again on its own and loads the real service the moment it stops answering 503.

It's one Caddy container with the page baked in. No bind mounts, no external requests, no JavaScript or CSS from anywhere else: `503.html` is a single file.

Image: `ghcr.io/alrayyes/service-not-ready`

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
    restart: always
    # The image has a HEALTHCHECK already. Put the proxy's own settings (labels, networks)
    # here. Tell it to send traffic to port 8080: the base image exposes 80, 443 and 2019
    # as well, so single-port auto-detection can't pick one.
```

Why each setting is there:

- **`read_only` and the two tmpfs mounts.** Caddy writes its autosaved config to `/config` and its state to `/data` even with nothing to manage. Docker's default tmpfs isn't writable by `nobody`, so each needs `mode=1777`. Without the mode you get "permission denied" errors in the log, though the page still serves.
- **`cap_add: NET_BIND_SERVICE`.** The image only binds port 8080, but `/usr/bin/caddy` carries the `cap_net_bind_service` file capability. With `no-new-privileges` and everything else dropped, the kernel refuses to exec it (`operation not permitted`) and the container restart-loops. Verified against `caddy:2-alpine` 2.11.6.
- **Runs as `nobody:nobody`.** That's baked in. Nothing to set.

## Configuration

| Variable      | Default | What it does                                                          |
| ------------- | ------- | --------------------------------------------------------------------- |
| `LISTEN_PORT` | `8080`  | Port Caddy binds. Keep it above 1024.                                 |
| `RETRY_AFTER` | `30`    | Seconds in the `Retry-After` header. The page polls at this interval. |

## What it serves

Every path, method and `Host` gets the same answer: status `503`, `Retry-After`, `Cache-Control: no-store`, the page body, and `X-Content-Type-Options`, `Referrer-Policy` and `Content-Security-Policy` headers. The `Server` header is removed and responses are compressed with zstd or gzip when the client accepts them.

There is no separate 404 page, because nothing is "not found" on a fallback. A request for `/favicon.ico` is a request to a service that isn't ready.

The page polls its own URL with `fetch(location.href, { cache: "no-store" })` and reloads when the status is anything but 503. It has no meta refresh, a visible status line in a polite live region, and a Retry button. It follows `prefers-color-scheme` (a dark neon theme and a light one) and `prefers-reduced-motion`.

### Healthcheck

The image's `HEALTHCHECK` passes when the server answers `503`. A fallback that returns 200 would be the broken one, so `wget`'s usual "non-2xx is a failure" is the wrong signal. It checks `127.0.0.1` on `LISTEN_PORT`, not `localhost`, because busybox `wget` tries `::1` first and is refused by an IPv4-only listener.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[GPL-3.0-only](LICENSE).
