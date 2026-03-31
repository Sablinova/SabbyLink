# SabbyLink Architecture

> **Technical deep-dive into the design, architecture, and implementation details of SabbyLink**

This document provides a comprehensive overview of SabbyLink's technical architecture, design decisions, and implementation patterns. For feature specifications, see [FEATURES.md](FEATURES.md). For deployment, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Backend Architecture](#backend-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Database Design](#database-design)
5. [API Design](#api-design)
6. [AI Integration Architecture](#ai-integration-architecture)
7. [RPC System Architecture](#rpc-system-architecture)
8. [WebSocket Communication](#websocket-communication)
9. [Security Architecture](#security-architecture)
10. [Performance Optimization](#performance-optimization)
11. [Deployment Architecture](#deployment-architecture)
12. [Design Decisions](#design-decisions)

---

## High-Level Architecture

SabbyLink follows a **monorepo architecture** with a clear separation between backend (Discord bot + API) and frontend (web dashboard).

```
┌─────────────────────────────────────────────────────────────┐
│                        User Layer                            │
├─────────────────────────────────────────────────────────────┤
│  Discord Client  │  Web Browser  │  Mobile PWA  │  REST API │
└────────┬─────────┴───────┬───────┴──────┬───────┴──────┬────┘
         │                 │              │              │
         └─────────────────┼──────────────┼──────────────┘
                           │              │
                    ┌──────▼──────────────▼─────┐
                    │   Caddy Reverse Proxy     │
                    │   (HTTPS, Auto-Cert)      │
                    └──────┬──────────────┬─────┘
                           │              │
         ┌─────────────────▼─────┐   ┌───▼────────────────┐
         │  Backend (Bun)         │   │  Frontend (React)  │
         │  ┌──────────────────┐  │   │  Static SPA        │
         │  │ Discord Client   │  │   │  (Vite Build)      │
         │  │ (Selfbot)        │  │   └────────────────────┘
         │  └──────────────────┘  │
         │  ┌──────────────────┐  │
         │  │ REST API         │  │
         │  │ (Elysia.js)      │  │
         │  └──────────────────┘  │
         │  ┌──────────────────┐  │
         │  │ WebSocket Server │  │
         │  │ (Real-time sync) │  │
         │  └──────────────────┘  │
         │  ┌──────────────────┐  │
         │  │ AI Adapters      │  │
         │  │ (8+ providers)   │  │
         │  └──────────────────┘  │
         │  ┌──────────────────┐  │
         │  │ SQLite Database  │  │
         │  │ (Drizzle ORM)    │  │
         │  └──────────────────┘  │
         └────────────────────────┘
```

### Key Architectural Principles

1. **Separation of Concerns**: Discord bot logic, API, WebSocket, and AI adapters are isolated modules
2. **Single Process**: All backend components run in one Bun process for minimal RAM usage
3. **Event-Driven**: Discord events drive bot behavior; WebSocket events drive UI updates
4. **Stateless API**: REST API is stateless; all state stored in SQLite
5. **Real-Time First**: WebSocket used for all real-time features (logs, analytics, bot status)
6. **Database-Backed**: All configuration persisted to SQLite for reliability

---

## Backend Architecture

### Runtime: Why Bun?

SabbyLink uses **Bun** instead of Node.js for several critical advantages:

| Metric | Bun | Node.js | Improvement |
|--------|-----|---------|-------------|
| **Startup Time** | ~50ms | ~200ms | 4x faster |
| **HTTP Req/sec** | ~100k | ~30k | 3.3x faster |
| **RAM Usage** | ~70MB | ~150MB | 50% reduction |
| **Package Install** | ~2s | ~15s | 7.5x faster |

**Decision**: For a selfbot that must run 24/7 on limited resources, Bun's memory efficiency and speed are game-changing.

### Backend Structure

```
backend/
├── src/
│   ├── index.ts              # Entry point - initializes all modules
│   ├── config/
│   │   ├── env.ts            # Environment variables with validation
│   │   └── constants.ts      # App-wide constants
│   ├── db/
│   │   ├── index.ts          # Database connection and initialization
│   │   ├── schema.ts         # Drizzle ORM schema definitions
│   │   └── migrations/       # SQL migration files
│   ├── bot/
│   │   ├── client.ts         # Discord selfbot client setup
│   │   ├── events/           # Discord event handlers
│   │   ├── commands/         # Slash command implementations
│   │   ├── modules/          # Feature modules (AFK, sniper, etc.)
│   │   └── utils/            # Bot-specific utilities
│   ├── api/
│   │   ├── index.ts          # Elysia.js app setup
│   │   ├── routes/           # API route handlers
│   │   ├── middleware/       # Auth, rate limiting, logging
│   │   └── validators/       # Request validation schemas
│   ├── ws/
│   │   ├── server.ts         # WebSocket server setup
│   │   ├── handlers/         # WebSocket event handlers
│   │   └── broadcast.ts      # Broadcast utilities
│   ├── ai/
│   │   ├── index.ts          # AI provider registry
│   │   ├── adapter.ts        # Base adapter interface
│   │   ├── providers/        # Provider implementations
│   │   │   ├── openai.ts
│   │   │   ├── claude.ts
│   │   │   ├── gemini.ts
│   │   │   ├── groq.ts
│   │   │   ├── ollama.ts
│   │   │   ├── openrouter.ts
│   │   │   ├── perplexity.ts
│   │   │   └── custom.ts
│   │   └── context.ts        # Conversation context management
│   └── utils/
│       ├── crypto.ts         # Encryption/decryption (AES-256-GCM)
│       ├── logger.ts         # Structured logging
│       ├── rate-limiter.ts   # Rate limiting logic
│       └── validators.ts     # Common validation helpers
├── package.json
├── tsconfig.json
└── .env.example
```

### Module Initialization Flow

```typescript
// src/index.ts - Startup sequence
async function start() {
  // 1. Load and validate environment
  const config = loadConfig();
  
  // 2. Initialize database
  await initDatabase();
  
  // 3. Start Discord client
  const bot = await initBot(config.discordToken);
  
  // 4. Start REST API
  const api = await initAPI(bot);
  
  // 5. Start WebSocket server
  const ws = await initWebSocket(bot);
  
  // 6. Initialize AI providers
  await initAIProviders(config.aiKeys);
  
  // 7. Health check and ready signal
  logger.info('SabbyLink is ready!');
}
```

### Key Backend Patterns

#### 1. Event-Driven Architecture

```typescript
// bot/client.ts
client.on('messageCreate', async (message) => {
  // Emit to multiple handlers
  await Promise.all([
    handleCommands(message),
    handleAutoReactions(message),
    handleAIResponder(message),
    broadcastToWebSocket({ type: 'message', data: message })
  ]);
});
```

#### 2. Middleware Chain (API)

```typescript
// api/index.ts
const app = new Elysia()
  .use(cors())
  .use(authentication)   // Verify JWT/session
  .use(rateLimiting)     // Prevent abuse
  .use(requestLogging)   // Log all requests
  .use(errorHandling);   // Catch and format errors
```

#### 3. Adapter Pattern (AI)

```typescript
// ai/adapter.ts
interface AIAdapter {
  name: string;
  chat(messages: Message[], options: ChatOptions): Promise<string>;
  streamChat(messages: Message[], options: ChatOptions): AsyncIterable<string>;
}

// ai/providers/openai.ts
export class OpenAIAdapter implements AIAdapter {
  async chat(messages, options) {
    const response = await this.client.chat.completions.create({
      model: options.model,
      messages: this.formatMessages(messages),
      temperature: options.temperature
    });
    return response.choices[0].message.content;
  }
}
```

---

## Frontend Architecture

### Tech Stack

- **React 18**: Latest features (concurrent rendering, automatic batching)
- **TypeScript**: Full type safety across the codebase
- **Vite**: Lightning-fast dev server and optimized production builds
- **Tailwind CSS**: Utility-first styling with custom design system
- **Zustand**: <1KB state management (vs Redux's ~40KB)
- **Radix UI**: Accessible, unstyled components
- **Framer Motion**: Smooth animations and page transitions
- **React Router**: Client-side routing
- **TanStack Query**: Server state management and caching

### Frontend Structure

```
frontend/
├── src/
│   ├── main.tsx              # App entry point
│   ├── App.tsx               # Root component with routing
│   ├── pages/                # Page components (routes)
│   │   ├── Dashboard.tsx
│   │   ├── RPC.tsx
│   │   ├── Commands.tsx
│   │   ├── Automation.tsx
│   │   ├── AI.tsx
│   │   ├── Analytics.tsx
│   │   └── Settings.tsx
│   ├── components/           # Reusable UI components
│   │   ├── layout/           # Layout components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   ├── ui/               # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   └── ...
│   │   ├── features/         # Feature-specific components
│   │   │   ├── RPCBuilder.tsx
│   │   │   ├── CommandList.tsx
│   │   │   ├── AutomationCanvas.tsx
│   │   │   └── ...
│   │   └── shared/           # Shared components
│   ├── hooks/                # Custom React hooks
│   │   ├── useWebSocket.ts
│   │   ├── useBot.ts
│   │   ├── useAuth.ts
│   │   └── useTheme.ts
│   ├── store/                # Zustand stores
│   │   ├── auth.ts
│   │   ├── bot.ts
│   │   ├── theme.ts
│   │   └── settings.ts
│   ├── lib/                  # Utilities and helpers
│   │   ├── api.ts            # API client
│   │   ├── websocket.ts      # WebSocket client
│   │   ├── utils.ts          # General utilities
│   │   └── constants.ts      # Frontend constants
│   ├── types/                # TypeScript type definitions
│   │   ├── api.ts
│   │   ├── bot.ts
│   │   └── index.ts
│   └── styles/               # Global styles
│       └── globals.css
├── public/                   # Static assets
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

### State Management Strategy

SabbyLink uses **Zustand** for its simplicity and tiny bundle size. State is divided into logical stores:

```typescript
// store/bot.ts - Bot state
interface BotStore {
  status: 'online' | 'offline' | 'connecting';
  user: DiscordUser | null;
  uptime: number;
  setStatus: (status) => void;
  setUser: (user) => void;
}

// store/auth.ts - Authentication state
interface AuthStore {
  isAuthenticated: boolean;
  token: string | null;
  login: (credentials) => Promise<void>;
  logout: () => void;
}

// store/theme.ts - Theme state
interface ThemeStore {
  theme: 'light' | 'dark';
  accentColor: string;
  toggleTheme: () => void;
  setAccentColor: (color) => void;
}
```

### Component Architecture

**Principle**: Components should be small, focused, and composable.

```typescript
// pages/RPC.tsx - Container component
export function RPCPage() {
  const { rpcConfig, updateRPC } = useBot();
  const [preview, setPreview] = useState(null);
  
  return (
    <PageLayout title="Rich Presence">
      <RPCBuilder 
        config={rpcConfig} 
        onChange={updateRPC}
        onPreview={setPreview}
      />
      <RPCPreview data={preview} />
    </PageLayout>
  );
}

// components/features/RPCBuilder.tsx - Feature component
export function RPCBuilder({ config, onChange, onPreview }) {
  return (
    <Card>
      <PlatformSelector value={config.platform} onChange={...} />
      <StateEditor states={config.states} onChange={...} />
      <AnimationControls enabled={config.animate} interval={...} />
    </Card>
  );
}
```

### Real-Time Updates (WebSocket)

```typescript
// hooks/useWebSocket.ts
export function useWebSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3000/ws');
    
    ws.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);
      
      // Update relevant stores based on event type
      switch (type) {
        case 'bot:status':
          useBotStore.getState().setStatus(data.status);
          break;
        case 'message:new':
          // Update message log
          break;
        case 'command:executed':
          // Update analytics
          break;
      }
    };
    
    setSocket(ws);
    return () => ws.close();
  }, []);
  
  return { socket };
}
```

---

## Database Design

### Why SQLite?

SabbyLink uses **SQLite** with **Drizzle ORM** for several reasons:

1. **Zero Configuration**: No separate database server needed
2. **Minimal RAM**: Embedded database uses <10MB
3. **ACID Compliance**: Full transactional support
4. **Backup Simplicity**: Single file can be copied/restored
5. **Performance**: Fast for read-heavy workloads (selfbot use case)

### Schema Overview

See [DATABASE.md](DATABASE.md) for complete schema with all columns and constraints. Here's a high-level overview:

```sql
-- Core tables
users                  -- User accounts (for dashboard auth)
discord_accounts       -- Discord account info
settings               -- Bot settings (global)
user_settings          -- User-specific settings

-- RPC system
rpc_configs            -- RPC configuration
rpc_states             -- Multi-state for animations

-- Commands & automation
slash_commands         -- Custom slash commands
automations            -- Visual automation workflows
automation_blocks      -- Individual blocks in workflows

-- AI system
ai_configs             -- AI provider configurations
ai_conversations       -- Conversation threads
ai_messages            -- Individual messages in conversations

-- Logging & analytics
message_logs           -- Deleted/edited message tracking
command_logs           -- Command execution history
error_logs             -- Error tracking
analytics_daily        -- Daily aggregated stats

-- Features
afk_settings           -- AFK system config
auto_reactions         -- Auto-reaction rules
nitro_snipers          -- Nitro sniper config
giveaway_configs       -- Giveaway joiner config
```

### Schema Relationships

```
users (1) ──────── (1) discord_accounts
  │
  ├── (1) ────── (1) settings
  ├── (1) ────── (1) user_settings
  ├── (1) ────── (1) rpc_configs
  │                      │
  │                      └── (1) ────── (N) rpc_states
  ├── (1) ────── (N) slash_commands
  ├── (1) ────── (N) automations
  │                      │
  │                      └── (1) ────── (N) automation_blocks
  ├── (1) ────── (N) ai_configs
  ├── (1) ────── (N) ai_conversations
  │                      │
  │                      └── (1) ────── (N) ai_messages
  └── (1) ────── (N) message_logs
```

### Drizzle ORM Example

```typescript
// db/schema.ts
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const rpcConfigs = sqliteTable('rpc_configs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  platform: text('platform').notNull().default('pc'),
  animationEnabled: integer('animation_enabled', { mode: 'boolean' }).default(false),
  animationInterval: integer('animation_interval').default(30),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

// Usage in API route
const config = await db.select()
  .from(rpcConfigs)
  .where(eq(rpcConfigs.userId, userId))
  .limit(1);
```

---

## API Design

### REST API Principles

1. **RESTful**: Standard HTTP methods (GET, POST, PUT, DELETE)
2. **JSON**: All requests/responses in JSON format
3. **Versioned**: API routes prefixed with `/api/v1/`
4. **Authenticated**: JWT-based authentication
5. **Rate Limited**: Per-endpoint rate limits to prevent abuse

### API Structure

```
/api/v1/
├── /auth
│   ├── POST /login              # Login with username/password
│   ├── POST /logout             # Invalidate session
│   ├── POST /register           # Create new user
│   └── GET  /me                 # Get current user info
├── /bot
│   ├── GET  /status             # Bot online/offline status
│   ├── POST /restart            # Restart bot client
│   └── GET  /guilds             # List guilds bot is in
├── /rpc
│   ├── GET  /config             # Get RPC configuration
│   ├── PUT  /config             # Update RPC configuration
│   ├── GET  /states             # Get all RPC states
│   ├── POST /states             # Create new state
│   ├── PUT  /states/:id         # Update state
│   └── DELETE /states/:id       # Delete state
├── /commands
│   ├── GET  /list               # List all slash commands
│   ├── POST /create             # Create new command
│   ├── PUT  /:id                # Update command
│   └── DELETE /:id              # Delete command
├── /automation
│   ├── GET  /workflows          # List all workflows
│   ├── POST /workflows          # Create workflow
│   ├── PUT  /workflows/:id      # Update workflow
│   ├── DELETE /workflows/:id    # Delete workflow
│   ├── POST /workflows/:id/test # Test workflow
│   └── PUT  /workflows/:id/toggle # Enable/disable workflow
├── /ai
│   ├── GET  /providers          # List AI providers
│   ├── GET  /config             # Get AI configuration
│   ├── PUT  /config             # Update AI configuration
│   ├── POST /chat               # Send chat message (streaming)
│   └── GET  /conversations      # List conversations
├── /analytics
│   ├── GET  /overview           # Dashboard overview stats
│   ├── GET  /messages           # Message stats over time
│   ├── GET  /commands           # Command usage stats
│   └── GET  /uptime             # Uptime history
├── /logs
│   ├── GET  /messages           # Deleted/edited messages
│   ├── GET  /commands           # Command execution logs
│   └── GET  /errors             # Error logs
└── /settings
    ├── GET  /                   # Get all settings
    ├── PUT  /                   # Update settings (batch)
    ├── POST /backup             # Create backup
    └── POST /restore            # Restore from backup
```

### Example API Implementations

```typescript
// api/routes/rpc.ts
import { Elysia, t } from 'elysia';

export const rpcRoutes = new Elysia({ prefix: '/rpc' })
  .get('/config', async ({ userId }) => {
    const config = await db.query.rpcConfigs.findFirst({
      where: eq(rpcConfigs.userId, userId),
      with: { states: true }
    });
    return config;
  })
  .put('/config', async ({ userId, body }) => {
    await db.update(rpcConfigs)
      .set({
        enabled: body.enabled,
        platform: body.platform,
        animationEnabled: body.animationEnabled,
        animationInterval: body.animationInterval,
        updatedAt: new Date()
      })
      .where(eq(rpcConfigs.userId, userId));
    
    // Broadcast update to WebSocket clients
    broadcastToUser(userId, {
      type: 'rpc:config:updated',
      data: body
    });
    
    return { success: true };
  }, {
    body: t.Object({
      enabled: t.Boolean(),
      platform: t.String(),
      animationEnabled: t.Boolean(),
      animationInterval: t.Number()
    })
  });
```

---

## AI Integration Architecture

### Adapter Pattern

The AI system uses an **adapter pattern** to support multiple providers through a unified interface:

```typescript
// ai/adapter.ts
export interface AIAdapter {
  name: string;
  
  // Non-streaming chat
  chat(
    messages: AIMessage[], 
    options: ChatOptions
  ): Promise<string>;
  
  // Streaming chat (for real-time responses)
  streamChat(
    messages: AIMessage[], 
    options: ChatOptions
  ): AsyncIterable<string>;
  
  // Provider-specific config
  validateConfig(config: any): boolean;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}
```

### Provider Registry

```typescript
// ai/index.ts
import { OpenAIAdapter } from './providers/openai';
import { ClaudeAdapter } from './providers/claude';
// ... other providers

export class AIProviderRegistry {
  private providers: Map<string, AIAdapter> = new Map();
  
  register(provider: AIAdapter) {
    this.providers.set(provider.name, provider);
  }
  
  get(name: string): AIAdapter | undefined {
    return this.providers.get(name);
  }
  
  list(): string[] {
    return Array.from(this.providers.keys());
  }
}

// Initialize registry
export const aiRegistry = new AIProviderRegistry();
aiRegistry.register(new OpenAIAdapter());
aiRegistry.register(new ClaudeAdapter());
// ... register other providers
```

### Provider Implementations

Each provider implements the `AIAdapter` interface:

```typescript
// ai/providers/openai.ts
export class OpenAIAdapter implements AIAdapter {
  name = 'openai';
  private client: OpenAI;
  
  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }
  
  async chat(messages: AIMessage[], options: ChatOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options.model || 'gpt-4-turbo-preview',
      messages: this.formatMessages(messages),
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000
    });
    return response.choices[0].message.content;
  }
  
  async *streamChat(messages: AIMessage[], options: ChatOptions) {
    const stream = await this.client.chat.completions.create({
      model: options.model || 'gpt-4-turbo-preview',
      messages: this.formatMessages(messages),
      stream: true,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000
    });
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }
  
  private formatMessages(messages: AIMessage[]) {
    return messages.map(m => ({
      role: m.role,
      content: m.content
    }));
  }
  
  validateConfig(config: any): boolean {
    return typeof config.apiKey === 'string' && config.apiKey.startsWith('sk-');
  }
}
```

### Conversation Context Management

```typescript
// ai/context.ts
export class ConversationContext {
  private messages: AIMessage[] = [];
  private maxMessages = 20;  // Keep last 20 messages
  private maxTokens = 4000;  // Approximate token limit
  
  addMessage(role: 'user' | 'assistant', content: string) {
    this.messages.push({ role, content });
    this.prune();
  }
  
  getMessages(systemPrompt?: string): AIMessage[] {
    const messages: AIMessage[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push(...this.messages);
    return messages;
  }
  
  private prune() {
    // Keep only last N messages
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }
    
    // Estimate token count and trim if needed
    const estimatedTokens = this.messages.reduce(
      (sum, msg) => sum + msg.content.length / 4, // rough estimate
      0
    );
    
    while (estimatedTokens > this.maxTokens && this.messages.length > 1) {
      this.messages.shift();  // Remove oldest message
    }
  }
  
  clear() {
    this.messages = [];
  }
}
```

---

## RPC System Architecture

### Platform Emulation

Different platforms require different application IDs and asset structures:

```typescript
// bot/modules/rpc/platforms.ts
export interface PlatformConfig {
  name: string;
  applicationId: string;
  defaultAssets: {
    largeImage?: string;
    smallImage?: string;
  };
  supportedFields: string[];
}

export const PLATFORMS: Record<string, PlatformConfig> = {
  xbox: {
    name: 'Xbox',
    applicationId: '438122941302046720',
    defaultAssets: {
      largeImage: 'xbox_logo',
      smallImage: 'xbox_controller'
    },
    supportedFields: ['details', 'state', 'buttons']
  },
  playstation: {
    name: 'PlayStation',
    applicationId: '1149387775104172162',
    defaultAssets: {
      largeImage: 'ps_logo',
      smallImage: 'ps_controller'
    },
    supportedFields: ['details', 'state', 'buttons']
  },
  // ... other platforms
};
```

### Multi-State Animation System

```typescript
// bot/modules/rpc/animator.ts
export class RPCAnimator {
  private states: RPCState[] = [];
  private currentIndex = 0;
  private interval: NodeJS.Timer | null = null;
  
  constructor(
    private client: Discord.Client,
    private intervalSeconds: number
  ) {}
  
  setStates(states: RPCState[]) {
    this.states = states;
    this.currentIndex = 0;
  }
  
  start() {
    if (this.states.length === 0) return;
    
    // Set initial state
    this.updatePresence();
    
    // Start rotation
    this.interval = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.states.length;
      this.updatePresence();
    }, this.intervalSeconds * 1000);
  }
  
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
  
  private updatePresence() {
    const state = this.states[this.currentIndex];
    
    this.client.user?.setPresence({
      activities: [{
        name: state.name,
        type: this.getActivityType(state.type),
        details: state.details,
        state: state.state,
        timestamps: state.showTimestamp ? {
          start: Date.now()
        } : undefined,
        assets: {
          largeImage: state.largeImage,
          largeText: state.largeText,
          smallImage: state.smallImage,
          smallText: state.smallText
        },
        buttons: state.buttons
      }],
      status: state.status as any
    });
  }
  
  private getActivityType(type: string): Discord.ActivityType {
    const types: Record<string, Discord.ActivityType> = {
      playing: 0,
      streaming: 1,
      listening: 2,
      watching: 3,
      competing: 5
    };
    return types[type] || 0;
  }
}
```

---

## WebSocket Communication

### Event Types

```typescript
// ws/events.ts
export type WSEvent =
  // Bot events
  | { type: 'bot:status'; data: { status: 'online' | 'offline' } }
  | { type: 'bot:ready'; data: { user: DiscordUser } }
  | { type: 'bot:error'; data: { error: string } }
  
  // Message events
  | { type: 'message:new'; data: Message }
  | { type: 'message:deleted'; data: { id: string; content: string } }
  | { type: 'message:edited'; data: { id: string; oldContent: string; newContent: string } }
  
  // Command events
  | { type: 'command:executed'; data: { command: string; userId: string; timestamp: number } }
  
  // RPC events
  | { type: 'rpc:config:updated'; data: RPCConfig }
  | { type: 'rpc:state:changed'; data: RPCState }
  
  // AI events
  | { type: 'ai:message'; data: { content: string; role: 'user' | 'assistant' } }
  | { type: 'ai:stream:chunk'; data: { chunk: string } }
  | { type: 'ai:stream:end'; data: { fullMessage: string } }
  
  // Analytics events
  | { type: 'analytics:update'; data: AnalyticsData };
```

### WebSocket Server

```typescript
// ws/server.ts
export class WebSocketServer {
  private clients = new Map<string, WebSocket>();
  
  broadcast(event: WSEvent) {
    const payload = JSON.stringify(event);
    for (const [userId, socket] of this.clients) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
      }
    }
  }
  
  sendToUser(userId: string, event: WSEvent) {
    const socket = this.clients.get(userId);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(event));
    }
  }
  
  handleConnection(socket: WebSocket, userId: string) {
    this.clients.set(userId, socket);
    
    socket.on('close', () => {
      this.clients.delete(userId);
    });
    
    socket.on('message', (data) => {
      this.handleMessage(userId, data);
    });
  }
  
  private handleMessage(userId: string, data: any) {
    try {
      const event = JSON.parse(data);
      // Handle client-to-server events
      switch (event.type) {
        case 'ping':
          this.sendToUser(userId, { type: 'pong', data: {} });
          break;
        // ... other event handlers
      }
    } catch (error) {
      logger.error('WebSocket message error:', error);
    }
  }
}
```

---

## Security Architecture

### Discord OAuth & Hybrid Authentication

SabbyLink supports a **hybrid authentication system** inspired by Nighty:

1. **Discord OAuth for Dashboard Login** - Users can login with their Discord account instead of email/password
2. **User App Creation** - Create Discord Applications for legitimate slash commands with autocomplete
3. **Multiple Bot Modes**:
   - **Selfbot Mode**: Uses user token for selfbot actions (presence, automation, message logging)
   - **Bot Mode**: Uses application bot token for traditional bot commands
   - **Hybrid Mode**: Combines both - user token for selfbot + application token for slash commands

#### OAuth Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Discord OAuth Flow                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User clicks "Login with Discord"                            │
│           │                                                      │
│           ▼                                                      │
│  2. GET /api/v1/auth/discord/url                                │
│           │                                                      │
│           ▼                                                      │
│  3. Redirect to Discord OAuth consent page                      │
│           │                                                      │
│           ▼                                                      │
│  4. User authorizes app (identify, guilds scopes)               │
│           │                                                      │
│           ▼                                                      │
│  5. Discord redirects with ?code=...                            │
│           │                                                      │
│           ▼                                                      │
│  6. POST /api/v1/auth/discord/callback { code }                 │
│           │                                                      │
│           ▼                                                      │
│  7. Backend exchanges code for Discord access token             │
│           │                                                      │
│           ▼                                                      │
│  8. Fetch user info from Discord API                            │
│           │                                                      │
│           ▼                                                      │
│  9. Create/update user in database with Discord ID              │
│           │                                                      │
│           ▼                                                      │
│  10. Generate JWT + refresh token                               │
│           │                                                      │
│           ▼                                                      │
│  11. Return tokens to frontend                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### User App (Discord Application) Architecture

The User App system allows creating Discord Applications through the Discord Developer Portal API:

```typescript
// Backend routes: backend/src/api/routes/user-app.ts

// List user's applications
GET /api/v1/user-app/list

// Create new application (calls Discord API)
POST /api/v1/user-app/create
  - Creates application via Discord Developer Portal
  - Stores application info in database
  - Returns application ID and bot token

// Register slash commands
POST /api/v1/user-app/:appId/register-commands
  - Registers commands with Discord
  - Commands appear with autocomplete like regular bots
```

#### Database Schema Updates

```sql
-- Users table now supports OAuth-only accounts
ALTER TABLE users ADD COLUMN discord_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN discord_username TEXT;
ALTER TABLE users ADD COLUMN discord_avatar TEXT;
ALTER TABLE users ADD COLUMN discord_access_token TEXT;  -- Encrypted
ALTER TABLE users ADD COLUMN discord_refresh_token TEXT; -- Encrypted
ALTER TABLE users MODIFY password_hash TEXT NULL;  -- Nullable for OAuth-only users

-- User applications table
CREATE TABLE user_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  discord_app_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  bot_token TEXT,  -- Encrypted
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Dashboard-Based Configuration (Zero VPS Config)

SabbyLink supports **complete dashboard-based configuration** - no VPS access required:

```
┌─────────────────────────────────────────────────────────────────┐
│                 Configuration Sources (Priority Order)          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Dashboard Settings (system_settings table) ← Primary        │
│           │                                                      │
│           │  If not configured in dashboard...                   │
│           ▼                                                      │
│  2. Environment Variables (.env file) ← Fallback                 │
│           │                                                      │
│           │  If not set in env...                                │
│           ▼                                                      │
│  3. Default Values (hardcoded) ← Last resort                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### System Settings Table

```sql
CREATE TABLE system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT,           -- NULL for unset
  encrypted BOOLEAN DEFAULT false,
  description TEXT,
  category TEXT DEFAULT 'general',  -- discord, features, security, etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Available Settings

| Category | Key | Description | Encrypted |
|----------|-----|-------------|-----------|
| **discord** | `discord_client_id` | OAuth Application ID | No |
| **discord** | `discord_client_secret` | OAuth Application Secret | Yes |
| **discord** | `discord_redirect_uri` | OAuth Callback URL | No |
| **discord** | `bot_mode` | selfbot or bot | No |
| **features** | `enable_rpc` | Rich Presence enabled | No |
| **features** | `enable_ai_responder` | AI auto-reply | No |
| **features** | `enable_nitro_sniper` | Auto-claim Nitro | No |
| **security** | `rate_limit_max` | API rate limit | No |
| **security** | `session_timeout_hours` | JWT expiry | No |

#### Backend Implementation

```typescript
// backend/src/config/settings.ts

// In-memory cache for performance
let settingsCache: Map<string, string | null> = new Map();

export function getSetting(key: SettingKey): string | null {
  // 1. Check cache
  if (settingsCache.has(key)) {
    return settingsCache.get(key);
  }
  
  // 2. Load from database
  const row = db.select().from(systemSettings)
    .where(eq(systemSettings.key, key)).get();
  
  if (row?.value) {
    const value = row.encrypted ? decrypt(row.value) : row.value;
    settingsCache.set(key, value);
    return value;
  }
  
  // 3. Return default
  const meta = SETTINGS_METADATA.find(m => m.key === key);
  return meta?.default ?? null;
}

export function getDiscordOAuthConfig() {
  return {
    clientId: getSetting(SETTING_KEYS.DISCORD_CLIENT_ID),
    clientSecret: getSetting(SETTING_KEYS.DISCORD_CLIENT_SECRET),
    redirectUri: getSetting(SETTING_KEYS.DISCORD_REDIRECT_URI),
  };
}
```

#### Admin API Routes

```
GET /api/v1/admin/settings
  → Returns all settings + metadata (admin only)

PUT /api/v1/admin/settings
  → Updates settings, refreshes cache (admin only)

GET /api/v1/admin/settings/oauth-status
  → Returns { configured: boolean }
```

#### Frontend (Settings > Admin Tab)

Admin users (user ID = 1) see an "Admin" tab in Settings page that allows:
- Configuring Discord OAuth credentials
- Toggling features
- Setting rate limits
- Adjusting security settings

**Key Files:**
- `backend/src/config/settings.ts` - Settings service
- `backend/src/api/routes/admin-settings.ts` - Admin API
- `frontend/src/pages/SettingsPage.tsx` - Admin tab UI

### Encryption (AES-256-GCM)

```typescript
// utils/crypto.ts
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export class Encryption {
  private key: Buffer;
  
  constructor(secretKey: string) {
    // Derive 256-bit key from secret
    this.key = crypto.scryptSync(secretKey, 'salt', KEY_LENGTH);
  }
  
  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:ciphertext
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
  
  decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

### Authentication Flow

```typescript
// api/middleware/auth.ts
import jwt from 'jsonwebtoken';

export const authenticate = async ({ request, set }) => {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    set.status = 401;
    return { error: 'Unauthorized' };
  }
  
  const token = authHeader.substring(7);
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    return { userId: payload.userId };
  } catch (error) {
    set.status = 401;
    return { error: 'Invalid token' };
  }
};
```

### Rate Limiting

```typescript
// utils/rate-limiter.ts
export class RateLimiter {
  private requests = new Map<string, number[]>();
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}
  
  check(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside window
    const validRequests = requests.filter(
      timestamp => now - timestamp < this.windowMs
    );
    
    if (validRequests.length >= this.maxRequests) {
      return false;  // Rate limit exceeded
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }
  
  reset(key: string) {
    this.requests.delete(key);
  }
}

// Usage in API
const limiter = new RateLimiter(100, 60000);  // 100 req/min

export const rateLimiting = async ({ request, set }) => {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  
  if (!limiter.check(ip)) {
    set.status = 429;
    return { error: 'Too many requests' };
  }
};
```

---

## Performance Optimization

### 1. Database Indexing

```sql
-- Frequently queried fields
CREATE INDEX idx_message_logs_user_id ON message_logs(user_id);
CREATE INDEX idx_message_logs_created_at ON message_logs(created_at);
CREATE INDEX idx_command_logs_user_id ON command_logs(user_id);
CREATE INDEX idx_command_logs_timestamp ON command_logs(timestamp);

-- Composite indexes for common queries
CREATE INDEX idx_analytics_user_date ON analytics_daily(user_id, date);
```

### 2. Frontend Code Splitting

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-select'],
          'vendor-charts': ['recharts'],
          'vendor-motion': ['framer-motion']
        }
      }
    }
  }
});
```

### 3. React Component Optimization

```typescript
// Use memo for expensive components
export const RPCPreview = memo(({ data }) => {
  return <PresenceCard {...data} />;
});

// Use callback to prevent re-renders
export function CommandList() {
  const handleExecute = useCallback((id: string) => {
    executeCommand(id);
  }, []);
  
  return commands.map(cmd => (
    <CommandItem key={cmd.id} onExecute={handleExecute} />
  ));
}
```

### 4. WebSocket Message Batching

```typescript
// ws/broadcast.ts
export class MessageBatcher {
  private queue: WSEvent[] = [];
  private timer: NodeJS.Timer | null = null;
  
  add(event: WSEvent) {
    this.queue.push(event);
    
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), 100);  // Batch every 100ms
    }
  }
  
  private flush() {
    if (this.queue.length > 0) {
      wsServer.broadcast({
        type: 'batch',
        data: { events: this.queue }
      });
      this.queue = [];
    }
    this.timer = null;
  }
}
```

---

## Deployment Architecture

### Docker Compose Setup

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    environment:
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - DATABASE_URL=/data/sabbylink.db
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./data:/data
    restart: unless-stopped
    networks:
      - sabbylink
  
  frontend:
    build: ./frontend
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - sabbylink
  
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - backend
      - frontend
    restart: unless-stopped
    networks:
      - sabbylink

networks:
  sabbylink:
    driver: bridge

volumes:
  caddy_data:
  caddy_config:
```

### Resource Requirements

| Component | CPU | RAM | Disk |
|-----------|-----|-----|------|
| **Backend** | 0.5 cores | 70-100MB | 50MB + logs |
| **Frontend** | 0.1 cores | 20-30MB | 10MB (static) |
| **SQLite** | 0.1 cores | 10-20MB | Variable (grows with logs) |
| **Caddy** | 0.1 cores | 20-30MB | 10MB + certs |
| **Total** | ~1 core | **120-180MB** | ~100MB + data |

**Result**: Fits comfortably in a $5/month VPS (1GB RAM).

---

## Design Decisions

### 1. Why Bun over Node.js?

**Decision**: Use Bun as the runtime.

**Reasoning**:
- 50% less RAM usage (critical for VPS hosting)
- 3x faster HTTP performance
- Built-in TypeScript support (no ts-node needed)
- Faster package installation
- Native WebSocket support

**Tradeoff**: Slightly less mature ecosystem, but stability has improved significantly in 1.0+.

### 2. Why SQLite over PostgreSQL?

**Decision**: Use SQLite with Drizzle ORM.

**Reasoning**:
- Zero configuration (embedded database)
- <10MB RAM overhead
- Single file for easy backup/restore
- Sufficient performance for single-user workload
- No separate database server to manage

**Tradeoff**: Not suitable for multi-user deployments, but this is a selfbot (single user by definition).

### 3. Why Zustand over Redux?

**Decision**: Use Zustand for state management.

**Reasoning**:
- <1KB bundle size (vs Redux's ~40KB with middleware)
- Simpler API (no boilerplate)
- Better TypeScript support
- No need for React Context
- Sufficient for SabbyLink's state needs

**Tradeoff**: Less tooling (no Redux DevTools equivalent), but the simplicity wins for this use case.

### 4. Why Adapter Pattern for AI?

**Decision**: Use adapter pattern instead of a single provider.

**Reasoning**:
- Flexibility: Users can choose their preferred provider
- Future-proof: Easy to add new providers
- Cost optimization: Use cheaper providers for simple tasks
- Local AI support: Ollama for offline operation

**Tradeoff**: More code to maintain, but the flexibility is worth it.

### 5. Why GPL-3.0 License?

**Decision**: Use GPL-3.0 instead of MIT or Apache 2.0.

**Reasoning**:
- Ensures credit is given to original authors
- Prevents closed-source commercial forks
- Forces improvements to be shared back to the community
- Discourages pay-to-use forks (they must also be GPL)

**Tradeoff**: Less permissive than MIT, but aligns with the open-source ethos of the project.

---

## Next Steps

For implementation details, see:
- [FEATURES.md](FEATURES.md) - Feature specifications
- [DATABASE.md](DATABASE.md) - Complete database schema
- [API.md](API.md) - API endpoint documentation
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide

For contributing, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

**Last Updated**: 2024-01-01  
**Version**: 0.1.0 (Pre-release)
