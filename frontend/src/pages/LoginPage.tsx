import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

// Discord brand color
const DISCORD_COLOR = '#5865F2';

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const { login, isLoading, error, clearError } = useAuthStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setOauthError('Discord authorization was cancelled or failed');
      return;
    }

    if (code) {
      handleOAuthCallback(code);
    }
  }, [searchParams]);

  const handleOAuthCallback = async (code: string) => {
    setDiscordLoading(true);
    setOauthError(null);
    
    try {
      const response = await api.post('/auth/discord/callback', {
        code,
        redirect_uri: `${window.location.origin}/login`,
      });

      const { token, user } = response.data;
      
      // Store token and update auth state
      localStorage.setItem('sabbylink_token', token);
      
      // Manually update the store
      useAuthStore.setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });

      // Clear URL params and redirect
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error('OAuth callback error:', err);
      setOauthError(err.response?.data?.error || 'Failed to authenticate with Discord');
      // Clear the code from URL
      navigate('/login', { replace: true });
    } finally {
      setDiscordLoading(false);
    }
  };

  const handleDiscordLogin = async () => {
    setDiscordLoading(true);
    setOauthError(null);

    try {
      const response = await api.get('/auth/discord/url', {
        params: {
          redirect_uri: `${window.location.origin}/login`,
        },
      });

      const { url } = response.data;
      
      if (url) {
        // Store state for verification (optional)
        sessionStorage.setItem('discord_oauth_state', response.data.state);
        // Redirect to Discord
        window.location.href = url;
      } else {
        setOauthError('Discord OAuth not configured');
        setDiscordLoading(false);
      }
    } catch (err: any) {
      console.error('Discord login error:', err);
      setOauthError(err.response?.data?.error || 'Failed to start Discord login');
      setDiscordLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setOauthError(null);
    try {
      await login(email, password);
    } catch {
      // Error handled by store
    }
  };

  return (
    <div className="card p-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-center mb-6">Welcome Back</h2>
      
      {(error || oauthError) && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
          {error || oauthError}
        </div>
      )}

      {/* Discord OAuth Button */}
      <button
        type="button"
        onClick={handleDiscordLogin}
        disabled={discordLoading || isLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium text-white transition-colors mb-6"
        style={{ backgroundColor: DISCORD_COLOR }}
      >
        {discordLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Connecting to Discord...
          </>
        ) : (
          <>
            <DiscordIcon className="w-5 h-5" />
            Continue with Discord
          </>
        )}
      </button>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="you@example.com"
            required
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pr-10"
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={isLoading || discordLoading}
          className="btn-primary w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>
      
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link to="/register" className="text-brand-500 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
