# SabbyLink

> **The next-generation Discord selfbot with AI integration, universal RPC emulation, and a powerful web dashboard**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](https://react.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**SabbyLink** is an advanced, open-source Discord selfbot that surpasses existing solutions with AI-powered automation, universal platform RPC emulation, and a feature-complete web dashboard. Built with modern technologies for speed and efficiency, using <150MB RAM.

---

## ⚠️ Important Legal Notice

**Discord selfbots violate Discord's Terms of Service.** Using this software may result in account termination. This project is provided for **educational purposes only**. The developers are not responsible for any consequences of using this software. **Use at your own risk.**

---

## ✨ Why SabbyLink?

| Feature | SabbyLink | Nighty | Other Selfbots |
|---------|-----------|--------|----------------|
| **AI Integration** | ✅ Universal (8+ providers) | ❌ | ❌ |
| **Web Dashboard** | ✅ 100% feature control | ⚠️ Limited | ❌ |
| **Mobile Control** | ✅ PWA support | ⚠️ Basic | ❌ |
| **RPC Platforms** | ✅ 6 platforms + custom | ⚠️ PC only | ⚠️ Limited |
| **RPC Animations** | ✅ Multi-state support | ❌ | ❌ |
| **Visual Automation** | ✅ Drag-drop builder | ❌ | ❌ |
| **RAM Usage** | ✅ <150MB | ⚠️ ~250MB | ⚠️ 200MB+ |
| **Open Source** | ✅ GPL-3.0 | ❌ Closed | ⚠️ Varies |
| **License** | ✅ Free forever | 💰 Paid | ⚠️ Varies |

---

## 🚀 Key Features

### 🤖 AI Integration (Unique to SabbyLink)
- **Universal Provider Support**: OpenAI, Claude, Gemini, Groq, Ollama, OpenRouter, Perplexity, and custom APIs
- **AI Auto-Responder**: Smart responses to DMs/mentions with context awareness
- **Natural Language Commands**: Control your bot with plain English
- **Conversation Memory**: Maintains context across multiple messages

### 🎮 Advanced RPC System
- **Multi-Platform Emulation**: Xbox, PlayStation, PC, Mobile, Nintendo Switch, Custom
- **Animated Presence**: Rotate through multiple states with configurable intervals
- **Visual RPC Builder**: Real-time preview in the dashboard
- **Platform-Specific Assets**: Authentic-looking presence for each platform

### 🌐 Powerful Web Dashboard
- **100% Feature Control**: Every bot feature accessible from the browser
- **Real-Time Updates**: WebSocket-powered instant synchronization
- **Mobile-Optimized**: PWA support for phone/tablet control
- **Dark/Light Themes**: Customizable appearance with presets
- **Visual Automation Builder**: Drag-drop workflow creation without code

### 🛡️ Core Selfbot Features
- **Slash Commands**: Custom commands with autocomplete
- **Afk System**: Auto-reply when away with configurable messages
- **Auto-Reactions**: Auto-react to messages with emojis
- **Snipe/Edit Snipe**: View deleted/edited messages
- **Nitro Sniper**: Auto-claim Nitro gift codes
- **Giveaway Joiner**: Auto-enter giveaways
- **Message Logger**: Track deleted messages across servers
- **User Spy**: Monitor specific users' activity
- **Backup/Restore**: Save and restore settings

### 📊 Analytics & Monitoring
- **Message Statistics**: Track your Discord activity over time
- **Command Usage**: See which commands are used most
- **Uptime Tracking**: Monitor bot availability
- **Error Logging**: Detailed error reports with stack traces

### 🔒 Security & Privacy
- **AES-256-GCM Encryption**: All sensitive data encrypted at rest
- **Local-First**: Your data never leaves your server
- **Optional Discord OAuth**: Convenient login without storing passwords
- **Rate Limiting**: Prevent API abuse and account flags
- **Audit Logging**: Track all configuration changes

---

## 📦 Quick Start

### Prerequisites
- **Bun** 1.0+ ([install](https://bun.sh))
- **Git**
- **Discord Account** (with token)
- **VPS/Server** (optional, for 24/7 hosting)

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/sabbylink.git
cd sabbylink

# Install backend dependencies
cd backend
bun install

# Install frontend dependencies
cd ../frontend
bun install

# Copy environment template
cp .env.example .env

# Edit .env with your Discord token and settings
nano .env

# Start backend (from backend directory)
bun run dev

# Start frontend (from frontend directory, in new terminal)
bun run dev

# Open dashboard at http://localhost:5173
```

### Production Deployment (Docker)

```bash
# Clone the repository
git clone https://github.com/yourusername/sabbylink.git
cd sabbylink

# Configure environment
cp .env.example .env
nano .env  # Add your Discord token and settings

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Access dashboard at https://yourdomain.com
```

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed VPS setup instructions.

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [PLANNING.md](docs/PLANNING.md) | Complete project blueprint with specifications |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technical architecture and design decisions |
| [FEATURES.md](docs/FEATURES.md) | Detailed feature documentation |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | VPS deployment and production setup |
| [DATABASE.md](docs/DATABASE.md) | Database schema and migrations |
| [API.md](docs/API.md) | REST API and WebSocket documentation |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | How to contribute to the project |
| [SECURITY.md](docs/SECURITY.md) | Security best practices and reporting |

---

## 🏗️ Project Structure

```
sabbylink/
├── backend/              # Bun + TypeScript backend
│   ├── src/
│   │   ├── bot/         # Discord selfbot client
│   │   ├── api/         # REST API routes
│   │   ├── ws/          # WebSocket server
│   │   ├── db/          # Database models and migrations
│   │   ├── ai/          # AI provider adapters
│   │   └── utils/       # Shared utilities
│   ├── package.json
│   └── tsconfig.json
├── frontend/            # React + Vite frontend
│   ├── src/
│   │   ├── pages/      # Page components
│   │   ├── components/ # Reusable components
│   │   ├── hooks/      # Custom React hooks
│   │   ├── store/      # Zustand state management
│   │   └── lib/        # Utilities and API client
│   ├── package.json
│   └── vite.config.ts
├── docs/                # Documentation
├── scripts/             # Deployment scripts
├── docker-compose.yml   # Production deployment
├── Caddyfile           # Reverse proxy config
├── LICENSE             # GPL-3.0
└── README.md           # This file
```

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: [Bun](https://bun.sh) - 3x faster than Node.js, 50% less RAM
- **Framework**: [Elysia.js](https://elysiajs.com) - Ultrafast web framework for Bun
- **Database**: [SQLite](https://sqlite.org) + [Drizzle ORM](https://orm.drizzle.team) - Embedded, zero-config
- **Discord**: [discord.js-selfbot-v13](https://github.com/aiko-chan-ai/discord.js-selfbot-v13)
- **WebSocket**: Native Bun WebSocket API
- **Encryption**: Node.js crypto (AES-256-GCM)

### Frontend
- **Framework**: [React 18](https://react.dev) with TypeScript
- **Build Tool**: [Vite](https://vitejs.dev) - Lightning-fast HMR
- **Styling**: [Tailwind CSS](https://tailwindcss.com) + [Radix UI](https://radix-ui.com)
- **State**: [Zustand](https://zustand-demo.pmnd.rs) - <1KB state management
- **Animation**: [Framer Motion](https://framer.com/motion)
- **Charts**: [Recharts](https://recharts.org)

### Deployment
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: [Caddy](https://caddyserver.com) - Auto HTTPS
- **Process Management**: systemd

---

## 🎯 Roadmap

### Phase 1: Foundation (Weeks 1-2) ✅
- [x] Project planning and architecture
- [x] Documentation structure
- [x] Basic Discord bot client
- [x] SQLite database setup
- [x] Simple web dashboard

### Phase 2: Core Features (Weeks 3-4) ✅
- [x] RPC system with platform emulation
- [x] Slash commands system
- [x] Dashboard API integration
- [x] User settings and persistence

### Phase 3: Advanced Features (Weeks 5-6) 🚧
- [x] AI integration (5 providers: OpenAI, Claude, Gemini, Groq, Ollama)
- [ ] Visual automation builder
- [x] Advanced RPC animations
- [ ] Message logger and snipe

### Phase 4: Polish (Weeks 7-8)
- [ ] Theme system
- [ ] Mobile optimization
- [ ] Analytics dashboard
- [ ] Performance optimization

### Phase 5: Launch (Weeks 9-10)
- [ ] Production deployment guides
- [ ] Video tutorials
- [ ] Community Discord server
- [ ] Public release

---

## 🤝 Contributing

We welcome contributions! Whether it's:
- 🐛 Bug reports
- 💡 Feature requests
- 📝 Documentation improvements
- 🔧 Code contributions

Please read [CONTRIBUTING.md](docs/CONTRIBUTING.md) before submitting PRs.

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0** - see the [LICENSE](LICENSE) file for details.

### What this means:
- ✅ **Free to use**: Forever, no charges
- ✅ **Free to modify**: Change anything you want
- ✅ **Free to distribute**: Share with others
- ⚠️ **Must share source**: If you distribute, you must provide source code
- ⚠️ **Must use GPL-3.0**: Derivatives must use the same license
- ⚠️ **Must credit**: Original authors must be credited

**Why GPL-3.0?** We chose this license to ensure:
1. The project remains free and open-source forever
2. Contributors receive credit for their work
3. Commercial forks must share their improvements back to the community

---

## 🙏 Credits

### Core Team
- **Lead Developer**: [Your Name]
- **Contributors**: See [CONTRIBUTORS.md](CONTRIBUTORS.md)

### Inspired By
- **Nighty** - For pioneering advanced Discord selfbot features
- **discord.js-selfbot-v13** - For maintaining Discord selfbot support

### Special Thanks
- Discord.js community
- Bun team for the amazing runtime
- All open-source contributors

---

## 💬 Support & Community

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/sabbylink/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/sabbylink/discussions)
- **Discord**: [Coming Soon]

---

## ⚖️ Disclaimer

This project is for **educational purposes only**. Using selfbots violates Discord's Terms of Service and may result in account termination. The developers:
- Do **not** encourage violating Discord's ToS
- Are **not** responsible for any consequences of using this software
- Provide this software **as-is** with no warranties

**USE AT YOUR OWN RISK.**

---

## 🌟 Star History

If you find this project useful, please consider giving it a star ⭐ to help others discover it!

---

<div align="center">

**Made with ❤️ by the SabbyLink community**

[Report Bug](https://github.com/yourusername/sabbylink/issues) • [Request Feature](https://github.com/yourusername/sabbylink/issues) • [Documentation](docs/)

</div>
