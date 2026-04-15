import { useState, useEffect } from "react";
import {
  useListDisks,
  getListDisksQueryKey,
  useGetStorageSummary,
  getGetStorageSummaryQueryKey,
  useAddDisk,
  useUpdateDisk,
  useRemoveDisk,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatBytes } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Shield, Zap, Cpu, Server, Usb, Wifi, Database, RefreshCw, Monitor, HardDrive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

function DiskTypeIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case "ssd": return <Zap className={className} />;
    case "m2": return <Cpu className={className} />;
    case "nvme": return <Cpu className={className} />;
    case "hdd": return <Server className={className} />;
    case "usb": return <Usb className={className} />;
    case "nas": return <Wifi className={className} />;
    default: return <Database className={className} />;
  }
}

const DISK_TYPE_COLORS: Record<string, { from: string; to: string; border: string; text: string; badge: string }> = {
  ssd:     { from: "from-cyan-500",    to: "to-cyan-700",     border: "border-cyan-500/30",    text: "text-cyan-400",    badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  m2:      { from: "from-violet-500",  to: "to-violet-700",   border: "border-violet-500/30",  text: "text-violet-400",  badge: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  nvme:    { from: "from-fuchsia-500", to: "to-fuchsia-700",  border: "border-fuchsia-500/30", text: "text-fuchsia-400", badge: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30" },
  hdd:     { from: "from-amber-500",   to: "to-amber-700",    border: "border-amber-500/30",   text: "text-amber-400",   badge: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  usb:     { from: "from-emerald-500", to: "to-emerald-700",  border: "border-emerald-500/30", text: "text-emerald-400", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  nas:     { from: "from-sky-500",     to: "to-sky-700",      border: "border-sky-500/30",     text: "text-sky-400",     badge: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  unknown: { from: "from-slate-500",   to: "to-slate-700",    border: "border-slate-500/30",   text: "text-slate-400",   badge: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
};

function getColors(type: string) {
  return DISK_TYPE_COLORS[type] ?? DISK_TYPE_COLORS["unknown"];
}

function UsageRing({ percent, size = 80, type = "unknown" }: { percent: number; size?: number; type?: string }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const used = circ * Math.min(percent, 100) / 100;
  const strokeColor = percent > 90 ? "#ef4444" : percent > 70 ? "#f59e0b"
    : type === "ssd" ? "#06b6d4" : type === "nvme" ? "#d946ef" : type === "m2" ? "#8b5cf6"
    : type === "usb" ? "#10b981" : type === "nas" ? "#0ea5e9" : type === "hdd" ? "#f59e0b" : "#64748b";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={10} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={strokeColor} strokeWidth={10}
        strokeDasharray={`${used} ${circ - used}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }} />
    </svg>
  );
}

type HardwareDisk = {
  id: string; name: string; label: string | null; mountPoint: string; path: string;
  type: string; fsType: string | null; totalBytes: number; usedBytes: number; freeBytes: number;
  usagePercent: number; isRemovable: boolean; isReadOnly: boolean; model: string | null;
  vendor: string | null; serial: string | null; interfaceType: string | null; isSystem: boolean; isVirtual: boolean;
};

type HardwareInfo = {
  os: string; platform: string; hostname: string; disks: HardwareDisk[]; detectedAt: string;
};

function HardwareDiskCard({ disk }: { disk: HardwareDisk }) {
  const pct = disk.usagePercent;
  const colors = getColors(disk.type);

  return (
    <Card className={`bg-card border overflow-hidden ${colors.border}`}>
      <div className={`h-0.5 w-full bg-gradient-to-r ${colors.from} ${colors.to}`} />
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <UsageRing percent={pct} size={72} type={disk.type} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold">{pct.toFixed(0)}%</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{disk.name}</p>
                {disk.label && disk.label !== disk.name && (
                  <p className="text-xs text-muted-foreground truncate">{disk.label}</p>
                )}
                <p className="text-xs text-muted-foreground/50 font-mono truncate">{disk.mountPoint}</p>
              </div>
              <div className="flex gap-1.5 flex-wrap shrink-0">
                <Badge variant="outline" className={`text-xs px-1.5 py-0 ${colors.badge}`}>
                  <DiskTypeIcon type={disk.type} className="h-3 w-3 mr-1" />
                  {disk.type.toUpperCase()}
                </Badge>
                {disk.fsType && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">
                    {disk.fsType}
                  </Badge>
                )}
                {disk.isSystem && (
                  <Badge className="text-xs px-1.5 py-0 bg-primary/15 text-primary border-primary/30">System</Badge>
                )}
                {disk.isRemovable && (
                  <Badge className="text-xs px-1.5 py-0 bg-orange-500/15 text-orange-400 border-orange-500/30">Removable</Badge>
                )}
              </div>
            </div>

            <div className="mt-2.5">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{formatBytes(disk.usedBytes)} used</span>
                <span>{formatBytes(disk.freeBytes)} free</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${pct > 90 ? "from-red-500 to-red-600" : pct > 70 ? "from-amber-500 to-amber-600" : `${colors.from} ${colors.to}`}`}
                  style={{ width: `${Math.min(pct, 100)}%`, transition: "width 0.6s ease" }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground/40 mt-1">
                <span>Total: {formatBytes(disk.totalBytes)}</span>
                {disk.interfaceType && <span>via {disk.interfaceType.toUpperCase()}</span>}
                {disk.model && <span className="truncate max-w-[120px]">{disk.model}</span>}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ManagedDiskCard({ disk, onToggleBackup, onRemove }: {
  disk: { id: string; name: string; type: string; path: string; mountPoint?: string | null; label?: string | null; totalBytes: number; usedBytes: number; freeBytes: number; isActive: boolean; isBackup: boolean };
  onToggleBackup: () => void;
  onRemove: () => void;
}) {
  const pct = disk.totalBytes > 0 ? (disk.usedBytes / disk.totalBytes) * 100 : 0;
  const colors = getColors(disk.type);
  const [confirmRemove, setConfirmRemove] = useState(false);

  return (
    <Card className={`bg-card border overflow-hidden ${colors.border}`}>
      <div className={`h-0.5 w-full bg-gradient-to-r ${colors.from} ${colors.to}`} />
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <UsageRing percent={pct} size={72} type={disk.type} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold">{pct.toFixed(0)}%</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{disk.name}</p>
                {disk.label && <p className="text-xs text-muted-foreground truncate">{disk.label}</p>}
                <p className="text-xs text-muted-foreground/50 font-mono truncate">{disk.mountPoint ?? disk.path}</p>
              </div>
              <Badge variant="outline" className={`text-xs px-1.5 py-0 shrink-0 ${colors.badge}`}>
                <DiskTypeIcon type={disk.type} className="h-3 w-3 mr-1" />
                {disk.type.toUpperCase()}
              </Badge>
            </div>

            <div className="mt-2.5">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{formatBytes(disk.usedBytes)} used</span>
                <span>{formatBytes(disk.freeBytes)} free</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${pct > 90 ? "from-red-500 to-red-600" : pct > 70 ? "from-amber-500 to-amber-600" : `${colors.from} ${colors.to}`}`}
                  style={{ width: `${pct}%`, transition: "width 0.6s ease" }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground/40 mt-1">Total: {formatBytes(disk.totalBytes)}</p>
            </div>

            <div className="flex items-center gap-2 mt-2">
              {disk.isActive && <Badge className="text-xs px-1.5 py-0 bg-emerald-500/15 text-emerald-400 border-emerald-500/30"><Zap className="h-2.5 w-2.5 mr-1" />Active</Badge>}
              {disk.isBackup && <Badge className="text-xs px-1.5 py-0 bg-amber-500/15 text-amber-400 border-amber-500/30"><Shield className="h-2.5 w-2.5 mr-1" />Backup</Badge>}
              <div className="ml-auto flex gap-1.5">
                <Button variant="ghost" size="sm" onClick={onToggleBackup} className="h-6 text-xs text-muted-foreground hover:text-foreground px-2">
                  {disk.isBackup ? "Unset backup" : "Set as backup"}
                </Button>
                {confirmRemove ? (
                  <div className="flex gap-1">
                    <Button variant="destructive" size="sm" className="h-6 text-xs px-2" onClick={onRemove}>Confirm</Button>
                    <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setConfirmRemove(false)}>Cancel</Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(true)} className="h-6 text-xs text-destructive hover:text-destructive px-2">Remove</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Storage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: disksData, isLoading } = useListDisks({ query: { queryKey: getListDisksQueryKey() } });
  const { data: summary } = useGetStorageSummary({ query: { queryKey: getGetStorageSummaryQueryKey() } });
  const addDisk = useAddDisk();
  const updateDisk = useUpdateDisk();
  const removeDisk = useRemoveDisk();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "ssd", path: "/dev/sda", label: "", isBackup: false });
  const [hwInfo, setHwInfo] = useState<HardwareInfo | null>(null);
  const [hwLoading, setHwLoading] = useState(true);
  const [hwRefreshing, setHwRefreshing] = useState(false);

  const loadHardware = async (force = false) => {
    if (force) setHwRefreshing(true);
    else setHwLoading(true);
    try {
      const r = await fetch(`${BASE_URL}api/storage/hardware`);
      if (r.ok) setHwInfo(await r.json());
    } catch {}
    setHwLoading(false);
    setHwRefreshing(false);
  };

  useEffect(() => { loadHardware(); }, []);

  const totalUsed = summary?.usedBytes ?? 0;
  const totalSpace = summary?.totalBytes ?? 1;
  const overallPct = (totalUsed / totalSpace) * 100;

  const handleAdd = async () => {
    try {
      await addDisk.mutateAsync({ data: form });
      queryClient.invalidateQueries({ queryKey: getListDisksQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetStorageSummaryQueryKey() });
      setOpen(false);
      setForm({ name: "", type: "ssd", path: "/dev/sda", label: "", isBackup: false });
      toast({ title: "Disk added", description: `${form.name} has been added to your storage pool.` });
    } catch {
      toast({ title: "Error", description: "Failed to add disk.", variant: "destructive" });
    }
  };

  const OS_ICON: Record<string, string> = { Linux: "linux", macOS: "macos", Windows: "windows" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Storage</h1>
          <p className="text-muted-foreground mt-1">Physical hardware &amp; managed storage pools.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Add Pool</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Storage Pool</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input placeholder="e.g. Main SSD" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[["ssd","SSD"], ["m2","M.2"], ["nvme","NVMe"], ["hdd","HDD"], ["usb","USB"], ["nas","NAS"]].map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Device Path</Label>
                  <Input placeholder="/dev/sda" value={form.path} onChange={e => setForm(f => ({ ...f, path: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Label (optional)</Label>
                  <Input placeholder="My Backup Drive" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Use as Backup Disk</Label>
                  <Switch checked={form.isBackup} onCheckedChange={v => setForm(f => ({ ...f, isBackup: v }))} />
                </div>
                <Button className="w-full" onClick={handleAdd} disabled={!form.name || addDisk.isPending}>
                  {addDisk.isPending ? "Adding..." : "Add Pool"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {hwInfo && (
        <Card className="bg-card border-card-border overflow-hidden">
          <div className="h-0.5 w-full bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-500" />
          <CardHeader className="pb-3 pt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Monitor className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{hwInfo.hostname}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {hwInfo.os} &mdash; {hwInfo.disks.length} physical volume{hwInfo.disks.length !== 1 ? "s" : ""} detected
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">{hwInfo.os}</Badge>
                <Button variant="ghost" size="sm" onClick={() => loadHardware(true)} disabled={hwRefreshing} className="h-7 gap-1.5 text-xs text-muted-foreground">
                  <RefreshCw className={`h-3.5 w-3.5 ${hwRefreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            {hwInfo.disks.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <HardDrive className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p>No accessible volumes detected.</p>
                <p className="text-xs mt-1 opacity-60">The server may not have permission to read disk info, or you may be on an unsupported platform.</p>
              </div>
            ) : (() => {
              const physicalDisks = hwInfo.disks.filter(d => !d.isVirtual);
              const virtualDisks = hwInfo.disks.filter(d => d.isVirtual);
              const allDisks = [...physicalDisks, ...virtualDisks];
              const totalBytes = allDisks.reduce((s, d) => s + d.totalBytes, 0);
              return (
                <>
                  {allDisks.length > 1 && (
                    <>
                      <div className="flex h-5 w-full rounded-full overflow-hidden gap-0.5 mb-2">
                        {allDisks.map(disk => {
                          const w = totalBytes > 0 ? (disk.totalBytes / totalBytes) * 100 : 100 / allDisks.length;
                          const colors = getColors(disk.type);
                          return (
                            <div key={disk.id} className={`bg-gradient-to-r ${colors.from} ${colors.to} ${disk.isVirtual ? "opacity-40" : ""} flex items-center justify-center text-[8px] font-bold text-white/70`}
                              style={{ width: `${w}%` }} title={`${disk.name}: ${formatBytes(disk.totalBytes)}`}>
                              {w > 10 ? disk.mountPoint : ""}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
                        {allDisks.map(disk => {
                          const colors = getColors(disk.type);
                          return (
                            <div key={disk.id} className={`flex items-center gap-1.5 text-xs ${disk.isVirtual ? "text-muted-foreground/40" : "text-muted-foreground"}`}>
                              <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${colors.from} ${colors.to} ${disk.isVirtual ? "opacity-40" : ""}`} />
                              <span>{disk.mountPoint}</span>
                              <span className="opacity-50">{formatBytes(disk.totalBytes)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {physicalDisks.length > 0 && (
                    <>
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <HardDrive className="h-3 w-3" /> PHYSICAL &amp; NETWORK STORAGE
                      </p>
                      <div className="grid gap-3 md:grid-cols-2 mb-4">
                        {physicalDisks.map(disk => <HardwareDiskCard key={disk.id} disk={disk} />)}
                      </div>
                    </>
                  )}

                  {virtualDisks.length > 0 && (
                    <details className="group">
                      <summary className="text-xs font-medium text-muted-foreground/50 cursor-pointer flex items-center gap-2 hover:text-muted-foreground transition-colors list-none">
                        <Database className="h-3 w-3" />
                        <span>VIRTUAL &amp; CONTAINER VOLUMES ({virtualDisks.length})</span>
                        <span className="ml-auto text-muted-foreground/30 group-open:rotate-180 transition-transform">▾</span>
                      </summary>
                      <div className="grid gap-3 md:grid-cols-2 mt-2">
                        {virtualDisks.map(disk => <HardwareDiskCard key={disk.id} disk={disk} />)}
                      </div>
                    </details>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {hwLoading && !hwInfo && (
        <Card className="bg-card border-card-border">
          <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
            <div className="animate-spin h-7 w-7 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm">Scanning hardware disks...</p>
          </CardContent>
        </Card>
      )}

      {summary && (
        <Card className="bg-card border-card-border overflow-hidden">
          <div className="h-0.5 w-full bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500" />
          <CardHeader className="pb-3 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Managed Storage Pools</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Manually configured storage pools tracked by Smart Cloud</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <UsageRing percent={overallPct} size={52} type="ssd" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-bold">{overallPct.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatBytes(summary.freeBytes)} free</p>
                  <p className="text-xs text-muted-foreground">of {formatBytes(summary.totalBytes)}</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            {disksData?.disks && disksData.disks.length > 0 && (
              <>
                <div className="flex h-4 w-full rounded-full overflow-hidden gap-0.5 mb-2">
                  {disksData.disks.map(disk => {
                    const w = summary.totalBytes > 0 ? (disk.totalBytes / summary.totalBytes) * 100 : 100 / disksData.disks.length;
                    const colors = getColors(disk.type);
                    return (
                      <div key={disk.id} className={`bg-gradient-to-r ${colors.from} ${colors.to}`}
                        style={{ width: `${w}%` }} title={`${disk.name}: ${formatBytes(disk.totalBytes)}`} />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
                  {disksData.disks.map(disk => {
                    const colors = getColors(disk.type);
                    return (
                      <div key={disk.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${colors.from} ${colors.to}`} />
                        {disk.name}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              {isLoading && (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  <div className="animate-spin h-7 w-7 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                  Loading...
                </div>
              )}
              {disksData?.disks.map(disk => (
                <ManagedDiskCard
                  key={disk.id}
                  disk={disk}
                  onToggleBackup={async () => {
                    await updateDisk.mutateAsync({ diskId: disk.id, data: { isBackup: !disk.isBackup } });
                    queryClient.invalidateQueries({ queryKey: getListDisksQueryKey() });
                  }}
                  onRemove={async () => {
                    await removeDisk.mutateAsync({ diskId: disk.id });
                    queryClient.invalidateQueries({ queryKey: getListDisksQueryKey() });
                    queryClient.invalidateQueries({ queryKey: getGetStorageSummaryQueryKey() });
                    toast({ title: "Disk removed" });
                  }}
                />
              ))}
              {!isLoading && !disksData?.disks.length && (
                <div className="col-span-2 text-center py-10 text-muted-foreground">
                  <Server className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No storage pools added yet.</p>
                  <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => setOpen(true)}>
                    <Plus className="h-3.5 w-3.5" /> Add Pool
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
