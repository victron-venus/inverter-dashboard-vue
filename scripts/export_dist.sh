#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Victron Vue Dashboard Export Script
# =============================================================================
# Builds the Vue SPA and copies assets to:
#   - inverter-dashboard-go/internal/html/dist
#   - inverter-dashboard/src/inverter_dashboard/static
#
# Usage:
#   ./scripts/export_dist.sh          # SPA build (default)
#   ./scripts/export_dist.sh --lib    # Library build only
#   ./scripts/export_dist.sh --all    # Both SPA and library builds
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Paths
VUE_DIST="$PROJECT_ROOT/dist"
VUE_LIB_DIST="$PROJECT_ROOT/dist-lib"
GO_DIST="$PROJECT_ROOT/../inverter-dashboard-go/internal/html/dist"
GO_VUE_UI="$PROJECT_ROOT/../inverter-dashboard-go/internal/html/vue-ui"
PY_STATIC="$PROJECT_ROOT/../inverter-dashboard/src/inverter_dashboard/static"
PY_DIST="$PY_STATIC/dist"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse arguments
BUILD_MODE="${1:-spa}"

case "$BUILD_MODE" in
  --lib)
    BUILD_SPA=false
    BUILD_LIB=true
    ;;
  --all)
    BUILD_SPA=true
    BUILD_LIB=true
    ;;
  --help|-h)
    echo "Usage: $0 [--lib|--all]"
    echo "  (default)  Build SPA only"
    echo "  --lib      Build library only"
    echo "  --all      Build both SPA and library"
    exit 0
    ;;
  *)
    BUILD_SPA=true
    BUILD_LIB=false
    ;;
esac

# Navigate to project
cd "$PROJECT_ROOT"
log_info "Working directory: $PROJECT_ROOT"

# Check node_modules
if [ ! -d "node_modules" ]; then
  log_warn "node_modules not found, running npm install..."
  npm install
fi

# Build functions
build_spa() {
  log_info "Building SPA (mode: spa)..."
  npm run build
  log_success "SPA build complete: $VUE_DIST"
}

build_lib() {
  log_info "Building component library (mode: lib)..."
  npm run build -- --mode lib
  log_success "Library build complete: $VUE_LIB_DIST"
}

# Copy function
copy_assets() {
  local src="$1"
  local dest="$2"
  local label="$3"

  if [ ! -d "$src" ]; then
    log_error "Source directory not found: $src"
    return 1
  fi

  # Create destination if needed
  mkdir -p "$dest"

  # Copy with cleanup of old files
  log_info "Copying assets to $label..."
  rsync -av --delete "$src/" "$dest/"

  log_success "Assets synced to $dest"
}

# Build steps
if [ "$BUILD_SPA" = true ]; then
  build_spa

  # Deploy to both dashboards
  copy_assets "$VUE_DIST" "$GO_DIST" "inverter-dashboard-go/dist"
  copy_assets "$VUE_DIST" "$GO_VUE_UI" "inverter-dashboard-go/vue-ui"
  copy_assets "$VUE_DIST" "$PY_DIST" "inverter-dashboard"
fi

if [ "$BUILD_LIB" = true ]; then
  build_lib
  log_info "Library artifacts in $VUE_LIB_DIST:"
  ls -la "$VUE_LIB_DIST"
fi

# Summary
echo ""
echo "=========================================="
log_success "Export complete!"
echo "=========================================="
echo "SPA:       $VUE_DIST"
[ "$BUILD_LIB" = true ] && echo "Library:   $VUE_LIB_DIST"
echo "Go dist:   $GO_DIST"
echo "Go vue-ui: $GO_VUE_UI"
echo "Py deploy: $PY_DIST"
echo "=========================================="