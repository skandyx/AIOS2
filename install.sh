#!/bin/bash
# ============================================================
#  AIOS - AI Operating System :: Installation Script
#  Target: Debian 11+ / Ubuntu 20.04+
#  Runtime: Bun
# ============================================================

# Do NOT use 'set -e' — we handle errors gracefully so the
# installation always completes and the user can add API keys later.

# ----- Colors & Helpers ----- #
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; }
header()  { echo -e "\n${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${CYAN}${BOLD}  $*${NC}"; echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"; }

# ----- Project Configuration ----- #
# Auto-detect the directory where this script lives.
# This way, the script works whether you cloned from git OR
# downloaded and extracted a zip/tar.gz archive.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$SCRIPT_DIR}"
DEV_PORT=3000
WS_PORT=3003
DB_DIR="${PROJECT_DIR}/db"

# ============================================================
#  Step 1: OS Check
# ============================================================
header "Step 1 / 8 — Checking Operating System"

if [[ ! -f /etc/os-release ]]; then
    error "Cannot determine OS — /etc/os-release not found."
    error "This script targets Debian 11+ or Ubuntu 20.04+."
    error "You can still try running it manually, but some steps may fail."
else
    source /etc/os-release

    case "$ID" in
        debian)
            if [[ "$(echo "$VERSION_ID" | awk -F. '{print $1}')" -lt 11 ]]; then
                warn "Debian $VERSION_ID is not officially supported. Minimum: Debian 11."
                warn "Continuing anyway — your mileage may vary."
            else
                success "Debian $VERSION_ID detected — supported."
            fi
            ;;
        ubuntu)
            if [[ "$(echo "$VERSION_ID" | awk -F. '{print $1}')" -lt 20 ]]; then
                warn "Ubuntu $VERSION_ID is not officially supported. Minimum: Ubuntu 20.04."
                warn "Continuing anyway — your mileage may vary."
            else
                success "Ubuntu $VERSION_ID detected — supported."
            fi
            ;;
        *)
            warn "Unsupported OS: $ID. This script targets Debian 11+ or Ubuntu 20.04+."
            warn "Continuing anyway — some steps may need manual adjustments."
            ;;
    esac
fi

# ============================================================
#  Step 2: Install System Dependencies
# ============================================================
header "Step 2 / 8 — Installing System Dependencies"

SYS_DEPS=(curl git build-essential python3 python3-pip pkg-config libssl-dev)

MISSING=()
for dep in "${SYS_DEPS[@]}"; do
    if ! dpkg -s "$dep" &>/dev/null; then
        MISSING+=("$dep")
    fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
    info "Installing missing packages: ${MISSING[*]}"
    sudo apt-get update -qq
    sudo apt-get install -y -qq "${MISSING[@]}" || warn "Some packages may have failed to install. Continuing..."
    success "System dependencies step completed."
else
    success "All system dependencies already satisfied."
fi

# ============================================================
#  Step 3: Install Bun
# ============================================================
header "Step 3 / 8 — Installing Bun Runtime"

if command -v bun &>/dev/null; then
    BUN_VERSION=$(bun --version 2>/dev/null || echo "unknown")
    success "Bun is already installed (v${BUN_VERSION})."
else
    info "Installing Bun..."
    curl -fsSL https://bun.sh/install | bash

    # Source Bun so it's available in this shell
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"

    if command -v bun &>/dev/null; then
        success "Bun installed successfully ($(bun --version))."
    else
        error "Bun installation failed."
        error "Please install manually: curl -fsSL https://bun.sh/install | bash"
        error "Then re-run this script."
        exit 1
    fi
fi

# Ensure Bun is on PATH for subsequent commands
export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

# ============================================================
#  Step 4: Detect or Navigate to Project
# ============================================================
header "Step 4 / 8 — Setting Up Project Directory"

cd "${PROJECT_DIR}" || {
    error "Cannot change to project directory: ${PROJECT_DIR}"
    exit 1
}

if [[ -f "${PROJECT_DIR}/package.json" ]]; then
    success "Project found at ${PROJECT_DIR}."
    # Try to pull latest if it's a git repo
    if git rev-parse --is-inside-work-tree &>/dev/null; then
        info "Git repository detected. Pulling latest changes..."
        git pull --ff-only 2>/dev/null && success "Repository updated." || warn "Could not pull latest changes (maybe local modifications?)."
    else
        info "Not a git repository — skipping pull (downloaded archive mode)."
    fi
else
    error "No package.json found in ${PROJECT_DIR}."
    error "Make sure you are running this script from the AIOS project root."
    error "Current directory: $(pwd)"
    exit 1
fi

# ============================================================
#  Step 5: Install Project Dependencies
# ============================================================
header "Step 5 / 8 — Installing Project Dependencies"

if [[ ! -f "package.json" ]]; then
    error "package.json not found in ${PROJECT_DIR}."
    exit 1
fi

info "Running bun install..."
if bun install; then
    success "Project dependencies installed."
else
    error "bun install failed. Trying with --force..."
    bun install --force || {
        error "Failed to install dependencies. Please check the error above."
        exit 1
    }
fi

# ============================================================
#  Step 6: Configure Environment
# ============================================================
header "Step 6 / 8 — Configuring Environment"

if [[ ! -f ".env" ]]; then
    info "Creating .env file with default values..."
    mkdir -p "${DB_DIR}"

    cat > .env << ENVEOF
# ============================================
# AIOS — Environment Configuration
# ============================================
# This file was auto-generated by install.sh.
# Edit it to add your API keys — the app works
# without any keys using the built-in Z-AI provider.
# ============================================

# ── Database ──────────────────────────────────
DATABASE_URL="file:${DB_DIR}/custom.db"

# ── AI Provider API Keys ──────────────────────
# Z-AI (Built-in) — No key required, works out of the box
MISTRAL_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
DEEPSEEK_API_KEY=

# ── Local AI (Ollama) ─────────────────────────
OLLAMA_BASE_URL=http://localhost:11434

# ── WebSocket ─────────────────────────────────
WS_PORT=3003

# ── Application ───────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENVEOF

    success ".env created with default values."
    warn ""
    warn "╔══════════════════════════════════════════════════════════╗"
    warn "║  API keys are OPTIONAL — AIOS works without them!       ║"
    warn "║  The built-in Z-AI provider requires no API key.        ║"
    warn "║                                                          ║"
    warn "║  To add keys later, edit:                                ║"
    warn "║    ${PROJECT_DIR}/.env                                   ║"
    warn "╚══════════════════════════════════════════════════════════╝"
    warn ""
else
    success ".env already exists — leaving it untouched."
fi

# ============================================================
#  Step 7: Initialize Prisma Database
# ============================================================
header "Step 7 / 8 — Initializing Prisma Database"

mkdir -p "${DB_DIR}"

# Step 7a: Generate Prisma client (REQUIRED before db:push)
info "Generating Prisma client..."
if bunx prisma generate; then
    success "Prisma client generated."
else
    warn "Prisma generate failed. Trying alternative..."
    npx prisma generate 2>/dev/null || warn "Could not generate Prisma client automatically."
    warn "You can run manually: bunx prisma generate"
fi

# Step 7b: Push schema to database
if [[ -f "${DB_DIR}/custom.db" ]]; then
    info "SQLite database already exists at ${DB_DIR}/custom.db."
    info "Syncing schema..."
else
    info "No existing database found — creating one..."
fi

if bun run db:push; then
    success "Prisma database initialized and schema synced."
else
    warn ""
    warn "Database initialization did not complete automatically."
    warn "This is usually not a problem — it may just need API keys."
    warn ""
    warn "You can initialize the database manually later:"
    warn "  cd ${PROJECT_DIR}"
    warn "  bunx prisma generate"
    warn "  bunx prisma db push"
    warn ""
    warn "Continuing installation — the app will still start."
fi

# ============================================================
#  Step 8: Start Services
# ============================================================
header "Step 8 / 8 — Starting Services"

# --- Start Next.js Dev Server ---
info "Starting AIOS development server on port ${DEV_PORT}..."
bun run dev &
DEV_PID=$!
success "Dev server started (PID ${DEV_PID}, http://localhost:${DEV_PORT})"

# --- Start WebSocket Server ---
WS_ENTRY="${PROJECT_DIR}/mini-services/aios-ws/index.ts"
if [[ -f "$WS_ENTRY" ]]; then
    info "Starting WebSocket service on port ${WS_PORT}..."
    cd "${PROJECT_DIR}/mini-services/aios-ws" && bun run dev &
    WS_PID=$!
    cd "${PROJECT_DIR}"
    success "WebSocket server started (PID ${WS_PID}, ws://localhost:${WS_PORT})"
elif [[ -f "${PROJECT_DIR}/ws-server.js" ]]; then
    info "Starting WebSocket service (legacy) on port ${WS_PORT}..."
    bun run "${PROJECT_DIR}/ws-server.js" &
    WS_PID=$!
    success "WebSocket server started (PID ${WS_PID}, ws://localhost:${WS_PORT})"
else
    warn "WebSocket entry point not found — skipping WebSocket service."
    WS_PID=""
fi

# Give services a moment to bind
sleep 3

# ============================================================
#  Success Banner
# ============================================================
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║                                                              ║${NC}"
echo -e "${GREEN}${BOLD}║          🚀  AIOS Installation Complete!  🚀                 ║${NC}"
echo -e "${GREEN}${BOLD}║                                                              ║${NC}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║                                                              ║${NC}"
echo -e "${GREEN}${BOLD}║  🌐  App:       http://localhost:${DEV_PORT}                        ║${NC}"
if [[ -n "$WS_PID" ]]; then
echo -e "${GREEN}${BOLD}║  🔌  WebSocket: ws://localhost:${WS_PORT}                           ║${NC}"
fi
echo -e "${GREEN}${BOLD}║  📁  Directory: ${PROJECT_DIR}                 ${NC}"
echo -e "${GREEN}${BOLD}║  ⚙️  Config:     ${PROJECT_DIR}/.env                   ${NC}"
echo -e "${GREEN}${BOLD}║                                                              ║${NC}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║                                                              ║${NC}"
echo -e "${GREEN}${BOLD}║  📋  Next Steps:                                              ║${NC}"
echo -e "${GREEN}${BOLD}║                                                              ║${NC}"
echo -e "${GREEN}${BOLD}║  1. Open http://localhost:${DEV_PORT} in your browser              ║${NC}"
echo -e "${GREEN}${BOLD}║  2. The built-in Z-AI provider works without API keys        ║${NC}"
echo -e "${GREEN}${BOLD}║  3. To add more AI providers, edit .env:                     ║${NC}"
echo -e "${GREEN}${BOLD}║       nano ${PROJECT_DIR}/.env                                ║${NC}"
echo -e "${GREEN}${BOLD}║  4. Restart services after updating .env:                    ║${NC}"
echo -e "${GREEN}${BOLD}║       kill ${DEV_PID}${WS_PID:+ $WS_PID} && ./install.sh                            ${NC}"
echo -e "${GREEN}${BOLD}║                                                              ║${NC}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║                                                              ║${NC}"
echo -e "${GREEN}${BOLD}║  🛑  To stop services:                                        ║${NC}"
echo -e "${GREEN}${BOLD}║       kill ${DEV_PID}${WS_PID:+ $WS_PID}                                    ${NC}"
echo -e "${GREEN}${BOLD}║       (or press Ctrl+C)                                      ║${NC}"
echo -e "${GREEN}${BOLD}║                                                              ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Keep script alive so background processes don't get SIGHUP
info "Press Ctrl+C to stop all services and exit."
wait
