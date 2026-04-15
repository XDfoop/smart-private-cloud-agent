import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export type DiskType = "ssd" | "hdd" | "nvme" | "m2" | "usb" | "nas" | "ramdisk" | "network" | "container" | "unknown";

export interface HardwareDisk {
  id: string;
  name: string;
  label: string | null;
  mountPoint: string;
  path: string;
  type: DiskType;
  fsType: string | null;
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usagePercent: number;
  isRemovable: boolean;
  isReadOnly: boolean;
  model: string | null;
  vendor: string | null;
  serial: string | null;
  interfaceType: string | null;
  isSystem: boolean;
  isVirtual: boolean;
}

export interface HardwareInfo {
  os: string;
  platform: NodeJS.Platform;
  hostname: string;
  disks: HardwareDisk[];
  detectedAt: string;
}

function guessTypeFromDev(dev: string, fsType: string | null): DiskType {
  if (fsType === "tmpfs" || fsType === "ramfs") return "ramdisk";
  if (fsType === "nfs" || fsType === "nfs4" || fsType === "cifs" || fsType === "smb") return "nas";
  if (dev.includes("nbd") || dev.includes("rbd")) return "network";
  if (dev.includes("nvme")) return "nvme";
  if (dev.includes("mmcblk")) return "usb";
  if (dev.includes("sd")) return "hdd";
  if (dev.includes("vd") || dev.includes("xvd")) return "unknown";
  if (fsType === "overlay" || fsType === "overlayfs") return "container";
  return "unknown";
}

const SKIP_FS = new Set(["proc", "sysfs", "devtmpfs", "devpts", "cgroup", "cgroup2", "pstore",
  "securityfs", "fusectl", "hugetlbfs", "mqueue", "debugfs", "tracefs", "bpf",
  "rpc_pipefs", "nfsd", "autofs", "binfmt_misc", "fuse.gvfsd-fuse", "squashfs",
  "nsfs", "efivarfs", "configfs"]);

const SKIP_MOUNTS_EXACT = new Set(["/proc", "/sys", "/dev", "/dev/pts", "/dev/shm",
  "/dev/hugepages", "/run", "/run/lock", "/run/user", "/boot/grub", "/boot/efi"]);

function shouldSkipMount(mount: string, fs: string | null): boolean {
  if (SKIP_FS.has(fs ?? "")) return true;
  if (SKIP_MOUNTS_EXACT.has(mount)) return true;
  if (mount.startsWith("/proc/") || mount.startsWith("/sys/") || mount.startsWith("/dev/") && mount !== "/dev/shm") return true;
  if (mount.startsWith("/run/") && !mount.startsWith("/run/media")) return true;
  if (mount.startsWith("/snap/")) return true;
  return false;
}

function isVirtualFs(fs: string | null, dev: string): boolean {
  if (!fs) return false;
  return ["tmpfs", "ramfs", "overlay", "overlayfs", "aufs"].includes(fs) || dev === "overlay";
}

function deviceFriendlyName(dev: string, model: string | null, fsType: string | null, mountPoint: string): string {
  if (model && model.trim()) return model.trim();
  if (fsType === "tmpfs" || fsType === "ramfs") return "RAM Disk";
  if (fsType === "overlay" || dev === "overlay") return "Container Storage";
  if (fsType === "nfs" || fsType === "nfs4") return "NFS Network Share";
  if (fsType === "cifs" || fsType === "smb") return "Windows Share";
  if (dev.startsWith("/dev/nbd")) return `Network Block Device (${dev.split("/").pop()})`;
  if (dev.startsWith("/dev/nvme")) return `NVMe SSD (${dev.split("/").pop()?.replace(/p\d+$/, "")})`;
  if (dev.startsWith("/dev/sd")) return `Storage Drive (${dev.split("/").pop()?.replace(/\d+$/, "")})`;
  if (dev.startsWith("/dev/mmcblk")) return `SD/eMMC (${dev.split("/").pop()?.replace(/p\d+$/, "")})`;
  if (dev.startsWith("/dev/vd")) return `Virtual Disk (${dev.split("/").pop()?.replace(/\d+$/, "")})`;
  if (dev === "tmpfs") return mountPoint === "/dev/shm" ? "Shared Memory" : `RAM Disk (${mountPoint})`;
  const name = dev.split("/").pop() ?? dev;
  return name === "overlay" ? `Layer (${mountPoint})` : name;
}

async function detectLinux(): Promise<HardwareDisk[]> {
  const disks: HardwareDisk[] = [];
  const seen = new Set<string>();

  let modelByDev: Record<string, { model: string | null; vendor: string | null; serial: string | null; rota: boolean | null; tran: string | null; removable: boolean; size: number }> = {};
  try {
    const { stdout } = await execAsync("lsblk -J -b -o NAME,SIZE,TYPE,FSTYPE,MODEL,VENDOR,HOTPLUG,SERIAL,TRAN,ROTA 2>/dev/null");
    const parsed = JSON.parse(stdout);
    const flatten = (devs: any[]) => {
      for (const d of devs) {
        const name = `/dev/${d.name}`;
        modelByDev[name] = {
          model: (d.model as string | null)?.trim() ?? null,
          vendor: (d.vendor as string | null)?.trim() ?? null,
          serial: d.serial as string | null,
          rota: d.rota === "1" ? true : d.rota === "0" ? false : null,
          tran: d.tran as string | null,
          removable: d.hotplug === "1" || d.hotplug === true,
          size: parseInt(d.size) || 0,
        };
        if (d.children) flatten(d.children);
      }
    };
    flatten(parsed.blockdevices ?? []);
  } catch {}

  try {
    const { stdout } = await execAsync("df -B1 --output=source,fstype,size,used,avail,target 2>/dev/null | tail -n +2");
    for (const line of stdout.trim().split("\n")) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 6) continue;
      const [source, fstype, sizeStr, usedStr, availStr, ...mountParts] = parts;
      const mountPoint = mountParts.join(" ");
      if (!mountPoint || shouldSkipMount(mountPoint, fstype)) continue;

      const total = parseInt(sizeStr) || 0;
      const used = parseInt(usedStr) || 0;
      const avail = parseInt(availStr) || 0;
      if (total === 0) continue;

      const key = `${source}:${mountPoint}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const lsblkInfo = modelByDev[source] ?? null;
      const isVirtual = isVirtualFs(fstype, source);
      const isRemovable = lsblkInfo?.removable ?? false;
      const tran = lsblkInfo?.tran ?? null;
      const rota = lsblkInfo?.rota ?? null;
      const model = lsblkInfo?.model ?? null;

      let diskType: DiskType;
      if (lsblkInfo) {
        if (tran === "nvme" || source.includes("nvme")) diskType = "nvme";
        else if (source.includes("mmcblk")) diskType = "usb";
        else if (isRemovable || tran === "usb") diskType = "usb";
        else if (rota === false) diskType = "ssd";
        else if (rota === true) diskType = "hdd";
        else diskType = guessTypeFromDev(source, fstype);
      } else {
        diskType = guessTypeFromDev(source, fstype);
      }

      const friendlyName = deviceFriendlyName(source, model, fstype, mountPoint);

      disks.push({
        id: `hw-${source.replace(/[^a-z0-9]/gi, "_")}-${mountPoint.replace(/[^a-z0-9]/gi, "_")}`,
        name: friendlyName,
        label: null,
        mountPoint,
        path: source,
        type: diskType,
        fsType: fstype ?? null,
        totalBytes: total,
        usedBytes: used,
        freeBytes: avail,
        usagePercent: total > 0 ? Math.round((used / total) * 1000) / 10 : 0,
        isRemovable,
        isReadOnly: false,
        model: model,
        vendor: lsblkInfo?.vendor ?? null,
        serial: lsblkInfo?.serial ?? null,
        interfaceType: tran ?? (source.includes("nbd") ? "NBD" : null),
        isSystem: mountPoint === "/",
        isVirtual,
      });
    }
  } catch {}

  const deduped: HardwareDisk[] = [];
  const seenPaths = new Map<string, number>();
  const PRIORITY_MOUNTS = ["/", "/home", "/data", "/media", "/mnt/data", "/storage"];

  for (const disk of disks) {
    const prevIdx = seenPaths.get(disk.path);
    if (prevIdx !== undefined) {
      const prev = deduped[prevIdx];
      const curPriority = PRIORITY_MOUNTS.indexOf(disk.mountPoint);
      const prevPriority = PRIORITY_MOUNTS.indexOf(prev.mountPoint);
      const curBetter = (curPriority !== -1 && (prevPriority === -1 || curPriority < prevPriority))
        || (!prev.isSystem && disk.isSystem)
        || (prev.isVirtual && !disk.isVirtual);
      if (curBetter) deduped[prevIdx] = disk;
      continue;
    }
    seenPaths.set(disk.path, deduped.length);
    deduped.push(disk);
  }

  deduped.sort((a, b) => {
    if (a.isSystem && !b.isSystem) return -1;
    if (!a.isSystem && b.isSystem) return 1;
    if (!a.isVirtual && b.isVirtual) return -1;
    if (a.isVirtual && !b.isVirtual) return 1;
    return b.totalBytes - a.totalBytes;
  });

  return deduped;
}

async function detectMacOS(): Promise<HardwareDisk[]> {
  const disks: HardwareDisk[] = [];
  try {
    const { stdout } = await execAsync("df -kl 2>/dev/null | tail -n +2");
    for (const line of stdout.trim().split("\n")) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 9) continue;
      const [filesystem, blocks, used, avail, , , , , ...mountParts] = parts;
      const mount = mountParts.join(" ");
      if (!mount || shouldSkipMount(mount, null)) continue;
      if (filesystem.includes("@")) continue;

      const total = parseInt(blocks) * 1024;
      const usedB = parseInt(used) * 1024;
      const freeB = parseInt(avail) * 1024;
      if (total === 0) continue;

      const isRemovable = !filesystem.startsWith("/dev/disk0") && !filesystem.startsWith("/dev/disk1");
      const diskType: DiskType = isRemovable ? "usb" : "ssd";
      const devName = filesystem.split("/").pop() ?? filesystem;

      disks.push({
        id: `hw-mac-${mount.replace(/[^a-z0-9]/gi, "_") || "root"}`,
        name: mount === "/" ? "Macintosh HD" : devName,
        label: null,
        mountPoint: mount,
        path: filesystem,
        type: diskType,
        fsType: "APFS",
        totalBytes: total,
        usedBytes: usedB,
        freeBytes: freeB,
        usagePercent: total > 0 ? Math.round((usedB / total) * 1000) / 10 : 0,
        isRemovable,
        isReadOnly: false,
        model: null,
        vendor: "Apple",
        serial: null,
        interfaceType: null,
        isSystem: mount === "/",
        isVirtual: false,
      });
    }
  } catch {}
  return disks;
}

async function detectWindows(): Promise<HardwareDisk[]> {
  const disks: HardwareDisk[] = [];
  try {
    const ps = `Get-PSDrive -PSProvider FileSystem | Where-Object {$_.Used -ne $null} | ForEach-Object { $label = $null; try { $label = (Get-Volume -DriveLetter $_.Name 2>$null).FileSystemLabel } catch {}; $fs = $null; try { $fs = (Get-Volume -DriveLetter $_.Name 2>$null).FileSystem } catch {}; @{Name=$_.Name; Used=$_.Used; Free=$_.Free; Label=$label; FS=$fs} } | ConvertTo-Json -Depth 2`;
    const { stdout } = await execAsync(`powershell -NoProfile -NonInteractive -Command "${ps}"`, { timeout: 20000 });
    const items = JSON.parse(stdout.trim());
    const arr = Array.isArray(items) ? items : [items];
    for (const item of arr) {
      if (!item || !item.Name) continue;
      const used = Number(item.Used) || 0;
      const free = Number(item.Free) || 0;
      const total = used + free;
      disks.push({
        id: `hw-win-${item.Name}`,
        name: item.Label || `Local Disk (${item.Name}:)`,
        label: item.Label || null,
        mountPoint: `${item.Name}:\\`,
        path: `${item.Name}:`,
        type: "unknown",
        fsType: item.FS || "NTFS",
        totalBytes: total,
        usedBytes: used,
        freeBytes: free,
        usagePercent: total > 0 ? Math.round((used / total) * 1000) / 10 : 0,
        isRemovable: false,
        isReadOnly: false,
        model: null,
        vendor: null,
        serial: null,
        interfaceType: null,
        isSystem: item.Name === "C",
        isVirtual: false,
      });
    }
  } catch {
    try {
      const { stdout } = await execAsync("wmic logicaldisk get Name,Size,FreeSpace,VolumeName,DriveType /format:csv 2>nul");
      for (const line of stdout.trim().split("\n").slice(2)) {
        const cols = line.trim().split(",");
        if (cols.length < 5) continue;
        const [, driveType, freeSpace, name, size, volumeName] = cols;
        if (!name || !size || driveType === "5") continue;
        const total = parseInt(size) || 0;
        const free = parseInt(freeSpace) || 0;
        const used = total - free;
        disks.push({
          id: `hw-win-${name.replace(":", "")}`,
          name: volumeName?.trim() || `Local Disk (${name})`,
          label: volumeName?.trim() || null,
          mountPoint: name,
          path: name,
          type: driveType === "2" ? "usb" : driveType === "4" ? "nas" : "unknown",
          fsType: "NTFS",
          totalBytes: total,
          usedBytes: used,
          freeBytes: free,
          usagePercent: total > 0 ? Math.round((used / total) * 1000) / 10 : 0,
          isRemovable: driveType === "2",
          isReadOnly: false,
          model: null,
          vendor: null,
          serial: null,
          interfaceType: null,
          isSystem: name === "C:",
          isVirtual: false,
        });
      }
    } catch {}
  }
  return disks;
}

export async function detectHardwareDisks(): Promise<HardwareInfo> {
  const platform = process.platform;
  const os = platform === "linux" ? "Linux" : platform === "darwin" ? "macOS" : platform === "win32" ? "Windows" : String(platform);

  let hostname = "localhost";
  try {
    const { stdout } = await execAsync("hostname");
    hostname = stdout.trim();
  } catch {}

  let disks: HardwareDisk[] = [];
  try {
    if (platform === "linux") disks = await detectLinux();
    else if (platform === "darwin") disks = await detectMacOS();
    else if (platform === "win32") disks = await detectWindows();
  } catch {}

  return { os, platform, hostname, disks, detectedAt: new Date().toISOString() };
}
