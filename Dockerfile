FROM caddy:2-alpine@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f

COPY Caddyfile /etc/caddy/Caddyfile
COPY pages/ /srv/

# Caddy keeps its lock and instance files here even with nothing to manage, so they have to
# belong to the user that ends up running it. With a read-only root, mount a tmpfs over each
# with mode 1777: Docker's default tmpfs is not writable by nobody.
RUN chown -R nobody:nobody /data /config

USER nobody:nobody

ENV LISTEN_PORT=8080 \
    RETRY_AFTER=30

# Unprivileged port, so it works for the non-root user. The base image also declares 80, 443
# and 2019, which this Caddyfile does not bind.
EXPOSE 8080

# A healthy fallback answers 503 to everything, so wget's own exit status (non-zero on 503)
# is the wrong signal. Look for the 503 status line instead. 127.0.0.1, not localhost:
# busybox wget tries ::1 first and gets refused on an IPv4-only listener.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD ["sh", "-c", "wget -S -q -O /dev/null \"http://127.0.0.1:${LISTEN_PORT}/\" 2>&1 | grep -q ' 503 '"]
