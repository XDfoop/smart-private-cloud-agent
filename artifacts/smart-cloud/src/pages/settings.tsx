import {
  useGetSettings,
  getGetSettingsQueryKey,
  useUpdateSettings,
  useListAvailableModels,
  getListAvailableModelsQueryKey,
  useListDisks,
  getListDisksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, BrainCircuit, HardDrive, Globe, Cpu, Eye, Mic } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation, LANGUAGES, type Lang } from "@/lib/i18n";

const MODEL_TYPE_ICONS: Record<string, React.ElementType> = {
  llm: Cpu, vision: Eye, voice: Mic, multimodal: BrainCircuit,
};

export default function Settings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t, lang, setLang } = useTranslation();

  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const { data: modelsData } = useListAvailableModels({ query: { queryKey: getListAvailableModelsQueryKey() } });
  const { data: disksData } = useListDisks({ query: { queryKey: getListDisksQueryKey() } });
  const updateSettings = useUpdateSettings();

  const handleUpdate = async (data: Parameters<typeof updateSettings.mutateAsync>[0]["data"]) => {
    await updateSettings.mutateAsync({ data });
    queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
    toast({ title: t.settings.saved, description: t.settings.savedDesc });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.settings.title}</h1>
        <p className="text-muted-foreground mt-1">{t.settings.subtitle}</p>
      </div>

      <Card className="bg-card border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-primary" />{t.settings.aiModel}</CardTitle>
          <CardDescription>{t.settings.aiModelDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t.settings.activeModel}</Label>
            <Select
              value={settings?.activeModelId ?? ""}
              onValueChange={v => handleUpdate({ activeModelId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t.settings.selectModel} />
              </SelectTrigger>
              <SelectContent>
                {modelsData?.models.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      {(() => { const Icon = MODEL_TYPE_ICONS[model.type] ?? Cpu; return <Icon className="h-3.5 w-3.5" />; })()}
                      <span>{model.name}</span>
                      <span className="text-muted-foreground text-xs">({model.provider})</span>
                      {model.isLocal && <Badge className="text-xs py-0 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Local</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Local LLM Endpoint</Label>
            <div className="flex gap-2">
              <Input
                placeholder="http://localhost:11434"
                defaultValue={settings?.localLlmEndpoint ?? ""}
                onBlur={e => {
                  if (e.target.value !== settings?.localLlmEndpoint) {
                    handleUpdate({ localLlmEndpoint: e.target.value });
                  }
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Endpoint for Ollama, LM Studio, or other local LLM servers.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HardDrive className="h-5 w-5 text-primary" />{t.settings.storage}</CardTitle>
          <CardDescription>{t.settings.storageDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Disk</Label>
            <Select
              value={settings?.defaultDiskId ?? ""}
              onValueChange={v => handleUpdate({ defaultDiskId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select default disk" />
              </SelectTrigger>
              <SelectContent>
                {disksData?.disks.filter(d => d.isActive).map(disk => (
                  <SelectItem key={disk.id} value={disk.id}>{disk.name} ({disk.type.toUpperCase()})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Organize Files</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Automatically move files to AI-suggested locations.</p>
            </div>
            <Switch
              checked={settings?.autoOrganize ?? false}
              onCheckedChange={v => handleUpdate({ autoOrganize: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Require Approval</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Review AI suggestions before applying them.</p>
            </div>
            <Switch
              checked={settings?.requireApproval ?? true}
              onCheckedChange={v => handleUpdate({ requireApproval: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary" />Appearance</CardTitle>
          <CardDescription>Interface and language preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Dark Mode</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Use dark theme throughout the interface.</p>
            </div>
            <Switch
              checked={settings?.darkMode ?? true}
              onCheckedChange={v => handleUpdate({ darkMode: v })}
            />
          </div>
          <div className="space-y-2">
            <Label>{t.common.language}</Label>
            <Select
              value={lang}
              onValueChange={v => setLang(v as Lang)}
            >
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(l => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.flag} {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Changes apply instantly — also available from the sidebar.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-card-border border-dashed opacity-70">
        <CardContent className="pt-5">
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Installation Package</p>
              <p className="text-xs text-muted-foreground">Deploy this agent on any home PC or NAS with a single command.</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto">View Docs</Button>
          </div>
          <div className="mt-3 p-3 rounded bg-muted font-mono text-xs text-muted-foreground">
            npm install -g smart-private-cloud-agent && smart-cloud start
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
