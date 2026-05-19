#!/bin/bash
# AIOS - Run Server
# Uses auto-detected project directory

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "${PROJECT_DIR}"
while true; do
  NODE_OPTIONS="--max-old-space-size=1536" node node_modules/.bin/next dev -p 3000 2>&1 | tee -a "${PROJECT_DIR}/dev.log"
  echo "[$(date)] Server died, restarting in 3s..." >> "${PROJECT_DIR}/dev.log"
  sleep 3
done
