#!/usr/bin/env bash
# Grammar and spelling (LanguageTool, through ltex-cli-plus) over the docs we write. Used by
# CI and by hand, so both run the same thing. Needs Docker: the image carries its own JDK.
# ltex-cli-plus exits 3 on findings, so any non-zero is a failure.
set -euo pipefail
cd "$(dirname "$0")/.."

# renovate: datasource=docker depName=ghcr.io/alrayyes/ltex-cli-plus
LTEX_IMAGE="ghcr.io/alrayyes/ltex-cli-plus:latest@sha256:e585b21bd84494ed5edcd7fa2d7fab2d591f6dde01bf972578a380ef43a0ca0b"
FILES=("${@:-README.md CONTRIBUTING.md SECURITY.md}")
read -ra FILES <<<"${FILES[*]}"

docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/work" -w /work "$LTEX_IMAGE" \
  --client-configuration=.ltex.json "${FILES[@]}"
