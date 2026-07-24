#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Victron Vue Dashboard Build Script
# =============================================================================
# Build Vue SPA for the victron-venus dashboard ecosystem.
#
# This script runs in CI of inverter-dashboard-vue repository.
# The built dist/ is uploaded as a GitHub Release asset and can be
# fetched by other repositories (inverter-dashboard, inverter-dashboard-go).
#
# Usage:
#   ./scripts/build.sh            # SPA build (default)
#   ./scripts/build.sh --lib      # Library build only
#   ./scripts/build.sh --all      # Both builds
#   ./scripts/build.sh --check    # TypeScript type check only
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Output paths
VUE_DIST="$PROJECT_ROOT/dist"
VUE_LIB_DIST="$PROJECT_ROOT/dist-lib"
BUILD_OUTPUT_DIR="${BUILD_OUTPUT_DIR:-$PROJECT_ROOT/build}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}   $*"; }
log_success() { echo -e "${GREEN}[OK]${NC}     $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# Parse arguments
BUILD_MODE="${1:-spa}"
shift || true

case "$BUILD_MODE" in
  --lib|--library)
    BUILD_SPA=false
    BUILD_LIB=true
    ;;
  --all)
    BUILD_SPA=true
    BUILD_LIB=true
    ;;
  --check)
    BUILD_SPA=false
    BUILD_LIB=false
    TYPE_CHECK_ONLY=true
    ;;
  --help|-h)
    cat << 'EOF'
Usage: ./scripts/build.sh [OPTIONS]

Options:
  (default)   Build SPA only
  --lib        Build library only (UMD + ES modules for npm)
  --all        Build both SPA and library
  --check      TypeScript type check only (no output)

Environment:
  BUILD_OUTPUT_DIR   Set output directory (default: ./build)
EOF
    exit 0
    ;;
  *)
    BUILD_SPA=true
    BUILD_LIB=false
    TYPE_CHECK_ONLY=false
    ;;
esac

cd "$PROJECT_ROOT"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  log_info "Installing dependencies..."
  npm ci
fi

# TypeScript check
log_info "Running TypeScript check..."
npx tsc --noEmit
log_success "TypeScript check passed"

# Exit if only type check requested
if [ "${TYPE_CHECK_ONLY:-false}" = true ]; then
  log_success "Type check complete, no build output"
  exit 0
fi

# Ensure output directory
mkdir -p "$BUILD_OUTPUT_DIR"

# Build functions
build_spa() {
  log_info "Building SPA..."
  npm run build
  cp -r "$VUE_DIST" "$BUILD_OUTPUT_DIR/spa"
  log_success "SPA build: $BUILD_OUTPUT_DIR/spa"
}

build_lib() {
  log_info "Building component library..."
  npm run build:lib
  cp -r "$VUE_LIB_DIST" "$BUILD_OUTPUT_DIR/lib"
  log_success "Library build: $BUILD_OUTPUT_DIR/lib"
}

# Build steps
[ "$BUILD_SPA" = true ] && build_spa
[ "$BUILD_LIB" = true ] && build_lib

# Summary
echo ""
echo "=========================================="
log_success "Build complete!"
echo "=========================================="
echo "Output:  $BUILD_OUTPUT_DIR"
[ "$BUILD_SPA" = true ] && echo "  SPA:    $BUILD_OUTPUT_DIR/spa"
[ "$BUILD_LIB" = true ] && echo "  Lib:    $BUILD_OUTPUT_DIR/lib"
echo ""
echo "To publish:"
echo "  1. Create GitHub Release with this tag"
echo "  2. Upload build artifacts as release assets"
echo ""
echo "Other repos can download via:"
echo "  gh release download -R victron-venus/inverter-dashboard-vue <tag> --pattern 'spa/*'"
echo "=========================================="