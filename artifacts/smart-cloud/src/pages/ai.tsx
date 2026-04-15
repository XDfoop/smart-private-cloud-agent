import { useState, useRef, useEffect } from "react";
import {
  useGetAiMessages,
  getGetAiMessagesQueryKey,
  useSendAiMessage,
  useListAvailableModels,
  getListAvailableModelsQueryKey,
  useGetSettings,
  getGetSettingsQueryKey,
  useUpdateSettings,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BrainCircuit, Send, User, Cpu, Mic, Eye } from "lucide-react";

const MODEL_TYPE_ICONS: Record<string, React.ElementType> = {
  llm: Cpu, vision: Eye, voice: Mic, multimodal: BrainCircuit,
};

export default function Ai() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messagesData } = useGetAiMessages({ query: { queryKey: getGetAiMessagesQueryKey() } });
  const { data: modelsData } = useListAvailableModels({ query: { queryKey: getListAvailableModelsQueryKey() } });
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const sendMessage = useSendAiMessage();
  const updateSettings = useUpdateSettings();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messagesData?.messages]);

  const handleSend = async () => {
    if (!message.trim()) return;
    const msg = message;
    setMessage("");
    await sendMessage.mutateAsync({ data: { message: msg } });
    queryClient.invalidateQueries({ queryKey: getGetAiMessagesQueryKey() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleModelChange = async (modelId: string) => {
    await updateSettings.mutateAsync({ data: { activeModelId: modelId } });
    queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
  };

  const activeModel = modelsData?.models.find(m => m.id === settings?.activeModelId);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Agent</h1>
          <p className="text-muted-foreground mt-1">Your intelligent storage assistant.</p>
        </div>
        <div className="flex items-center gap-3">
          {activeModel && (
            <Badge variant="outline" className="gap-1.5 text-sm py-1 px-3">
              {(() => { const Icon = MODEL_TYPE_ICONS[activeModel.type] ?? Cpu; return <Icon className="h-3.5 w-3.5 text-primary" />; })()}
              {activeModel.name}
              {activeModel.isLocal && <span className="text-xs text-emerald-400">Local</span>}
            </Badge>
          )}
          <Select value={settings?.activeModelId ?? ""} onValueChange={handleModelChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {modelsData?.models.map(model => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center gap-2">
                    {(() => { const Icon = MODEL_TYPE_ICONS[model.type] ?? Cpu; return <Icon className="h-3.5 w-3.5" />; })()}
                    <span>{model.name}</span>
                    {model.isLocal && <Badge className="text-xs py-0 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Local</Badge>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="flex-1 bg-card border-card-border overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 p-4" ref={scrollRef as React.RefObject<HTMLDivElement>}>
          <div className="space-y-4">
            {messagesData?.messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role !== "user" && (
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <BrainCircuit className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  {msg.content}
                  <p className="text-xs opacity-60 mt-1">{new Date(msg.createdAt).toLocaleTimeString()}</p>
                </div>
                {msg.role === "user" && (
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {sendMessage.isPending && (
              <div className="flex gap-3 justify-start">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <BrainCircuit className="h-4 w-4 text-primary animate-pulse" />
                </div>
                <div className="bg-muted rounded-xl px-4 py-2.5 text-sm text-muted-foreground">
                  Thinking...
                </div>
              </div>
            )}
            {!messagesData?.messages.length && !sendMessage.isPending && (
              <div className="text-center py-16 text-muted-foreground">
                <BrainCircuit className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Start a conversation</p>
                <p className="text-sm mt-1">Ask the AI to help organize your files, analyze storage, or suggest where to store things.</p>
              </div>
            )}
          </div>
        </ScrollArea>
        <CardContent className="border-t border-border p-4">
          <div className="flex gap-3">
            <Input
              placeholder="Ask AI to help with storage, file organization..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={sendMessage.isPending || !message.trim()} className="gap-2">
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {["Analyze my storage usage", "Find duplicate files", "Suggest backup schedule", "What files need organizing?"].map(prompt => (
              <button
                key={prompt}
                onClick={() => setMessage(prompt)}
                className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
