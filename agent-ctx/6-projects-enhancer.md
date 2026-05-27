Task ID: 6
Agent: Main
Task: Enhance ProjectsModule with Orchestrator Tracking, Agent Discussions, File Management, GitHub, ZIP, Documentation

Work Log:
- Read existing ProjectsModule.tsx (1780 lines) and all related API routes
- API routes already existed from Task 3-4: orchestrate, agents/messages, files, github, download, document
- Rewrote ProjectsModule.tsx with all existing features preserved + 6 new features

New Features Added:

1. **Orchestrator Tab** - New tab with:
   - "🚀 Start Orchestrator" button (POST /api/projects/[id]/orchestrate)
   - Visual status indicator with pulse animation:
     - idle → gray, analyzing → amber pulse, assigning → amber, running → green pulse, completed → green, failed → red
   - Event log timeline from orchestratorLog JSON (parsed and displayed newest-first)
   - Each log entry shows timestamp, event type (formatted), and details
   - Refresh button to fetch latest status from /api/projects/[id]/orchestrate/status

2. **Agent Discussions Tab** - Chat-like interface:
   - Fetches messages from GET /api/projects/[id]/agents/messages
   - Each message shows: from role badge (color-coded), to role badge, message type with icon, content, timestamp
   - Role colors: orchestrator=amber, agent=emerald, user=cyan, system=slate
   - Message types: instruction (amber/Zap), result (emerald/CheckCircle), discussion (cyan/MessageSquare), status (slate/Activity)
   - Send message input at bottom: user types → POST /api/projects/[id]/agents/messages as "user" fromRole
   - Refresh button for manual reload

3. **Files Tab** - File browser:
   - Fetch from GET /api/projects/[id]/files
   - File icons by type/language (FileCode for TS/JS/Python, FileJson, FileText, FileImage, etc.)
   - Click eye icon to view file content in a dialog (GET /api/projects/[id]/files/[fileId])
   - Upload button opens file picker (multiple files), uploads via FormData POST
   - Delete file button (DELETE /api/projects/[id]/files/[fileId])
   - File stats: count, total size (formatBytes helper)
   - Source badge (upload/github)

4. **GitHub Tab** - Connect and manage repos:
   - Connect form: repo URL input, optional PAT input, "Connect" button (POST /api/projects/[id]/github)
   - If connected: shows repo name, owner, branch, language, stars, private/public badge
   - "Import Files" button → POST /api/projects/[id]/github/clone
   - "Push to GitHub" button → POST /api/projects/[id]/github/push
   - Green "Repository Connected" indicator

5. **Documentation Tab** - AI-generated docs:
   - Shows README (from project.readme field) with scrollable view
   - Shows Architecture Documentation (from project.documentation field)
   - "Generate Docs" / "Regenerate" button → POST /api/projects/[id]/document
   - Empty state with prompt to generate

6. **Export/Download Actions in Detail Header**:
   - "ZIP" button → GET /api/projects/[id]/download → triggers browser download
   - "Docs" button → POST /api/projects/[id]/document → generates documentation

Interface Updates:
- ProjectData interface: added orchestratorStatus, orchestratorLog, repoUrl, repoOwner, repoName, repoBranch, githubToken, localPath, documentation, readme
- New interfaces: AgentMessage, ProjectFileData, GitHubRepoInfo, OrchestratorLogEntry
- New icon imports: Play, Activity, MessageSquare, FileText, Upload, Download, Github, BookOpen, File, FileCode, FileJson, FileImage, FileType, Folder, Send, RefreshCw, GitBranch, ArrowUpFromLine, Copy, Eye, X, Circle
- New helper functions: formatBytes(), getFileIcon()
- New config maps: ORCHESTRATOR_STATUS_CONFIG, MESSAGE_TYPE_CONFIG, ROLE_COLOR, FILE_ICON_MAP
- TabsList now uses ScrollArea for horizontal scrolling (9 tabs)
- All tab triggers use text-xs for compact sizing
- File Viewer Dialog for viewing file content

All existing features preserved: project list, creation, task management (manual + AI), skill assignment, MCP assignment, edit dialog, status change confirmation, automation tools section.

Lint passes clean with zero errors. Dev server running on port 3000.

Stage Summary:
- ProjectsModule enhanced from ~1780 lines to ~2000+ lines with 6 new feature tabs
- Orchestrator tab with status tracking and event log
- Agent Discussions tab with chat interface and user input
- Files tab with browser, upload, view, delete
- GitHub tab with connect, import, push
- Documentation tab with AI-generated README and architecture docs
- Export/download buttons in detail header
- All existing functionality preserved and working
