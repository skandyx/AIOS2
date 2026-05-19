#!/bin/bash
# AIOS Server Runner - keeps server alive with auto-restart
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting Next.js dev server..."
  NODE_OPTIONS="--max-old-space-size=1536" node node_modules/.bin/next dev -p 3000 2>&1 | tee -a /home/z/my-project/dev.log
  EXIT_CODE=$?
  echo "[$(date)] Next.js exited with code $EXIT_CODE, restarting in 3s..."
  sleep 3
done
