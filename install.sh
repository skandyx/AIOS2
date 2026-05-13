#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# AIOS — AI Operating System — Installation Script
# Compatible: Debian 11+ / Ubuntu 20.04+
# Usage: sudo ./install.sh [OPTIONS]
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ─── Variables ────────────────────────────────────────────────────────────
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_MAJOR=20
BUN_INSTALL_DIR="$HOME/.bun"
LOG_FILE="/tmp/aios-install.log"
MODE="dev"  # dev or prod

# ─── Parse Arguments ─────────────────────────────────────────────────────
SKIP_SYSTEM=false
SKIP_BUN=false
SKIP_NODE=false
SKIP_NPM_INSTALL=false
SKIP_DB=false
START_SERVICES=true

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-system)   SKIP_SYSTEM=true; shift ;;
    --skip-bun)      SKIP_BUN=true; shift ;;
    --skip-node)     SKIP_NODE=true; shift ;;
    --skip-install)  SKIP_NPM_INSTALL=true; shift ;;
    --skip-db)       SKIP_DB=true; shift ;;
    --no-start)      START_SERVICES=false; shift ;;
    --dev)           MODE="dev"; shift ;;
    --prod)          MODE="prod"; shift ;;
    --help|-h)       echo "Usage: sudo ./install.sh [OPTIONS]"; echo ""; echo "Options:"; echo "  --skip-system   Skip system package installation"; echo "  --skip-bun      Skip Bun installation"; echo "  --skip-node     Skip Node.js installation"; echo "  --skip-install  Skip npm dependency installation"; echo "  --skip-db       Skip database initialization"; echo "  --no-start      Do not start services after install"; echo "  --dev           Development mode (default)"; echo "  --prod          Production mode (build + start)"; echo "  --help          Show this help message"; exit 0 ;;
    *) echo -e "${RED}Unknown option: $1${NC}"; exit 1 ;;
  esac
done

# ─── Helper Functions ────────────────────────────────────────────────────
log()  { echo -e "${CYAN}[AIOS]${NC} $1"; }
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

command_exists() {
  command -v "$1" &>/dev/null
}

check_root() {
  if [[ $EUID -eq 0 ]]; then
    warn "Running as root — npm global installs may use root home."
  fi
}

# ─── Pre-flight Checks ───────────────────────────────────────────────────
preflight() {
  log "Running pre-flight checks..."

  # Check OS
  if [[ ! -f /etc/os-release ]]; then
    err "Cannot detect OS. This script requires Debian or Ubuntu."
  fi
  source /etc/os-release
  if [[ "$ID" != "debian" && "$ID" != "ubuntu" ]]; then
    err "Unsupported OS: $ID. This script requires Debian or Ubuntu."
  fi
  ok "OS: $PRETTY_NAME"

  # Check architecture
  ARCH=$(uname -m)
  if [[ "$ARCH" != "x86_64" && "$ARCH" != "aarch64" && "$ARCH" != "arm64" ]]; then
    err "Unsupported architecture: $ARCH. Only x86_64 and aarch64/arm64 are supported."
  fi
  ok "Architecture: $ARCH"

  # Check RAM (minimum 2GB)
  TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
  TOTAL_RAM_GB=$((TOTAL_RAM_KB / 1024 / 1024))
  if [[ $TOTAL_RAM_GB -lt 1 ]]; then
    err "Insufficient RAM: ${TOTAL_RAM_GB}GB. Minimum 2GB recommended."
  fi
  ok "RAM: ${TOTAL_RAM_GB}GB"

  # Check disk space (minimum 1GB free)
  AVAILABLE_DISK_KB=$(df "$PROJECT_DIR" | awk 'NR==2 {print $4}')
  AVAILABLE_DISK_GB=$((AVAILABLE_DISK_KB / 1024 / 1024))
  if [[ $AVAILABLE_DISK_GB -lt 1 ]]; then
    err "Insufficient disk space: ${AVAILABLE_DISK_GB}GB. Minimum 1GB required."
  fi
  ok "Disk: ${AVAILABLE_DISK_GB}GB available"
}

# ─── Install System Dependencies ─────────────────────────────────────────
install_system_deps() {
  log "Installing system dependencies..."

  apt-get update -qq

  apt-get install -y -qq \
    curl \
    unzip \
    git \
    build-essential \
    python3 \
    ca-certificates \
    gnupg \
    lsof \
    procps \
  2>&1 | tee -a "$LOG_FILE" > /dev/null

  ok "System dependencies installed"
}

# ─── Install Bun ──────────────────────────────────────────────────────────
install_bun() {
  if command_exists bun; then
    ok "Bun already installed: $(bun --version)"
    return
  fi

  log "Installing Bun runtime..."

  # Detect arch for Bun install
  BUN_ARCH=""
  case $(uname -m) in
    x86_64)  BUN_ARCH="x64" ;;
    aarch64|arm64) BUN_ARCH="arm64" ;;
    *)       err "Unsupported arch for Bun: $(uname -m)" ;;
  esac

  curl -fsSL https://bun.sh/install | bash 2>&1 | tee -a "$LOG_FILE"

  # Source bun in current shell
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"

  if [[ -f "$HOME/.bashrc" ]]; then
    source "$HOME/.bashrc" 2>/dev/null || true
  fi

  # Verify
  if command_exists bun; then
    ok "Bun installed: $(bun --version)"
  else
    # Try with full path
    if [[ -x "$HOME/.bun/bin/bun" ]]; then
      export PATH="$HOME/.bun/bin:$PATH"
      ok "Bun installed: $(bun --version)"
    else
      err "Bun installation failed. Install manually: curl -fsSL https://bun.sh/install | bash"
    fi
  fi
}

# ─── Install Node.js ─────────────────────────────────────────────────────
install_node() {
  if command_exists node; then
    NODE_VERSION=$(node --version)
    ok "Node.js already installed: $NODE_VERSION"
    return
  fi

  log "Installing Node.js $NODE_MAJOR.x..."

  # Add NodeSource repository
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - 2>&1 | tee -a "$LOG_FILE" > /dev/null

  apt-get install -y -qq nodejs 2>&1 | tee -a "$LOG_FILE" > /dev/null

  if command_exists node; then
    ok "Node.js installed: $(node --version)"
    ok "npm installed: $(npm --version)"
  else
    err "Node.js installation failed"
  fi
}

# ─── Install Project Dependencies ────────────────────────────────────────
install_project_deps() {
  log "Installing project dependencies..."

  cd "$PROJECT_DIR"

  # Ensure bun is in PATH
  export PATH="$HOME/.bun/bin:$PATH"

  if ! command_exists bun; then
    err "Bun not found in PATH. Make sure Bun is installed."
  fi

  # Main project
  log "Installing main project dependencies..."
  bun install 2>&1 | tee -a "$LOG_FILE"

  # WebSocket mini-service
  log "Installing WebSocket service dependencies..."
  cd "$PROJECT_DIR/mini-services/aios-ws"
  bun install 2>&1 | tee -a "$LOG_FILE"
  cd "$PROJECT_DIR"

  ok "Project dependencies installed"
}

# ─── Initialize Database ─────────────────────────────────────────────────
init_database() {
  log "Initializing database..."

  cd "$PROJECT_DIR"

  # Ensure the db directory exists
  mkdir -p db

  # Push Prisma schema
  bun run db:push 2>&1 | tee -a "$LOG_FILE"

  # Generate Prisma client
  bun run db:generate 2>&1 | tee -a "$LOG_FILE"

  ok "Database initialized (SQLite at db/custom.db)"
}

# ─── Build for Production ────────────────────────────────────────────────
build_production() {
  log "Building for production..."

  cd "$PROJECT_DIR"

  bun run build 2>&1 | tee -a "$LOG_FILE"

  ok "Production build complete"
}

# ─── Start Services ──────────────────────────────────────────────────────
start_services() {
  log "Starting AIOS services..."

  cd "$PROJECT_DIR"

  # Kill any existing processes
  pkill -f "next dev" 2>/dev/null || true
  pkill -f "next start" 2>/dev/null || true
  pkill -f "aios-ws" 2>/dev/null || true
  sleep 1

  # Start WebSocket service
  log "Starting WebSocket service on port 3003..."
  cd "$PROJECT_DIR/mini-services/aios-ws"
  nohup bun --hot index.ts > /tmp/aios-ws.log 2>&1 &
  WS_PID=$!
  cd "$PROJECT_DIR"

  # Wait for WS to start
  sleep 2
  if kill -0 $WS_PID 2>/dev/null; then
    ok "WebSocket service started (PID: $WS_PID, port: 3003)"
  else
    warn "WebSocket service may not have started. Check: /tmp/aios-ws.log"
  fi

  # Start Next.js
  if [[ "$MODE" == "prod" ]]; then
    log "Starting Next.js in production mode on port 3000..."
    nohup bun run start > /tmp/aios-next.log 2>&1 &
  else
    log "Starting Next.js in development mode on port 3000..."
    nohup bun run dev > /tmp/aios-next.log 2>&1 &
  fi
  NEXT_PID=$!

  # Wait for Next.js to start
  sleep 5
  if kill -0 $NEXT_PID 2>/dev/null; then
    ok "Next.js started (PID: $NEXT_PID, port: 3000)"
  else
    warn "Next.js may not have started. Check: /tmp/aios-next.log"
  fi

  # Save PIDs for later
  echo "$NEXT_PID" > /tmp/aios-next.pid
  echo "$WS_PID" > /tmp/aios-ws.pid
}

# ─── Health Check ────────────────────────────────────────────────────────
health_check() {
  log "Running health checks..."

  # Check Next.js
  if curl -sf -o /dev/null -m 5 http://localhost:3000 2>/dev/null; then
    ok "Next.js: responding on port 3000"
  else
    warn "Next.js: not responding on port 3000 (may still be starting)"
  fi

  # Check API
  if curl -sf -o /dev/null -m 5 http://localhost:3000/api/monitoring 2>/dev/null; then
    ok "API: /api/monitoring responding"
  else
    warn "API: /api/monitoring not responding yet"
  fi

  # Check WebSocket
  if lsof -i :3003 &>/dev/null; then
    ok "WebSocket: listening on port 3003"
  else
    warn "WebSocket: not listening on port 3003"
  fi
}

# ─── Print Summary ───────────────────────────────────────────────────────
print_summary() {
  echo ""
  echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}${CYAN}  AIOS — AI Operating System — Installation Complete!  ${NC}"
  echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "  ${GREEN}➜${NC}  Application:  http://localhost:3000"
  echo -e "  ${GREEN}➜${NC}  WebSocket:    ws://localhost:3003"
  echo -e "  ${GREEN}➜${NC}  Mode:         ${MODE}"
  echo -e "  ${GREEN}➜${NC}  Database:     ${PROJECT_DIR}/db/custom.db"
  echo ""
  echo -e "  ${CYAN}Commands:${NC}"
  echo -e "    Start dev:       cd ${PROJECT_DIR} && bun run dev"
  echo -e "    Start WS:        cd ${PROJECT_DIR}/mini-services/aios-ws && bun run dev"
  echo -e "    Lint:            cd ${PROJECT_DIR} && bun run lint"
  echo -e "    Reset DB:        cd ${PROJECT_DIR} && bun run db:reset"
  echo ""
  echo -e "  ${CYAN}Stop services:${NC}"
  echo -e "    kill \$(cat /tmp/aios-next.pid) 2>/dev/null"
  echo -e "    kill \$(cat /tmp/aios-ws.pid) 2>/dev/null"
  echo ""
  echo -e "  ${CYAN}Logs:${NC}"
  echo -e "    Next.js:  /tmp/aios-next.log"
  echo -e "    WebSocket: /tmp/aios-ws.log"
  echo -e "    Install:  ${LOG_FILE}"
  echo ""
  echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

main() {
  echo ""
  echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}${CYAN}  AIOS — AI Operating System — Installer              ${NC}"
  echo -e "${BOLD}${CYAN}  For Debian 11+ / Ubuntu 20.04+                       ${NC}"
  echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════${NC}"
  echo ""

  # Init log
  echo "AIOS Install Log — $(date)" > "$LOG_FILE"
  echo "Mode: $MODE" >> "$LOG_FILE"
  echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)" >> "$LOG_FILE"
  echo "" >> "$LOG_FILE"

  # Step 1: Pre-flight
  preflight

  # Step 2: System deps
  if [[ "$SKIP_SYSTEM" == false ]]; then
    install_system_deps
  else
    warn "Skipping system package installation (--skip-system)"
  fi

  # Step 3: Bun
  if [[ "$SKIP_BUN" == false ]]; then
    install_bun
  else
    warn "Skipping Bun installation (--skip-bun)"
  fi

  # Step 4: Node.js
  if [[ "$SKIP_NODE" == false ]]; then
    install_node
  else
    warn "Skipping Node.js installation (--skip-node)"
  fi

  # Step 5: Project dependencies
  if [[ "$SKIP_NPM_INSTALL" == false ]]; then
    install_project_deps
  else
    warn "Skipping npm install (--skip-install)"
  fi

  # Step 6: Database
  if [[ "$SKIP_DB" == false ]]; then
    init_database
  else
    warn "Skipping database initialization (--skip-db)"
  fi

  # Step 7: Build (prod only)
  if [[ "$MODE" == "prod" ]]; then
    build_production
  fi

  # Step 8: Start services
  if [[ "$START_SERVICES" == true ]]; then
    start_services
    sleep 3
    health_check
  else
    warn "Not starting services (--no-start)"
  fi

  # Summary
  print_summary
}

main "$@"
