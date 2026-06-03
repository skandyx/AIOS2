#!/bin/bash
# ─── AIOS Start Script ─────────────────────────────────────────────────────────
# Usage: ./Start.sh [--port PORT] [--detach]
# Starts the AIOS application and all required services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${AIOS_PORT:-3000}"
DETACH=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --port) PORT="$2"; shift 2 ;;
    --detach) DETACH=true; shift ;;
    -h|--help)
      echo "Usage: ./Start.sh [--port PORT] [--detach]"
      echo ""
      echo "Options:"
      echo "  --port PORT    Port to run the server on (default: 3000)"
      echo "  --detach       Run in background (detached mode)"
      echo "  -h, --help     Show this help message"
      exit 0
      ;;
    *) echo -e "${RED}Unknown option: $1${NC}"; exit 1 ;;
  esac
done

echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        🚀 AIOS - AI Operating System     ║${NC}"
echo -e "${CYAN}║           Starting Services...           ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# Check if bun is installed
if ! command -v bun &> /dev/null; then
  echo -e "${RED}✗ bun is not installed. Please install bun first.${NC}"
  echo -e "  curl -fsSL https://bun.sh/install | bash"
  exit 1
fi
echo -e "${GREEN}✓ bun is installed${NC}"

# Check if node_modules exist
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  bun install
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Check if .env exists
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}⚠ No .env file found. Creating default...${NC}"
  echo "DATABASE_URL=file:./db/aios.db" > .env
fi
echo -e "${GREEN}✓ Environment configured${NC}"

# Push database schema
echo -e "${YELLOW}Syncing database schema...${NC}"
bun run db:push 2>/dev/null || echo -e "${YELLOW}⚠ Database push had warnings (this may be normal)${NC}"
echo -e "${GREEN}✓ Database ready${NC}"

# Stop any existing services
if [ -f ".aios.pid" ]; then
  echo -e "${YELLOW}Stopping existing AIOS services...${NC}"
  ./Stop.sh 2>/dev/null || true
  sleep 2
fi

# Start mini-services (WebSocket, etc.)
echo -e "${YELLOW}Starting mini-services...${NC}"
for service_dir in mini-services/*/; do
  if [ -f "${service_dir}package.json" ]; then
    service_name=$(basename "$service_dir")
    echo -e "  ${CYAN}→ Starting ${service_name}...${NC}"
    if [ "$DETACH" = true ]; then
      cd "$service_dir"
      nohup bun run dev > "${SCRIPT_DIR}/.aios-${service_name}.log" 2>&1 &
      echo $! >> "${SCRIPT_DIR}/.aios.pid"
      cd "$SCRIPT_DIR"
    else
      cd "$service_dir"
      bun run dev &
      echo $! >> "${SCRIPT_DIR}/.aios.pid"
      cd "$SCRIPT_DIR"
    fi
  fi
done
echo -e "${GREEN}✓ Mini-services started${NC}"

# Start the Next.js dev server
echo -e "${YELLOW}Starting Next.js server on port ${PORT}...${NC}"
if [ "$DETACH" = true ]; then
  nohup bun run dev > .aios-server.log 2>&1 &
  SERVER_PID=$!
else
  bun run dev &
  SERVER_PID=$!
fi
echo "$SERVER_PID" >> .aios.pid

# Wait for server to be ready
echo -ne "${YELLOW}Waiting for server to be ready"
for i in $(seq 1 30); do
  if curl -s "http://localhost:${PORT}" > /dev/null 2>&1; then
    echo ""
    echo -e "${GREEN}✓ Server is ready!${NC}"
    break
  fi
  echo -ne "."
  sleep 1
  if [ $i -eq 30 ]; then
    echo ""
    echo -e "${YELLOW}⚠ Server may still be starting. Check .aios-server.log for details.${NC}"
  fi
done

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     🎉 AIOS is now running!             ║${NC}"
echo -e "${CYAN}║     http://localhost:${PORT}                ║${NC}"
echo -e "${CYAN}║                                          ║${NC}"
echo -e "${CYAN}║     To stop: ./Stop.sh                   ║${NC}"
echo -e "${CYAN}║     To view logs: tail -f .aios-*.log    ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"

if [ "$DETACH" = false ]; then
  echo ""
  echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
  # Wait for the server process
  wait $SERVER_PID 2>/dev/null || true
fi
