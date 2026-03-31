import { useState, useEffect } from 'react';
import { useBotStore } from '../store/bot';
import { 
  Bot, 
  Power, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Loader2, 
  User,
  Zap,
  Shield,
  Info,
  CheckCircle,
  XCircle,
  Link2,
} from 'lucide-react';
import { api } from '../lib/api';

type BotMode = 'selfbot' | 'hybrid' | 'bot';

interface BotModeConfig {
  id: BotMode;
  name: string;
  description: string;
  icon: typeof User;
  features: string[];
  warning?: string;
}

const botModes: BotModeConfig[] = [
  {
    id: 'selfbot',
    name: 'Selfbot Mode',
    description: 'Use your Discord user token for full account access',
    icon: User,
    features: [
      'Access all user features',
      'Send messages as yourself',
      'Manage your account settings',
      'No slash command support',
    ],
    warning: 'Against Discord ToS - Use at your own risk',
  },
  {
    id: 'hybrid',
    name: 'Hybrid Mode',
    description: 'User token + Discord App for slash commands (Nighty-style)',
    icon: Zap,
    features: [
      'Selfbot actions via user token',
      'Slash commands with autocomplete',
      'Best of both worlds',
      'Requires User App setup',
    ],
    warning: 'Selfbot portion is against Discord ToS',
  },
  {
    id: 'bot',
    name: 'Bot Mode',
    description: 'Use a regular Discord bot token',
    icon: Shield,
    features: [
      'Fully ToS compliant',
      'Slash commands supported',
      'Limited to bot permissions',
      'Must be invited to servers',
    ],
  },
];

export default function BotPage() {
  const { status, user, start, stop, restart, isLoading, error, clearError } =
    useBotStore();
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [botMode, setBotMode] = useState<BotMode>('selfbot');
  const [discordLinked, setDiscordLinked] = useState(false);
  const [hasUserApp, setHasUserApp] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);

  useEffect(() => {
    // Check Discord link status and user app status
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const [discordRes, appsRes] = await Promise.all([
        api.get('/auth/discord/status').catch(() => ({ data: { linked: false } })),
        api.get('/user-app/list').catch(() => ({ data: { applications: [] } })),
      ]);
      
      setDiscordLinked(discordRes.data?.linked || false);
      setHasUserApp((appsRes.data?.applications?.length || 0) > 0);
    } catch (error) {
      console.error('Failed to check setup status:', error);
    }
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await start(token);
      setToken('');
    } catch {
      // Error handled by store
    }
  };

  const handleStop = async () => {
    clearError();
    try {
      await stop();
    } catch {
      // Error handled by store
    }
  };

  const handleRestart = async () => {
    clearError();
    try {
      await restart();
    } catch {
      // Error handled by store
    }
  };

  const selectedMode = botModes.find((m) => m.id === botMode)!;
  const canUseHybrid = discordLinked && hasUserApp;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Bot Control</h1>
        <p className="text-muted-foreground">
          Manage your Discord connection
        </p>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
          {error}
        </div>
      )}

      {/* Bot Mode Selector */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Bot Mode</h2>
          <button
            onClick={() => setShowModeSelector(!showModeSelector)}
            className="btn-outline text-sm"
          >
            {showModeSelector ? 'Hide Options' : 'Change Mode'}
          </button>
        </div>

        {/* Current Mode Display */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            botMode === 'hybrid' ? 'bg-primary/20 text-primary' :
            botMode === 'bot' ? 'bg-green-500/20 text-green-500' :
            'bg-yellow-500/20 text-yellow-500'
          }`}>
            <selectedMode.icon className="w-6 h-6" />
          </div>
          <div>
            <p className="font-medium">{selectedMode.name}</p>
            <p className="text-sm text-muted-foreground">{selectedMode.description}</p>
          </div>
        </div>

        {/* Mode Selector Grid */}
        {showModeSelector && (
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            {botModes.map((mode) => {
              const isDisabled = mode.id === 'hybrid' && !canUseHybrid;
              const isSelected = botMode === mode.id;
              
              return (
                <button
                  key={mode.id}
                  onClick={() => !isDisabled && setBotMode(mode.id)}
                  disabled={isDisabled}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : isDisabled
                      ? 'border-muted bg-muted/30 opacity-50 cursor-not-allowed'
                      : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <mode.icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-medium">{mode.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{mode.description}</p>
                  
                  <ul className="space-y-1">
                    {mode.features.map((feature, i) => (
                      <li key={i} className="text-xs flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {mode.warning && (
                    <p className="mt-3 text-xs text-yellow-500 flex items-start gap-1">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {mode.warning}
                    </p>
                  )}

                  {mode.id === 'hybrid' && !canUseHybrid && (
                    <div className="mt-3 p-2 bg-muted rounded text-xs">
                      <p className="text-muted-foreground">
                        {!discordLinked && (
                          <span className="flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-red-500" />
                            Discord not linked
                          </span>
                        )}
                        {discordLinked && !hasUserApp && (
                          <span className="flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-red-500" />
                            No User App created
                          </span>
                        )}
                      </p>
                      <a href="/user-app" className="text-primary hover:underline mt-1 inline-block">
                        Set up User App →
                      </a>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Status Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center ${
                status === 'online'
                  ? 'bg-discord-green/20'
                  : status === 'connecting'
                  ? 'bg-discord-yellow/20'
                  : 'bg-gray-500/20'
              }`}
            >
              <Bot
                className={`w-8 h-8 ${
                  status === 'online'
                    ? 'text-discord-green'
                    : status === 'connecting'
                    ? 'text-discord-yellow'
                    : 'text-gray-500'
                }`}
              />
            </div>
            <div>
              <h2 className="text-xl font-bold capitalize">{status}</h2>
              {user && (
                <p className="text-muted-foreground">
                  Logged in as {user.username}#{user.discriminator}
                </p>
              )}
            </div>
          </div>

          {status === 'online' && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRestart}
                disabled={isLoading}
                className="btn-outline"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span className="ml-2">Restart</span>
              </button>
              <button
                onClick={handleStop}
                disabled={isLoading}
                className="btn-destructive"
              >
                <Power className="w-4 h-4" />
                <span className="ml-2">Stop</span>
              </button>
            </div>
          )}
        </div>

        {status !== 'online' && (
          <form onSubmit={handleStart} className="space-y-4">
            <div>
              <label
                htmlFor="token"
                className="block text-sm font-medium mb-1"
              >
                {botMode === 'bot' ? 'Bot Token' : 'Discord User Token'}
              </label>
              <div className="relative">
                <input
                  id="token"
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="input pr-10"
                  placeholder={botMode === 'bot' ? 'Enter your bot token' : 'Enter your Discord user token'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Your token is encrypted and stored securely
              </p>
            </div>

            {/* Hybrid Mode - User App Token */}
            {botMode === 'hybrid' && (
              <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Link2 className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-primary">Hybrid Mode Active</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      In hybrid mode, your user token handles selfbot actions while your
                      User App provides slash commands with autocomplete.
                    </p>
                    <a href="/user-app" className="text-sm text-primary hover:underline mt-2 inline-block">
                      Manage User Apps →
                    </a>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !token}
              className="btn-primary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Power className="w-4 h-4 mr-2" />
                  Start {botMode === 'bot' ? 'Bot' : 'Selfbot'}
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Warning based on mode */}
      {botMode !== 'bot' && (
        <div className="card p-4 border-discord-yellow/50 bg-discord-yellow/10">
          <h3 className="font-semibold text-discord-yellow mb-2">
            Important Notice
          </h3>
          <p className="text-sm text-muted-foreground">
            {botMode === 'selfbot' ? (
              <>
                Selfbots are against Discord's Terms of Service. Use this tool
                responsibly and at your own risk. Your account may be terminated if
                detected.
              </>
            ) : (
              <>
                Hybrid mode uses a selfbot component which is against Discord's Terms of Service.
                The User App portion is legitimate, but the selfbot actions may result in account termination.
                Use responsibly and at your own risk.
              </>
            )}
          </p>
        </div>
      )}

      {/* Setup Status for Hybrid Mode */}
      {botMode === 'hybrid' && (
        <div className="card p-4">
          <h3 className="font-semibold mb-3">Hybrid Mode Setup Status</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {discordLinked ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span>Discord Account Linked</span>
              </div>
              {!discordLinked && (
                <a href="/settings" className="text-sm text-primary hover:underline">
                  Link Account
                </a>
              )}
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {hasUserApp ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span>User App Created</span>
              </div>
              {!hasUserApp && (
                <a href="/user-app" className="text-sm text-primary hover:underline">
                  Create App
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
