#!/bin/bash
# ============================================================
#  AIOS - AI Operating System :: Installation Script
#  Target: Debian 11+ / Ubuntu 20.04+
#  Runtime: Bun
# ============================================================

set -e

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
PROJECT_DIR="/home/z/my-project"
REPO_URL=""  # Set this to your git repo URL, e.g. "https://github.com/your-org/aios.git"
DEV_PORT=3000
WS_PORT=3003
DB_DIR="${PROJECT_DIR}/db"

# ============================================================
#  Step 1: OS Check
# ============================================================
header "Step 1 / 8 — Checking Operating System"

if [[ ! -f /etc/os-release ]]; then
    error "Cannot determine OS — /etc/os-release not found."
    exit 1
fi

source /etc/os-release

case "$ID" in
    debian)
        if [[ "$(echo "$VERSION_ID" | awk -F. '{print $1}')" -lt 11 ]]; then
            error "Debian $VERSION_ID is not supported. Minimum: Debian 11."
            exit 1
        fi
        success "Debian $VERSION_ID detected — supported."
        ;;
    ubuntu)
        if [[ "$(echo "$VERSION_ID" | awk -F. '{print $1}')" -lt 20 ]]; then
            error "Ubuntu $VERSION_ID is not supported. Minimum: Ubuntu 20.04."
            exit 1
        fi
        success "Ubuntu $VERSION_ID detected — supported."
        ;;
    *)
        error "Unsupported OS: $ID. This script targets Debian 11+ or Ubuntu 20.04+."
        exit 1
        ;;
esac

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
    sudo apt-get install -y -qq "${MISSING[@]}"
    success "System dependencies installed."
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
        error "Bun installation failed. Please install manually: curl -fsSL https://bun.sh/install | bash"
        exit 1
    fi
fi

# Ensure Bun is on PATH for subsequent commands
export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

# ============================================================
#  Step 4: Clone or Detect Project
# ============================================================
header "Step 4 / 8 — Setting Up Project Directory"

if [[ -d "${PROJECT_DIR}" && -f "${PROJECT_DIR}/package.json" ]]; then
    success "Existing project detected at ${PROJECT_DIR}."
    cd "${PROJECT_DIR}"
    info "Pulling latest changes (if this is a git repo)..."
    if git rev-parse --is-inside-work-tree &>/dev/null; then
        git pull --ff-only 2>/dev/null && success "Repository updated." || warn "Could not pull latest changes (maybe local modifications?)."
    else
        warn "Not a git repository — skipping pull."
    fi
elif [[ -n "$REPO_URL" ]]; then
    info "Cloning repository from ${REPO_URL}..."
    git clone "$REPO_URL" "${PROJECT_DIR}"
    cd "${PROJECT_DIR}"
    success "Repository cloned."
else
    warn "No existing project and REPO_URL is not set."
    error "Please either:"
    error "  1. Clone the repo manually, or"
    error "  2. Set REPO_URL at the top of this script."
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
bun install

success "Project dependencies installed."

# ============================================================
#  Step 6: Configure Environment
# ============================================================
header "Step 6 / 8 — Configuring Environment"

if [[ ! -f ".env" ]]; then
    if [[ -f ".env.example" ]]; then
        cp .env.example .env
        warn ".env created from .env.example."
        warn "Please edit .env and add your API keys before running the app:"
        warn "  ${PROJECT_DIR}/.env"
    else
        info "No .env.example found — generating default .env..."
        mkdir -p "${DB_DIR}"
        cat > .env << 'ENVEOF'
DATABASE_URL=file:/home/z/my-project/db/custom.db

# AI Model Provider API Keys
MISTRAL_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
DEEPSEEK_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
ENVEOF
        warn ".env generated with defaults."
        warn "Please edit .env and add your API keys:"
        warn "  ${PROJECT_DIR}/.env"
    fi
else
    success ".env already exists — leaving it untouched."
fi

# ============================================================
#  Step 7: Initialize Prisma Database
# ============================================================
header "Step 7 / 8 — Initializing Prisma Database"

mkdir -p "${DB_DIR}"

if [[ -f "${DB_DIR}/custom.db" ]]; then
    info "SQLite database already exists at ${DB_DIR}/custom.db."
    info "Running db:push to sync schema..."
else
    info "No existing database found — running db:push to create one..."
fi

bun run db:push

success "Prisma database initialized and schema synced."

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
WS_ENTRY="${PROJECT_DIR}/ws-server.js"
if [[ -f "$WS_ENTRY" ]]; then
    info "Starting WebSocket service on port ${WS_PORT}..."
    bun run "$WS_ENTRY" &
    WS_PID=$!
    success "WebSocket server started (PID ${WS_PID}, ws://localhost:${WS_PORT})"
else
    warn "ws-server.js not found — skipping WebSocket service."
    warn "If your project uses a different WS entry point, edit this script."
    WS_PID=""
fi

# Give services a moment to bind
sleep 3

# ============================================================
#  Success Banner
# ============================================================
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║                                                          ║${NC}"
echo -e "${GREEN}${BOLD}║          🚀  AIOS Installation Complete!  🚀             ║${NC}"
echo -e "${GREEN}${BOLD}║                                                          ║${NC}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║                                                          ║${NC}"
echo -e "${GREEN}${BOLD}║  🌐  App:     http://localhost:${DEV_PORT}                    ║${NC}"
if [[ -n "$WS_PID" ]]; then
echo -e "${GREEN}${BOLD}║  🔌  WS:      ws://localhost:${WS_PORT}                      ║${NC}"
fi
echo -e "${GREEN}${BOLD}║  📁  Dir:     ${PROJECT_DIR}          ${NC}"
echo -e "${GREEN}${BOLD}║  ⚙️  Config:   ${PROJECT_DIR}/.env             ${NC}"
echo -e "${GREEN}${BOLD}║                                                          ║${NC}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║                                                          ║${NC}"
echo -e "${GREEN}${BOLD}║  Next Steps:                                              ║${NC}"
echo -e "${GREEN}${BOLD}║    1. Edit .env with your API keys                        ║${NC}"
echo -e "${GREEN}${BOLD}║    2. Restart services if keys were updated               ║${NC}"
echo -e "${GREEN}${BOLD}║    3. Open http://localhost:${DEV_PORT} in your browser        ║${NC}"
echo -e "${GREEN}${BOLD}║                                                          ║${NC}"
echo -e "${GREEN}${BOLD}║  To stop services:                                        ║${NC}"
echo -e "${GREEN}${BOLD}║    kill ${DEV_PID}${WS_PID:+ $WS_PID}                                  ║${NC}"
echo -e "${GREEN}${BOLD}║                                                          ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Keep script alive so background processes don't get SIGHUP
info "Press Ctrl+C to stop all services and exit."
wait
