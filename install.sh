#!/bin/bash
# ============================================================
#  AIOS - AI Operating System :: Installation Script
#  Supported OS: Debian 11+, Ubuntu 20.04+, Kali Linux 2023+
#  Runtime: Bun + Node.js + Python3 (edge-tts)
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
# Auto-detect the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}" )" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}"
DEV_PORT=3000
WS_PORT=3003
DB_DIR="${PROJECT_DIR}/db"

# If you want to clone from a remote repo instead, set REPO_URL:
# REPO_URL="https://github.com/your-org/aios.git"
REPO_URL=""

# ============================================================
#  Step 1: OS Check (Debian/Ubuntu/Kali/Parrot/Arch/Fedora)
# ============================================================
header "Step 1 / 10 — Checking Operating System"

if [[ ! -f /etc/os-release ]]; then
    error "Cannot determine OS — /etc/os-release not found."
    error "This script requires a Linux distribution with /etc/os-release."
    exit 1
fi

source /etc/os-release

SUPPORTED_OS=false
OS_FAMILY=""

case "$ID" in
    debian)
        if [[ "$(echo "$VERSION_ID" | awk -F. '{print $1}')" -lt 11 ]]; then
            error "Debian $VERSION_ID is not supported. Minimum: Debian 11."
            exit 1
        fi
        success "Debian $VERSION_ID detected — supported."
        SUPPORTED_OS=true
        OS_FAMILY="debian"
        ;;
    ubuntu)
        if [[ "$(echo "$VERSION_ID" | awk -F. '{print $1}')" -lt 20 ]]; then
            error "Ubuntu $VERSION_ID is not supported. Minimum: Ubuntu 20.04."
            exit 1
        fi
        success "Ubuntu $VERSION_ID detected — supported."
        SUPPORTED_OS=true
        OS_FAMILY="debian"
        ;;
    kali)
        success "Kali Linux detected — supported!"
        info "Kali is Debian-based — all Debian packages will work."
        SUPPORTED_OS=true
        OS_FAMILY="debian"
        ;;
    parrot)
        success "Parrot OS detected — supported!"
        info "Parrot is Debian-based — all Debian packages will work."
        SUPPORTED_OS=true
        OS_FAMILY="debian"
        ;;
    linuxmint|pop|elementary|zorin)
        success "$NAME detected — supported (Ubuntu derivative)."
        SUPPORTED_OS=true
        OS_FAMILY="debian"
        ;;
    arch|manjaro|endeavouros|garuda)
        success "$NAME detected — supported (Arch-based)."
        SUPPORTED_OS=true
        OS_FAMILY="arch"
        ;;
    fedora)
        success "Fedora $VERSION_ID detected — supported."
        SUPPORTED_OS=true
        OS_FAMILY="redhat"
        ;;
    *)
        # Try to detect Debian/Ubuntu derivatives by ID_LIKE
        if echo "$ID_LIKE" | grep -qi "debian"; then
            warn "Unknown distro '$ID' but appears Debian-based ($ID_LIKE)."
            success "Proceeding with Debian-compatible installation."
            SUPPORTED_OS=true
            OS_FAMILY="debian"
        elif echo "$ID_LIKE" | grep -qi "arch"; then
            warn "Unknown distro '$ID' but appears Arch-based ($ID_LIKE)."
            success "Proceeding with Arch-compatible installation."
            SUPPORTED_OS=true
            OS_FAMILY="arch"
        elif echo "$ID_LIKE" | grep -qi "fedora"; then
            warn "Unknown distro '$ID' but appears Fedora-based ($ID_LIKE)."
            success "Proceeding with Fedora-compatible installation."
            SUPPORTED_OS=true
            OS_FAMILY="redhat"
        else
            error "Unsupported OS: $ID ($NAME)"
            error "This script targets Debian/Ubuntu/Kali/Parrot/Arch/Fedora."
            error "If your distro is Debian-based, you can try:"
            error "  export ID_LIKE=debian && ./install.sh"
            exit 1
        fi
        ;;
esac

info "OS family: $OS_FAMILY"

# ============================================================
#  Step 2: Install System Dependencies
# ============================================================
header "Step 2 / 10 — Installing System Dependencies"

if [[ "$OS_FAMILY" == "debian" ]]; then
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

elif [[ "$OS_FAMILY" == "arch" ]]; then
    SYS_DEPS=(curl git base-devel python python-pip pkg-config openssl)
    MISSING=()
    for dep in "${SYS_DEPS[@]}"; do
        if ! pacman -Qi "$dep" &>/dev/null; then
            MISSING+=("$dep")
        fi
    done

    if [[ ${#MISSING[@]} -gt 0 ]]; then
        info "Installing missing packages: ${MISSING[*]}"
        sudo pacman -S --noconfirm "${MISSING[@]}"
        success "System dependencies installed."
    else
        success "All system dependencies already satisfied."
    fi

elif [[ "$OS_FAMILY" == "redhat" ]]; then
    SYS_DEPS=(curl git gcc gcc-c++ make python3 python3-pip pkgconfig openssl-devel)
    MISSING=()
    for dep in "${SYS_DEPS[@]}"; do
        if ! rpm -q "$dep" &>/dev/null; then
            MISSING+=("$dep")
        fi
    done

    if [[ ${#MISSING[@]} -gt 0 ]]; then
        info "Installing missing packages: ${MISSING[*]}"
        sudo dnf install -y "${MISSING[@]}"
        success "System dependencies installed."
    else
        success "All system dependencies already satisfied."
    fi
fi

# ============================================================
#  Step 3: Install Bun
# ============================================================
header "Step 3 / 10 — Installing Bun Runtime"

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
#  Step 4: Install Node.js (if not present)
# ============================================================
header "Step 4 / 10 — Checking Node.js"

if command -v node &>/dev/null; then
    NODE_VERSION=$(node --version 2>/dev/null || echo "unknown")
    success "Node.js is already installed (${NODE_VERSION})."
else
    info "Installing Node.js via Bun..."
    # Bun can run Node.js programs natively, but some tools need actual Node
    if [[ "$OS_FAMILY" == "debian" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ "$OS_FAMILY" == "arch" ]]; then
        sudo pacman -S --noconfirm nodejs npm
    elif [[ "$OS_FAMILY" == "redhat" ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo dnf install -y nodejs
    fi

    if command -v node &>/dev/null; then
        success "Node.js installed successfully ($(node --version))."
    else
        warn "Node.js installation failed. Bun will handle most Node.js tasks."
    fi
fi

# ============================================================
#  Step 5: Install Python3 + edge-tts (Jarvis Voice)
# ============================================================
header "Step 5 / 10 — Installing Python TTS/STT Dependencies"

# Ensure pip is available and up-to-date
if command -v pip3 &>/dev/null; then
    success "pip3 is available."
else
    info "Installing pip3..."
    if [[ "$OS_FAMILY" == "debian" ]]; then
        sudo apt-get install -y -qq python3-pip
    elif [[ "$OS_FAMILY" == "arch" ]]; then
        sudo pacman -S --noconfirm python-pip
    elif [[ "$OS_FAMILY" == "redhat" ]]; then
        sudo dnf install -y python3-pip
    fi
fi

# Install edge-tts for high-quality Jarvis-like neural voices
if python3 -m edge_tts --help &>/dev/null; then
    EDGE_VERSION=$(python3 -m edge_tts --version 2>/dev/null || echo "installed")
    success "edge-tts is already installed (${EDGE_VERSION})."
else
    info "Installing edge-tts (Microsoft Neural TTS — Jarvis voice)..."
    pip3 install edge-tts --break-system-packages 2>/dev/null || \
    pip3 install edge-tts --user 2>/dev/null || \
    pip3 install edge-tts 2>/dev/null || {
        warn "pip3 install failed. Trying with python3 -m pip..."
        python3 -m pip install edge-tts --break-system-packages 2>/dev/null || \
        python3 -m pip install edge-tts --user 2>/dev/null || {
            error "Failed to install edge-tts. Voice features may not work."
            error "Install manually: pip3 install edge-tts"
        }
    }

    if python3 -m edge_tts --help &>/dev/null; then
        success "edge-tts installed successfully — Jarvis voice ready!"
    else
        warn "edge-tts installation may have issues. Voice will use fallback TTS."
    fi
fi

info "Available Jarvis voices: en-GB-RyanNeural (default), en-GB-ThomasNeural, en-US-BrianNeural, en-US-GuyNeural"

# ============================================================
#  Step 6: Clone or Detect Project
# ============================================================
header "Step 6 / 10 — Setting Up Project Directory"

if [[ -f "${PROJECT_DIR}/package.json" ]]; then
    success "Existing project detected at ${PROJECT_DIR}."
    cd "${PROJECT_DIR}"
    info "Pulling latest changes (if this is a git repo)..."
    if git rev-parse --is-inside-work-tree &>/dev/null; then
        git pull --ff-only 2>/dev/null && success "Repository updated." || warn "Could not pull latest changes (maybe local modifications?)."
    else
        info "Not a git repository — skipping pull."
    fi
elif [[ -n "$REPO_URL" ]]; then
    info "Cloning repository from ${REPO_URL}..."
    git clone "$REPO_URL" "${PROJECT_DIR}"
    cd "${PROJECT_DIR}"
    success "Repository cloned."
else
    # Script is running from within the project directory itself
    # (e.g. user downloaded and ran ./install.sh from the project root)
    if [[ -f "$(pwd)/package.json" ]]; then
        PROJECT_DIR="$(pwd)"
        success "Project detected in current directory: ${PROJECT_DIR}"
        cd "${PROJECT_DIR}"
    else
        error "No project found and REPO_URL is not set."
        error ""
        error "Solutions:"
        error "  1. Run this script from inside the AIOS project directory"
        error "  2. Set REPO_URL at the top of this script, e.g.:"
        error "     REPO_URL=\"https://github.com/your-org/aios.git\""
        error "  3. Clone the repo first, then run ./install.sh from within it"
        exit 1
    fi
fi

# ============================================================
#  Step 7: Install Project Dependencies
# ============================================================
header "Step 7 / 10 — Installing Project Dependencies"

if [[ ! -f "package.json" ]]; then
    error "package.json not found in ${PROJECT_DIR}."
    exit 1
fi

info "Running bun install..."
bun install

success "Project dependencies installed."

# ============================================================
#  Step 8: Configure Environment
# ============================================================
header "Step 8 / 10 — Configuring Environment"

if [[ ! -f ".env" ]]; then
    if [[ -f ".env.example" ]]; then
        cp .env.example .env
        warn ".env created from .env.example."
    else
        info "Generating default .env with Mistral API key..."
        mkdir -p "${DB_DIR}"
        cat > .env << 'ENVEOF'
DATABASE_URL=file:/home/z/my-project/db/custom.db

# ─── AI Provider API Keys ──────────────────────────────────────────────
# Mistral AI (https://console.mistral.ai/)
MISTRAL_API_KEY=

# OpenAI (https://platform.openai.com/api-keys)
# OPENAI_API_KEY=sk-...

# Anthropic (https://console.anthropic.com/)
# ANTHROPIC_API_KEY=sk-ant-...

# Google Gemini (https://aistudio.google.com/apikey)
# GOOGLE_API_KEY=AI...

# DeepSeek (https://platform.deepseek.com/api_keys)
# DEEPSEEK_API_KEY=...

# Ollama (Local/Pi) - default: http://localhost:11434
# OLLAMA_BASE_URL=http://localhost:11434
ENVEOF
        warn ".env generated with defaults."
    fi
    warn "Please edit .env and add your API keys:"
    warn "  nano ${PROJECT_DIR}/.env"
else
    success ".env already exists — leaving it untouched."
fi

# Check if Mistral API key is configured
if grep -q "^MISTRAL_API_KEY=.$" .env 2>/dev/null; then
    success "Mistral API key is configured in .env"
else
    warn "Mistral API key is not set in .env"
    warn "You can get one at: https://console.mistral.ai/"
    warn "The built-in Z-AI provider works without any API key."
fi

# ============================================================
#  Step 9: Initialize Prisma Database
# ============================================================
header "Step 9 / 10 — Initializing Prisma Database"

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
#  Step 10: Start Services
# ============================================================
header "Step 10 / 10 — Starting Services"

# --- Start Process Manager (pm.js) ---
PM_ENTRY="${PROJECT_DIR}/pm.js"
SUPERVISOR_ENTRY="${PROJECT_DIR}/supervisor.sh"

if [[ -f "$PM_ENTRY" ]]; then
    info "Starting AIOS via process manager (pm.js)..."
    nohup node "$PM_ENTRY" > /dev/null 2>&1 &
    PM_PID=$!
    success "Process manager started (PID ${PM_PID})"
elif [[ -f "$SUPERVISOR_ENTRY" ]]; then
    info "Starting AIOS via supervisor.sh..."
    nohup bash "$SUPERVISOR_ENTRY" > /dev/null 2>&1 &
    PM_PID=$!
    success "Supervisor started (PID ${PM_PID})"
else
    # Fallback: start Next.js directly
    info "Starting AIOS development server on port ${DEV_PORT}..."
    nohup bun run dev > /dev/null 2>&1 &
    PM_PID=$!
    success "Dev server started (PID ${PM_PID}, http://localhost:${DEV_PORT})"
fi

# Give services a moment to bind
info "Waiting for services to start..."
sleep 8

# Verify the server is up
if curl -s "http://localhost:${DEV_PORT}" -o /dev/null 2>/dev/null; then
    success "AIOS is live at http://localhost:${DEV_PORT}!"
else
    warn "Server not responding yet — it may need a few more seconds."
    warn "Check logs: tail -f ${PROJECT_DIR}/server.log"
fi

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
echo -e "${GREEN}${BOLD}║  🌐  App:       http://localhost:${DEV_PORT}                  ║${NC}"
echo -e "${GREEN}${BOLD}║  📁  Dir:       ${PROJECT_DIR}              ${NC}"
echo -e "${GREEN}${BOLD}║  ⚙️  Config:     ${PROJECT_DIR}/.env               ${NC}"
echo -e "${GREEN}${BOLD}║  🗣️  Voice:      edge-tts (Jarvis)                  ║${NC}"
echo -e "${GREEN}${BOLD}║  🤖  AI:         Z-AI (built-in) + Mistral           ║${NC}"
echo -e "${GREEN}${BOLD}║                                                          ║${NC}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║                                                          ║${NC}"
echo -e "${GREEN}${BOLD}║  Next Steps:                                              ║${NC}"
echo -e "${GREEN}${BOLD}║    1. Edit .env with your API keys                        ║${NC}"
echo -e "${GREEN}${BOLD}║       nano ${PROJECT_DIR}/.env                            ${NC}"
echo -e "${GREEN}${BOLD}║    2. Open http://localhost:${DEV_PORT} in your browser        ║${NC}"
echo -e "${GREEN}${BOLD}║    3. Say 'Fred' to activate the voice assistant          ║${NC}"
echo -e "${GREEN}${BOLD}║                                                          ║${NC}"
echo -e "${GREEN}${BOLD}║  Supported AI Providers:                                  ║${NC}"
echo -e "${GREEN}${BOLD}║    • Z-AI (built-in, no key needed)                      ║${NC}"
echo -e "${GREEN}${BOLD}║    • Mistral AI (key in .env)                             ║${NC}"
echo -e "${GREEN}${BOLD}║    • OpenAI / Anthropic / Google / DeepSeek               ║${NC}"
echo -e "${GREEN}${BOLD}║    • Ollama (local, for Raspberry Pi)                     ║${NC}"
echo -e "${GREEN}${BOLD}║                                                          ║${NC}"
echo -e "${GREEN}${BOLD}║  To stop services:                                        ║${NC}"
echo -e "${GREEN}${BOLD}║    pkill -f 'next dev'                                    ║${NC}"
echo -e "${GREEN}${BOLD}║                                                          ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
