import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/auth';
import { useThemeStore } from './store/theme';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import BotPage from './pages/BotPage';
import RPCPage from './pages/RPCPage';
import CommandsPage from './pages/CommandsPage';
import AIPage from './pages/AIPage';
import SettingsPage from './pages/SettingsPage';
import UserAppPage from './pages/UserAppPage';

// Discord OAuth callback handler
function DiscordAuthHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken } = useAuthStore();

  useEffect(() => {
    const discordAuth = searchParams.get('discord_auth');
    const token = searchParams.get('token');

    if (discordAuth === 'success' && token) {
      // Store the token and redirect to dashboard
      setToken(token);
      navigate('/dashboard', { replace: true });
    } else if (discordAuth === 'error') {
      // Redirect to login with error message
      const message = searchParams.get('message') || 'Discord authentication failed';
      navigate(`/login?error=${encodeURIComponent(message)}`, { replace: true });
    }
  }, [searchParams, navigate, setToken]);

  return <div className="flex items-center justify-center h-screen">Processing Discord login...</div>;
}

// Root redirect - handles Discord OAuth callback or redirects to dashboard
function RootRedirect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken, isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    const discordAuth = searchParams.get('discord_auth');
    const token = searchParams.get('token');

    if (discordAuth === 'success' && token) {
      // Store the token and redirect to dashboard
      setToken(token);
      // Clear URL params and redirect
      window.history.replaceState({}, '', '/');
      navigate('/dashboard', { replace: true });
    } else if (discordAuth === 'error') {
      // Redirect to login with error message
      const message = searchParams.get('message') || 'Discord authentication failed';
      navigate(`/login?error=${encodeURIComponent(message)}`, { replace: true });
    } else {
      // Normal redirect to dashboard
      checkAuth().then(() => {
        navigate('/dashboard', { replace: true });
      });
    }
  }, [searchParams, navigate, setToken, checkAuth]);

  // Show loading while processing
  if (searchParams.get('discord_auth')) {
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Processing Discord login...</div>;
  }

  return <Navigate to="/dashboard" replace />;
}

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public route component (redirects to dashboard if logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { setTheme, theme } = useThemeStore();

  // Initialize theme on mount
  useEffect(() => {
    setTheme(theme);
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <AuthLayout>
                <LoginPage />
              </AuthLayout>
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <AuthLayout>
                <RegisterPage />
              </AuthLayout>
            </PublicRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DashboardPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bot"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <BotPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rpc"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <RPCPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/commands"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <CommandsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AIPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SettingsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-app"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <UserAppPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Redirects */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
