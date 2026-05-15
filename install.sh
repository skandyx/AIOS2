#!/bin/bash
# ============================================================
#  AIOS - AI Operating System :: Installation Script
#  Target: Debian 11+ / Ubuntu 20.04+ / macOS
#  Runtime: Bun
# ============================================================
#
#  Ce script s'installe dans le dossier où il se trouve.
#  Que tu aies cloné via git ou téléchargé/extracté un zip,
#  il détecte automatiquement le bon répertoire.
#
#  ⚠️  Les clés API vont dans le fichier .env (PAS .env.example)
#  ⚠️  .env.example est juste un template, il n'est jamais lu par l'app
#
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
header()  { echo -e "\n${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${CYAN}${BOLD}  $*${NC}"; echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"; }

# ============================================================
#  Auto-detect the project directory
#  The script installs in the folder where it lives,
#  whether it was cloned from git or extracted from a zip.
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$SCRIPT_DIR}"
DEV_PORT=3000
WS_PORT=3003

echo ""
echo -e "${CYAN}${BOLD}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║                                                           ║${NC}"
echo -e "${CYAN}${BOLD}║          🧠  AIOS — AI Operating System  🧠               ║${NC}"
echo -e "${CYAN}${BOLD}║                                                           ║${NC}"
echo -e "${CYAN}${BOLD}║          Installation Script                               ║${NC}"
echo -e "${CYAN}${BOLD}║                                                           ║${NC}"
echo -e "${CYAN}${BOLD}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
info "Dossier d'installation détecté : ${PROJECT_DIR}"
echo ""

# ============================================================
#  Step 1: OS Check
# ============================================================
header "Étape 1 / 8 — Vérification du système d'exploitation"

if [[ "$(uname)" == "Darwin" ]]; then
    success "macOS détecté — supporté."
elif [[ -f /etc/os-release ]]; then
    source /etc/os-release
    case "$ID" in
        debian)
            if [[ "$(echo "$VERSION_ID" | awk -F. '{print $1}')" -lt 11 ]]; then
                warn "Debian $VERSION_ID — version minimale recommandée : Debian 11."
            else
                success "Debian $VERSION_ID détecté — supporté."
            fi
            ;;
        ubuntu)
            if [[ "$(echo "$VERSION_ID" | awk -F. '{print $1}')" -lt 20 ]]; then
                warn "Ubuntu $VERSION_ID — version minimale recommandée : Ubuntu 20.04."
            else
                success "Ubuntu $VERSION_ID détecté — supporté."
            fi
            ;;
        *)
            warn "OS : $ID — ce script cible Debian 11+ / Ubuntu 20.04+ / macOS."
            warn "L'installation continue, mais certaines étapes pourraient nécessiter des ajustements."
            ;;
    esac
else
    warn "Impossible de déterminer l'OS. L'installation continue."
fi

# ============================================================
#  Step 2: Install System Dependencies
# ============================================================
header "Étape 2 / 8 — Installation des dépendances système"

if [[ "$(uname)" == "Darwin" ]]; then
    # macOS — use Homebrew or skip
    if ! command -v brew &>/dev/null; then
        warn "Homebrew non détecté. Installe-le avec : /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    else
        success "Homebrew détecté."
    fi
    # macOS usually has git and curl pre-installed or via Xcode CLI tools
    command -v git &>/dev/null && success "git déjà installé." || warn "git non trouvé. Installe avec : xcode-select --install"
    command -v curl &>/dev/null && success "curl déjà installé." || warn "curl non trouvé."
else
    # Linux (Debian/Ubuntu)
    SYS_DEPS=(curl git build-essential python3 python3-pip pkg-config libssl-dev)

    MISSING=()
    for dep in "${SYS_DEPS[@]}"; do
        if ! dpkg -s "$dep" &>/dev/null; then
            MISSING+=("$dep")
        fi
    done

    if [[ ${#MISSING[@]} -gt 0 ]]; then
        info "Installation des paquets manquants : ${MISSING[*]}"
        sudo apt-get update -qq
        sudo apt-get install -y -qq "${MISSING[@]}" || warn "Certains paquets n'ont pas pu être installés. On continue..."
        success "Dépendances système installées."
    else
        success "Toutes les dépendances système sont déjà satisfaites."
    fi
fi

# ============================================================
#  Step 3: Install Bun
# ============================================================
header "Étape 3 / 8 — Installation du runtime Bun"

if command -v bun &>/dev/null; then
    BUN_VERSION=$(bun --version 2>/dev/null || echo "inconnue")
    success "Bun est déjà installé (v${BUN_VERSION})."
else
    info "Installation de Bun..."
    curl -fsSL https://bun.sh/install | bash

    # Source Bun so it's available in this shell
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"

    if command -v bun &>/dev/null; then
        success "Bun installé avec succès ($(bun --version))."
    else
        error "L'installation de Bun a échoué."
        error "Installe-le manuellement : curl -fsSL https://bun.sh/install | bash"
        error "Puis relance ce script."
        exit 1
    fi
fi

# Ensure Bun is on PATH for subsequent commands
export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

# ============================================================
#  Step 4: Navigate to Project Directory
# ============================================================
header "Étape 4 / 8 — Configuration du répertoire projet"

cd "${PROJECT_DIR}" || {
    error "Impossible d'accéder au dossier : ${PROJECT_DIR}"
    exit 1
}

if [[ -f "${PROJECT_DIR}/package.json" ]]; then
    success "Projet trouvé dans : ${PROJECT_DIR}"
    # Try to pull latest if it's a git repo
    if git rev-parse --is-inside-work-tree &>/dev/null; then
        info "Dépôt git détecté. Récupération des dernières modifications..."
        git pull --ff-only 2>/dev/null && success "Dépôt mis à jour." || warn "Impossible de pull (modifications locales ?)."
    else
        info "Pas un dépôt git — mode archive (zip/tar.gz) détecté."
    fi
else
    error "Aucun package.json trouvé dans : ${PROJECT_DIR}"
    error "Assure-toi de lancer ce script depuis la racine du projet AIOS."
    error "Dossier actuel : $(pwd)"
    exit 1
fi

# ============================================================
#  Step 5: Install Project Dependencies
# ============================================================
header "Étape 5 / 8 — Installation des dépendances du projet"

info "Exécution de bun install..."
if bun install; then
    success "Dépendances du projet installées."
else
    error "bun install a échoué. Nouvelle tentative avec --force..."
    bun install --force || {
        error "Impossible d'installer les dépendances. Vérifie l'erreur ci-dessus."
        exit 1
    }
fi

# ============================================================
#  Step 6: Configure Environment (.env)
# ============================================================
header "Étape 6 / 8 — Configuration de l'environnement"

# ── IMPORTANT: API keys go in .env, NOT .env.example ──
# .env.example = template (committed to git, never read by the app)
# .env = actual config (read by the app, never committed to git)

if [[ -f "${PROJECT_DIR}/.env" ]]; then
    success ".env existe déjà — conservé tel quel."
    warn "Si tu veux ajouter des clés API, édite : ${PROJECT_DIR}/.env"
else
    info "Création du fichier .env..."
    info ""
    warn "┌─────────────────────────────────────────────────────────────┐"
    warn "│  ⚠️  IMPORTANT : Les clés API vont dans .env              │"
    warn "│     PAS dans .env.example !                                │"
    warn "│                                                             │"
    warn "│  .env.example = template (jamais lu par l'application)     │"
    warn "│  .env = config réelle (lu par l'application)               │"
    warn "│                                                             │"
    warn "│  Z-AI (intégré) fonctionne SANS aucune clé API.            │"
    warn "│  Les autres providers (Mistral, OpenAI, etc.) sont         │"
    warn "│  optionnels. Tu peux les ajouter plus tard.                │"
    warn "└─────────────────────────────────────────────────────────────┘"
    info ""

    # Ask if user wants to add API keys now
    echo -e "${YELLOW}Veux-tu ajouter tes clés API maintenant ? (o/N)${NC}"
    echo -e "  Appuie sur Entrée pour passer → l'app fonctionne avec Z-AI sans clé"
    read -r ADD_KEYS

    MISTRAL_KEY=""
    OPENAI_KEY=""
    ANTHROPIC_KEY=""
    GOOGLE_KEY=""
    DEEPSEEK_KEY=""

    if [[ "$ADD_KEYS" == "o" || "$ADD_KEYS" == "O" || "$ADD_KEYS" == "y" || "$ADD_KEYS" == "Y" ]]; then
        echo ""
        info "Saisis tes clés API (appuie sur Entrée pour passer) :"
        echo ""
        echo -ne "  ${CYAN}Mistral API Key${NC} : "; read -r MISTRAL_KEY
        echo -ne "  ${CYAN}OpenAI API Key${NC}  : "; read -r OPENAI_KEY
        echo -ne "  ${CYAN}Anthropic API Key${NC}: "; read -r ANTHROPIC_KEY
        echo -ne "  ${CYAN}Google API Key${NC}  : "; read -r GOOGLE_KEY
        echo -ne "  ${CYAN}DeepSeek API Key${NC}: "; read -r DEEPSEEK_KEY
        echo ""
        success "Clés API enregistrées dans .env"
    else
        info "Pas de clés API pour l'instant — Z-AI fonctionne sans clé."
        info "Tu pourras les ajouter plus tard dans : ${PROJECT_DIR}/.env"
    fi

    # Create .env with relative paths (portable across any directory)
    mkdir -p "${PROJECT_DIR}/db"

    cat > "${PROJECT_DIR}/.env" << ENVEOF
# ============================================
# AIOS — Configuration de l'environnement
# ============================================
# Ce fichier a été généré par install.sh.
# Z-AI (intégré) fonctionne SANS aucune clé API.
# Les autres providers sont optionnels.
# ============================================

# ── Base de données ───────────────────────────
DATABASE_URL="file:./db/custom.db"

# ── Clés API des providers IA ─────────────────
# Z-AI (Intégré) — Pas de clé nécessaire, fonctionne immédiatement !
MISTRAL_API_KEY=${MISTRAL_KEY}
OPENAI_API_KEY=${OPENAI_KEY}
ANTHROPIC_API_KEY=${ANTHROPIC_KEY}
GOOGLE_API_KEY=${GOOGLE_KEY}
DEEPSEEK_API_KEY=${DEEPSEEK_KEY}

# ── IA Locale (Ollama) ────────────────────────
OLLAMA_BASE_URL=http://localhost:11434

# ── WebSocket ─────────────────────────────────
WS_PORT=3003

# ── Application ───────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENVEOF

    success ".env créé dans : ${PROJECT_DIR}/.env"
fi

# ============================================================
#  Step 7: Initialize Prisma Database
# ============================================================
header "Étape 7 / 8 — Initialisation de la base de données"

mkdir -p "${PROJECT_DIR}/db"

# Step 7a: Generate Prisma client (REQUIRED before db:push)
info "Génération du client Prisma..."
if bunx prisma generate; then
    success "Client Prisma généré."
else
    warn "prisma generate a échoué. Tentative alternative..."
    npx prisma generate 2>/dev/null || warn "Impossible de générer le client Prisma automatiquement."
    warn "Tu peux le faire manuellement : bunx prisma generate"
fi

# Step 7b: Push schema to database
if [[ -f "${PROJECT_DIR}/db/custom.db" ]]; then
    info "Base SQLite existante trouvée. Synchronisation du schéma..."
else
    info "Aucune base existante — création en cours..."
fi

if bun run db:push; then
    success "Base de données initialisée et schéma synchronisé."
else
    warn ""
    warn "L'initialisation de la base n'a pas fonctionné automatiquement."
    warn "Ce n'est généralement pas grave — tu peux le faire manuellement :"
    warn ""
    warn "  cd ${PROJECT_DIR}"
    warn "  bunx prisma generate"
    warn "  bunx prisma db push"
    warn ""
    warn "L'installation continue — l'app démarrera quand même."
fi

# ============================================================
#  Step 8: Start Services
# ============================================================
header "Étape 8 / 8 — Démarrage des services"

# --- Start Next.js Dev Server ---
info "Démarrage du serveur AIOS sur le port ${DEV_PORT}..."
cd "${PROJECT_DIR}" && bun run dev &
DEV_PID=$!
success "Serveur démarré (PID ${DEV_PID}, http://localhost:${DEV_PORT})"

# --- Start WebSocket Server ---
WS_ENTRY="${PROJECT_DIR}/mini-services/aios-ws/index.ts"
if [[ -f "$WS_ENTRY" ]]; then
    info "Démarrage du service WebSocket sur le port ${WS_PORT}..."
    cd "${PROJECT_DIR}/mini-services/aios-ws" && bun run dev &
    WS_PID=$!
    cd "${PROJECT_DIR}"
    success "Serveur WebSocket démarré (PID ${WS_PID})"
elif [[ -f "${PROJECT_DIR}/ws-server.js" ]]; then
    info "Démarrage du service WebSocket (legacy)..."
    bun run "${PROJECT_DIR}/ws-server.js" &
    WS_PID=$!
    success "Serveur WebSocket démarré (PID ${WS_PID})"
else
    warn "Service WebSocket non trouvé — ignoré."
    WS_PID=""
fi

# Give services a moment to bind
sleep 3

# ============================================================
#  Success Banner
# ============================================================
echo ""
echo -e "${GREEN}${BOLD}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║                                                               ║${NC}"
echo -e "${GREEN}${BOLD}║          🚀  AIOS Installation terminée !  🚀                ║${NC}"
echo -e "${GREEN}${BOLD}║                                                               ║${NC}"
echo -e "${GREEN}${BOLD}╠═══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║                                                               ║${NC}"
echo -e "${GREEN}${BOLD}║  🌐  App :      http://localhost:${DEV_PORT}                         ║${NC}"
if [[ -n "$WS_PID" ]]; then
echo -e "${GREEN}${BOLD}║  🔌  WebSocket : ws://localhost:${WS_PORT}                            ║${NC}"
fi
echo -e "${GREEN}${BOLD}║  📁  Dossier :  ${PROJECT_DIR}                  ${NC}"
echo -e "${GREEN}${BOLD}║  ⚙️  Config :   ${PROJECT_DIR}/.env                    ${NC}"
echo -e "${GREEN}${BOLD}║                                                               ║${NC}"
echo -e "${GREEN}${BOLD}╠═══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║                                                               ║${NC}"
echo -e "${GREEN}${BOLD}║  📋  Prochaines étapes :                                      ║${NC}"
echo -e "${GREEN}${BOLD}║                                                               ║${NC}"
echo -e "${GREEN}${BOLD}║  1. Ouvre http://localhost:${DEV_PORT} dans ton navigateur           ║${NC}"
echo -e "${GREEN}${BOLD}║  2. Z-AI (intégré) fonctionne SANS clé API                   ║${NC}"
echo -e "${GREEN}${BOLD}║  3. Pour ajouter des clés API, édite .env :                  ║${NC}"
echo -e "${GREEN}${BOLD}║       nano ${PROJECT_DIR}/.env                                 ║${NC}"
echo -e "${GREEN}${BOLD}║  4. Redémarre après modification de .env :                   ║${NC}"
echo -e "${GREEN}${BOLD}║       Ctrl+C puis ./install.sh                               ║${NC}"
echo -e "${GREEN}${BOLD}║                                                               ║${NC}"
echo -e "${GREEN}${BOLD}║  ⚠️  Les clés API vont dans .env, PAS dans .env.example !    ║${NC}"
echo -e "${GREEN}${BOLD}║                                                               ║${NC}"
echo -e "${GREEN}${BOLD}╠═══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║                                                               ║${NC}"
echo -e "${GREEN}${BOLD}║  🛑  Pour arrêter les services :                              ║${NC}"
echo -e "${GREEN}${BOLD}║       kill ${DEV_PID}${WS_PID:+ $WS_PID}                                     ║${NC}"
echo -e "${GREEN}${BOLD}║       (ou appuie sur Ctrl+C)                                  ║${NC}"
echo -e "${GREEN}${BOLD}║                                                               ║${NC}"
echo -e "${GREEN}${BOLD}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Keep script alive so background processes don't get SIGHUP
info "Appuie sur Ctrl+C pour arrêter les services et quitter."
wait
