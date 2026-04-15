# Smart Private Cloud Storage Agent

A self-hosted private cloud storage system powered by AI. Run it on your own PC, NAS, or Raspberry Pi to get real hardware disk monitoring, AI-assisted file organization, and a rich dark-themed web dashboard.

![Smart Cloud Dashboard](https://img.shields.io/badge/Status-Active-brightgreen) ![License](https://img.shields.io/badge/License-MIT-blue) ![Node.js](https://img.shields.io/badge/Node.js-20%2B-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

---

## Features

- **Real Hardware Disk Detection** — Reads actual HDD, SSD, NVMe, USB, and NAS volumes on Linux, macOS, and Windows using native OS tools (`lsblk`, `diskutil`, PowerShell/WMIC)
- **AI-Powered Storage Agent** — Chat with GPT-4o mini or other models to organize files, get storage insights, and automate cleanup
- **Multi-Language UI** — English (default), Thai, Chinese (Simplified), Japanese, Korean — switchable from the sidebar
- **OAuth Connections** — Discord, Telegram, LINE, Facebook, Instagram, GitHub, Google
- **Dark Cockpit UI** — Deep navy + cyan theme with circular usage rings, colorful disk type badges (SSD/HDD/NVMe/USB/NAS)
- **Self-Hosted** — No cloud subscription, no data leaves your machine

---

## Tech Stack

| Layer     | Technology |
|-----------|-----------|
| Frontend  | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Backend   | Node.js, Express 5, TypeScript |
| Database  | PostgreSQL + Drizzle ORM |
| AI        | OpenAI-compatible API (GPT-4o mini, o4-mini, Llama, LLaVA, Whisper) |
| Monorepo  | pnpm workspaces |

---

## Quick Start

### Prerequisites

- [Node.js 20+](https://nodejs.org/en/download)
- [pnpm](https://pnpm.io/installation) — `npm install -g pnpm`
- [PostgreSQL 15+](https://www.postgresql.org/download/)

### Install

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/smart-cloud.git
cd smart-cloud

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your database URL and session secret

# 4. Push database schema
pnpm --filter @workspace/db run push

# 5. Start the API server (port 8080)
pnpm --filter @workspace/api-server run dev

# 6. Start the frontend (port 24787) — open a new terminal
pnpm --filter @workspace/smart-cloud run dev
```

Open [http://localhost:24787](http://localhost:24787) in your browser.

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/smartcloud
SESSION_SECRET=your-random-secret-here
NODE_ENV=development
```

Generate a secure session secret:
```bash
openssl rand -hex 32
```

---

## Platform Support

### Linux

Uses `lsblk` for partition info and `df` for mount points. Works on Ubuntu, Debian, Arch, and most distributions.

```bash
# Ubuntu/Debian: ensure lsblk is installed
sudo apt install util-linux
```

### macOS

Uses `diskutil list` and `df` to enumerate volumes including APFS containers and external drives.

### Windows

Uses PowerShell `Get-PSDrive` + WMIC `diskdrive get` for physical disk detection.

---

## NAS Installation

### Synology DSM

1. Enable SSH in **Control Panel → Terminal**
2. SSH in and follow the Linux install steps
3. Set up auto-start via **Control Panel → Task Scheduler**

### Docker (any NAS / server)

```yaml
version: '3.8'
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: smartcloud
      POSTGRES_PASSWORD: yourpassword
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  api:
    build: .
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgresql://postgres:yourpassword@db:5432/smartcloud
      SESSION_SECRET: your-random-secret
      NODE_ENV: production
    depends_on:
      - db
    restart: unless-stopped

volumes:
  postgres_data:
```

```bash
docker compose up -d
```

### TrueNAS SCALE

Use the Apps section (Custom App) or run via the Shell using the Docker Compose method above.

---

## Remote Access

| Method | Use Case | Cost |
|--------|----------|------|
| Local LAN | Access from any device on your home network | Free |
| [Tailscale](https://tailscale.com) | Secure VPN access from anywhere, no port forwarding | Free (personal) |
| [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) | Public HTTPS URL via `cloudflared` | Free |
| Nginx Reverse Proxy | Production deployment with custom domain | Free |

---

## Language Support

The UI supports 5 languages selectable from the sidebar:

| Code | Language |
|------|----------|
| `en` | English (default) |
| `th` | ภาษาไทย (Thai) |
| `zh` | 中文 (Simplified Chinese) |
| `ja` | 日本語 (Japanese) |
| `ko` | 한국어 (Korean) |

Selection is persisted in `localStorage`. To add a new language, edit `artifacts/smart-cloud/src/lib/i18n.tsx`.

---

## Project Structure

```
smart-cloud/
├── artifacts/
│   ├── api-server/          # Express 5 API server
│   │   └── src/
│   │       ├── routes/      # ai, auth, storage, files
│   │       └── hardware/    # disk-detector.ts (cross-platform)
│   └── smart-cloud/         # React + Vite frontend
│       └── src/
│           ├── lib/i18n.tsx # i18n context & translations
│           └── pages/       # dashboard, storage, files, ai, connections, settings, setup
├── lib/
│   └── db/                  # Drizzle ORM schema & client
└── packages/
    └── api-client-react/    # Generated React Query hooks
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/storage/disks` | List all detected disks |
| `GET` | `/api/storage/summary` | Aggregated storage stats |
| `GET` | `/api/files` | List files with optional search |
| `POST` | `/api/files/upload` | Upload a file |
| `POST` | `/api/ai/chat` | Send message to AI agent |
| `GET` | `/api/auth/connections` | List OAuth connection status |
| `POST` | `/api/auth/connections/:provider/toggle` | Connect/disconnect a provider |
| `GET` | `/api/settings` | Get user settings |
| `PATCH` | `/api/settings` | Update settings |

---

## Running as a System Service

### Linux (systemd)

```bash
sudo tee /etc/systemd/system/smartcloud.service << EOF
[Unit]
Description=Smart Cloud Storage API
After=network.target postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/smart-cloud
ExecStart=/usr/bin/node artifacts/api-server/dist/index.mjs
Restart=always
EnvironmentFile=$HOME/smart-cloud/.env

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now smartcloud
```

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

MIT — see [LICENSE](LICENSE) for details.
