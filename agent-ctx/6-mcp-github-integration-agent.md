# Task 6 - MCP GitHub Integration Agent

## Task
Enhance the MCP module to properly support the GitHub MCP server and integrate it with the GitHub push functionality.

## Work Completed

### 1. API Routes Created

#### `/src/app/api/mcp/github/route.ts`
- **GET**: Checks if GitHub MCP is installed and configured
  - Queries MCPServer (slug: 'github-mcp') and Integration (type: 'github')
  - Returns: installed, configured, connected, username, mcpServerId, mcpEnabled, mcpRunning
- **POST**: Install and configure GitHub MCP in one step
  - Accepts: { token, username }
  - Validates token via GitHub API
  - Creates/updates Integration + MCPServer records
  - Stores GITHUB_PERSONAL_ACCESS_TOKEN in MCP server envVars

#### `/src/app/api/mcp/github/test/route.ts`
- **POST**: Test GitHub MCP connectivity
  - Uses stored token to verify GitHub access
  - Returns: success, user info, scopes, mcpInstalled, mcpEnabled

### 2. Curated GitHub MCP Entry Updated
- File: `/src/app/api/mcp/search/route.ts`
- Added `specialAction: 'github-connect'` field
- Enhanced description
- Updated args with `-y` flag

### 3. MCPModule.tsx Enhanced
- New components: GitHubConnectDialog, GitHubStatusPanel
- RegistryCard: Special GitHub MCP styling (emerald theme, 🐙 icon, AIOS badge, "Connect & Install" button)
- InstalledCard: GitHub connection prompts, Push to GitHub button, Connected badge
- Header: GitHub status badge when MCP installed
- Installed tab: GitHubStatusPanel, test results, Connect CTA
- Full flow: Connect → Install MCP → Configure integration → Test → Push

## Files Modified
- `/src/app/api/mcp/github/route.ts` (new)
- `/src/app/api/mcp/github/test/route.ts` (new)
- `/src/app/api/mcp/search/route.ts` (updated GitHub MCP entry)
- `/src/components/modules/MCPModule.tsx` (major update)
- `/home/z/my-project/worklog.md` (appended work record)

## Test Results
- Lint: passes clean
- GET /api/mcp/github: returns correct status
- POST /api/mcp/github/test: returns correct error when not configured
- GET /api/mcp/search: GitHub MCP entry includes specialAction field
