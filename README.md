# GiftMaster

Discord alt-account generator with free/premium stock tiers, an admin HTTP dashboard, and a landing page. Two pieces:

- **Bot** — slash commands, discord.js v14. Alt generator with atomic redemption and per-user cooldowns.
- **Dashboard** — Express server with session auth, stock file editor, live stock counters, settings panel.

---

## Requirements

- Node.js >= 18
- A Discord bot application
- A server (or local box) to host the dashboard

---

## Install

```bash
git clone <your-repo>
cd giftmaster
npm install
```

---

## Configure

### 1. Copy the env template

```bash
cp .env.example .env
```

### 2. Fill in `.env`

| Key | Description |
|---|---|
| `TOKEN` | Bot token from the Discord Developer Portal. |
| `CLIENT_ID` | Application ID (same as the bot's user ID). |
| `GUILD_ID` | The guild where slash commands get registered. |
| `SESSION_SECRET` | Long random string. Signs dashboard session cookies. |
| `username` | Dashboard login username. |
| `password` | Dashboard login password. |

Generate a `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Edit `config.json`

```jsonc
{
  "port": "3000",                       // dashboard HTTP port
  "status": "Made By ScienceGear 🔥",   // bot activity text
  "website": "https://...",             // links in embeds
  "banner": "https://...",              // embed image
  "footer": "Made By ScienceGear 🔥",   // embed footer

  "genChannel": "00000000000000000000",       // channel ID for /free
  "premiumChannel": "00000000000000000000",   // channel ID for /premium
  "genCooldown": 5,                            // seconds between /free per user
  "premiumCooldown": 3,                        // seconds between /premium per user

  "color": {
    "green": "0x57F287",
    "yellow": "0xFEE75C",
    "red": "0xED4245",
    "default": "0x5865F2"
  },
  "command": {
    "notfound_message": true,
    "error_message": true
  }
}
```

Cooldowns are numbers, not strings. Colors can be `"0xRRGGBB"`, `"#RRGGBB"`, or raw ints — the commands coerce them via `utils/colors.js`.

---

## Deploy commands

Registers slash commands to the guild in `GUILD_ID`. Run once, and again any time you change a command's name or options.

```bash
npm run deploy
```

---

## Run

### Bot + dashboard together

```bash
npm start
```

Boots the Discord client and starts the HTTP server on `config.port`. Both run in the same process.

### Dashboard only

```bash
npm run dashboard
```

Useful when you want to edit stock files without the bot being online.

### Dev mode (auto-restart on file change)

```bash
npm run dev
```

---

## Directory layout

```
giftmaster/
├── index.js                bot entry
├── server.js               dashboard entry
├── deploy-commands.js      slash command registration
├── config.json             bot + dashboard config
├── .env                    secrets (gitignored)
├── .env.example            template
├── package.json
├── commands/               slash commands
│   ├── add.js
│   ├── create.js
│   ├── free.js
│   ├── help.js
│   ├── premium.js
│   └── stock.js
├── utils/
│   ├── colors.js           hex → int color coercion
│   ├── cooldown.js         in-memory per-user cooldowns
│   ├── fileLock.js         per-file mutex for stock writes
│   └── stock.js            stock dir helpers
├── dashboard/              served by express.static
│   ├── login.html
│   ├── accessdecline.html
│   ├── invalidlogin.html
│   ├── css/
│   │   ├── login.css
│   │   ├── accessdecline.css
│   │   └── manager.css
│   ├── js/
│   │   └── main.js
│   └── img/
│       ├── wave.png
│       ├── bg.svg
│       ├── gift.png
│       └── pattern.png
├── free/                   free stock (one account per line)
│   └── <service>.txt
├── premium/                premium stock
│   └── <service>.txt
└── .sessions/              session file store (gitignored)
```

---

## Bot commands

| Command | Channel | Permissions | Description |
|---|---|---|---|
| `/help` | anywhere | everyone | Help panel with command list. |
| `/stock` | anywhere | everyone | Live free + premium stock counts. |
| `/free <service>` | `genChannel` | everyone, on cooldown | Pop one account from `free/<service>.txt`, DM the user. |
| `/premium <service>` | `premiumChannel` | everyone, on cooldown | Pop one from `premium/<service>.txt`, DM the user. |
| `/create <service> <type>` | anywhere | Manage Channels | Create a new empty stock file. |
| `/add <type> <service> <account>` | anywhere | Manage Channels | Append an account line to a stock file. |

**Redemption behavior**

- `/free` and `/premium` pop the top non-empty line and rewrite the file. Serialized per file via `utils/fileLock.js`, so concurrent generations can never grab the same account.
- The bot sends the account via DM first. If DMs are closed, it falls back to an ephemeral reply containing the account — nothing is lost.
- Cooldowns are per-user, in-memory. Restart clears them.

**Service names**

Sanitized to `[a-z0-9_-]`. Lowercased. `.txt` extension added automatically. Paths like `../foo` are rejected.

---

## Dashboard

Served on `config.port` (default 3000).

| Route | Auth | Purpose |
|---|---|---|
| `GET /` | public | Login page. |
| `POST /login` | public, rate-limited | Form submit. Sets session cookie. |
| `GET /signout` | session | Destroys session, redirects to login. |
| `GET /edit` | session | File manager dashboard. |
| `GET /edit/:folder/:filename` | session | Text editor for a specific stock file. |
| `POST /save/:folder/:filename` | session | Save edited file content. |
| `GET /help` | session | Help + bot command reference. |
| `GET /settings` | session | Config settings form. |
| `POST /save-settings` | session | Persists whitelisted config keys to `config.json`. |
| `POST /create` | session | Create a new stock file. |
| `POST /rename` | session | Rename a stock file. |
| `POST /delete` | session | Delete a stock file. |

**Auth**

- Session cookie, `httpOnly` + `sameSite: strict`, signed with `SESSION_SECRET`.
- Sessions persisted to `.sessions/` via `session-file-store`.
- Login attempts rate-limited: 10 per 15 minutes per IP.
- Set `cookie.secure: true` in `server.js` if you're behind HTTPS.

**Path safety**

Every `folder` and `filename` from the URL or body goes through `resolveStockFile()`. Folder must be `free` or `premium`; filename must match `^[a-zA-Z0-9_.-]+$` with no `..`; the resolved path must be inside the chosen folder.

**HTML escaping**

Anything user-controlled that gets interpolated into HTML — filenames, folder names, file contents, settings values — is passed through `escapeHtml()`.

---

## API

Read-only JSON endpoints for status pages and health checks.

| Route | Returns |
|---|---|
| `GET /health` | `{ ok: true, uptime: <seconds> }` |
| `GET /stock` | `{ free: [{name, count}], premium: [{name, count}] }` |

If you're running the bot with `npm start`, these come from the dashboard's express instance. If you want them standalone, `npm run dashboard`.

---

## Deployment notes

- **HTTPS**: run behind nginx / Caddy / Cloudflare. Set `cookie.secure: true` in the session config once TLS terminates in front of you. The `trust proxy` flag is already on so rate limiting sees real client IPs.
- **Reverse proxy**: forward `/` to `localhost:3000`. The bot itself doesn't serve HTTP.
- **Process manager**: `pm2` or `systemd`. `npm start` for the full stack.
- **Backups**: back up `free/`, `premium/`, and `config.json`. `.sessions/` and `node_modules/` don't matter.
- **Restart to clear cooldowns**: cooldown map is in-memory.
- **`npm run deploy` after command changes**: slash command metadata is pushed to Discord at deploy time, not on boot.

---

## Troubleshooting

**`ColorConvert` error on any slash command** — a color value in `config.json` isn't parseable. Use `"0xRRGGBB"` or a raw int, and make sure `utils/colors.js` exists.

**`ephemeral` deprecation warning** — the code uses `flags: MessageFlags.Ephemeral`, not `ephemeral: true`. If you see the warning, a command file wasn't updated.

**Dashboard login loop** — `SESSION_SECRET` empty or changed after login. Set a stable value in `.env`, restart.

**`Failed to register commands`** — check `CLIENT_ID` and `GUILD_ID` are real IDs, `TOKEN` is valid, and the bot is in the guild.

**Stock counter off** — counts ignore blank lines. A file with one account and a trailing newline shows `1`.
