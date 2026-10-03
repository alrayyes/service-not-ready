#!/usr/bin/env bash
# Vale over the docs we write. Used by CI and by hand, so both run the same thing.
# Without vale on PATH it runs the official image (needs Docker).
set -euo pipefail
cd "$(dirname "$0")/.."

# renovate: datasource=docker depName=jdkato/vale
VALE_IMAGE="jdkato/vale:v3.24.0@sha256:f5a09410093936d4919d868120786da9789e2652ac321c66a895403eca020ae4"
FILES=("${@:-README.md CONTRIBUTING.md SECURITY.md}")
read -ra FILES <<<"${FILES[*]}"

if command -v vale >/dev/null; then
  vale=(vale)
else
  vale=(docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/work" -w /work --entrypoint vale "$VALE_IMAGE")
fi

"${vale[@]}" sync
"${vale[@]}" "${FILES[@]}"
