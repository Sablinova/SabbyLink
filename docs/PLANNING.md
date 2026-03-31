# SabbyLink - Complete Project Planning Document

**Version:** 1.2.0  
**Last Updated:** March 31, 2026  
**License:** GPL-3.0  
**Status:** Implementation - Dashboard Config Complete

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technical Architecture](#2-technical-architecture)
3. [Feature Specifications](#3-feature-specifications)
4. [Database Design](#4-database-design)
5. [API Design](#5-api-design)
6. [AI Integration Plan](#6-ai-integration-plan)
7. [RPC System Design](#7-rpc-system-design)
8. [Web Dashboard Design](#8-web-dashboard-design)
9. [Security & Privacy](#9-security--privacy)
10. [Deployment Strategy](#10-deployment-strategy)
11. [Development Roadmap](#11-development-roadmap)
12. [Testing Strategy](#12-testing-strategy)
13. [Open Questions & Decisions](#13-open-questions--decisions)

---

## 1. Executive Summary

### 1.1 Project Vision

**SabbyLink** is an advanced, open-source Discord selfbot that surpasses existing solutions (like Nighty) by providing:
- **Universal AI Integration** - Support for ANY LLM provider (OpenAI, Claude, Gemini, Groq, Ollama, custom APIs)
- **Complete Web Dashboard Control** - Manage 100% of bot functionality from any device (phone, tablet, desktop)
- **Platform RPC Emulation** - Appear as playing games on Xbox, PlayStation, PC, Mobile, or Nintendo Switch
- **Visual Automation Builder** - No-code drag-and-drop workflow creation
- **Minimal Resource Usage** - <150MB RAM (40% less than competitors)
- **GPL-3.0 Licensed** - Free forever, credit-protected, can't be commercialized without sharing back

### 1.2 Why SabbyLink is Better

| Feature | SabbyLink | Nighty | Others |
|---------|-----------|--------|--------|
| **Web Dashboard** | ✅ Full control | ❌ None | ❌ Limited |
| **AI Integration** | ✅ Any provider | ❌ None | ❌ Limited |
| **RAM Usage** | 120-180MB | ~250MB | 200-300MB |
| **Platform Support** | Cross-platform | Windows only | Varies |
| **Price** | Free (GPL-3.0) | $10 lifetime | $5-20 |
| **Mobile Control** | ✅ PWA support | ❌ None | ❌ Limited |
| **Visual Automation** | ✅ Drag-drop | ❌ Python scripts | ❌ None |
| **RPC Platforms** | 5+ (Xbox/PS/PC/Mobile/Switch) | 3 | 2-3 |
| **Real-time Updates** | ✅ WebSocket | ❌ Polling | Varies |
| **Open Source** | ✅ GPL-3.0 | ❌ Closed | Varies |

### 1.3 Target Audience

1. **Discord Power Users** - Want advanced automation and customization
2. **Developers** - Need AI integration and API access
3. **Gamers** - Want custom RPC presence for multiple platforms
4. **Privacy-Conscious Users** - Prefer self-hosted over cloud services
5. **Community Contributors** - Want to extend and improve the bot

### 1.4 Success Metrics

- **Adoption**: 1,000+ active users in first 6 months
- **Performance**: <150MB RAM, <100ms API response time
- **Reliability**: 99%+ uptime for 24/7 deployments
- **Community**: 50+ GitHub stars, 10+ contributors in first year
- **Feature Parity**: Match 100% of Nighty features, add 10+ unique features

---

## 2. Technical Architecture

### 2.1 High-Level System Design

```
┌──────────────────────────────────────────────────────────────┐
│                         VPS Server                            │
│                                                               │
│  ┌────────────────┐         ┌────────────────────────┐      │
│  │  Caddy Proxy   │────────▶│  React Frontend (PWA)  │      │
│  │  (Port 443)    │         │  (Static Files)        │      │
│  │  Auto HTTPS    │         └────────────────────────┘      │
│  └────────┬───────┘                                          │
│           │                                                   │
│           ▼                                                   │
│  ┌──────────────────────────────────────────────────┐       │
│  │        Bun Backend (Port 3000)                    │       │
│  │  ┌──────────────┐    ┌─────────────────────┐    │       │
│  │  │  REST API    │    │  WebSocket Server   │    │       │
│  │  │  Elysia.js   │    │  Real-time Updates  │    │       │
│  │  └──────────────┘    └─────────────────────┘    │       │
│  │                                                    │       │
│  │  ┌──────────────┐    ┌─────────────────────┐    │       │
│  │  │   Discord    │◀──▶│   SQLite Database   │    │       │
│  │  │   Selfbot    │    │   (Embedded)        │    │       │
│  │  │   Client     │    └─────────────────────┘    │       │
│  │  └──────┬───────┘                                │       │
│  │         │                                         │       │
│  │         ▼                                         │       │
│  │  ┌──────────────┐    ┌─────────────────────┐    │       │
│  │  │  AI Module   │    │  RPC Emulator       │    │       │
│  │  │  Universal   │    │  Multi-Platform     │    │       │
│  │  │  LLM Support │    │  Xbox/PS/PC/Mobile  │    │       │
│  │  └──────────────┘    └─────────────────────┘    │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
└───────────────────────────────────────────────────────────────┘
         ▲                                      ▲
         │                                      │
   Discord API                           User Browser
  (Gateway + REST)                      (Web Dashboard)
```

### 2.2 Technology Stack Rationale

#### Backend

**Runtime: Bun**
- **Why**: 3x faster than Node.js, 50% less RAM usage, built-in TypeScript
- **Alternative Considered**: Node.js (rejected: higher RAM, slower startup)
- **RAM Impact**: Saves ~50-80MB vs Node.js

**Framework: Elysia.js**
- **Why**: Built for Bun, ultrafast, low overhead, excellent TypeScript support
- **Alternative Considered**: Express (rejected: slower, more RAM), Fastify (rejected: Node.js only)
- **RAM Impact**: Minimal footprint (~10-15MB)

**Discord Library: discord.js-selfbot-v13**
- **Why**: Most maintained selfbot library, full Discord API support
- **Alternative Considered**: discord.py-self (rejected: Python = higher RAM), custom implementation (rejected: too much work)
- **Warning**: Violates Discord ToS - user assumes all risk

**Database: SQLite with better-sqlite3**
- **Why**: Embedded (no separate server), <10MB RAM, fast, reliable
- **Alternative Considered**: PostgreSQL (rejected: overkill, needs separate server), MongoDB (rejected: higher RAM)
- **RAM Impact**: <10MB for database engine

**WebSocket: ws library**
- **Why**: Simple, lightweight, battle-tested
- **Alternative Considered**: Socket.io (rejected: heavier, more features than needed)

#### Frontend

**Framework: React 18**
- **Why**: Mature, huge ecosystem, good performance
- **Alternative Considered**: Vue (rejected: smaller ecosystem), Svelte (rejected: less mature)

**Build Tool: Vite**
- **Why**: Lightning fast, excellent DX, modern
- **Alternative Considered**: webpack (rejected: slower), Create React App (rejected: deprecated)

**Styling: Tailwind CSS + Framer Motion**
- **Why**: Utility-first (fast development), Framer Motion for smooth animations
- **Alternative Considered**: styled-components (rejected: runtime cost), CSS modules (rejected: less flexible)

**State: Zustand**
- **Why**: Tiny (<1KB), simple API, no boilerplate
- **Alternative Considered**: Redux (rejected: too heavy), Context (rejected: prop drilling issues)

**UI Components: Radix UI + shadcn/ui**
- **Why**: Accessible, unstyled primitives, highly customizable
- **Alternative Considered**: Material-UI (rejected: opinionated styling), Chakra (rejected: heavier)

#### Deployment

**Containerization: Docker + Docker Compose**
- **Why**: Consistent environment, easy deployment, isolation
- **Alternative Considered**: PM2 (rejected: less isolation), systemd only (rejected: harder to replicate)

**Reverse Proxy: Caddy**
- **Why**: Auto HTTPS (Let's Encrypt), simpler config than Nginx
- **Alternative Considered**: Nginx (rejected: more complex), Traefik (rejected: overkill for single app)

### 2.3 RAM Optimization Strategy

**Target: <150MB total RAM usage**

Breakdown:
- Bun runtime: ~40MB
- Discord bot client: ~30MB
- SQLite database: ~10MB
- API server (Elysia): ~15MB
- AI module (idle): ~10MB
- WebSocket server: ~5MB
- Overhead/buffers: ~40MB
- **Total (idle)**: ~150MB
- **Total (active with AI)**: ~200MB peak

Optimization techniques:
1. **Lazy loading**: Load AI adapters only when used
2. **Efficient data structures**: Avoid keeping large objects in memory
3. **Stream processing**: Don't buffer large responses
4. **Connection pooling**: Reuse database connections
5. **Garbage collection**: Let Bun's GC work efficiently
6. **No caching**: Use database as cache (SQLite is fast enough)

### 2.4 Scalability Considerations

**Single-User Design**
- SabbyLink is designed for single-user deployments (one Discord account per instance)
- Each user deploys their own instance on their own VPS
- No multi-tenancy complexity

**Horizontal Scaling (Future)**
- If needed, could support multiple Discord accounts per instance
- Each account = separate bot client process
- Shared database and web dashboard

**Vertical Scaling**
- Designed to run on minimal VPS (2 vCPU, 4GB RAM)
- Can handle much higher load on better hardware

---

## 3. Feature Specifications

### 3.1 Core Features (Parity with Nighty)

#### 3.1.1 Slash Command System
- **Description**: Modern slash commands with autocomplete
- **User Story**: As a user, I want to execute commands with `/` prefix and see autocomplete suggestions
- **Acceptance Criteria**:
  - [x] Commands registered with Discord gateway
  - [x] Autocomplete for command parameters
  - [x] Private mode (commands visible only to user)
  - [x] Command categories (admin, fun, utils, etc.)
  - [x] **Hybrid Mode**: User App creation for legitimate Discord slash commands
- **Priority**: P0 (Critical)
- **Status**: ✅ Complete (including hybrid User App support)

#### 3.1.2 Rich Presence Customizer
- **Description**: Custom Discord RPC with platform emulation
- **User Story**: As a user, I want to appear as playing any game on any platform
- **Acceptance Criteria**:
  - [ ] Support for Xbox, PlayStation, PC, Mobile, Switch
  - [ ] Custom game name, details, state
  - [ ] Image support (large and small images)
  - [ ] Timestamp support (elapsed time)
  - [ ] Button support (up to 2 buttons)
  - [ ] Party size support
- **Priority**: P0 (Critical)

#### 3.1.3 Profile Animations
- **Description**: Animated status, bio, and pronouns
- **User Story**: As a user, I want my profile to cycle through multiple states
- **Acceptance Criteria**:
  - [ ] Animated custom status (keyframes)
  - [ ] Animated bio (cycle through multiple bios)
  - [ ] Animated pronouns
  - [ ] Configurable animation speed
  - [ ] Start/stop controls
- **Priority**: P1 (High)

#### 3.1.4 Notification System
- **Description**: Advanced notifications for Discord events
- **User Story**: As a user, I want to be notified when important events happen
- **Acceptance Criteria**:
  - [ ] Friend removed you
  - [ ] Kicked from server
  - [ ] Ghost pinged (mention then deleted)
  - [ ] DM received
  - [ ] Mentioned in server
  - [ ] Multiple delivery methods (webhook, desktop, email)
- **Priority**: P1 (High)

#### 3.1.5 Backup & Restore
- **Description**: Full account backup and restoration
- **User Story**: As a user, I want to backup my account and restore it later
- **Acceptance Criteria**:
  - [ ] Backup friend list
  - [ ] Backup server list
  - [ ] Backup DM history
  - [ ] Backup settings
  - [ ] Restore from backup file
  - [ ] Scheduled backups
- **Priority**: P1 (High)

#### 3.1.6 Nitro Sniper
- **Description**: Auto-claim Nitro codes
- **User Story**: As a user, I want to automatically claim Nitro codes when detected
- **Acceptance Criteria**:
  - [ ] Detect Nitro codes in messages
  - [ ] Claim code within milliseconds
  - [ ] Configurable delay (to avoid detection)
  - [ ] Server whitelist/blacklist
  - [ ] Track attempts and successes
- **Priority**: P2 (Medium)
- **Warning**: Aggressive use may trigger Discord rate limits

#### 3.1.7 Giveaway Joiner
- **Description**: Auto-join giveaways
- **User Story**: As a user, I want to automatically enter giveaways
- **Acceptance Criteria**:
  - [ ] Detect giveaway messages by keywords
  - [ ] Auto-react with configured emoji
  - [ ] Support for multiple alt accounts
  - [ ] Server whitelist/blacklist
  - [ ] Track joined giveaways
- **Priority**: P2 (Medium)

#### 3.1.8 Message Logger
- **Description**: Log deleted and edited messages
- **User Story**: As a user, I want to see messages that were deleted or edited
- **Acceptance Criteria**:
  - [ ] Log deleted messages
  - [ ] Log edited messages (before/after)
  - [ ] Log bulk deletes
  - [ ] Searchable log history
  - [ ] Export logs
- **Priority**: P1 (High)

#### 3.1.9 User Spy
- **Description**: Track specific users' activity
- **User Story**: As a user, I want to monitor specific users' status changes
- **Acceptance Criteria**:
  - [ ] Track status changes
  - [ ] Track activity changes (what game they're playing)
  - [ ] Track name/avatar changes
  - [ ] Track server joins/leaves
  - [ ] Per-user notification settings
- **Priority**: P2 (Medium)

#### 3.1.10 Theme System
- **Description**: Customizable UI themes
- **User Story**: As a user, I want to customize the dashboard appearance
- **Acceptance Criteria**:
  - [ ] Dark/light mode toggle
  - [ ] Custom color schemes
  - [ ] Theme builder with live preview
  - [ ] Save and load themes
  - [ ] Community theme marketplace
- **Priority**: P1 (High)

### 3.2 New Features (Superior to Nighty)

#### 3.2.1 Universal AI Integration
- **Description**: Support for ANY LLM provider
- **User Story**: As a user, I want to use my preferred AI provider (not locked to one)
- **Acceptance Criteria**:
  - [ ] Support OpenAI (GPT-4, GPT-3.5-turbo)
  - [ ] Support Anthropic (Claude 3.5 Sonnet)
  - [ ] Support Google (Gemini Pro)
  - [ ] Support Groq (free, fast LLMs)
  - [ ] Support Ollama (local LLMs)
  - [ ] Support custom OpenAI-compatible APIs
  - [ ] Configure via web dashboard
  - [ ] Multiple providers per user
  - [ ] Cost tracking
- **Priority**: P0 (Critical) - MAJOR DIFFERENTIATOR

#### 3.2.2 AI Auto-Responder
- **Description**: AI-powered smart responses to DMs/mentions
- **User Story**: As a user, I want AI to respond to messages for me
- **Acceptance Criteria**:
  - [ ] Configurable triggers (DM, mention, keywords)
  - [ ] Customizable AI personality/context
  - [ ] Delay to appear human
  - [ ] Rate limiting (don't spam)
  - [ ] Blacklist/whitelist users
- **Priority**: P0 (Critical)

#### 3.2.3 Natural Language Commands
- **Description**: AI parses natural language into commands
- **User Story**: As a user, I want to use natural language instead of remembering command syntax
- **Example**: "remind me in 2 hours to check email" → sets reminder
- **Acceptance Criteria**:
  - [ ] Parse intent from natural language
  - [ ] Extract parameters (time, message, etc.)
  - [ ] Execute corresponding command
  - [ ] Confirm action to user
- **Priority**: P1 (High)

#### 3.2.4 Web Dashboard (100% Control)
- **Description**: Manage ALL bot features from web browser
- **User Story**: As a user, I want to control everything from my phone/tablet/desktop
- **Acceptance Criteria**:
  - [ ] Responsive design (mobile/tablet/desktop)
  - [ ] Real-time updates via WebSocket
  - [ ] Bot start/stop/status control
  - [ ] RPC builder with live preview
  - [ ] AI provider configuration
  - [ ] Command execution interface
  - [ ] Module toggles (Nitro sniper, etc.)
  - [ ] Settings management
  - [ ] Live logs viewer
  - [ ] Analytics dashboard
- **Priority**: P0 (Critical) - MAJOR DIFFERENTIATOR

#### 3.2.5 Visual Automation Builder
- **Description**: Drag-and-drop workflow creation
- **User Story**: As a user, I want to create automations without coding
- **Acceptance Criteria**:
  - [ ] Drag-and-drop interface
  - [ ] Trigger blocks (message received, DM, etc.)
  - [ ] Condition blocks (if/then logic)
  - [ ] Action blocks (send message, AI respond, etc.)
  - [ ] Connect blocks visually
  - [ ] Test mode (dry-run)
  - [ ] Enable/disable per automation
  - [ ] View automation logs
- **Priority**: P0 (Critical) - MAJOR DIFFERENTIATOR

#### 3.2.6 RPC Animation System
- **Description**: Animated RPC with keyframes
- **User Story**: As a user, I want my RPC to cycle through multiple states
- **Acceptance Criteria**:
  - [ ] Define multiple keyframes
  - [ ] Set duration per keyframe
  - [ ] Preview animation before applying
  - [ ] Save animated presets
  - [ ] Start/stop controls
- **Priority**: P1 (High)

#### 3.2.7 Advanced Analytics
- **Description**: Detailed usage statistics and charts
- **User Story**: As a user, I want to see how I use Discord
- **Acceptance Criteria**:
  - [ ] Messages sent over time (chart)
  - [ ] Commands executed (breakdown by category)
  - [ ] AI requests and tokens used
  - [ ] Module statistics (Nitro sniper success rate, etc.)
  - [ ] Export data as CSV
- **Priority**: P2 (Medium)

#### 3.2.8 Cross-Platform PWA
- **Description**: Progressive Web App for mobile devices
- **User Story**: As a user, I want to install the dashboard as an app on my phone
- **Acceptance Criteria**:
  - [ ] PWA manifest
  - [ ] Service worker for offline support
  - [ ] Add to home screen prompt
  - [ ] App-like experience on mobile
  - [ ] Push notifications (if supported)
- **Priority**: P2 (Medium)

---

## 4. Database Design

### 4.1 Complete Schema

```sql
-- Users table (web dashboard authentication)
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  discord_id TEXT UNIQUE,
  discord_token TEXT, -- encrypted with AES-256-GCM
  avatar_url TEXT,
  is_premium BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_discord_id ON users(discord_id);
CREATE INDEX idx_users_email ON users(email);

-- Settings table (key-value per user)
CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, key)
);
CREATE INDEX idx_settings_user_key ON settings(user_id, key);

-- Custom commands
CREATE TABLE commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'custom',
  is_enabled BOOLEAN DEFAULT 1,
  usage_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_commands_user ON commands(user_id);

-- Activity logs
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT, -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_logs_user_time ON logs(user_id, created_at DESC);

-- Themes
CREATE TABLE themes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  colors TEXT NOT NULL, -- JSON with color scheme
  is_active BOOLEAN DEFAULT 0,
  is_public BOOLEAN DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_themes_user ON themes(user_id);
CREATE INDEX idx_themes_public ON themes(is_public) WHERE is_public = 1;

-- Notifications
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT 0,
  metadata TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = 0;

-- Automations
CREATE TABLE automations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_value TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_value TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT 1,
  ai_context TEXT, -- For AI-powered responses
  usage_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_automations_user ON automations(user_id);

-- Analytics (daily aggregates)
CREATE TABLE analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date DATE NOT NULL,
  messages_sent INTEGER DEFAULT 0,
  commands_executed INTEGER DEFAULT 0,
  servers_joined INTEGER DEFAULT 0,
  ai_requests INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, date)
);
CREATE INDEX idx_analytics_user_date ON analytics(user_id, date DESC);

-- AI providers
CREATE TABLE ai_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  provider_name TEXT NOT NULL,
  api_key TEXT, -- encrypted
  base_url TEXT,
  model TEXT NOT NULL,
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2000,
  is_default BOOLEAN DEFAULT 0,
  extra_params TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_ai_providers_user ON ai_providers(user_id);

-- RPC presets
CREATE TABLE rpc_presets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  activity_type INTEGER NOT NULL,
  details TEXT,
  state TEXT,
  large_image TEXT,
  large_text TEXT,
  small_image TEXT,
  small_text TEXT,
  party_size INTEGER,
  party_max INTEGER,
  button1_label TEXT,
  button1_url TEXT,
  button2_label TEXT,
  button2_url TEXT,
  timestamps_enabled BOOLEAN DEFAULT 0,
  start_timestamp INTEGER,
  end_timestamp INTEGER,
  application_id TEXT,
  is_animated BOOLEAN DEFAULT 0,
  animation_config TEXT, -- JSON
  is_active BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_rpc_presets_user ON rpc_presets(user_id);

-- Game library (popular games for RPC quick select)
CREATE TABLE game_library (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  game_name TEXT NOT NULL,
  application_id TEXT,
  large_image TEXT,
  small_image TEXT,
  icon_url TEXT,
  release_date TEXT,
  popularity INTEGER DEFAULT 0,
  UNIQUE(platform, game_name)
);
CREATE INDEX idx_game_library_platform ON game_library(platform);
CREATE INDEX idx_game_library_popularity ON game_library(popularity DESC);

-- Sessions (for JWT refresh tokens)
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  refresh_token TEXT NOT NULL,
  device_info TEXT,
  ip_address TEXT,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(refresh_token);
```

### 4.2 Data Encryption

**Sensitive Fields:**
- `users.discord_token` - AES-256-GCM encryption
- `ai_providers.api_key` - AES-256-GCM encryption
- `sessions.refresh_token` - Hashed with bcrypt

**Encryption Key Management:**
- Master encryption key stored in environment variable
- Key derivation: PBKDF2 with salt
- Unique IV per encrypted value
- Authentication tag for integrity

### 4.3 Migration Strategy

**Initial Setup:**
1. Run schema.sql on first launch
2. Seed game_library with popular games
3. Create admin user if doesn't exist

**Future Migrations:**
- Use numbered migration files (001_add_field.sql, 002_create_table.sql)
- Track applied migrations in `migrations` table
- Always backup before migration

---

## 5. API Design

### 5.1 RESTful Endpoints

**Base URL:** `https://yourdomain.com/api`

#### Authentication

```
POST /api/auth/register
Body: { username, email, password }
Response: { token, refreshToken, user }

POST /api/auth/login
Body: { email, password }
Response: { token, refreshToken, user }

POST /api/auth/refresh
Body: { refreshToken }
Response: { token, refreshToken }

POST /api/auth/logout
Headers: Authorization: Bearer <token>
Response: { success: true }

# Discord OAuth (NEW - Implemented)
GET /api/v1/auth/discord/url
Response: { url: "https://discord.com/oauth2/authorize?..." }

POST /api/v1/auth/discord/callback
Body: { code }
Response: { token, refreshToken, user }

GET /api/v1/auth/discord/guilds
Headers: Authorization: Bearer <token>
Response: [{ id, name, icon, ... }]

GET /api/v1/auth/discord/status
Headers: Authorization: Bearer <token>
Response: { linked: true, discordId: "...", discordUsername: "..." }

DELETE /api/v1/auth/discord/unlink
Headers: Authorization: Bearer <token>
Response: { success: true }
```

#### User App Management (NEW - For Hybrid Bot Mode)

```
# List user's Discord applications
GET /api/v1/user-app/list
Headers: Authorization: Bearer <token>
Response: [{ id, name, icon, ... }]

# Create new Discord application for slash commands
POST /api/v1/user-app/create
Headers: Authorization: Bearer <token>
Body: { name, description }
Response: { id, name, token, ... }

# Update application
PATCH /api/v1/user-app/:appId
Headers: Authorization: Bearer <token>
Body: { name, description, icon }
Response: { success: true }

# Reset bot token
POST /api/v1/user-app/:appId/reset-token
Headers: Authorization: Bearer <token>
Response: { token: "..." }

# Get authorization URL for application
GET /api/v1/user-app/:appId/auth-url
Headers: Authorization: Bearer <token>
Response: { url: "https://discord.com/oauth2/authorize?..." }

# Register slash commands for application
POST /api/v1/user-app/:appId/register-commands
Headers: Authorization: Bearer <token>
Body: { commands: [...] }
Response: { success: true, registeredCount: 5 }
```

#### Bot Control

```
GET /api/bot/status
Response: { connected, uptime, user: { id, username, avatar } }

POST /api/bot/start
Response: { success: true }

POST /api/bot/stop
Response: { success: true }

POST /api/bot/restart
Response: { success: true }
```

#### RPC Management

```
GET /api/rpc/presets
Response: [{ id, name, platform, ... }]

POST /api/rpc/presets
Body: { name, platform, details, state, ... }
Response: { id, ... }

PUT /api/rpc/presets/:id
Body: { ... }
Response: { success: true }

DELETE /api/rpc/presets/:id
Response: { success: true }

POST /api/rpc/set
Body: { platform, game, details, state, ... }
Response: { success: true }

POST /api/rpc/clear
Response: { success: true }
```

#### AI Providers

```
GET /api/ai/providers
Response: [{ id, provider_name, model, is_default }]

POST /api/ai/providers
Body: { provider, apiKey, baseUrl, model, temperature, maxTokens }
Response: { id, ... }

PUT /api/ai/providers/:id
Body: { ... }
Response: { success: true }

DELETE /api/ai/providers/:id
Response: { success: true }

POST /api/ai/providers/:id/default
Response: { success: true }

POST /api/ai/chat
Body: { messages, temperature, maxTokens }
Response: { content, model, usage }
```

#### Commands

```
GET /api/commands
Response: [{ id, name, description, category, usage_count }]

POST /api/commands/execute
Body: { command, parameters }
Response: { result, success }

GET /api/commands/history
Query: ?limit=100&offset=0
Response: [{ id, command, timestamp, result }]

POST /api/commands
Body: { name, description, content, category }
Response: { id, ... }

PUT /api/commands/:id
Body: { ... }
Response: { success: true }

DELETE /api/commands/:id
Response: { success: true }
```

#### Automations

```
GET /api/automations
Response: [{ id, name, trigger_type, action_type, is_enabled }]

POST /api/automations
Body: { name, trigger_type, trigger_value, action_type, action_value, ai_context }
Response: { id, ... }

PUT /api/automations/:id
Body: { ... }
Response: { success: true }

DELETE /api/automations/:id
Response: { success: true }

POST /api/automations/:id/toggle
Response: { is_enabled }
```

#### Modules

```
GET /api/modules
Response: { nitroSniper: { enabled, stats }, giveawayJoiner: { ... }, ... }

POST /api/modules/:module/toggle
Response: { enabled }

PUT /api/modules/:module/config
Body: { delay, whitelist, blacklist, ... }
Response: { success: true }
```

#### Analytics

```
GET /api/analytics/overview
Query: ?start_date=2026-01-01&end_date=2026-12-31
Response: { messages_sent, commands_executed, ai_requests, ... }

GET /api/analytics/chart/:metric
Query: ?start_date=2026-01-01&end_date=2026-12-31
Response: [{ date, value }, ...]
```

#### Logs

```
GET /api/logs
Query: ?level=error&limit=100&offset=0
Response: [{ id, level, message, timestamp, metadata }]

GET /api/logs/stream
Response: Server-Sent Events stream
```

### 5.2 WebSocket Events

**Connection:** `wss://yourdomain.com/ws`

#### Client → Server

```javascript
// Authenticate
{ type: 'auth', token: 'Bearer <token>' }

// Subscribe to events
{ type: 'subscribe', events: ['bot.status', 'notifications', 'logs'] }

// Unsubscribe
{ type: 'unsubscribe', events: ['logs'] }

// Ping (keepalive)
{ type: 'ping' }
```

#### Server → Client

```javascript
// Authentication response
{ type: 'auth_success' }
{ type: 'auth_error', message: 'Invalid token' }

// Bot status update
{ type: 'bot.status', data: { connected: true, uptime: 3600 } }

// Notification
{ type: 'notification', data: { id, type, title, message, timestamp } }

// Log entry
{ type: 'log', data: { level, message, timestamp } }

// Command executed
{ type: 'command.executed', data: { command, result, timestamp } }

// Module triggered
{ type: 'module.triggered', data: { module: 'nitroSniper', success: true } }

// AI response
{ type: 'ai.response', data: { request_id, content, tokens_used } }

// Automation triggered
{ type: 'automation.triggered', data: { id, name, success: true } }

// Pong (keepalive response)
{ type: 'pong' }
```

---

## 6. AI Integration Plan

### 6.1 Adapter Architecture

**Pattern:** Factory + Adapter pattern for universal LLM support

```
LLMFactory.create(config) → BaseLLMAdapter

BaseLLMAdapter (interface)
├── OpenAIAdapter (GPT-4, GPT-3.5-turbo)
├── AnthropicAdapter (Claude 3.5 Sonnet)
├── GoogleAdapter (Gemini Pro)
├── OllamaAdapter (Local LLMs)
└── CustomOpenAIAdapter (any OpenAI-compatible API)
```

**Key Methods:**
- `chat(messages, options)` → `{ content, model, usage }`
- `streamChat(messages, options)` → AsyncGenerator<string>
- `isAvailable()` → boolean

### 6.2 Supported Providers

| Provider | Models | Cost | Speed | Notes |
|----------|--------|------|-------|-------|
| OpenAI | GPT-4, GPT-3.5-turbo | $0.03/1K tokens | Medium | Most capable |
| Anthropic | Claude 3.5 Sonnet | $3/1M tokens | Fast | Great for conversations |
| Google | Gemini Pro, Flash | Free tier | Fast | Free for low volume |
| Groq | Llama 3.1 70B, Mixtral | Free | Very fast (500+ tok/s) | Best free option |
| Ollama | Llama 3, Mistral, CodeLlama | Free (local) | Varies (GPU) | Fully private |
| Together.ai | Many models | $0.20/1M tokens | Fast | Good variety |
| LM Studio | Any local model | Free (local) | Varies (GPU) | Easy local setup |
| Custom | Any OpenAI-compatible | Varies | Varies | Maximum flexibility |

### 6.3 AI Use Cases

1. **Auto-Responder**
   - Trigger: DM received, mention detected
   - Action: Generate contextual response
   - Config: personality, delay, rate limit

2. **Natural Language Commands**
   - Input: "remind me in 2 hours to check email"
   - AI parsing: { action: "reminder", time: "2 hours", message: "check email" }
   - Execution: Set reminder command

3. **Conversation Summarization**
   - Input: Last N messages in channel
   - Output: 2-3 sentence summary
   - Use case: Catch up on missed conversations

4. **Smart Translation**
   - Input: Message in language A
   - Output: Translation to language B with cultural context
   - Better than simple translation APIs

5. **Sentiment Analysis**
   - Input: Message
   - Output: Sentiment score + explanation
   - Use case: Detect toxic messages, understand tone

6. **AI Moderation**
   - Input: Message
   - Output: Spam/hate speech detection
   - Action: Auto-delete, warn, log

7. **Image Generation**
   - Input: Text prompt
   - Output: Generated image URL
   - Integration: DALL-E or Stable Diffusion API

### 6.4 Cost Management

**Rate Limiting:**
- Free tier: 100 AI requests/day
- Premium: Unlimited (user pays for API)

**Cost Tracking:**
- Track tokens used per provider
- Display estimated cost in dashboard
- Alert user when approaching limits

**Caching:**
- Cache similar prompts (fuzzy match)
- Cache for 1 hour
- Saves costs on repeated queries

---

## 7. RPC System Design

### 7.1 Platform Emulation

**Supported Platforms:**
1. Xbox (Xbox One, Series X/S)
2. PlayStation (PS4, PS5)
3. PC (Steam, Epic Games, generic)
4. Mobile (iOS, Android)
5. Nintendo Switch
6. Custom (any platform name)

**Platform Assets:**
- Application IDs (Discord's official IDs for each platform)
- Default images (platform logos)
- Platform-specific features (party size for Xbox, etc.)

### 7.2 RPC Components

```
RPC Preset:
├── Platform (Xbox/PS/PC/Mobile/Switch/Custom)
├── Game Name (string)
├── Activity Type (Playing/Streaming/Watching/Listening/Competing)
├── Details (string) - e.g., "In Matchmaking"
├── State (string) - e.g., "Team Slayer - Rank 25"
├── Images
│   ├── Large Image (URL or asset)
│   ├── Large Text (hover text)
│   ├── Small Image (URL or asset)
│   └── Small Text (hover text)
├── Party
│   ├── Size (current)
│   └── Max (maximum)
├── Buttons (up to 2)
│   ├── Label (string)
│   └── URL (string)
├── Timestamps
│   ├── Start (epoch ms)
│   └── End (epoch ms) - optional
└── Animation (optional)
    ├── Keyframes (array)
    └── Duration per keyframe (ms)
```

### 7.3 Animation System

**Keyframe Structure:**
```javascript
{
  duration: 3000, // ms
  details: "Level 1",
  state: "100/100 HP",
  largeImage: "image_url",
  largeText: "Playing"
}
```

**Animation Playback:**
- Cycle through keyframes sequentially
- Transition every `duration` ms
- Loop infinitely until stopped
- Smooth transitions (update RPC with new data)

### 7.4 Game Library

**Pre-populated Games:**
- Top 50 games per platform
- Application IDs (where available)
- Official images
- Quick-select in dashboard

**User Additions:**
- Users can add custom games
- Store in database for reuse
- Share with community (optional)

---

## 8. Web Dashboard Design

### 8.1 Navigation Structure

```
Dashboard
├── Home / Overview
│   ├── Bot Status Card
│   ├── Quick Stats (messages, commands, uptime)
│   ├── Recent Notifications
│   └── Quick Actions (start/stop bot, apply RPC preset)
├── Bot Control
│   ├── Connection Status
│   ├── Start/Stop/Restart Buttons
│   ├── Account Info (username, avatar, ID)
│   ├── Multi-Account Switcher
│   └── Live Activity Feed
├── RPC Manager
│   ├── Quick Presets (Xbox/PS/PC tabs)
│   ├── Custom RPC Builder (visual)
│   ├── Animated RPC Creator
│   ├── Saved Presets Library (grid view)
│   └── Game Library Browser
├── AI Settings
│   ├── Provider Configuration (cards)
│   ├── Default Provider Selector
│   ├── Auto-Responder Rules
│   ├── AI Usage Analytics (tokens, cost)
│   └── Test Playground
├── Commands
│   ├── Command Palette (search & execute)
│   ├── Command History (timeline)
│   ├── Custom Commands (CRUD)
│   ├── Command Scheduler (cron)
│   └── Command Statistics (charts)
├── Automations
│   ├── Visual Workflow Builder (canvas)
│   ├── Automation List (cards)
│   ├── Automation Logs (timeline)
│   └── Templates (community)
├── Profile Customizer
│   ├── Status Manager (dropdown + emoji)
│   ├── Bio Editor (rich text)
│   ├── Profile Animations (keyframes)
│   └── Pronouns/Server Tags
├── Modules
│   ├── Nitro Sniper (toggle + config)
│   ├── Giveaway Joiner (toggle + config)
│   ├── Message Logger (toggle + search)
│   ├── User Spy (add users + logs)
│   └── Ghost Ping Detector (toggle + history)
├── Notifications
│   ├── Notification Center (list)
│   ├── Configure Alert Types (checkboxes)
│   ├── Delivery Methods (webhook/email/desktop)
│   └── Quiet Hours (time range)
├── Themes
│   ├── Theme Builder (color pickers)
│   ├── Live Preview
│   ├── Saved Themes (grid)
│   ├── Community Marketplace
│   └── Import/Export
├── Analytics
│   ├── Overview Dashboard (KPIs)
│   ├── Charts (messages, commands, AI usage)
│   ├── Module Statistics
│   └── Export Data (CSV)
├── Backup & Restore
│   ├── Create Backup Now (button)
│   ├── Scheduled Backups (config)
│   ├── Backup History (list)
│   └── Restore from File (upload)
├── Logs
│   ├── Live Log Feed (auto-scroll)
│   ├── Filter Controls (level, category, search)
│   ├── Export Logs
│   └── Error Summary
└── Settings
    ├── Account Settings (email, password, avatar)
    ├── Security (2FA, sessions, IP whitelist)
    ├── API Keys (generate, revoke)
    └── Advanced Config (JSON editor)
```

### 8.2 Component Hierarchy

**Layout:**
```
<Layout>
  <Sidebar> (collapsible on mobile)
  <Navbar> (search, notifications, user menu)
  <MainContent>
    <PageComponent />
  </MainContent>
</Layout>
```

**Reusable Components:**
- `Button`, `Input`, `Select`, `Textarea` (form controls)
- `Card`, `Badge`, `Alert`, `Toast` (display)
- `Modal`, `Dialog`, `Dropdown` (overlays)
- `Table`, `Chart`, `Timeline` (data display)
- `Tabs`, `Accordion`, `Collapsible` (navigation)
- `Loading`, `Error`, `Empty` (states)

**Page-Specific Components:**
- `RPCBuilder` - RPC visual builder
- `WorkflowCanvas` - Automation drag-drop canvas
- `ThemeEditor` - Color picker + live preview
- `LogViewer` - Real-time log stream
- `ChartWidget` - Recharts wrappers

### 8.3 State Management

**Zustand Store Structure:**
```javascript
{
  // Auth
  user: { id, username, email, avatar },
  token: string,
  isAuthenticated: boolean,
  
  // Bot
  bot: { connected, uptime, user: { id, username, avatar } },
  
  // UI
  theme: 'dark' | 'light',
  sidebarCollapsed: boolean,
  
  // Real-time data (from WebSocket)
  notifications: [],
  logs: [],
  
  // Cached data
  rpcPresets: [],
  aiProviders: [],
  commands: [],
  automations: []
}
```

**Actions:**
```javascript
// Auth
login(email, password)
logout()
refreshToken()

// Bot
startBot()
stopBot()
restartBot()

// UI
toggleTheme()
toggleSidebar()
addNotification(notification)
markNotificationRead(id)

// Data
fetchRPCPresets()
saveRPCPreset(preset)
deleteRPCPreset(id)
// ... etc for all resources
```

### 8.4 Real-Time Updates

**WebSocket Hook:**
```javascript
useWebSocket(events, handlers)

// Usage:
const { connected, send } = useWebSocket(['bot.status', 'notifications'], {
  'bot.status': (data) => updateBotStatus(data),
  'notifications': (data) => addNotification(data)
});
```

**Auto-Reconnect:**
- Exponential backoff (1s, 2s, 4s, 8s, 16s, 30s max)
- Show connection status in UI
- Queue messages while disconnected
- Replay on reconnect

---

## 9. Security & Privacy

### 9.1 Token Encryption

**Encryption Algorithm:** AES-256-GCM
- **Why**: Industry standard, authenticated encryption (prevents tampering)
- **Key Derivation**: PBKDF2 with salt (100,000 iterations)
- **IV**: Unique per encrypted value (96-bit random)
- **Authentication Tag**: Ensures integrity

**Encrypted Fields:**
- Discord token (users.discord_token)
- AI API keys (ai_providers.api_key)
- Webhook URLs (if stored)

**Encryption Flow:**
1. User enters Discord token
2. Backend derives encryption key from master secret + salt
3. Generate random IV
4. Encrypt token with AES-256-GCM
5. Store: IV + ciphertext + auth tag (base64 encoded)

**Decryption Flow:**
1. Retrieve encrypted token from database
2. Decode base64
3. Extract IV, ciphertext, auth tag
4. Derive same encryption key
5. Decrypt and verify auth tag
6. Return plaintext token

### 9.2 Authentication Flow

**Discord OAuth (Recommended) - IMPLEMENTED:**
```
1. User clicks "Login with Discord"
2. Redirect to Discord OAuth consent page
3. User authorizes app
4. Discord redirects back with auth code
5. Backend exchanges code for access token
6. Fetch user info from Discord API
7. Create user in database (if new) or link to existing account
8. Generate JWT access token (1h expiry)
9. Generate refresh token (30 days)
10. Store refresh token in database (hashed)
11. Return tokens to frontend
12. Frontend stores access token in memory, refresh token in HTTP-only cookie
```

**API Endpoints (Implemented):**
- `GET /api/v1/auth/discord/url` - Get OAuth authorization URL
- `POST /api/v1/auth/discord/callback` - Exchange code for tokens
- `GET /api/v1/auth/discord/guilds` - Get user's Discord guilds
- `GET /api/v1/auth/discord/status` - Check if Discord is linked
- `DELETE /api/v1/auth/discord/unlink` - Unlink Discord from account

**Traditional Email/Password (Also Supported):**
```
1. User registers with email + password
2. Hash password with bcrypt (cost factor: 12)
3. Store user in database
4. User logs in with email + password
5. Verify password hash
6. Generate JWT access token (1h expiry)
7. Generate refresh token (30 days)
8. Store refresh token in database (hashed)
9. Return tokens to frontend
```

**Token Refresh:**
```
1. Access token expires (1h)
2. Frontend detects 401 response
3. Send refresh token to /auth/refresh
4. Backend verifies refresh token (check database)
5. Generate new access token (1h)
6. Return new token
7. Retry original request with new token
```

### 9.3 Rate Limiting

**API Endpoints:**
- `/auth/login`: 5 attempts per 15 minutes per IP
- `/auth/register`: 3 attempts per hour per IP
- `/api/ai/chat`: 100 requests per day (free tier)
- All other endpoints: 100 requests per minute per user

**Implementation:**
- Use in-memory store (Map) for rate limit counters
- Key: `${ip}:${endpoint}` or `${userId}:${endpoint}`
- Sliding window algorithm
- Return 429 Too Many Requests with Retry-After header

### 9.4 CORS Configuration

```javascript
{
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
```

### 9.5 Security Headers

**Caddy adds automatically:**
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

**Additional (via Elysia middleware):**
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy: default-src 'self'; ...`

### 9.6 Input Validation

**Strategy:**
- Validate all user inputs on backend (never trust client)
- Use Zod for schema validation
- Sanitize HTML inputs (strip tags)
- Validate URLs before fetching
- Limit string lengths
- Validate enums against whitelist

**Example:**
```javascript
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100)
});
```

### 9.7 Audit Logging

**What to Log:**
- User login/logout
- Discord token updates
- AI provider changes
- High-value command executions
- Security-related actions (2FA enable/disable)
- Failed authentication attempts

**Log Storage:**
- Store in `logs` table
- Retain for 90 days
- Export to file for long-term storage

---

## 10. Deployment Strategy

### 10.1 Docker Setup

**Services:**
1. **bot** - Bun backend (Discord bot + API + WebSocket)
2. **web** - Nginx serving React static files
3. **caddy** - Reverse proxy (handles HTTPS)

**docker-compose.yml Structure:**
```yaml
version: '3.8'

services:
  bot:
    build: ./backend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=/data/sabbylink.db
    volumes:
      - ./data:/data
    ports:
      - "3000:3000"
    networks:
      - sabbylink-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  web:
    build: ./frontend
    restart: unless-stopped
    networks:
      - sabbylink-network

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - sabbylink-network
    depends_on:
      - bot
      - web

volumes:
  caddy_data:
  caddy_config:

networks:
  sabbylink-network:
    driver: bridge
```

### 10.2 VPS Requirements

**Minimum Specs:**
- **CPU**: 2 vCPU cores
- **RAM**: 4GB (2GB for system, 2GB for app)
- **Storage**: 20GB SSD
- **Network**: 1TB/month bandwidth
- **OS**: Ubuntu 22.04 LTS or Debian 12

**Recommended Specs:**
- **CPU**: 4 vCPU cores (for AI workloads)
- **RAM**: 8GB (if using local LLM)
- **Storage**: 40GB SSD
- **GPU**: Optional (for local LLM acceleration)

**Estimated Cost:**
- DigitalOcean: $24/month (4GB RAM droplet)
- Hetzner: €4.51/month (4GB RAM CX22)
- Vultr: $12/month (4GB RAM)
- Linode: $12/month (4GB RAM)

### 10.3 Monitoring Setup

**Monitoring Script** (`scripts/monitor.sh`):
```bash
#!/bin/bash
# Run via cron: */5 * * * * /opt/sabbylink/scripts/monitor.sh

WEBHOOK_URL="$DISCORD_WEBHOOK_URL"
CONTAINER="sabbylink-bot-1"

# Check container health
if ! docker ps | grep -q "$CONTAINER"; then
  curl -H "Content-Type: application/json" \
    -d "{\"content\":\"🚨 SabbyLink container is DOWN! Restarting...\"}" \
    "$WEBHOOK_URL"
  docker-compose -f /opt/sabbylink/docker-compose.yml up -d
fi

# Check RAM usage
RAM_PCT=$(docker stats --no-stream --format "{{.MemPerc}}" "$CONTAINER" | sed 's/%//')
if (( $(echo "$RAM_PCT > 80" | bc -l) )); then
  curl -H "Content-Type: application/json" \
    -d "{\"content\":\"⚠️ SabbyLink RAM usage: ${RAM_PCT}%\"}" \
    "$WEBHOOK_URL"
fi

# Check disk usage
DISK_PCT=$(df / --output=pcent | tail -1 | tr -d ' %')
if [ "$DISK_PCT" -gt 85 ]; then
  curl -H "Content-Type: application/json" \
    -d "{\"content\":\"⚠️ Disk usage: ${DISK_PCT}%\"}" \
    "$WEBHOOK_URL"
fi
```

**Metrics to Track:**
- Container uptime
- RAM usage
- CPU usage
- Disk usage
- Discord bot connection status
- API response times
- Error rates

### 10.4 Backup Strategy

**Automated Backups** (`scripts/backup.sh`):
```bash
#!/bin/bash
# Run daily: 0 2 * * * /opt/sabbylink/scripts/backup.sh

BACKUP_DIR="/opt/sabbylink/backups"
DATE=$(date +%Y-%m-%d)

# Backup database
cp /opt/sabbylink/data/sabbylink.db "$BACKUP_DIR/db-$DATE.sqlite"

# Backup environment file
cp /opt/sabbylink/.env "$BACKUP_DIR/env-$DATE.env"

# Compress
tar czf "$BACKUP_DIR/sabbylink-$DATE.tar.gz" \
  "$BACKUP_DIR/db-$DATE.sqlite" \
  "$BACKUP_DIR/env-$DATE.env"

# Clean up temp files
rm "$BACKUP_DIR/db-$DATE.sqlite" "$BACKUP_DIR/env-$DATE.env"

# Delete backups older than 7 days
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete
```

**What to Backup:**
- SQLite database (contains all user data)
- .env file (contains secrets)
- Uploaded files (if any)

**Backup Retention:**
- Daily backups: Keep last 7 days
- Weekly backups: Keep last 4 weeks
- Monthly backups: Keep last 3 months

### 10.5 Deployment Checklist

**Pre-Deployment:**
- [ ] Purchase domain name
- [ ] Set up Cloudflare DNS (or equivalent)
- [ ] Provision VPS
- [ ] Install Docker and Docker Compose
- [ ] Clone repository
- [ ] Create `.env` file with secrets
- [ ] Test locally with `docker-compose up`

**Deployment:**
- [ ] Build Docker images
- [ ] Run `docker-compose up -d`
- [ ] Verify all containers are running
- [ ] Check logs for errors
- [ ] Test API endpoints
- [ ] Test WebSocket connection
- [ ] Test Discord bot connection

**Post-Deployment:**
- [ ] Set up monitoring (cron jobs)
- [ ] Set up automated backups
- [ ] Configure firewall (allow 80, 443, SSH only)
- [ ] Enable fail2ban (SSH brute-force protection)
- [ ] Test HTTPS certificate (auto-generated by Caddy)
- [ ] Test from external device (phone, different network)

---

## 11. Development Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Working Discord bot + basic web dashboard

**Backend:**
- [x] Set up Bun project structure
- [x] Initialize SQLite database
- [x] Create database schema (20+ tables with Drizzle ORM)
- [x] Implement Discord bot client (connect, reconnect, basic events)
- [x] Set up Elysia.js API server
- [x] Implement JWT authentication (register, login, refresh)
- [x] Implement basic bot control API (start, stop, status)

**Frontend:**
- [x] Set up React + Vite + Tailwind project
- [x] Create layout components (Sidebar, Navbar, Layout)
- [x] Implement authentication pages (Login, Register)
- [x] Implement Dashboard home page
- [x] Implement Bot Control page
- [x] Set up WebSocket connection

**DevOps:**
- [x] Create Dockerfile for backend
- [x] Create Dockerfile for frontend
- [x] Create docker-compose.yml
- [x] Create Caddyfile
- [ ] Test local deployment

**Deliverable:** User can register, log in, start/stop the Discord bot from web dashboard.

---

### Phase 2: Core Features (Weeks 3-4)

**Goal:** RPC system + command execution + basic modules

**Backend:**
- [x] Implement RPC emulator (all platforms)
- [x] Implement RPC API endpoints
- [x] Implement command system (slash commands)
- [x] Implement command execution API
- [x] Implement Nitro Sniper module
- [ ] Implement Giveaway Joiner module
- [ ] Implement Message Logger module

**Frontend:**
- [x] Implement RPC Builder page (visual builder)
- [x] Implement RPC preset management
- [x] Implement Commands page (execute, history)
- [ ] Implement Modules page (toggle, configure)
- [x] Implement Settings page

**Deliverable:** User can create custom RPC, execute commands, enable modules from dashboard.

---

### Phase 3: Advanced Features (Weeks 5-6)

**Goal:** AI integration + automation builder + analytics

**Backend:**
- [x] Implement AI adapter architecture
- [x] Implement OpenAI adapter
- [x] Implement Anthropic adapter
- [x] Implement Ollama adapter
- [x] Implement CustomOpenAI adapter (for Groq, etc.)
- [x] Implement AI provider API endpoints
- [ ] Implement AI auto-responder
- [ ] Implement natural language command parsing
- [ ] Implement automation system (triggers, actions)
- [x] Implement analytics data collection

**Frontend:**
- [x] Implement AI Settings page (provider config)
- [ ] Implement AI auto-responder configuration
- [ ] Implement Automations page (visual builder)
- [ ] Implement Analytics page (charts)
- [ ] Implement drag-and-drop workflow canvas

**Deliverable:** User can configure AI providers, create automations, view analytics.

---

### Phase 4: Polish & Extras (Weeks 7-8)

**Goal:** Animations + themes + notifications + mobile optimization

**Backend:**
- [x] Implement RPC animation system
- [ ] Implement profile animation system
- [ ] Implement theme API endpoints
- [ ] Implement notification system
- [ ] Implement backup/restore API

**Frontend:**
- [ ] Implement RPC animation editor
- [ ] Implement Profile Customizer page
- [ ] Implement Theme Builder page
- [ ] Implement Notifications page
- [ ] Implement Backup & Restore page
- [ ] Optimize for mobile (responsive design)
- [ ] Implement PWA features (manifest, service worker)

**Deliverable:** Full-featured application with all planned features.

---

### Phase 5: Deploy & Launch (Weeks 9-10)

**Goal:** Production deployment + documentation + launch

**DevOps:**
- [ ] Test production deployment on VPS
- [ ] Set up monitoring scripts
- [ ] Set up automated backups
- [ ] Security audit
- [ ] Load testing

**Documentation:**
- [x] Complete README.md
- [ ] Write deployment guide
- [ ] Write API documentation
- [ ] Write contribution guidelines
- [ ] Record demo video

**Launch:**
- [x] Create GitHub repository (public)
- [ ] Write launch announcement
- [ ] Post on Reddit (r/discordapp, r/selfhosted)
- [ ] Post on Discord (relevant servers)
- [ ] Submit to GitHub trending

**Deliverable:** SabbyLink is live, documented, and publicly available.

---

## 12. Testing Strategy

### 12.1 Unit Tests

**Backend (Bun:test):**
- Database functions (CRUD operations)
- Encryption/decryption functions
- JWT token generation/validation
- AI adapter methods
- RPC emulator methods

**Frontend (Vitest):**
- Utility functions
- Custom hooks
- Store actions (Zustand)
- Form validation

**Coverage Goal:** 70% code coverage

### 12.2 Integration Tests

**API Endpoints:**
- Test all REST endpoints with supertest
- Test WebSocket events
- Test authentication flow
- Test error handling

**Discord Bot:**
- Test bot connection
- Test command execution
- Test event handlers
- Test module triggers

**Coverage Goal:** 80% of critical paths

### 12.3 End-to-End Tests

**Playwright Tests:**
- User registration flow
- User login flow
- Bot start/stop from dashboard
- RPC creation and application
- Command execution from dashboard
- Theme switching
- Mobile responsiveness

**Coverage Goal:** All critical user journeys

### 12.4 Load Testing

**k6 Load Tests:**
- API endpoint throughput (requests/sec)
- WebSocket connection capacity (concurrent connections)
- Database query performance (queries/sec)
- Memory usage under load

**Goals:**
- 100 requests/sec sustained
- 1000 concurrent WebSocket connections
- <100ms API response time (p95)
- <200MB RAM under load

### 12.5 Security Testing

**OWASP Top 10:**
- SQL injection testing (should be impossible with parameterized queries)
- XSS testing (sanitize all user inputs)
- CSRF testing (use CSRF tokens)
- Authentication bypass testing
- Privilege escalation testing

**Tools:**
- OWASP ZAP (automated security scanning)
- Burp Suite (manual testing)

---

## 13. Open Questions & Decisions

### 13.1 Decided

- ✅ **Name**: SabbyLink
- ✅ **License**: GPL-3.0 (credit protection + copyleft)
- ✅ **Tech Stack**: Bun + SQLite + React + Tailwind
- ✅ **Architecture**: Hybrid selfbot + web dashboard
- ✅ **Deployment**: Docker + VPS
- ✅ **AI Strategy**: Universal LLM support (any provider)
- ✅ **RPC Platforms**: 5+ (Xbox, PS, PC, Mobile, Switch)

### 13.2 Open Questions

**1. Monetization (Future)**
- Keep 100% free?
- Offer optional hosted version ($2-5/month)?
- Accept donations (GitHub Sponsors, Ko-fi)?
- **Decision**: Defer until post-launch, focus on adoption first

**2. Community Management**
- Create Discord server?
- Use GitHub Discussions?
- Both?
- **Decision**: Start with GitHub Discussions, create Discord if community grows

**3. Support Channels**
- Email support?
- Discord support?
- GitHub Issues only?
- **Decision**: GitHub Issues for bugs, Discussions for questions

**4. Branding**
- Create logo?
- Design color scheme?
- Professional landing page?
- **Decision**: Keep it simple for v1.0, improve later

**5. Legal Disclaimer**
- How prominent should Discord ToS warning be?
- Require user acknowledgment?
- **Decision**: Prominent warning in README + in-app banner on first login

**6. Feature Requests**
- Accept community feature requests?
- Voting system?
- **Decision**: Yes, via GitHub Discussions with upvotes

**7. Code Contributions**
- Accept pull requests?
- Contribution guidelines?
- Code review process?
- **Decision**: Yes, create CONTRIBUTING.md with clear guidelines

### 13.3 Dashboard-Based Configuration (Zero VPS Config)

**v1.2 Implementation (Completed March 31, 2026)**

All application configuration is now manageable from the dashboard. No VPS access required.

**System Settings (`systemSettings` table):**
- Discord OAuth credentials (Client ID, Secret, Redirect URI)
- Bot mode (selfbot/bot)
- Feature toggles (RPC, AI, Nitro Sniper, etc.)
- Rate limiting settings
- Security settings
- Analytics settings
- Backup settings

**How It Works:**
1. Settings stored in SQLite `system_settings` table
2. Sensitive values encrypted with AES-256-GCM
3. Settings loaded into memory cache at startup
4. Admin users (user ID 1) can access Settings > Admin tab
5. Backend falls back to env vars for backwards compatibility

**API Endpoints:**
- `GET /api/v1/admin/settings` - Get all system settings (admin only)
- `PUT /api/v1/admin/settings` - Update system settings (admin only)
- `GET /api/v1/admin/settings/oauth-status` - Check Discord OAuth status

**Files:**
- `backend/src/config/settings.ts` - Settings service with cache
- `backend/src/api/routes/admin-settings.ts` - Admin API routes
- `backend/src/db/schema.ts` - `systemSettings` table
- `frontend/src/pages/SettingsPage.tsx` - Admin tab in Settings page

### 13.4 Future Enhancements (Post-Launch)

**v2.0 Ideas:**
- Mobile app (React Native)
- Voice channel features (recording, TTS)
- Multi-account support (manage multiple Discord accounts)
- Plugin system (community extensions)
- Advanced AI features (voice cloning, image recognition)
- Integration marketplace (Zapier, IFTTT, webhooks)

---

## Appendix A: Technology Comparison Matrix

| Technology | Pros | Cons | Decision |
|------------|------|------|----------|
| **Bun vs Node.js** | 3x faster, 50% less RAM | Newer, smaller ecosystem | ✅ Bun |
| **SQLite vs PostgreSQL** | Embedded, no server, <10MB RAM | No multi-master replication | ✅ SQLite |
| **React vs Vue** | Larger ecosystem, more jobs | Slightly heavier | ✅ React |
| **Tailwind vs CSS-in-JS** | Faster development, no runtime cost | Verbose classes | ✅ Tailwind |
| **Zustand vs Redux** | Tiny (<1KB), simple API | Less middleware | ✅ Zustand |
| **Caddy vs Nginx** | Auto HTTPS, simpler config | Less mature | ✅ Caddy |
| **Docker vs systemd** | Consistent environment, portable | Slightly more overhead | ✅ Docker |

---

## Appendix B: Glossary

- **Selfbot**: A Discord bot running on a user account (not a bot account)
- **RPC**: Rich Presence - Discord's system for showing what you're doing
- **LLM**: Large Language Model (e.g., GPT-4, Claude)
- **PWA**: Progressive Web App - web app that behaves like a native app
- **WebSocket**: Protocol for real-time bidirectional communication
- **JWT**: JSON Web Token - standard for authentication tokens
- **CORS**: Cross-Origin Resource Sharing - security feature of web browsers
- **AES-256-GCM**: Advanced Encryption Standard with Galois/Counter Mode
- **Adapter Pattern**: Design pattern for making incompatible interfaces compatible
- **Factory Pattern**: Design pattern for creating objects without specifying exact class

---

## Appendix C: References

**Documentation:**
- Discord API: https://discord.com/developers/docs
- Bun: https://bun.sh/docs
- Elysia.js: https://elysiajs.com
- React: https://react.dev
- Tailwind CSS: https://tailwindcss.com
- SQLite: https://www.sqlite.org/docs.html

**Inspiration:**
- Nighty Selfbot: https://nighty.one
- discord.js-selfbot-v13: https://github.com/aiko-chan-ai/discord.js-selfbot-v13

**AI Providers:**
- OpenAI: https://platform.openai.com/docs
- Anthropic: https://docs.anthropic.com
- Google AI: https://ai.google.dev
- Groq: https://groq.com
- Ollama: https://ollama.ai

---

**End of PLANNING.md**

This document will be updated as the project evolves. All major decisions and changes should be documented here.

**Last Updated:** March 30, 2026  
**Next Review:** After Phase 1 completion
