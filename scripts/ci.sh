#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci --ignore-scripts
npm run typecheck
npm run lint
npm test
npm run build:all
