import { useState } from "react";
import {
  useGetOAuthConnections,
  getGetOAuthConnectionsQueryKey,
  useGetCurrentUser,
  getGetCurrentUserQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, Check, Loader2, X, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

const PROVIDER_CONFIG: Record<string, {
  name: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  glowColor: string;
  icon: string;
}> = {
  discord: {
    name: "Discord",
    description: "Get storage alerts and chat with your AI agent via Discord bot",
    color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/25", glowColor: "shadow-indigo-500/20",
    icon: "D",
  },
  telegram: {
    name: "Telegram",
    description: "Receive notifications and control your cloud via Telegram bot",
    color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/25", glowColor: "shadow-sky-500/20",
    icon: "T",
  },
  line: {
    name: "LINE",
    description: "Get storage reports and file sharing via LINE messaging",
    color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/25", glowColor: "shadow-green-500/20",
    icon: "L",
  },
  facebook: {
    name: "Facebook",
    description: "Share files and media to Facebook directly from your cloud",
    color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/25", glowColor: "shadow-blue-500/20",
    icon: "F",
  },
  instagram: {
    name: "Instagram",
    description: "Auto-backup and publish photos to your Instagram account",
    color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/25", glowColor: "shadow-pink-500/20",
    icon: "I",
  },
  github: {
    name: "GitHub",
    description: "Sync repositories and auto-backup your code projects",
    color: "text-gray-300", bg: "bg-gray-500/10", border: "border-gray-500/25", glowColor: "shadow-gray-500/20",
    icon: "G",
  },
  google: {
    name: "Google",
    description: "Sync Google Drive, Docs, and Photos with your private cloud",
    color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25", glowColor: "shadow-red-500/20",
    icon: "G",
  },
};

type Connection = {
  id: string;
  provider: string;
  connected: boolean;
  username?: string | null;
  connectedAt?: string | null;
};

function ConnectionCard({ conn, onToggle }: { conn: Connection; onToggle: () => Promise<void> }) {
  const cfg = PROVIDER_CONFIG[conn.provider];
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  if (!cfg) return null;

  const handleToggle = async () => {
    setLoading(true);
    await onToggle();
    setLoading(false);
  };

  return (
    <Card className={`bg-card border overflow-hidden transition-all duration-200 ${cfg.border} ${conn.connected ? `shadow-md ${cfg.glowColor}` : ""}`}>
      {conn.connected && <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500 to-emerald-400" />}
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start gap-4">
          <div className={`h-12 w-12 rounded-xl ${cfg.bg} flex items-center justify-center font-black text-xl ${cfg.color} shrink-0 border ${cfg.border}`}>
            {cfg.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="font-semibold">{cfg.name}</p>
                {conn.connected && conn.username ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                    <span className="text-emerald-400 font-medium">{conn.username}</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">{cfg.description}</p>
                )}
              </div>
              <Button
                variant={conn.connected ? "outline" : "default"}
                size="sm"
                onClick={handleToggle}
                disabled={loading}
                className={`gap-2 shrink-0 ${conn.connected ? "border-destructive/40 text-destructive hover:bg-destructive/10" : ""}`}
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : conn.connected ? (
                  <><X className="h-3.5 w-3.5" /> {t.connections.disconnect}</>
                ) : (
                  <><Link2 className="h-3.5 w-3.5" /> {t.connections.connect}</>
                )}
              </Button>
            </div>
            {conn.connected && (
              <p className="text-xs text-muted-foreground/50 mt-2">{cfg.description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Connections() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { data: connectionsData, isLoading } = useGetOAuthConnections({ query: { queryKey: getGetOAuthConnectionsQueryKey() } });
  const { data: user } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey() } });

  const connections: Connection[] = (connectionsData?.connections ?? []) as Connection[];
  const connectedCount = connections.filter(c => c.connected).length;

  const handleToggle = async (provider: string) => {
    try {
      await fetch(`${BASE_URL}api/auth/connections/${provider}/toggle`, { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: getGetOAuthConnectionsQueryKey() });
      const conn = connections.find(c => c.provider === provider);
      const isNowConnected = !conn?.connected;
      const cfg = PROVIDER_CONFIG[provider];
      toast({
        title: isNowConnected ? `Connected to ${cfg?.name}` : `Disconnected from ${cfg?.name}`,
        description: isNowConnected ? `Your ${cfg?.name} account has been linked.` : `${cfg?.name} has been unlinked.`,
      });
    } catch {
      toast({ title: "Error", description: "Failed to update connection.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.connections.title}</h1>
        <p className="text-muted-foreground mt-1">{t.connections.subtitle}</p>
      </div>

      {user && (
        <Card className="bg-card border-card-border overflow-hidden">
          <div className="h-0.5 w-full bg-gradient-to-r from-cyan-500 to-cyan-600" />
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="h-14 w-14 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xl font-black text-primary shrink-0">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-lg">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 flex items-center gap-1.5">
                  <Shield className="h-3 w-3" />
                  Self-Hosted
                </Badge>
                <Badge variant="outline" className="border-primary/30 text-primary">
                  {t.connections.linked(connectedCount, Object.keys(PROVIDER_CONFIG).length)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Loading connections...</p>
        </div>
      ) : connections.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Link2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No connections available.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {Object.keys(PROVIDER_CONFIG).map(provider => {
            const conn = connections.find(c => c.provider === provider);
            const fallback: Connection = { id: provider, provider, connected: false, username: null };
            return (
              <ConnectionCard
                key={provider}
                conn={conn ?? fallback}
                onToggle={() => handleToggle(provider)}
              />
            );
          })}
        </div>
      )}

      <Card className="bg-card border-card-border border-dashed">
        <CardContent className="pt-4 pb-4 text-center text-muted-foreground text-sm">
          More integrations coming soon — Slack, Notion, Dropbox, S3, OneDrive, and more.
        </CardContent>
      </Card>
    </div>
  );
}
