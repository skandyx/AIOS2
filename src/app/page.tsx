'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import {
  MessageSquare, Bot, Brain, Workflow, Activity, Puzzle,
  Cpu, Terminal, Shield, Link2, Mic, ChevronLeft, ChevronRight,
  Bell, Search, Command, Zap, Wifi, WifiOff, Settings,
  Sparkles, LayoutDashboard, Volume2, VolumeX, X, CheckCircle2,
  AlertTriangle, AlertCircle, Info, Maximize2, Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAIOSStore, type AIModule } from '@/lib/store';

// Module imports (all default exports)
import ChatModule from '@/components/modules/ChatModule';
import VoiceModule from '@/components/modules/VoiceModule';
import AgentsModule from '@/components/modules/AgentsModule';
import MemoryModule from '@/components/modules/MemoryModule';
import WorkflowsModule from '@/components/modules/WorkflowsModule';
import MonitoringModule from '@/components/modules/MonitoringModule';
import PluginsModule from '@/components/modules/PluginsModule';
import ModelsModule from '@/components/modules/ModelsModule';
import TerminalModule from '@/components/modules/TerminalModule';
import SecurityModule from '@/components/modules/SecurityModule';
import IntegrationsModule from '@/components/modules/IntegrationsModule';

// ─── Navigation Config ──────────────────────────────────────────────────────────

interface NavItem {
  id: AIModule;
  label: string;
  icon: React.ElementType;
  color: string;
  shortcut?: string;
}

const navItems: NavItem[] = [
  { id: 'chat', label: 'AI Chat', icon: MessageSquare, color: 'text-cyan-400', shortcut: '1' },
  { id: 'voice', label: 'Voice', icon: Mic, color: 'text-emerald-400', shortcut: '2' },
  { id: 'agents', label: 'Agents', icon: Bot, color: 'text-violet-400', shortcut: '3' },
  { id: 'memory', label: 'Memory', icon: Brain, color: 'text-amber-400', shortcut: '4' },
  { id: 'workflows', label: 'Workflows', icon: Workflow, color: 'text-rose-400', shortcut: '5' },
  { id: 'monitoring', label: 'Monitoring', icon: Activity, color: 'text-green-400', shortcut: '6' },
  { id: 'plugins', label: 'Plugins', icon: Puzzle, color: 'text-sky-400', shortcut: '7' },
  { id: 'models', label: 'AI Models', icon: Cpu, color: 'text-indigo-400', shortcut: '8' },
  { id: 'terminal', label: 'Terminal', icon: Terminal, color: 'text-lime-400', shortcut: '9' },
  { id: 'security', label: 'Security', icon: Shield, color: 'text-red-400', shortcut: '0' },
  { id: 'integrations', label: 'Integrations', icon: Link2, color: 'text-orange-400', shortcut: '-' },
];

// ─── Module Render Map ──────────────────────────────────────────────────────────

const moduleComponents: Record<AIModule, React.ComponentType> = {
  chat: ChatModule,
  voice: VoiceModule,
  agents: AgentsModule,
  memory: MemoryModule,
  workflows: WorkflowsModule,
  monitoring: MonitoringModule,
  plugins: PluginsModule,
  models: ModelsModule,
  terminal: TerminalModule,
  security: SecurityModule,
  integrations: IntegrationsModule,
};

// ─── Main Page Component ────────────────────────────────────────────────────────

export default function AIOSDashboard() {
  const {
    activeModule,
    setActiveModule,
    sidebarCollapsed,
    toggleSidebar,
    systemMetrics,
    setSystemMetrics,
    notifications,
    addNotification,
    dismissNotification,
    isVoiceActive,
    setVoiceActive,
  } = useAIOSStore();

  const [isConnected, setIsConnected] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeAgents, setActiveAgents] = useState(3);

  // ─── WebSocket Connection ──────────────────────────────────────────────
  useEffect(() => {
    const socketInstance = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      addNotification({ type: 'success', title: 'Connected', message: 'Real-time connection established' });
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('system:metrics', (data: any) => {
      setSystemMetrics(data);
    });

    socketInstance.on('notification', (data: any) => {
      addNotification(data);
    });

    socketInstance.on('agent:status', (data: any) => {
      if (data.status === 'active') {
        setActiveAgents(prev => prev + 1);
      } else if (data.status === 'idle' || data.status === 'offline') {
        setActiveAgents(prev => Math.max(0, prev - 1));
      }
    });

    // Store socket ref for cleanup without triggering re-render
    const socketRef = socketInstance;

    return () => {
      socketRef.disconnect();
    };
  }, []);

  // ─── Fetch System Metrics ──────────────────────────────────────────────
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/monitoring');
        if (res.ok) {
          const data = await res.json();
          setSystemMetrics(data);
        }
      } catch {
        // Silently fail - metrics will show zeros
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  // ─── Clock ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── Keyboard Shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
        setCommandSearch('');
      }

      // Number keys for module switching (only when not typing in input)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const numKey = parseInt(e.key);
      if (numKey >= 1 && numKey <= 9) {
        const idx = numKey - 1;
        if (idx < navItems.length) {
          setActiveModule(navItems[idx].id);
        }
      }
      if (e.key === '0') {
        const idx = 9;
        if (idx < navItems.length) {
          setActiveModule(navItems[idx].id);
        }
      }

      // Escape to close modals
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setShowNotifications(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─── Fullscreen Toggle ──────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // ─── Command Palette Actions ────────────────────────────────────────────
  const commandActions = [
    { id: 'chat', label: 'Go to AI Chat', icon: MessageSquare, module: 'chat' as AIModule },
    { id: 'voice', label: 'Go to Voice', icon: Mic, module: 'voice' as AIModule },
    { id: 'agents', label: 'Go to Agents', icon: Bot, module: 'agents' as AIModule },
    { id: 'memory', label: 'Go to Memory', icon: Brain, module: 'memory' as AIModule },
    { id: 'workflows', label: 'Go to Workflows', icon: Workflow, module: 'workflows' as AIModule },
    { id: 'monitoring', label: 'Go to Monitoring', icon: Activity, module: 'monitoring' as AIModule },
    { id: 'plugins', label: 'Go to Plugins', icon: Puzzle, module: 'plugins' as AIModule },
    { id: 'models', label: 'Go to AI Models', icon: Cpu, module: 'models' as AIModule },
    { id: 'terminal', label: 'Go to Terminal', icon: Terminal, module: 'terminal' as AIModule },
    { id: 'security', label: 'Go to Security', icon: Shield, module: 'security' as AIModule },
    { id: 'integrations', label: 'Go to Integrations', icon: Link2, module: 'integrations' as AIModule },
  ];

  const filteredCommands = commandActions.filter(cmd =>
    cmd.label.toLowerCase().includes(commandSearch.toLowerCase())
  );

  // ─── Active Module Component ────────────────────────────────────────────
  const ActiveModuleComponent = moduleComponents[activeModule];

  // ─── Unread Notifications ──────────────────────────────────────────────
  const unreadNotifications = notifications.filter(n => !n.dismissed);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-screen flex bg-background overflow-hidden">
        {/* ─── Left Sidebar ─────────────────────────────────────────────── */}
        <motion.aside
          className={`relative flex flex-col border-r border-border/50 bg-card/30 backdrop-blur-xl z-20 ${
            sidebarCollapsed ? 'w-16' : 'w-56'
          }`}
          animate={{ width: sidebarCollapsed ? 64 : 224 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 px-4 h-14 border-b border-border/50">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center aios-glow flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col"
              >
                <span className="text-sm font-bold aios-gradient">AIOS</span>
                <span className="text-[10px] text-muted-foreground">AI Operating System</span>
              </motion.div>
            )}
          </div>

          {/* Navigation Items */}
          <ScrollArea className="flex-1 py-2">
            <nav className="flex flex-col gap-1 px-2">
              {navItems.map((item) => {
                const isActive = activeModule === item.id;
                const Icon = item.icon;
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setActiveModule(item.id)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                          isActive
                            ? 'bg-cyan-500/10 text-cyan-400'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeIndicator"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-cyan-400 rounded-r-full"
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          />
                        )}
                        <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? item.color : ''}`} />
                        {!sidebarCollapsed && (
                          <span className="text-sm font-medium">{item.label}</span>
                        )}
                        {!sidebarCollapsed && item.shortcut && (
                          <kbd className="ml-auto text-[10px] text-muted-foreground/50 bg-white/5 px-1.5 py-0.5 rounded">
                            {item.shortcut}
                          </kbd>
                        )}
                      </button>
                    </TooltipTrigger>
                    {sidebarCollapsed && (
                      <TooltipContent side="right" className="flex items-center gap-2">
                        <span>{item.label}</span>
                        {item.shortcut && (
                          <kbd className="text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">
                            {item.shortcut}
                          </kbd>
                        )}
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Sidebar Footer */}
          <div className="border-t border-border/50 p-2 space-y-1">
            {/* Connection Status */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
              {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {!sidebarCollapsed && (
                <span className="text-xs">{isConnected ? 'Connected' : 'Offline'}</span>
              )}
            </div>

            {/* Collapse Toggle */}
            <button
              onClick={toggleSidebar}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors w-full"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-xs">Collapse</span>
                </>
              )}
            </button>
          </div>
        </motion.aside>

        {/* ─── Main Content ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* ─── Top Header ─────────────────────────────────────────────── */}
          <header className="h-14 border-b border-border/50 bg-card/30 backdrop-blur-xl flex items-center justify-between px-4 z-10">
            {/* Left: Module Title */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {(() => {
                  const currentNav = navItems.find(n => n.id === activeModule);
                  if (!currentNav) return null;
                  const Icon = currentNav.icon;
                  return (
                    <>
                      <Icon className={`w-5 h-5 ${currentNav.color}`} />
                      <h1 className="text-base font-semibold">{currentNav.label}</h1>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Center: Quick Stats */}
            <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-cyan-400" />
                <span>{activeAgents} agents</span>
              </div>
              <div className="w-px h-4 bg-border/50" />
              <div className="flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-amber-400" />
                <span>{systemMetrics.totalMemories} memories</span>
              </div>
              <div className="w-px h-4 bg-border/50" />
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>{systemMetrics.totalConversations} chats</span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Voice Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${isVoiceActive ? 'text-cyan-400 aios-pulse' : 'text-muted-foreground'}`}
                    onClick={() => setVoiceActive(!isVoiceActive)}
                  >
                    {isVoiceActive ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isVoiceActive ? 'Voice Active' : 'Voice Muted'}</TooltipContent>
              </Tooltip>

              {/* Command Palette Trigger */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() => { setCommandPaletteOpen(true); setCommandSearch(''); }}
                  >
                    <Command className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Command Palette (⌘K)</TooltipContent>
              </Tooltip>

              {/* Notifications */}
              <div className="relative">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() => setShowNotifications(!showNotifications)}
                    >
                      <Bell className="h-4 w-4" />
                      {unreadNotifications.length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                          {unreadNotifications.length}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
                </Tooltip>
              </div>

              {/* Fullscreen */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hidden md:flex"
                    onClick={toggleFullscreen}
                  >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</TooltipContent>
              </Tooltip>

              {/* Time */}
              <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground ml-2">
                <span className="font-mono">
                  {currentTime.toLocaleTimeString('en-US', { hour12: false })}
                </span>
              </div>
            </div>
          </header>

          {/* ─── Module Content ─────────────────────────────────────────── */}
          <main className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeModule}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="h-full"
              >
                <ActiveModuleComponent />
              </motion.div>
            </AnimatePresence>
          </main>

          {/* ─── Status Bar ──────────────────────────────────────────────── */}
          <footer className="h-7 border-t border-border/50 bg-card/20 backdrop-blur-xl flex items-center justify-between px-4 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span>{isConnected ? 'Online' : 'Offline'}</span>
              </div>
              <span>•</span>
              <span>v1.0.0-alpha</span>
              <span>•</span>
              <span>Autonomy: Supervised</span>
            </div>
            <div className="flex items-center gap-3">
              <span>{activeAgents} agents active</span>
              <span>•</span>
              <span>{systemMetrics.totalMemories} memories</span>
              <span>•</span>
              <span className="hidden sm:inline">AIOS — AI Operating System</span>
            </div>
          </footer>
        </div>

        {/* ─── Notifications Panel ──────────────────────────────────────── */}
        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="fixed right-4 top-16 w-80 max-h-96 z-50 aios-glass rounded-xl border border-border/50 shadow-2xl"
            >
              <div className="flex items-center justify-between p-3 border-b border-border/50">
                <span className="text-sm font-semibold">Notifications</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowNotifications(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <ScrollArea className="max-h-80">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No notifications
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {notifications.slice(0, 20).map((notif) => (
                      <div
                        key={notif.id}
                        className={`flex items-start gap-2 p-2 rounded-lg transition-colors ${
                          notif.dismissed ? 'opacity-50' : 'bg-white/5'
                        }`}
                      >
                        {notif.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />}
                        {notif.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />}
                        {notif.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />}
                        {notif.type === 'info' && <Info className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{notif.title}</p>
                          <p className="text-[10px] text-muted-foreground">{notif.message}</p>
                        </div>
                        {!notif.dismissed && (
                          <button
                            onClick={() => dismissNotification(notif.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Command Palette ──────────────────────────────────────────── */}
        <AnimatePresence>
          {commandPaletteOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 aios-overlay"
                onClick={() => setCommandPaletteOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.15 }}
                className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50 aios-glass rounded-xl border border-cyan-500/20 shadow-2xl overflow-hidden"
              >
                <div className="flex items-center gap-2 px-4 border-b border-border/50">
                  <Search className="w-4 h-4 text-cyan-400" />
                  <Input
                    value={commandSearch}
                    onChange={(e) => setCommandSearch(e.target.value)}
                    placeholder="Type a command or search..."
                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-11 text-sm"
                    autoFocus
                  />
                  <kbd className="text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">
                    ESC
                  </kbd>
                </div>
                <ScrollArea className="max-h-64">
                  <div className="p-2">
                    {filteredCommands.map((cmd) => {
                      const Icon = cmd.icon;
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => {
                            setActiveModule(cmd.module);
                            setCommandPaletteOpen(false);
                          }}
                          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors"
                        >
                          <Icon className="w-4 h-4" />
                          <span>{cmd.label}</span>
                        </button>
                      );
                    })}
                    {filteredCommands.length === 0 && (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        No commands found
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ─── Voice Active Indicator ──────────────────────────────────── */}
        <AnimatePresence>
          {isVoiceActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed bottom-12 right-6 z-40"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center aios-pulse shadow-lg shadow-cyan-500/20">
                <Mic className="w-5 h-5 text-white" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}
