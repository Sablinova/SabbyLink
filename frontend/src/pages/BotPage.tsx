import { useState } from 'react';
import { useBotStore } from '../store/bot';
import { Bot, Power, RefreshCw, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function BotPage() {
  const { status, user, start, stop, restart, isLoading, error, clearError } =
    useBotStore();
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Bot Control</h1>
        <p className="text-muted-foreground">
          Manage your Discord selfbot connection
        </p>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
          {error}
        </div>
      )}

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
                Discord Token
              </label>
              <div className="relative">
                <input
                  id="token"
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="input pr-10"
                  placeholder="Enter your Discord token"
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
                  Start Bot
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Warning */}
      <div className="card p-4 border-discord-yellow/50 bg-discord-yellow/10">
        <h3 className="font-semibold text-discord-yellow mb-2">
          Important Notice
        </h3>
        <p className="text-sm text-muted-foreground">
          Selfbots are against Discord's Terms of Service. Use this tool
          responsibly and at your own risk. Your account may be terminated if
          detected.
        </p>
      </div>
    </div>
  );
}
