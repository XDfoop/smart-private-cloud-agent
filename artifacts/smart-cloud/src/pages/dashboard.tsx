import { 
  useGetStorageSummary, 
  getGetStorageSummaryQueryKey,
  useGetRecentFiles,
  getGetRecentFilesQueryKey,
  useListDisks,
  getListDisksQueryKey
} from "@workspace/api-client-react";
import { formatBytes } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BrainCircuit, HardDrive, File as FileIcon, Clock } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function Dashboard() {
  const { t } = useTranslation();
  const { data: summary } = useGetStorageSummary({
    query: { queryKey: getGetStorageSummaryQueryKey() }
  });
  
  const { data: recentFiles } = useGetRecentFiles({ limit: 5 }, {
    query: { queryKey: getGetRecentFilesQueryKey({ limit: 5 }) }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.dashboard.title}</h1>
        <p className="text-muted-foreground mt-2">{t.dashboard.subtitle}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-card border-card-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.totalStorage}</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? formatBytes(summary.totalBytes) : "0 B"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t.dashboard.disksConnected(summary?.totalDisks || 0)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-card-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.usedSpace}</CardTitle>
            <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {summary ? formatBytes(summary.usedBytes) : "0 B"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t.dashboard.used((summary?.usagePercent ?? 0).toFixed(1))}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.aiSuggestions}</CardTitle>
            <BrainCircuit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{t.dashboard.active}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t.dashboard.autoOrg}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card border-card-border col-span-1">
          <CardHeader>
            <CardTitle>{t.dashboard.utilization}</CardTitle>
            <CardDescription>{t.dashboard.breakdown}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary?.diskBreakdown.map((disk) => (
              <div key={disk.diskId} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{disk.name}</span>
                  <span className="text-muted-foreground">
                    {formatBytes(disk.usedBytes)} / {formatBytes(disk.totalBytes)}
                  </span>
                </div>
                <Progress 
                  value={(disk.usedBytes / disk.totalBytes) * 100} 
                  className="h-2"
                />
              </div>
            ))}
            {(!summary?.diskBreakdown || summary.diskBreakdown.length === 0) && (
              <div className="text-sm text-muted-foreground">{t.dashboard.noDisks}</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border col-span-1">
          <CardHeader>
            <CardTitle>{t.dashboard.recentFiles}</CardTitle>
            <CardDescription>{t.dashboard.latestActivity}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentFiles?.files.map((file) => (
                <div key={file.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileIcon className="h-8 w-8 p-1.5 bg-muted rounded text-primary" />
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{file.category}</p>
                    </div>
                  </div>
                  <div className="text-xs text-right text-muted-foreground">
                    <p>{formatBytes(file.sizeBytes)}</p>
                    <p className="flex items-center gap-1 justify-end mt-0.5">
                      <Clock className="h-3 w-3" />
                      {new Date(file.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {(!recentFiles?.files || recentFiles.files.length === 0) && (
                <div className="text-sm text-muted-foreground">{t.dashboard.noFiles}</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  );
}
