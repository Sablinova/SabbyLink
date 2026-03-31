import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useBotStore } from '../store/bot';
import { useThemeStore } from '../store/theme';
import {
  Home,
  Bot,
  Gamepad2,
  Terminal,
  Brain,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Monitor,
  AppWindow,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/bot', label: 'Bot', icon: Bot },
  { path: '/user-app', label: 'User Apps', icon: AppWindow },
  { path: '/rpc', label: 'RPC', icon: Gamepad2 },
  { path: '/commands', label: 'Commands', icon: Terminal },
  { path: '/ai', label: 'AI', icon: Brain },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { status } = useBotStore();
  const { theme, setTheme } = useThemeStore();

  const statusColors = {
    online: 'bg-discord-green',
    offline: 'bg-gray-500',
    connecting: 'bg-discord-yellow animate-pulse',
    error: 'bg-discord-red',
  };

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <span className="text-xl font-bold">
                <span className="text-brand-500">Sabby</span>Link
              </span>
            </Link>
            <button
              className="lg:hidden p-2 hover:bg-accent rounded-md"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Bot Status */}
          <div className="p-4 border-b">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
              <div>
                <p className="text-sm font-medium capitalize">{status}</p>
                <p className="text-xs text-muted-foreground">Bot Status</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                    isActive
                      ? 'bg-brand-500 text-white'
                      : 'hover:bg-accent text-foreground'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-medium">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-sm font-medium">{user?.username}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={cycleTheme}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md hover:bg-accent transition-colors"
              >
                <ThemeIcon className="w-4 h-4" />
                <span className="text-sm capitalize">{theme}</span>
              </button>
              <button
                onClick={logout}
                className="flex items-center justify-center p-2 rounded-md hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 border-b bg-card/95 backdrop-blur">
          <button
            className="lg:hidden p-2 hover:bg-accent rounded-md"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center space-x-4">
            <div className={`w-2.5 h-2.5 rounded-full ${statusColors[status]}`} />
            <span className="text-sm text-muted-foreground capitalize">
              {status}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
