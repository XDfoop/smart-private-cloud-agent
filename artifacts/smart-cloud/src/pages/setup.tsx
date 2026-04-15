import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Monitor, Server, Terminal, CheckCircle2, Copy, ChevronDown, ChevronRight,
  Wifi, Database, HardDrive, Cpu, Package, BookOpen
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  const { toast } = useToast();
  const copy = () => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied to clipboard" });
  };
  return (
    <div className="relative group my-2">
      <pre className="bg-black/40 border border-white/5 rounded-lg p-4 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed">
        <code>{code}</code>
      </pre>
      <Button
        size="sm"
        variant="ghost"
        onClick={copy}
        className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 flex flex-col items-center">
        <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-sm font-bold text-primary">
          {num}
        </div>
        <div className="w-px flex-1 bg-border mt-2 min-h-[8px]" />
      </div>
      <div className="pb-6 flex-1 min-w-0">
        <p className="font-semibold text-sm mb-2">{title}</p>
        <div className="text-sm text-muted-foreground space-y-2">{children}</div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, badge, children, defaultOpen = true }: {
  icon: React.ElementType; title: string; badge?: string;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="bg-card border-card-border overflow-hidden">
      <button
        className="w-full text-left"
        onClick={() => setOpen(o => !o)}
      >
        <CardHeader className="pb-3 pt-4 flex flex-row items-center gap-3 hover:bg-white/[0.02] transition-colors">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base flex-1 text-left">{title}</CardTitle>
          {badge && <Badge variant="outline" className="text-xs">{badge}</Badge>}
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        </CardHeader>
      </button>
      {open && <CardContent className="pt-0 pb-5">{children}</CardContent>}
    </Card>
  );
}

function OSTabs({ tabs }: { tabs: { label: string; badge?: string; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="flex gap-1 mb-4 border-b border-border pb-1">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActive(i)}
            className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
              active === i ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.badge && <Badge className="ml-1.5 text-[10px] py-0 px-1 h-4 bg-primary/15 text-primary border-primary/30">{tab.badge}</Badge>}
          </button>
        ))}
      </div>
      <div>{tabs[active].content}</div>
    </div>
  );
}

export default function Setup() {
  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Setup Guide</h1>
        <p className="text-muted-foreground mt-1">ติดตั้ง Smart Cloud บนเครื่องของคุณเองเพื่อดู hardware disk จริง</p>
      </div>

      <Card className="bg-primary/5 border-primary/30 overflow-hidden">
        <div className="h-0.5 w-full bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500" />
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="text-foreground font-semibold mb-1">ทำไม hardware ต้องรันบนเครื่องเอง?</p>
              <p>Smart Cloud เป็น <span className="text-primary font-medium">self-hosted app</span> — API server ต้องรันบนเครื่องที่มี disk จริง (PC, NAS, Raspberry Pi) ถึงจะอ่าน HDD/SSD ของคุณได้ ตอนนี้ server รันบน Replit cloud เลยเห็นแค่ virtual disk ของ cloud</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Section icon={Package} title="Prerequisites" defaultOpen>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: Cpu, name: "Node.js 20+", desc: "nodejs.org/en/download", color: "text-emerald-400" },
            { icon: Package, name: "pnpm", desc: "npm install -g pnpm", color: "text-amber-400" },
            { icon: Database, name: "PostgreSQL 15+", desc: "postgresql.org/download", color: "text-sky-400" },
          ].map(item => (
            <div key={item.name} className="flex items-start gap-2 p-3 bg-white/[0.03] rounded-lg border border-white/5">
              <item.icon className={`h-4 w-4 mt-0.5 shrink-0 ${item.color}`} />
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Terminal} title="Installation" defaultOpen>
        <OSTabs tabs={[
          {
            label: "Linux",
            badge: "แนะนำ",
            content: (
              <div>
                <Step num={1} title="ติดตั้ง Node.js 20+">
                  <CodeBlock code={`# Ubuntu / Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Arch Linux
sudo pacman -S nodejs npm

# ตรวจสอบ version
node --version  # v20.x.x`} />
                </Step>
                <Step num={2} title="ติดตั้ง pnpm และ PostgreSQL">
                  <CodeBlock code={`npm install -g pnpm

# PostgreSQL (Ubuntu/Debian)
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# สร้าง database
sudo -u postgres psql -c "CREATE DATABASE smartcloud;"
sudo -u postgres psql -c "CREATE USER smartcloud WITH PASSWORD 'yourpassword';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE smartcloud TO smartcloud;"`} />
                </Step>
                <Step num={3} title="โหลดและติดตั้งแอป">
                  <CodeBlock code={`# Clone จาก Replit หรือ export project
git clone <your-repo-url> smart-cloud
cd smart-cloud

# ติดตั้ง dependencies
pnpm install`} />
                </Step>
                <Step num={4} title="ตั้งค่า Environment Variables">
                  <CodeBlock code={`# สร้างไฟล์ .env ที่ root
cat > .env << EOF
DATABASE_URL=postgresql://smartcloud:yourpassword@localhost:5432/smartcloud
SESSION_SECRET=$(openssl rand -hex 32)
NODE_ENV=production
EOF`} />
                </Step>
                <Step num={5} title="Build และ Run">
                  <CodeBlock code={`# Push database schema
pnpm --filter @workspace/db run push

# Build และ start API server
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start
# API พร้อมที่ http://localhost:8080

# เปิด frontend อีก terminal
pnpm --filter @workspace/smart-cloud run build
pnpm --filter @workspace/smart-cloud run preview
# เปิด browser ที่ http://localhost:4173`} />
                </Step>
                <Step num={6} title="(ตัวเลือก) รันเป็น systemd service">
                  <CodeBlock code={`# สร้าง service file
sudo tee /etc/systemd/system/smartcloud.service << EOF
[Unit]
Description=Smart Cloud Storage API
After=network.target postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=/home/$USER/smart-cloud
ExecStart=/usr/bin/node artifacts/api-server/dist/index.mjs
Restart=always
EnvironmentFile=/home/$USER/smart-cloud/.env

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable smartcloud
sudo systemctl start smartcloud`} />
                </Step>
              </div>
            ),
          },
          {
            label: "macOS",
            content: (
              <div>
                <Step num={1} title="ติดตั้ง Homebrew, Node.js, PostgreSQL">
                  <CodeBlock code={`# ติดตั้ง Homebrew (ถ้ายังไม่มี)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# ติดตั้ง Node.js และ PostgreSQL
brew install node@20 pnpm postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# สร้าง database
createdb smartcloud`} />
                </Step>
                <Step num={2} title="ติดตั้งแอป">
                  <CodeBlock code={`git clone <your-repo-url> smart-cloud
cd smart-cloud
pnpm install

# ตั้งค่า .env
cat > .env << EOF
DATABASE_URL=postgresql://$(whoami)@localhost:5432/smartcloud
SESSION_SECRET=$(openssl rand -hex 32)
NODE_ENV=production
EOF`} />
                </Step>
                <Step num={3} title="Build และ Run">
                  <CodeBlock code={`pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start &
pnpm --filter @workspace/smart-cloud run preview`} />
                </Step>
              </div>
            ),
          },
          {
            label: "Windows",
            content: (
              <div>
                <Step num={1} title="ติดตั้ง Node.js และ pnpm">
                  <p>ดาวน์โหลด Node.js 20+ จาก <span className="text-primary font-mono">nodejs.org</span> แล้วรัน installer</p>
                  <CodeBlock code={`# ใน PowerShell (Admin)
npm install -g pnpm`} />
                </Step>
                <Step num={2} title="ติดตั้ง PostgreSQL">
                  <p>ดาวน์โหลดจาก <span className="text-primary font-mono">postgresql.org/download/windows</span> รัน installer, จด password ที่ตั้งไว้</p>
                  <CodeBlock code={`# ใน psql หรือ pgAdmin
CREATE DATABASE smartcloud;
CREATE USER smartcloud WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE smartcloud TO smartcloud;`} />
                </Step>
                <Step num={3} title="ติดตั้งและ Run แอป">
                  <CodeBlock code={`git clone <your-repo-url> smart-cloud
cd smart-cloud
pnpm install

# สร้าง .env
echo DATABASE_URL=postgresql://smartcloud:yourpassword@localhost:5432/smartcloud > .env
echo SESSION_SECRET=your-random-secret >> .env
echo NODE_ENV=production >> .env

# Push DB schema และ start
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run build
node artifacts\api-server\dist\index.mjs`} />
                </Step>
              </div>
            ),
          },
        ]} />
      </Section>

      <Section icon={Server} title="NAS Setup" badge="Synology / QNAP / TrueNAS" defaultOpen={false}>
        <OSTabs tabs={[
          {
            label: "Synology DSM",
            content: (
              <div className="space-y-4">
                <Step num={1} title="ติดตั้ง Node.js Package">
                  <p>เปิด <span className="text-primary">Package Center</span> ค้นหา "Node.js" แล้ว Install</p>
                  <p>หรือใช้ <span className="text-primary">Docker</span> (แนะนำ — ดู Docker tab)</p>
                </Step>
                <Step num={2} title="ติดตั้ง PostgreSQL via Docker">
                  <CodeBlock code={`# ใน Synology SSH (Control Panel > Terminal > Enable SSH)
docker pull postgres:15
docker run -d --name smartcloud-db \\
  -e POSTGRES_DB=smartcloud \\
  -e POSTGRES_PASSWORD=yourpassword \\
  -p 5432:5432 \\
  -v /volume1/docker/postgres:/var/lib/postgresql/data \\
  postgres:15`} />
                </Step>
                <Step num={3} title="รัน Smart Cloud">
                  <CodeBlock code={`# SSH เข้า Synology
cd /volume1/homes/admin
git clone <your-repo-url> smart-cloud
cd smart-cloud

# ติดตั้ง pnpm
npm install -g pnpm
pnpm install

# ตั้งค่า .env
echo "DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/smartcloud" > .env
echo "SESSION_SECRET=$(openssl rand -hex 32)" >> .env

# Build และ Start
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run build
node artifacts/api-server/dist/index.mjs &`} />
                </Step>
                <Step num={4} title="ตั้ง Auto-Start ด้วย Task Scheduler">
                  <p>เปิด <span className="text-primary">Control Panel {">"} Task Scheduler {">"} Create {">"} Triggered Task {">"} User-defined script</span></p>
                  <CodeBlock code={`# ใส่ใน Run command:
cd /volume1/homes/admin/smart-cloud && node artifacts/api-server/dist/index.mjs`} />
                </Step>
              </div>
            ),
          },
          {
            label: "Docker",
            badge: "ทุก NAS",
            content: (
              <div>
                <Step num={1} title="สร้าง docker-compose.yml">
                  <CodeBlock lang="yaml" code={`version: '3.8'
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
    volumes:
      - /:/host:ro   # mount host filesystem (read-only)
    privileged: false
    restart: unless-stopped

volumes:
  postgres_data:`} />
                </Step>
                <Step num={2} title="Build และ Start">
                  <CodeBlock code={`docker compose up -d
# เปิด http://your-nas-ip:8080`} />
                </Step>
              </div>
            ),
          },
          {
            label: "TrueNAS",
            content: (
              <div>
                <Step num={1} title="ใช้ Apps (TrueNAS SCALE)">
                  <p>TrueNAS SCALE รองรับ Kubernetes apps — ใช้ Custom App หรือ Docker Compose ผ่าน Shell</p>
                  <CodeBlock code={`# เปิด Shell จาก TrueNAS web UI
# แล้วทำขั้นตอนเดียวกับ Docker tab ด้านบน`} />
                </Step>
                <Step num={2} title="Mount ZFS pool ให้ app อ่านได้">
                  <CodeBlock code={`# ZFS pools อยู่ที่ /mnt/
ls /mnt/
# จะเห็น: tank, data, backup ฯลฯ

# Smart Cloud API server จะอ่านได้อัตโนมัติจาก df/lsblk`} />
                </Step>
              </div>
            ),
          },
        ]} />
      </Section>

      <Section icon={Wifi} title="เข้าถึงจากระยะไกล" defaultOpen={false}>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                title: "Local Network (LAN)",
                desc: "เข้าถึงได้ทันทีจากทุกเครื่องใน network เดียวกัน",
                code: "http://192.168.1.x:8080",
                badge: "ง่ายที่สุด",
                badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
              },
              {
                title: "Tailscale VPN",
                desc: "เข้าถึง NAS จากนอกบ้านได้ปลอดภัย ไม่ต้อง port forward",
                code: "tailscale.com — ฟรีสำหรับ personal use",
                badge: "แนะนำ",
                badgeColor: "bg-primary/15 text-primary border-primary/30",
              },
              {
                title: "Cloudflare Tunnel",
                desc: "ให้ domain จาก Cloudflare ชี้มาที่ local server ของคุณ",
                code: "cloudflared tunnel --url http://localhost:8080",
                badge: "ฟรี",
                badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
              },
              {
                title: "Reverse Proxy (Nginx)",
                desc: "ใช้ Nginx หน้า API server สำหรับ production",
                code: "proxy_pass http://localhost:8080",
                badge: "Advanced",
                badgeColor: "bg-violet-500/15 text-violet-400 border-violet-500/30",
              },
            ].map(item => (
              <div key={item.title} className="p-4 bg-white/[0.02] rounded-lg border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{item.title}</p>
                  <Badge className={`text-xs px-1.5 py-0 ${item.badgeColor}`}>{item.badge}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
                <code className="text-xs text-emerald-400 font-mono">{item.code}</code>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section icon={HardDrive} title="หลังติดตั้ง — สิ่งที่คุณจะเห็น" defaultOpen={false}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">เมื่อ Smart Cloud รันบนเครื่องของคุณ หน้า Storage จะแสดง:</p>
          <div className="grid gap-2">
            {[
              { os: "Linux", example: "/dev/sda1 — Samsung SSD 980 Pro 1TB · ext4 · 45% used\n/dev/sdb1 — WD Red 4TB · btrfs · /media/data\n/dev/sdc1 — Seagate 2TB · ntfs · /mnt/backup" },
              { os: "macOS", example: "Macintosh HD — APFS · 512GB · 67% used\nExternal SSD — ExFAT · 1TB · /Volumes/Data" },
              { os: "Windows", example: "C:\\ — Local Disk (OS) · NTFS · 476 GB · 71% used\nD:\\ — Data Drive · NTFS · 2 TB · 34% used\nE:\\ — WD My Passport · exFAT · 1 TB · Removable" },
            ].map(item => (
              <div key={item.os} className="p-3 bg-black/30 rounded-lg border border-white/5">
                <Badge variant="outline" className="text-xs mb-2">{item.os}</Badge>
                <pre className="text-xs font-mono text-emerald-300/80 whitespace-pre leading-relaxed">{item.example}</pre>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20 mt-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-400">พอรันบนเครื่องเอง หน้า Storage จะ refresh อัตโนมัติและแสดง disk hardware จริงของคุณ รวมถึง model, serial number, interface type (SATA/NVMe/USB)</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
