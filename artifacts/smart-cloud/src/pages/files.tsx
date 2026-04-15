import { useState } from "react";
import {
  useListFiles,
  getListFilesQueryKey,
  useGetFileCategories,
  getGetFileCategoriesQueryKey,
  useMoveFile,
  useDeleteFile,
  useSuggestFileStorage,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatBytes } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrainCircuit, Check, X, Trash2, Search, FolderOpen, FileText, Image, Video, Music, Archive, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  images: Image, videos: Video, documents: FileText, audio: Music, archives: Archive, code: Code
};

const CATEGORY_COLORS: Record<string, string> = {
  images: "text-cyan-400", videos: "text-violet-400", documents: "text-amber-400",
  audio: "text-emerald-400", archives: "text-red-400", code: "text-blue-400", other: "text-gray-400"
};

export default function Files() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, { suggestedPath: string; reasoning: string }>>({});

  const params = {
    ...(category !== "all" ? { category } : {}),
  };
  const { data: filesData, isLoading } = useListFiles(params, { query: { queryKey: getListFilesQueryKey(params) } });
  const { data: categoriesData } = useGetFileCategories({ query: { queryKey: getGetFileCategoriesQueryKey() } });
  const moveFile = useMoveFile();
  const deleteFile = useDeleteFile();
  const suggestStorage = useSuggestFileStorage();

  const filteredFiles = filesData?.files.filter(f =>
    search ? f.name.toLowerCase().includes(search.toLowerCase()) : true
  ) ?? [];

  const handleApprove = async (fileId: string) => {
    const sug = suggestions[fileId];
    await moveFile.mutateAsync({ fileId, data: { newPath: sug?.suggestedPath, aiApproved: true } });
    queryClient.invalidateQueries({ queryKey: getListFilesQueryKey() });
    toast({ title: "Approved", description: "File location approved and saved." });
  };

  const handleReject = async (fileId: string) => {
    await moveFile.mutateAsync({ fileId, data: { aiApproved: false } });
    queryClient.invalidateQueries({ queryKey: getListFilesQueryKey() });
    setSuggestions(s => { const n = { ...s }; delete n[fileId]; return n; });
  };

  const handleDelete = async (fileId: string) => {
    await deleteFile.mutateAsync({ fileId });
    queryClient.invalidateQueries({ queryKey: getListFilesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetFileCategoriesQueryKey() });
    toast({ title: "Deleted", description: "File removed." });
  };

  const handleSuggest = async () => {
    if (!selectedIds.length) return;
    const result = await suggestStorage.mutateAsync({ data: { fileIds: selectedIds } });
    const newSugs: Record<string, { suggestedPath: string; reasoning: string }> = {};
    result.suggestions.forEach(s => {
      newSugs[s.fileId] = { suggestedPath: s.suggestedPath, reasoning: s.reasoning };
    });
    setSuggestions(prev => ({ ...prev, ...newSugs }));
    setSelectedIds([]);
    toast({ title: "AI Suggestions Ready", description: `${result.suggestions.length} storage suggestions generated.` });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">File Manager</h1>
        <p className="text-muted-foreground mt-1">Browse and manage your stored files with AI assistance.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {categoriesData?.categories.map(cat => {
          const Icon = CATEGORY_ICONS[cat.category] ?? FolderOpen;
          const color = CATEGORY_COLORS[cat.category] ?? "text-gray-400";
          return (
            <button
              key={cat.category}
              onClick={() => setCategory(category === cat.category ? "all" : cat.category)}
              className={`p-3 rounded-lg border text-left transition-colors ${category === cat.category ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}
            >
              <Icon className={`h-5 w-5 mb-1 ${color}`} />
              <p className="text-sm font-medium capitalize">{cat.category}</p>
              <p className="text-xs text-muted-foreground">{cat.count} files · {formatBytes(cat.totalBytes)}</p>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {selectedIds.length > 0 && (
          <Button onClick={handleSuggest} disabled={suggestStorage.isPending} className="gap-2">
            <BrainCircuit className="h-4 w-4" />
            {suggestStorage.isPending ? "Analyzing..." : `Suggest Storage (${selectedIds.length})`}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {isLoading && <p className="text-muted-foreground text-sm">Loading files...</p>}
        {filteredFiles.map(file => {
          const Icon = CATEGORY_ICONS[file.category] ?? FolderOpen;
          const color = CATEGORY_COLORS[file.category] ?? "text-gray-400";
          const suggestion = suggestions[file.id];
          const isSelected = selectedIds.includes(file.id);
          return (
            <Card
              key={file.id}
              className={`bg-card border-card-border transition-colors cursor-pointer ${isSelected ? "border-primary/50 bg-primary/5" : ""}`}
              onClick={() => toggleSelect(file.id)}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {file.aiApproved && <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Approved</Badge>}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(file.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{file.path}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">{formatBytes(file.sizeBytes)}</span>
                      <Badge variant="outline" className="text-xs capitalize">{file.category}</Badge>
                    </div>

                    {suggestion && (
                      <div className="mt-2 p-2 rounded bg-primary/5 border border-primary/20 text-xs" onClick={e => e.stopPropagation()}>
                        <p className="text-primary font-medium mb-1">AI Suggestion</p>
                        <p className="text-muted-foreground mb-1">{suggestion.reasoning}</p>
                        <p className="font-mono text-foreground mb-2">{suggestion.suggestedPath}</p>
                        <div className="flex gap-2">
                          <Button size="sm" className="h-6 text-xs gap-1" onClick={() => handleApprove(file.id)}>
                            <Check className="h-3 w-3" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={() => handleReject(file.id)}>
                            <X className="h-3 w-3" /> Reject
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!isLoading && !filteredFiles.length && (
          <div className="text-center py-12 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No files found. {search ? "Try a different search term." : "Add some files to your storage."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
