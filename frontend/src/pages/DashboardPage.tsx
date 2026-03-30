import { useEffect, useState } from 'react';
import { useBotStore } from '../store/bot';
import { analyticsApi } from '../lib/api';
import { Bot, MessageSquare, Terminal, Wifi, Clock, Server } from 'lucide-react';

interface Stats {
  today: {
    messagesSent: number;
    messagesReceived: number;
    commandsExecuted: number;
  };
  week: {
    total: {
      messagesSent: number;
      messagesReceived: number;
      commandsExecuted: number;
    };
  };
}

export default function DashboardPage() {
  const { status, user, guilds, ping, uptime, fetchStatus, fetchGuilds } = useBotStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchStatus(),
          fetchGuilds(),
        ]);

        const response = await analyticsApi.getOverview();
        setStats(response.data);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchGuilds]);

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const statusCards = [
    {
      title: 'Bot Status',
      value: status,
      icon: Bot,
      color: status === 'online' ? 'text-discord-green' : 'text-gray-500',
    },
    {
      title: 'Ping',
      value: `${ping}ms`,
      icon: Wifi,
      color: ping < 100 ? 'text-discord-green' : ping < 300 ? 'text-discord-yellow' : 'text-discord-red',
    },
    {
      title: 'Uptime',
      value: formatUptime(uptime),
      icon: Clock,
      color: 'text-brand-500',
    },
    {
      title: 'Servers',
      value: guilds.length.toString(),
      icon: Server,
      color: 'text-discord-blurple',
    },
  ];

  const analyticsCards = [
    {
      title: 'Messages Sent',
      value: stats?.today.messagesSent || 0,
      weekValue: stats?.week.total.messagesSent || 0,
      icon: MessageSquare,
      color: 'text-brand-500',
    },
    {
      title: 'Messages Received',
      value: stats?.today.messagesReceived || 0,
      weekValue: stats?.week.total.messagesReceived || 0,
      icon: MessageSquare,
      color: 'text-discord-blurple',
    },
    {
      title: 'Commands Executed',
      value: stats?.today.commandsExecuted || 0,
      weekValue: stats?.week.total.commandsExecuted || 0,
      icon: Terminal,
      color: 'text-discord-green',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back{user ? `, ${user.username}` : ''}!
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statusCards.map((card) => (
          <div key={card.title} className="card p-4">
            <div className="flex items-center space-x-3">
              <card.icon className={`w-8 h-8 ${card.color}`} />
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-xl font-bold capitalize">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {analyticsCards.map((card) => (
            <div key={card.title} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <card.icon className={`w-6 h-6 ${card.color}`} />
                <span className="text-xs text-muted-foreground">Today</span>
              </div>
              <p className="text-sm text-muted-foreground">{card.title}</p>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {card.weekValue} this week
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="/rpc" className="card p-4 hover:border-brand-500 transition-colors cursor-pointer">
            <p className="font-medium">Configure RPC</p>
            <p className="text-sm text-muted-foreground">Set up your presence</p>
          </a>
          <a href="/commands" className="card p-4 hover:border-brand-500 transition-colors cursor-pointer">
            <p className="font-medium">Create Command</p>
            <p className="text-sm text-muted-foreground">Add custom commands</p>
          </a>
          <a href="/ai" className="card p-4 hover:border-brand-500 transition-colors cursor-pointer">
            <p className="font-medium">AI Chat</p>
            <p className="text-sm text-muted-foreground">Configure AI providers</p>
          </a>
          <a href="/settings" className="card p-4 hover:border-brand-500 transition-colors cursor-pointer">
            <p className="font-medium">Settings</p>
            <p className="text-sm text-muted-foreground">Customize preferences</p>
          </a>
        </div>
      </div>
    </div>
  );
}
