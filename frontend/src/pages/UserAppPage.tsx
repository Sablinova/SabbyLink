import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AppWindow,
  Plus,
  RefreshCw,
  Copy,
  ExternalLink,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  Terminal,
  Link2,
  Trash2,
  Settings2,
  Loader2,
} from 'lucide-react';
import { api } from '../lib/api';

interface DiscordApplication {
  id: string;
  name: string;
  icon: string | null;
  description: string;
}

interface RegisteredCommand {
  id: string;
  name: string;
  description: string;
}

export default function UserAppPage() {
  const [applications, setApplications] = useState<DiscordApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [registering, setRegistering] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Create app form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  
  // Bot token management
  const [botTokens, setBotTokens] = useState<Record<string, string>>({});
  const [showToken, setShowToken] = useState<Record<string, boolean>>({});
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  
  // Discord link status
  const [discordLinked, setDiscordLinked] = useState(false);
  const [discordUser, setDiscordUser] = useState<{ id: string; username: string } | null>(null);

  useEffect(() => {
    checkDiscordStatus();
  }, []);

  const checkDiscordStatus = async () => {
    try {
      const response = await api.get('/auth/discord/status');
      if (response.data?.linked) {
        setDiscordLinked(true);
        setDiscordUser(response.data.user);
        fetchApplications();
      } else {
        setDiscordLinked(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to check Discord status:', error);
      setDiscordLinked(false);
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await api.get('/user-app/list');
      setApplications(response.data?.applications || []);
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to fetch applications' 
      });
    } finally {
      setLoading(false);
    }
  };

  const createApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;

    setCreating(true);
    setMessage(null);
    try {
      const response = await api.post('/user-app/create', { name: newAppName.trim() });
      const { application, botToken, authUrl } = response.data;
      
      // Store the bot token
      setBotTokens(prev => ({ ...prev, [application.id]: botToken }));
      
      // Add to applications list
      setApplications(prev => [...prev, application]);
      
      // Reset form
      setNewAppName('');
      setShowCreateForm(false);
      
      setMessage({ 
        type: 'success', 
        text: `Application "${application.name}" created! Don't forget to authorize it.` 
      });

      // Open auth URL in new tab
      if (authUrl) {
        window.open(authUrl, '_blank');
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to create application' 
      });
    } finally {
      setCreating(false);
    }
  };

  const resetBotToken = async (appId: string) => {
    try {
      const response = await api.post(`/user-app/${appId}/reset-token`);
      setBotTokens(prev => ({ ...prev, [appId]: response.data.botToken }));
      setMessage({ type: 'success', text: 'Bot token reset successfully' });
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to reset bot token' 
      });
    }
  };

  const registerCommands = async (appId: string) => {
    const token = botTokens[appId];
    if (!token) {
      setMessage({ type: 'error', text: 'Bot token required. Reset the token first.' });
      return;
    }

    setRegistering(appId);
    try {
      const response = await api.post(`/user-app/${appId}/register-commands`, { 
        botToken: token 
      });
      setMessage({ 
        type: 'success', 
        text: `${response.data.registered} commands registered successfully!` 
      });
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to register commands' 
      });
    } finally {
      setRegistering(null);
    }
  };

  const getAuthUrl = (appId: string) => {
    return `https://discord.com/api/oauth2/authorize?client_id=${appId}&scope=applications.commands`;
  };

  const copyToken = async (appId: string) => {
    const token = botTokens[appId];
    if (!token) return;

    await navigator.clipboard.writeText(token);
    setCopiedToken(appId);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const linkDiscord = async () => {
    try {
      const response = await api.get('/auth/discord/url');
      window.location.href = response.data.url;
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to get Discord OAuth URL' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Discord not linked - show connect prompt
  if (!discordLinked) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">User Applications</h1>
          <p className="text-muted-foreground">
            Create Discord applications for slash commands with autocomplete
          </p>
        </div>

        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-[#5865F2]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Link2 className="w-8 h-8 text-[#5865F2]" />
          </div>
          <h2 className="text-xl font-bold mb-2">Connect Your Discord Account</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            To create and manage Discord applications, you need to link your Discord account first.
            This allows SabbyLink to create apps on your behalf.
          </p>
          <button
            onClick={linkDiscord}
            className="btn-primary inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Connect Discord
          </button>
        </div>

        {/* Info card */}
        <div className="card p-4 border-blue-500/30 bg-blue-500/10">
          <h3 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
            <AppWindow className="w-4 h-4" />
            What are User Applications?
          </h3>
          <p className="text-sm text-muted-foreground">
            User Applications allow you to have slash commands with autocomplete, just like regular Discord bots.
            This is the same technique Nighty uses - your selfbot actions stay on your user account, 
            but commands get the nice slash command experience.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Applications</h1>
          <p className="text-muted-foreground">
            Create Discord applications for slash commands with autocomplete
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Application
        </button>
      </div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-500/20 border border-green-500/30 text-green-400'
              : 'bg-red-500/20 border border-red-500/30 text-red-400'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          {message.text}
          <button 
            onClick={() => setMessage(null)}
            className="ml-auto text-current opacity-60 hover:opacity-100"
          >
            ×
          </button>
        </motion.div>
      )}

      {/* Connected Discord Account */}
      {discordUser && (
        <div className="card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#5865F2]/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </div>
            <div>
              <p className="font-medium">Connected as {discordUser.username}</p>
              <p className="text-sm text-muted-foreground">ID: {discordUser.id}</p>
            </div>
          </div>
          <button
            onClick={fetchApplications}
            className="btn-outline flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      )}

      {/* Create Application Form */}
      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-6"
        >
          <h2 className="text-lg font-semibold mb-4">Create New Application</h2>
          <form onSubmit={createApplication} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Application Name
              </label>
              <input
                type="text"
                value={newAppName}
                onChange={(e) => setNewAppName(e.target.value)}
                placeholder="e.g., SabbyLink Commands"
                className="input w-full"
                maxLength={32}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                This will appear as the app name in Discord's developer portal
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating || !newAppName.trim()}
                className="btn-primary flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Application
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewAppName('');
                }}
                className="btn-outline"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Applications List */}
      {applications.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <AppWindow className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">No Applications Yet</h2>
          <p className="text-muted-foreground mb-4">
            Create your first Discord application to enable slash commands
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Application
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                    {app.icon ? (
                      <img
                        src={`https://cdn.discordapp.com/app-icons/${app.id}/${app.icon}.png`}
                        alt={app.name}
                        className="w-full h-full rounded-lg"
                      />
                    ) : (
                      <AppWindow className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{app.name}</h3>
                    <p className="text-sm text-muted-foreground">ID: {app.id}</p>
                  </div>
                </div>
                <a
                  href={`https://discord.com/developers/applications/${app.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline flex items-center gap-2 text-sm"
                >
                  <Settings2 className="w-4 h-4" />
                  Developer Portal
                </a>
              </div>

              {/* Bot Token Section */}
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Bot Token</label>
                  <button
                    onClick={() => resetBotToken(app.id)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset Token
                  </button>
                </div>
                {botTokens[app.id] ? (
                  <div className="flex items-center gap-2">
                    <input
                      type={showToken[app.id] ? 'text' : 'password'}
                      value={botTokens[app.id]}
                      readOnly
                      className="input flex-1 text-sm font-mono"
                    />
                    <button
                      onClick={() => setShowToken(prev => ({ ...prev, [app.id]: !prev[app.id] }))}
                      className="btn-outline p-2"
                    >
                      {showToken[app.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => copyToken(app.id)}
                      className="btn-outline p-2"
                    >
                      {copiedToken === app.id ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Click "Reset Token" to generate a new bot token
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <a
                  href={getAuthUrl(app.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Authorize App
                </a>
                <button
                  onClick={() => registerCommands(app.id)}
                  disabled={registering === app.id || !botTokens[app.id]}
                  className="btn-primary flex items-center gap-2"
                >
                  {registering === app.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <Terminal className="w-4 h-4" />
                      Register Commands
                    </>
                  )}
                </button>
              </div>

              {!botTokens[app.id] && (
                <p className="mt-3 text-sm text-yellow-500 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Reset the bot token to register commands
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Info Section */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4 border-blue-500/30 bg-blue-500/10">
          <h3 className="font-semibold text-blue-400 mb-2">How It Works</h3>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Create a Discord application</li>
            <li>Authorize it to your account</li>
            <li>Register slash commands</li>
            <li>Use /commands with autocomplete!</li>
          </ol>
        </div>
        <div className="card p-4 border-yellow-500/30 bg-yellow-500/10">
          <h3 className="font-semibold text-yellow-400 mb-2">Important Notes</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Slash commands may take up to 1 hour to sync globally</li>
            <li>• Store your bot token securely - it cannot be retrieved</li>
            <li>• Each application can have up to 100 commands</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
