#!/bin/bash

# DaVinci Auto-Update Script
# Checks for updates and applies them automatically.
# Replaces assets/ wholesale, then copies the root files declared in the
# release's .update-manifest (CLAUDE.md, companion docs, this script).
# All other workspace files (prototypes/, canvas-navigation-data.json, plugins/,
# davinci-users.json, etc.) are untouched.

set -e

# Self-exec guard: copy to temp and re-run from there so the script
# can safely overwrite itself on disk during the update.
if [ -z "$DAVINCI_REEXEC" ]; then
  TMPSCRIPT=$(mktemp /tmp/davinci-update.XXXXXX)
  cp "$0" "$TMPSCRIPT"
  chmod +x "$TMPSCRIPT"
  DAVINCI_REEXEC=1 exec "$TMPSCRIPT" "$@"
fi

# Configuration
REPO="Venturus-UIUX/davinci"
GH_HOST="github.pie.apple.com"
VERSION_FILE=".version"
LAST_CHECK_FILE=".davinci-last-check"
MANIFEST_FILE=".update-manifest"
CHECK_INTERVAL=86400  # seconds (24 hours)

# Colors (disable if terminal doesn't support them)
if [ -t 1 ] && command -v tput &>/dev/null && [ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]; then
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  RED='\033[0;31m'
  BLUE='\033[0;34m'
  NC='\033[0m'
else
  GREEN='' YELLOW='' RED='' BLUE='' NC=''
fi

# Read expected files from local manifest (falls back to empty list on first install)
# Used for self-recovery: if any expected file is missing locally, force a re-check
# even if we're still within the throttle window.
read_manifest_files() {
  local manifest=$1
  [ ! -f "$manifest" ] && return
  grep -v '^[[:space:]]*#' "$manifest" | grep -v '^[[:space:]]*$'
}

EXPECTED_FILES=$(read_manifest_files "$MANIFEST_FILE")
HAS_MISSING_PRECHECK=0
for EXPECTED in $EXPECTED_FILES; do
  # Skip davinci-update.sh — if it were missing, we wouldn't be running.
  [ "$EXPECTED" = "davinci-update.sh" ] && continue
  [ ! -f "./$EXPECTED" ] && HAS_MISSING_PRECHECK=1 && break
done

# Skip if checked recently (within CHECK_INTERVAL) AND no expected files are missing
if [ -f "$LAST_CHECK_FILE" ] && [ "$HAS_MISSING_PRECHECK" = "0" ]; then
  LAST_CHECK=$(cat "$LAST_CHECK_FILE" 2>/dev/null || echo "0")
  NOW=$(date +%s)
  ELAPSED=$((NOW - LAST_CHECK))
  if [ "$ELAPSED" -lt "$CHECK_INTERVAL" ]; then
    LOCAL_VERSION=$(cat "$VERSION_FILE" 2>/dev/null | tr -d '[:space:]' || echo "0.0.0")
    echo -e "${GREEN}DaVinci v${LOCAL_VERSION} — checked recently, skipping.${NC}"
    exit 0
  fi
fi

# Read local version
LOCAL_VERSION="0.0.0"
if [ -f "$VERSION_FILE" ]; then
  LOCAL_VERSION=$(cat "$VERSION_FILE" | tr -d '[:space:]')
fi

echo -e "${BLUE}DaVinci Update Check${NC}"
echo -e "Local version: v${LOCAL_VERSION}"

# ── Ensure gh CLI is available and authenticated ─────────────────────────────

# Auto-install gh if missing
if ! command -v gh &>/dev/null; then
  if command -v brew &>/dev/null; then
    echo -e "${YELLOW}Installing gh CLI (one-time setup)...${NC}"
    brew install gh 2>/dev/null
  else
    echo -e "${RED}ERROR: gh CLI not found and Homebrew not available.${NC}"
    echo -e "Install Homebrew: ${YELLOW}https://brew.sh${NC}"
    echo -e "Then run this script again."
    exit 1
  fi
fi

# Auto-auth if not authenticated with enterprise host
if ! GH_HOST="$GH_HOST" gh auth status &>/dev/null 2>&1; then
  echo -e "${YELLOW}GitHub authentication required (one-time setup).${NC}"
  echo -e "A browser window will open for you to log in."
  GH_HOST="$GH_HOST" gh auth login --hostname "$GH_HOST" --web --git-protocol ssh || {
    echo -e "${RED}ERROR: Authentication failed.${NC}"
    echo -e "Manual download: ${YELLOW}https://${GH_HOST}/${REPO}/releases/latest${NC}"
    exit 1
  }
fi

# ── Check for updates via gh API ─────────────────────────────────────────────

echo -e "Checking for updates..."
LATEST_TAG=$(GH_HOST="$GH_HOST" gh api "repos/${REPO}/releases/latest" --jq '.tag_name' 2>/dev/null || echo "")

if [ -z "$LATEST_TAG" ]; then
  echo -e "${RED}ERROR: Could not fetch latest release.${NC}"
  echo -e "Check: ${YELLOW}https://${GH_HOST}/${REPO}/releases${NC}"
  exit 1
fi

REMOTE_VERSION="${LATEST_TAG#v}"
echo -e "Latest version: v${REMOTE_VERSION}"

# Compare versions
MISSING_FILES=""
for EXPECTED in $EXPECTED_FILES; do
  [ "$EXPECTED" = "davinci-update.sh" ] && continue
  [ ! -f "./$EXPECTED" ] && MISSING_FILES="${MISSING_FILES} ${EXPECTED}"
done

if [ "$LOCAL_VERSION" = "$REMOTE_VERSION" ] && [ -z "$MISSING_FILES" ]; then
  date +%s > "$LAST_CHECK_FILE"
  echo -e "${GREEN}DaVinci v${LOCAL_VERSION} is up to date.${NC}"
  exit 0
fi

if [ "$LOCAL_VERSION" = "$REMOTE_VERSION" ] && [ -n "$MISSING_FILES" ]; then
  echo -e "${YELLOW}DaVinci v${LOCAL_VERSION} matches remote, but these expected files are missing:${MISSING_FILES}${NC}"
  echo -e "${YELLOW}Forcing re-sync to recover...${NC}"
fi

echo -e "${YELLOW}Update available: v${LOCAL_VERSION} → v${REMOTE_VERSION}${NC}"

# ── Download and apply update ────────────────────────────────────────────────

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

echo -e "Downloading release..."
GH_HOST="$GH_HOST" gh release download "$LATEST_TAG" \
  --repo "$REPO" \
  --pattern "DaVinci.zip" \
  --dir "$TMPDIR" \
  --clobber || {
  echo -e "${RED}ERROR: Failed to download release.${NC}"
  echo -e "Manual download: ${YELLOW}https://${GH_HOST}/${REPO}/releases/latest${NC}"
  exit 1
}

# Extract ZIP
ZIP_FILE=$(find "$TMPDIR" -name "DaVinci.zip" | head -1)
if [ -z "$ZIP_FILE" ]; then
  echo -e "${RED}ERROR: No ZIP file found in release.${NC}"
  exit 1
fi
EXTRACT_DIR="${TMPDIR}/extracted"
mkdir -p "$EXTRACT_DIR"
unzip -q "$ZIP_FILE" -d "$EXTRACT_DIR"

# Update assets folder (fully replaceable — user plugins live in root plugins/).
# rsync --delete only rewrites changed files; the previous rm+cp approach
# rewrote all ~4,500 files (mostly legacy icons/regular/) on every update,
# triggering slow cloud-sync / antivirus / Spotlight churn on designer machines.
# Once the legacy icons are seeded they never change, so we exclude them
# from subsequent syncs entirely — saves ~4,400 stat calls per update.
echo -e "Updating framework files..."
if [ -d "${EXTRACT_DIR}/assets" ]; then
  if [ -d "./assets/icons/regular" ] && [ -d "${EXTRACT_DIR}/assets/icons/regular" ]; then
    rsync -a --delete --exclude='icons/regular/' "${EXTRACT_DIR}/assets/" ./assets/
  else
    # First install OR release dropped legacy icons — full sync seeds or cleans up
    rsync -a --delete "${EXTRACT_DIR}/assets/" ./assets/
  fi
fi

# Seed files/ (navbar/canvas image assets — logos, icon). --ignore-existing:
# copy ONLY files the designer doesn't already have. This seeds the shipped
# logos on first install and adds genuinely new framework assets later, but
# NEVER overwrites a file the designer customized (e.g. their own icon.png) and
# NEVER removes images they added. Per-file seed semantics, not a sync.
if [ -d "${EXTRACT_DIR}/files" ]; then
  mkdir -p ./files
  rsync -a --ignore-existing "${EXTRACT_DIR}/files/" ./files/
fi

# Seed plugins/ on first install (never overwrite existing user plugins)
if [ ! -d "./plugins" ] && [ -d "./assets/plugins" ]; then
  echo -e "${YELLOW}First install — seeding plugins/ from framework seeds...${NC}"
  mkdir -p ./plugins
  cp ./assets/plugins/_component-index.md ./plugins/
  cp ./assets/plugins/plugins.css ./plugins/
  cp ./assets/plugins/plugins.js ./plugins/
  echo -e "${GREEN}Created plugins/ directory with seed files.${NC}"
fi

# Seed davinci-users.json on first install (never overwrite existing personas)
if [ ! -f "./davinci-users.json" ] && [ -f "./assets/canvas/davinci-users-data.json" ]; then
  echo -e "${YELLOW}First install — seeding davinci-users.json at workspace root...${NC}"
  cp ./assets/canvas/davinci-users-data.json ./davinci-users.json
  echo -e "${GREEN}Created davinci-users.json. Ask Claude to add impersonation personas.${NC}"
fi

# Update root files from manifest shipped inside the release. Falls back to
# the legacy hardcoded list if the release predates the manifest.
NEW_MANIFEST="${EXTRACT_DIR}/${MANIFEST_FILE}"
if [ -f "$NEW_MANIFEST" ]; then
  while IFS= read -r FILE; do
    case "$FILE" in
      ''|\#*) continue ;;
    esac
    SRC="${EXTRACT_DIR}/${FILE}"
    [ ! -f "$SRC" ] && continue
    cp "$SRC" "./${FILE}"
    case "$FILE" in
      davinci-update.sh) chmod +x "./${FILE}" ;;
    esac
  done < "$NEW_MANIFEST"
  # Persist manifest for the next run's precheck
  cp "$NEW_MANIFEST" "./$MANIFEST_FILE"
else
  # Legacy fallback: release ZIP has no manifest (pre-2.10 releases)
  for FILE in CLAUDE.md CHANGELOG.md MIGRATIONS.md PITFALLS.md TROUBLESHOOTING.md CHECKLIST.md HEURISTICS.md; do
    [ -f "${EXTRACT_DIR}/${FILE}" ] && cp "${EXTRACT_DIR}/${FILE}" "./${FILE}"
  done
  if [ -f "${EXTRACT_DIR}/davinci-update.sh" ]; then
    cp "${EXTRACT_DIR}/davinci-update.sh" ./davinci-update.sh
    chmod +x ./davinci-update.sh
  fi
fi

# Update version file
echo "$REMOTE_VERSION" > "$VERSION_FILE"
date +%s > "$LAST_CHECK_FILE"

# Create migration marker for Claude to detect in next session
echo "${LOCAL_VERSION}:${REMOTE_VERSION}" > ".davinci-migrate"

echo ""
echo -e "${GREEN}DaVinci updated: v${LOCAL_VERSION} → v${REMOTE_VERSION}${NC}"

# Show migration notice if MIGRATIONS.md exists
if [ -f "MIGRATIONS.md" ]; then
  echo ""
  echo -e "${YELLOW}⚠ Breaking changes may affect your prototypes.${NC}"
  echo -e "  After starting a new chat, Claude will automatically scan and fix affected prototypes."
fi

# Show changelog entries since old version
if [ -f "CHANGELOG.md" ]; then
  echo ""
  echo -e "${BLUE}What's new since v${LOCAL_VERSION}:${NC}"
  awk -v old="$LOCAL_VERSION" '
    /^## \[/{ver=$2; gsub(/[\[\]]/, "", ver)}
    ver && ver != "Unreleased" && ver != old {print}
    ver == old {exit}
  ' CHANGELOG.md
fi
