import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Save, Send, Loader2, Wand2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { savePost, publishPostNow } from "@/lib/posts.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { getCalibration } from "@/lib/calibration.functions";

type SearchParams = { topic?: string; hook?: string; template?: string };

export const Route = createFileRoute("/_authenticated/generator")({
  head: () => ({ meta: [{ title: "AI post generator — Postpilot" }] }),
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    topic: typeof s.topic === "string" ? s.topic : undefined,
    hook: typeof s.hook === "string" ? s.hook : undefined,
    template: typeof s.template === "string" ? s.template : undefined,
  }),
  component: Generator,
});

function Generator() {
  const search = useSearch({ from: "/_authenticated/generator" });
  const [topic, setTopic] = useState(search.topic ?? "");
  const [tone, setTone] = useState("insightful");
  const [format, setFormat] = useState(search.hook ? search.hook.toLowerCase() : "story");
  const [length, setLength] = useState("medium");
  const [edited, setEdited] = useState("");

  const profileFn = useServerFn(getMyProfile);
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => profileFn() });

  const calibrationFn = useServerFn(getCalibration);
  const calibration = useQuery({ queryKey: ["calibration"], queryFn: () => calibrationFn() });

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: { messages, brandVoice: profile.data?.brand_voice ?? "" },
        }),
      }),
    [profile.data?.brand_voice],
  );

  const { messages, sendMessage, status, setMessages } = useChat({ transport });

  const assistantText = useMemo(() => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last) return "";
    return last.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
  }, [messages]);

  useEffect(() => {
    setEdited(assistantText);
  }, [assistantText]);

  // Prefill from template
  useEffect(() => {
    if (search.template && messages.length === 0) {
      setEdited(search.template);
    }
  }, [search.template, messages.length]);

  const client = useQueryClient();
  const saveFn = useServerFn(savePost);
  const publishFn = useServerFn(publishPostNow);

  const saveMut = useMutation({
    mutationFn: (input: { status: "draft" | "scheduled"; scheduled_at?: string | null }) =>
      saveFn({ data: { content: edited, format, status: input.status, scheduled_at: input.scheduled_at ?? null } }),
    onSuccess: (_d, vars) => {
      client.invalidateQueries({ queryKey: ["posts"] });
      client.invalidateQueries({ queryKey: ["analytics"] });
      toast.success(vars.status === "scheduled" ? "Scheduled" : "Saved to drafts");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const publishMut = useMutation({
    mutationFn: async () => {
      const saved = await saveFn({ data: { content: edited, format, status: "draft" } });
      return publishFn({ data: { id: saved.id } });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["posts"] });
      client.invalidateQueries({ queryKey: ["analytics"] });
      toast.success("Published to LinkedIn 🎉");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  function generate() {
    if (!topic.trim()) return toast.error("Give me a topic first");
    setMessages([]);
    sendMessage({
      text: `Topic: ${topic}\nTone: ${tone}\nFormat: ${format}\nLength: ${length}\n\nWrite a single LinkedIn post.`,
    });
  }

  const busy = status === "submitted" || status === "streaming";

  return (
    <AppShell title="Post generator">
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-brand" />
            <h2 className="font-display text-lg font-semibold">Brief</h2>
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="topic">What is this post about?</Label>
              <Textarea id="topic" rows={4} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Lessons from my first year as a founder" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insightful">Insightful</SelectItem>
                    <SelectItem value="bold">Bold / contrarian</SelectItem>
                    <SelectItem value="vulnerable">Vulnerable</SelectItem>
                    <SelectItem value="playful">Playful</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Format</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="story">Story</SelectItem>
                    <SelectItem value="listicle">Listicle</SelectItem>
                    <SelectItem value="hook+insight">Hook + insight</SelectItem>
                    <SelectItem value="question">Question / poll</SelectItem>
                    <SelectItem value="framework">Framework</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Length</Label>
              <Select value={length} onValueChange={setLength}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short (under 500 chars)</SelectItem>
                  <SelectItem value="medium">Medium (500 – 1000)</SelectItem>
                  <SelectItem value="long">Long-form (1000+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generate} disabled={busy} className="w-full bg-brand-gradient text-brand-foreground">
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Writing…</> : <><Sparkles className="mr-2 h-4 w-4" />Generate</>}
            </Button>
            {profile.data?.brand_voice ? (
              <p className="text-xs text-muted-foreground">Using your saved brand voice.</p>
            ) : (
              <p className="text-xs text-muted-foreground">Tip: add your brand voice in Settings for more on-brand drafts.</p>
            )}

            {calibration.data && calibration.data.topics.length > 0 ? (
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-brand" />
                  Viral ideas for {calibration.data.niche || "your niche"}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {calibration.data.topics.slice(0, 6).map((t, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setTopic(t)}
                      className="rounded-full border border-border bg-card px-2.5 py-1 text-left text-[11px] leading-snug text-foreground/80 transition-colors hover:border-brand/60 hover:text-brand"
                    >
                      {t.length > 90 ? `${t.slice(0, 90)}…` : t}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                Want AI to tailor viral topics to your niche? <a href="/settings" className="text-brand hover:underline">Calibrate from your LinkedIn →</a>
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="text-sm font-medium">Draft</div>
            <div className="text-xs text-muted-foreground">{edited.length} chars</div>
          </div>
          {edited || busy ? (
            <Textarea
              value={edited}
              onChange={(e) => setEdited(e.target.value)}
              rows={16}
              className="mt-4 min-h-[360px] resize-y font-display text-base leading-relaxed"
              placeholder="Your draft will appear here…"
            />
          ) : (
            <div className="mt-4 min-h-[360px] rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              <ReactMarkdown>{"Give me a topic on the left and I'll draft a post that sounds like you."}</ReactMarkdown>
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={generate} disabled={busy || !topic.trim()}>
              <Sparkles className="mr-2 h-4 w-4" /> Regenerate
            </Button>
            <Button variant="outline" onClick={() => saveMut.mutate({ status: "draft" })} disabled={!edited || saveMut.isPending}>
              <Save className="mr-2 h-4 w-4" /> Save draft
            </Button>
            <ScheduleControl onSchedule={(iso) => saveMut.mutate({ status: "scheduled", scheduled_at: iso })} disabled={!edited} />
            <Button
              onClick={() => publishMut.mutate()}
              disabled={!edited || publishMut.isPending}
              className="bg-brand-gradient text-brand-foreground"
            >
              {publishMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Publish now
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ScheduleControl({ onSchedule, disabled }: { onSchedule: (iso: string) => void; disabled?: boolean }) {
  const [dt, setDt] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });
  return (
    <div className="flex items-center gap-2">
      <Input type="datetime-local" value={dt} onChange={(e) => setDt(e.target.value)} className="w-52" />
      <Button variant="outline" disabled={disabled} onClick={() => onSchedule(new Date(dt).toISOString())}>Schedule</Button>
    </div>
  );
}