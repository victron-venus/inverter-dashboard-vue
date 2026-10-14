#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -n "${CADDY_BIN:-}" ]]; then
  exec node scripts/test-https-profile.mjs
fi
case "$(uname -s)-$(uname -m)" in
  Linux-x86_64)
    platform=linux_amd64
    digest=a7a433a1b133efc3c8d10eb0b99d52a24b5ef5c322dc77f5282182b1c0402139ab83f3a99f0c52409df77d20123fb0b523edad8a66d8f5e49136197bf61ef0e7 ;;
  Darwin-arm64)
    platform=mac_arm64
    digest=68f592df8f0ec058fbdb9b137b64e9a0aa792d28c06e1e3b9ec12d0e7fb371683a54e73ef6d8e6d0dd70dc6b941a5b5d5b73faedd3f89de119ad2eb78bdc668e ;;
  *) echo 'Set CADDY_BIN to a supported Caddy executable on this platform.' >&2; exit 1 ;;
esac
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
archive="$scratch/caddy.tar.gz"
curl --fail --location --proto '=https' --tlsv1.2 --max-time 120 --max-filesize 100000000 \
  "https://github.com/caddyserver/caddy/releases/download/v2.11.7/caddy_2.11.7_${platform}.tar.gz" -o "$archive"
node --input-type=module - "$archive" "$digest" <<'NODE'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
assert.equal(createHash('sha512').update(readFileSync(process.argv[2])).digest('hex'), process.argv[3])
NODE
tar -xzf "$archive" -C "$scratch" caddy
CADDY_BIN="$scratch/caddy" node scripts/test-https-profile.mjs
