#!/bin/bash
# AIOS Keep-Alive - Simple server restart loop
# Uses auto-detected project directory

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

while true; do
  cd "${PROJECT_DIR}"
  bun run dev 2>&1 | tee -a "${PROJECT_DIR}/server.log"
  echo "[KEEP-ALIVE] Server died, restarting in 3s..." >> "${PROJECT_DIR}/server.log"
  sleep 3
done
