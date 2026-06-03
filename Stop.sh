#!/bin/bash
# ─── AIOS Stop Script ──────────────────────────────────────────────────────────
# Usage: ./Stop.sh [--force]
# Stops the AIOS application and all running services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

FORCE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --force) FORCE=true; shift ;;
    -h|--help)
      echo "Usage: ./Stop.sh [--force]"
      echo ""
      echo "Options:"
      echo "  --force    Force kill all processes"
      echo "  -h, --help Show this help message"
      exit 0
      ;;
    *) echo -e "${RED}Unknown option: $1${NC}"; exit 1 ;;
  esac
done

echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        🛑 AIOS - Stopping Services      ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

STOPPED=0

# Stop processes from PID file
if [ -f ".aios.pid" ]; then
  echo -e "${YELLOW}Stopping services from PID file...${NC}"
  while read -r pid; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      if [ "$FORCE" = true ]; then
        kill -9 "$pid" 2>/dev/null || true
        echo -e "  ${RED}Force killed PID ${pid}${NC}"
      else
        kill "$pid" 2>/dev/null || true
        echo -e "  ${GREEN}Stopped PID ${pid}${NC}"
      fi
      STOPPED=$((STOPPED + 1))
    fi
  done < .aios.pid
  rm -f .aios.pid
else
  echo -e "${YELLOW}No PID file found (.aios.pid)${NC}"
fi

# Also stop any bun/node processes running on common AIOS ports
echo -e "${YELLOW}Checking for remaining processes...${NC}"

# Check for processes on port 3000 (Next.js)
for PORT in 3000 3003; do
  PID=$(lsof -ti:$PORT 2>/dev/null || true)
  if [ -n "$PID" ]; then
    for p in $PID; do
      if [ "$FORCE" = true ]; then
        kill -9 "$p" 2>/dev/null || true
        echo -e "  ${RED}Force killed process on port ${PORT} (PID ${p})${NC}"
      else
        kill "$p" 2>/dev/null || true
        echo -e "  ${GREEN}Stopped process on port ${PORT} (PID ${p})${NC}"
      fi
      STOPPED=$((STOPPED + 1))
    done
  fi
done

# Kill any remaining node/bun processes that might be AIOS-related
# Only do this with --force to avoid killing unrelated processes
if [ "$FORCE" = true ]; then
  echo -e "${YELLOW}Force-killing all bun/node AIOS processes...${NC}"
  pkill -f "bun run dev" 2>/dev/null || true
  pkill -f "next dev" 2>/dev/null || true
  echo -e "  ${RED}All AIOS-related processes force-killed${NC}"
fi

# Clean up log files (optional)
# rm -f .aios-*.log

echo ""
if [ $STOPPED -gt 0 ]; then
  echo -e "${GREEN}✓ Stopped ${STOPPED} service(s)${NC}"
else
  echo -e "${YELLOW}No running services found${NC}"
fi

echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     🛑 AIOS has been stopped.           ║${NC}"
echo -e "${CYAN}║     To restart: ./Start.sh              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
