#!/usr/bin/env bash
# Rebuild public SPA and republish to here.now (alvit / inverter-dashboard).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export VITE_PUBLIC_MODE=true
npm run build
OUT="${HERENOW_OUT:-/tmp/inverter-dashboard-herenow-public}"
rm -rf "$OUT"
mkdir -p "$OUT/.herenow"
cp -a dist/. "$OUT/"
# Prefer existing proxy config if present next to this script's sibling trees
if [[ -f "$ROOT/../inverter-dashboard-herenow-public/.herenow/proxy.json" ]]; then
  cp "$ROOT/../inverter-dashboard-herenow-public/.herenow/proxy.json" "$OUT/.herenow/proxy.json"
fi
python3 - <<PY
from pathlib import Path
assets = sorted(Path("$OUT/assets").glob("index-*.js"))
js = assets[-1].name if assets else "index.js"
css = sorted(Path("$OUT/assets").glob("index-*.css"))
cssn = css[-1].name if css else "index.css"
zr = sorted(Path("$OUT/assets").glob("zrender-vendor-*.js"))
ec = sorted(Path("$OUT/assets").glob("echarts-vendor-*.js"))
Path("$OUT/index.html").write_text(f"""<!doctype html>
<html lang=\"en\">
  <head>
    <meta charset=\"UTF-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
    <meta name=\"inverter-public-mode\" content=\"true\" />
    <meta name=\"inverter-gateway-snapshot\" content=\"/api/gateway/snapshot\" />
    <title>Inverter Dashboard · public</title>
    <meta name=\"description\" content=\"Read-only Victron dashboard via inverter-gateway (here.now proxy). Writes disabled.\" />
    <script type=\"module\" crossorigin src=\"/assets/{js}\"></script>
    <link rel=\"modulepreload\" crossorigin href=\"/assets/{zr[-1].name}\">
    <link rel=\"modulepreload\" crossorigin href=\"/assets/{ec[-1].name}\">
    <link rel=\"stylesheet\" crossorigin href=\"/assets/{cssn}\">
  </head>
  <body>
    <div id=\"app\"></div>
  </body>
</html>
""")
print("wrote", "$OUT/index.html")
PY
PUBLISH_SH="${HOME}/.agents/skills/here-now/scripts/publish.sh"
[[ -x "$PUBLISH_SH" ]] || PUBLISH_SH="${HOME}/.hermes/skills/here-now/scripts/publish.sh"
exec "$PUBLISH_SH" "$OUT" \
  --workspace alvit \
  --slug patient-kitten-xsbc \
  --spa \
  --overwrite \
  --client cursor \
  --title "Inverter Dashboard" \
  --description "Read-only Victron Vue dashboard via inverter-gateway (public). Writes disabled."
