# Task 5-6-7: Fix Three Issues

## Agent: code-fixer

## Summary

Fixed three issues in the AIOS project:

### ISSUE 1 (CRITICAL): Voice Assistant Broken CLI
- **File**: `src/app/api/voice/assistant/route.ts`
- **Problem**: Used `execFileAsync('python3', ['-m', 'edge_tts', ...])` which fails because edge_tts is not in system Python
- **Fix**: Replaced with HTTP fetch to `http://localhost:3031/api/tts` (the voice-service mini-service that has edge-tts working)
- Kept Z-AI SDK as fallback

### ISSUE 2 (HIGH): Dashboard Quick Action Buttons
- **File**: `src/components/modules/DashboardModule.tsx`
- **Problem**: Buttons had no onClick handlers
- **Fix**: Imported `useAIOSStore` from `@/lib/store`, added `setActiveModule` calls with correct module IDs

### ISSUE 3 (HIGH): Terminal Mock Data
- **File**: `src/components/modules/TerminalModule.tsx`
- **Problem**: All commands returned hardcoded mock data
- **Fix**: Connected `status`, `agents`, `tasks`, `memory`, `chat` commands to real API endpoints
- Kept `help`, `clear`, `scan`, `run` as local commands

## Lint: PASS
## Dev Server: Running without errors
