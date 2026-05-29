# Task 3 - code-fixer: Fix project creation

## Summary
Fixed 4 issues preventing reliable project creation in the AIOS project.

## Files Modified
1. **`src/app/api/projects/route.ts`** — Complete rewrite:
   - Removed fragile static `import { runOrchestration } from '@/lib/orchestrator'`
   - Added dynamic `triggerOrchestration()` function that uses `import()` with try/catch
   - Added `normalizeCategory()` to convert "Web App" → "web_app" on write
   - Added `categoryToDisplay()` to convert "web_app" → "Web App" on read
   - Added `normalizeTechStack()` to prevent double JSON encoding
   - Added `normalizeTags()` for consistency
   - Both GET and POST responses now map categories to display format

2. **`src/app/api/projects/[id]/route.ts`** — Same fixes:
   - Added category mapping helpers (normalize + display)
   - Added `normalizeJsonArray()` helper for techStack and tags
   - PATCH handler now normalizes category and properly encodes techStack/tags
   - GET response maps category to display format

3. **`src/app/api/projects/[id]/orchestrate/route.ts`** — Import fix:
   - Replaced static `import { runOrchestration }` with dynamic `import()`
   - Returns 503 with clear message if orchestrator module is unavailable

4. **`src/components/modules/ProjectsModule.tsx`** — Frontend fixes:
   - Added `createError` state to CreateProjectDialog
   - Replaced silent `catch { /* silently fail */ }` with proper error handling
   - Shows error message from API response when `res.ok` is false
   - Shows network error message on fetch failure
   - Added error banner with AlertCircle icon in the dialog
   - Added Loader2 spinner icon to "Creating..." button
   - Fixed techStack to send array directly instead of pre-stringifying

## Root Causes
1. Static orchestrator import could crash entire route module
2. Category "Web App" stored raw instead of normalized to "web_app"
3. techStack double-encoded (frontend JSON.stringify + backend JSON.stringify)
4. Silent error swallowing on frontend gave no user feedback

## Verification
- `bun run lint` passes with no errors
- `npx tsc --noEmit` shows no new errors in edited files
- API testing confirms: POST returns 201, DB stores "web_app", API returns "Web App"
- techStack stored as proper JSON string `["React","TypeScript"]` not double-encoded
