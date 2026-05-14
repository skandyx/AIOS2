#!/bin/bash
while true; do
  echo "[$(date)] Starting Next.js dev server..."
  NODE_OPTIONS="--max-old-space-size=384" node node_modules/.bin/next dev -p 3000 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Next.js exited with code $EXIT_CODE, restarting in 1s..."
  sleep 1
done
