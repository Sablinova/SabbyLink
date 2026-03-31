# Nighty Feature Analysis & Implementation Reference

> Complete analysis of Nighty selfbot (v2.5.0b) features for SabbyLink development.
> Last Updated: March 31, 2026
> Sources: nighty.one, docs.nighty.one

---

## Table of Contents

1. [Overview](#overview)
2. [Technical Architecture](#technical-architecture)
3. [Authentication System](#authentication-system)
4. [Slash Commands](#slash-commands)
5. [Rich Presence / Activity System](#rich-presence--activity-system)
6. [Profile Customization](#profile-customization)
7. [Modules & Automation](#modules--automation)
8. [Notification System](#notification-system)
9. [User Interface](#user-interface)
10. [Privacy & Safety](#privacy--safety)
11. [Data Storage](#data-storage)
12. [Feature Comparison](#feature-comparison)
13. [SabbyLink Implementation Roadmap](#sabbylink-implementation-roadmap)

---

## Overview

**Nighty** is a commercial Discord selfbot ($10 lifetime license) operating since 2020 with 15,000+ users. It's a Windows desktop application built with WebView2 technology.

### Key Stats
- **Price**: $10 lifetime (official), $11+ via resellers
- **Platform**: Windows 10/11/Server 2022 only
- **Technology**: WebView2 (Microsoft Edge runtime)
- **Version**: 2.5.0b (as of March 2026)
- **Users**: 15,000+
- **Operating since**: 2020

### Tagline
> "Your Ultimate Discord Toolkit - Better notifications, commands everywhere, powerful automations, fun tools, and even some trolling. Everything you need, packed into one powerful app."

---

## Technical Architecture

### Application Structure
```
Nighty.exe (Launcher)
├── WebView2 Runtime (UI)
├── Discord Gateway Connection
├── User App (for slash commands)
└── Local SQLite/JSON Storage
```

### Data Storage Location
```
%appdata%/Nighty Selfbot/
├── auth.json          # License key
├── data/
│   ├── profile.json   # Profile settings
│   └── presets.json   # RPC presets
└── [other config files]
```

### Runtime Requirements
- Microsoft WebView2 Runtime (Evergreen X64)
- Windows 10/11 or Server 2022
- Disabled antivirus (Windows Defender) recommended
- Firewall exceptions may be needed

---

## Authentication System

### Login Methods

#### 1. Web Login (Recommended)
- Opens Discord's official OAuth login page
- Supports QR code scanning
- Uses standard Discord credentials
- Most secure method

#### 2. Token Login
Requires manually extracting Discord token:
```javascript
// Run in Discord browser console (F12 → Console)
let token;
webpackChunkdiscord_app.push([
  [Math.random()],
  {},
  (r) => {
    for (let m in r.c) {
      try {
        const mod = r.c[m].exports;
        if (mod && mod.default && typeof mod.default.getToken === 'function') {
          token = mod.default.getToken();
          break;
        }
      } catch {}
    }
  },
]);
console.log(token);
```

### User App Creation Process
Nighty creates a Discord Application (User App) for slash commands:

1. User provides custom app name
2. Nighty creates app via Discord Developer Portal (automated)
3. User clicks "Get Your Application Token" button
4. User clicks "Reset Token" in Discord's interface
5. Nighty captures the new application token
6. User authorizes the app to their account
7. Slash commands become available

**Key Insight**: This means Nighty uses BOTH:
- User token (for selfbot actions)
- Application token (for slash commands)

---

## Slash Commands

### Command Categories

| Category | Command | Description |
|----------|---------|-------------|
| `/admin` | Various | Server administration commands |
| `/animated` | Various | Animated message effects |
| `/fun` | Various | Entertainment/joke commands |
| `/image` | Various | Image generation/manipulation |
| `/misc` | Various | Miscellaneous utilities |
| `/recovery` | backup, restore | Account backup & restore |
| `/settings` | Various | Configuration management |
| `/spotify` | Various | Spotify integration |
| `/text` | Various | Text manipulation |
| `/tools` | Various | General utilities |
| `/troll` | noleave, etc. | Trolling/prank commands |
| `/utils` | autotranslate, autoslash | Automation utilities |

### Specific Commands Mentioned
- `/help` - Shows all available commands
- `/help [category]` - Shows category-specific commands
- `/troll noleave` - Forces user to stay in group DM
- `/utils autotranslate` - Auto-translates messages
- `/utils autoslash` - Auto-executes slash commands
- `/appedit` - Edit the Discord app name

### Private Mode
- Commands can be made visible only to the user
- Toggle: Enable/Disable
- Hides all selfbot activity from others

---

## Rich Presence / Activity System

### Supported Platforms
1. **PC** (Windows)
2. **Xbox**
3. **PlayStation**
4. **Mobile**
5. **Nintendo Switch**
6. **Custom**

### Activity Types (7 Types)
1. Playing
2. Streaming
3. Listening (Spotify simulation)
4. Watching (Crunchyroll simulation)
5. Competing
6. Custom Activity
7. Hang Status

### RPC Fields
```
┌─────────────────────────────────────┐
│ [Large Image]  Game Name            │
│                Details Line         │
│                State Line           │
│ [Small Image]  Timestamp            │
│                                     │
│ [Button 1] [Button 2]               │
└─────────────────────────────────────┘
```

- **Large Image**: URL (Imgur recommended) + tooltip text
- **Small Image**: URL + tooltip text
- **Details**: First line of text
- **State**: Second line of text
- **Timestamp**: Show elapsed/remaining time
- **Buttons**: Up to 2 clickable buttons with URLs

### Image URLs
- Must use direct image URLs
- Imgur recommended: Upload → Right-click → Open in new tab → Copy URL
- Format: `https://i.imgur.com/xxxxx.png`

### Dynamic Values
Variables that auto-update:
- `{spotify_lyrics}` - Current Spotify lyrics
- `{local_time}` - Local system time
- `{active_app}` - Currently focused application
- Custom user-defined values

### Animation System
All profile elements support keyframe animation:
- **Bio/About Me** - Animated text
- **Status** (Online/Idle/DND)
- **Custom Status** - Emoji + text
- **Pronouns**
- **Rich Presence** - All fields
- **Server Tag** (NEW in 2.5)

Animation features:
- Multiple keyframes
- Configurable delays between frames
- Smooth transitions
- Live preview in UI

### Discord Settings Required
For RPC to display:
1. Status must be Online/Idle/DND (not Invisible)
2. User Settings → Activity Privacy → Enable all
3. Per-server: Server Name → Privacy Settings → Enable both options

---

## Profile Customization

### Editable Fields
- **Username** (within Discord limits)
- **Avatar**
- **Banner**
- **Bio/About Me**
- **Pronouns**
- **Custom Status** (emoji + text)
- **Online Status**

### Animation Support
All text fields support rotation/animation:
```
Keyframe 1: "First message" (5 seconds)
Keyframe 2: "Second message" (5 seconds)
Keyframe 3: "Third message" (5 seconds)
→ Loop
```

---

## Modules & Automation

### Nitro Sniper
- Auto-claims Nitro gift codes
- Millisecond response time
- Configurable delay
- Supports unlimited alt accounts
- Notification on successful claim

### Giveaway Joiner
- Auto-enters giveaways
- Keyword filtering (require specific words)
- Server blacklisting
- Configurable delay
- Supports unlimited alts

### Message Logger
- Tracks deleted messages
- Tracks edited messages (shows before/after)
- Stores locally

### User Spy
- Monitor specific users' activity
- Track online/offline status
- Activity changes

### Auto-Reactions
- Keyword-based triggers
- User-based triggers
- Channel-based triggers
- Multiple emoji support

### AFK System
- Auto-reply when away
- Customizable message
- Automatic enable/disable

### Server Cloner
- Clone server structure
- Channels, roles, permissions
- (Full details not documented)

### Auto-Translate
- `/utils autotranslate`
- Automatically translate sent messages
- Language detection

### Auto-Slash
- `/utils autoslash`
- Auto-execute slash commands
- Automation of repetitive tasks

### Custom Scripts Engine
- **Python-based scripting**
- Community script marketplace
- Download pre-made scripts
- Create custom features
- Event-based triggers
- No coding experience required for pre-made scripts

### Coming Soon: Event Manager
- Visual block builder
- Triggers, conditions, actions
- No-code automation
- "Infinitely expand Nighty's features"

---

## Notification System

### Notification Types
Events Nighty notifies about (that Discord doesn't):

| Event | Description |
|-------|-------------|
| Joined Giveaway | Confirmation of giveaway entry |
| Nitro Sniped | Successful Nitro claim |
| Ghostping Detected | Someone pinged and deleted |
| Friend Blocked You | Friend list changes |
| You Got Pinged | Mention detection |
| Role Added in Server | Role changes |
| Kicked from Server | Server removal |
| Friend Removed You | Unfriend detection |
| Nickname Updated | Your nickname changed |
| Keyword Detected | Custom keyword alerts |
| Ticket Replied | Support ticket responses |
| User Typing in DMs | Typing indicators |
| Command Used | Command execution log |
| Custom Script Event | Script-triggered events |
| Giveaway Detected | New giveaway found |

### Notification Channels
1. **In-App Notification Center** - Built-in UI
2. **Discord Webhooks** - Send to any channel
3. **Desktop Notifications** - Windows toast notifications
4. **Sound Alerts** - Audio notifications
5. **Dynamic Alerts** - Custom alert types

### Customization
- Choose which events to be notified about
- Choose notification method per event
- Full flexibility

---

## User Interface

### Main Sections
1. **Overview** - Dashboard/home
2. **Themes** - Theme editor + community themes
3. **Modules** - Enable/configure features
4. **Scripts** - Custom scripts + community scripts
5. **User Profile** - Profile + RPC editor
6. **Custom Tabs** - Extensible interface

### UI Features
- **Theme Builder** - Full color customization
- **Community Content** - Download themes/scripts
- **Live Preview** - Real-time RPC preview
- **Custom Context Menus** - Right-click integration
- **Hide to Tray** - Background operation
- **Notification Center** - In-app alerts

### Special Features
- **Nighty Discoverable** - Community feature discovery
- **Activity Viewer** - View others' activities
- **Login Manager** - Multi-account management
- **Ticket Replier** - Support ticket automation

---

## Privacy & Safety

### Data Collection (Server-Side)
Nighty servers store only:
1. Hardware ID (HWID)
2. License key
3. Discord user ID (upon approval request)

### Data NOT Stored
- Discord token
- Messages
- Personal information
- Activity data

### Local Storage
All sensitive data stored locally:
- `%appdata%/Nighty Selfbot/`
- Token encrypted locally
- Settings in JSON files

### Safety Claims
- "100% safety" claimed
- "Bans are extremely rare"
- "Virtually unheard of" ban cases
- Operates as "real Discord client device"
- Rate limiting built-in

### Recommendations
- Don't disclose selfbot usage publicly
- Don't use in attention-drawing ways
- Keep private mode enabled

---

## Data Storage

### Local Files
```
%appdata%/Nighty Selfbot/
├── auth.json           # License key storage
├── data/
│   ├── profile.json    # Profile configuration
│   ├── presets.json    # RPC presets
│   └── [other files]
└── [cache/temp files]
```

### Account Backup
Full account backup includes:
- Server list
- Friends list
- Settings
- DM history (likely)
- No cooldowns
- No limits
- Cross-account restore capability

---

## Feature Comparison

### Nighty vs SabbyLink

| Feature | Nighty | SabbyLink |
|---------|--------|-----------|
| **Platform** | Windows only | Web + Docker (any OS) |
| **Price** | $10 lifetime | Free (GPL-3.0) |
| **Dashboard** | Native Windows | Web-based |
| **Mobile Control** | ❌ No | ✅ PWA |
| **AI Integration** | Limited | Universal (8+ providers) |
| **Hosting** | User's PC | Self-hosted VPS |
| **Open Source** | ❌ No | ✅ Yes |
| **Scripting** | Python | JavaScript/TypeScript |
| **24/7 Operation** | Requires PC on | ✅ VPS-based |
| **Multi-Account** | ✅ Yes | 🚧 Planned |
| **Web Login** | ✅ Discord OAuth | 🚧 Adding |
| **Private Mode** | ✅ Yes | 🚧 Planned |

### Nighty Unique Features
- Custom Scripts Engine (Python)
- Community content marketplace
- Windows context menu integration
- Native Windows notifications
- Theme builder with community themes
- Activity Viewer (view others' presence)
- Server Tag Animation (new)

### SabbyLink Advantages
- Free and open source
- Cross-platform (Docker)
- Web dashboard from anywhere
- Mobile PWA support
- Universal AI integration
- 24/7 VPS hosting
- Full API access
- Self-hosted privacy

---

## SabbyLink Implementation Roadmap

### Phase 1: Parity Features (High Priority)
1. **Discord OAuth Login** - Match Nighty's web login
2. **Rich Presence System**
   - All 6 platforms
   - 7 activity types
   - Animation/keyframes
   - Dynamic values
   - Live preview
3. **Nitro Sniper** - Fast claiming with delay option
4. **Giveaway Joiner** - Auto-entry with filters
5. **Message Logger** - Deleted/edited tracking
6. **Backup/Restore** - Full account backup

### Phase 2: Enhanced Features
1. **Profile Animation** - Bio, status, pronouns rotation
2. **Notification System** - Webhooks, alerts
3. **Auto-Reactions** - Keyword/user triggers
4. **User Spy** - Activity monitoring
5. **Private Mode** - Hide command usage
6. **AFK System** - Auto-reply

### Phase 3: Differentiators (SabbyLink Unique)
1. **AI Integration** - 8+ providers, auto-responder
2. **Web Dashboard** - Full mobile support
3. **Visual Automation Builder** - No-code workflows
4. **REST API** - External integrations
5. **Multi-User** - Multiple dashboard accounts
6. **Real-time WebSocket** - Live updates

### Phase 4: Advanced
1. **Custom Scripts** - JavaScript engine
2. **Plugin System** - Community extensions
3. **Server Cloner** - Full server backup
4. **Advanced Logging** - Analytics dashboard

---

## Technical Notes for Implementation

### User App vs Selfbot Token
Nighty uses BOTH:
- **User Token**: For selfbot actions (presence, automation)
- **App Token**: For slash commands (created via Discord Dev Portal)

SabbyLink options:
1. Pure selfbot (current) - User token only
2. Hybrid (like Nighty) - Both tokens
3. Regular bot - Bot token only (less features)

### Discord API Considerations
- Selfbots violate ToS but enforcement is rare
- User Apps are legitimate Discord feature
- Rate limiting essential to avoid flags
- Private mode crucial for safety

### RPC Platform Detection
How Nighty shows different platforms:
- Uses platform field in presence payload
- Xbox/PlayStation/etc. have specific identifiers
- Mobile uses specific client identifiers

### Animation Implementation
- Client-side timer rotates content
- Sends presence update on each rotation
- Configurable interval (seconds)
- Smooth transitions in UI preview

---

## Resources

- **Main Site**: https://nighty.one
- **Documentation**: https://docs.nighty.one
- **Status Page**: https://status.nighty.one
- **Support Discord**: https://discord.gg/2UwXRfU2V6
- **YouTube**: https://www.youtube.com/@NightySelfbot
- **Current Version**: 2.5.0b

---

## License & Legal

Nighty Terms of Service key points:
- 1 license key = 1 user
- Non-transferable, non-resellable
- Can switch between own alt accounts
- One machine at a time (auto-logout on switch)
- Refund within 72 hours if doesn't work
- Abuse = license revocation

---

*This document is for educational and development reference purposes only.*
