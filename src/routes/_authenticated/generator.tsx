import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Save, Send, Loader2, Wand2, Image as ImageIcon, Download, Hash, Video as VideoIcon, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { savePost, publishPostNow, generateHashtags, getPost } from "@/lib/posts.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { getCalibration } from "@/lib/calibration.functions";
import { streamImage } from "@/lib/streamImage";
import { supabase } from "@/integrations/supabase/client";

type SearchParams = { topic?: string; hook?: string; template?: string; postId?: string };

export const Route = createFileRoute("/_authenticated/generator")({
  head: () => ({ meta: [{ title: "AI post generator — Postpilot" }] }),
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    topic: typeof s.topic === "string" ? s.topic : undefined,
    hook: typeof s.hook === "string" ? s.hook : undefined,
    template: typeof s.template === "string" ? s.template : undefined,
    postId: typeof s.postId === "string" ? s.postId : undefined,
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
  const [editingId, setEditingId] = useState<string | undefined>(search.postId);
  const [scheduleIso, setScheduleIso] = useState<string | null>(null);

  const getPostFn = useServerFn(getPost);
  const existing = useQuery({
    queryKey: ["post", search.postId],
    queryFn: () => getPostFn({ data: { id: search.postId as string } }),
    enabled: !!search.postId,
  });

  useEffect(() => {
    if (!existing.data) return;
    setEditingId(existing.data.id);
    setEdited(existing.data.content);
    setFormat(existing.data.format ?? "story");
    setScheduleIso(existing.data.scheduled_at ?? null);
  }, [existing.data]);

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
  const hashtagsFn = useServerFn(generateHashtags);

  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgFinal, setImgFinal] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);

  // Video state — `videoPath` is the storage key (persisted); `videoPreviewUrl`
  // is a local object URL (or signed URL when loading an existing post).
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!existing.data?.video_url) return;
    setVideoPath(existing.data.video_url);
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage
        .from("post-videos")
        .createSignedUrl(existing.data!.video_url as string, 3600);
      if (!cancelled && data?.signedUrl) setVideoPreviewUrl(data.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [existing.data]);

  const hashtagsMut = useMutation({
    mutationFn: async () => {
      const { hashtags } = await hashtagsFn({ data: { content: edited } });
      return hashtags;
    },
    onSuccess: (tags) => {
      if (!tags.length) return toast.error("No hashtags returned — try again.");
      const stripped = edited.replace(/\n*(?:#[A-Za-z0-9_]+\s*)+$/g, "").trimEnd();
      setEdited(`${stripped}\n\n${tags.join(" ")}`);
      toast.success("Viral hashtags added");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const saveMut = useMutation({
    mutationFn: (input: { status: "draft" | "scheduled"; scheduled_at?: string | null }) =>
      saveFn({
        data: {
          id: editingId,
          content: edited,
          format,
          status: input.status,
          scheduled_at: input.scheduled_at ?? null,
          image_data_url: imgSrc && imgFinal ? imgSrc : null,
          video_url: videoPath ?? null,
        },
      }),
    onSuccess: (out, vars) => {
      if (out?.id) setEditingId(out.id);
      client.invalidateQueries({ queryKey: ["posts"] });
      client.invalidateQueries({ queryKey: ["analytics"] });
      toast.success(vars.status === "scheduled" ? (editingId ? "Schedule updated" : "Scheduled") : (editingId ? "Draft updated" : "Saved to drafts"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const publishMut = useMutation({
    mutationFn: async () => {
      let content = edited;
      if (!/#[A-Za-z0-9_]+/.test(content)) {
        try {
          const { hashtags } = await hashtagsFn({ data: { content } });
          if (hashtags.length) content = `${content.trimEnd()}\n\n${hashtags.join(" ")}`;
        } catch { /* non-fatal */ }
      }
      setEdited(content);
      const saved = await saveFn({ data: { id: editingId, content, format, status: "draft" } });
      if (saved?.id) setEditingId(saved.id);
      const imageDataUrl = imgSrc && imgFinal ? imgSrc : undefined;
      return publishFn({ data: { id: saved.id, imageDataUrl } });
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

  async function generateImage() {
    const seed = (edited || topic).trim();
    if (!seed) return toast.error("Write or generate a draft first");
    setImgBusy(true);
    setImgFinal(false);
    setImgSrc(null);
    try {
      // Keep the visual prompt short; use topic + first ~200 chars of the post.
      const visualPrompt = `${topic ? `${topic}. ` : ""}${edited.slice(0, 220)}`;
      await streamImage("/api/generate-post-image", visualPrompt, (dataUrl, final) => {
        setImgSrc(dataUrl);
        if (final) setImgFinal(true);
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Image generation failed");
    } finally {
      setImgBusy(false);
    }
  }

  function downloadImage() {
    if (!imgSrc) return;
    const a = document.createElement("a");
    a.href = imgSrc;
    a.download = `postpilot-${Date.now()}.png`;
    a.click();
  }

  async function probeDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => {
        const d = v.duration;
        URL.revokeObjectURL(url);
        Number.isFinite(d) ? resolve(d) : reject(new Error("Could not read video duration"));
      };
      v.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read video metadata"));
      };
      v.src = url;
    });
  }

  async function handleVideoSelected(file: File) {
    if (file.type !== "video/mp4") {
      toast.error("Only MP4 videos are supported.");
      return;
    }
    const MAX = 5 * 1024 * 1024 * 1024; // 5 GB — LinkedIn native cap
    const SOFT = 200 * 1024 * 1024;
    if (file.size > MAX) {
      toast.error("Video must be under 5 GB.");
      return;
    }
    if (file.size > SOFT) {
      toast.warning("Files under 200MB upload faster and more reliably.");
    }

    let duration: number;
    try {
      duration = await probeDuration(file);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read video");
      return;
    }
    if (duration > 600) {
      toast.error("LinkedIn videos must be under 10 minutes.");
      return;
    }
    if (duration < 3) {
      toast.error("Video must be at least 3 seconds long.");
      return;
    }

    setVideoBusy(true);
    setVideoProgress(0);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      const path = `${uid}/${crypto.randomUUID()}.mp4`;

      const { data: signed, error: signErr } = await supabase.storage
        .from("post-videos")
        .createSignedUploadUrl(path);
      if (signErr || !signed) throw signErr ?? new Error("Could not start upload");

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signed.signedUrl);
        xhr.setRequestHeader("Content-Type", "video/mp4");
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setVideoProgress(Math.round((ev.loaded / ev.total) * 100));
          }
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      if (videoPath && videoPath !== path) {
        await supabase.storage.from("post-videos").remove([videoPath]).catch(() => {});
      }
      setVideoPath(path);
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(URL.createObjectURL(file));
      setVideoProgress(100);
      toast.success("Video attached");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Video upload failed");
    } finally {
      setVideoBusy(false);
    }
  }

  async function removeVideo() {
    if (videoPath) {
      await supabase.storage.from("post-videos").remove([videoPath]).catch(() => {});
    }
    if (videoPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPath(null);
    setVideoPreviewUrl(null);
  }

  return (
    <AppShell title="Post generator">
      {editingId ? (
        <div className="mb-3 rounded-lg border border-brand/40 bg-brand/5 px-3 py-2 text-xs text-brand">
          Editing existing post — changes update the saved version.
        </div>
      ) : null}
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
            <Button variant="outline" onClick={() => hashtagsMut.mutate()} disabled={!edited || hashtagsMut.isPending}>
              {hashtagsMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Hash className="mr-2 h-4 w-4" />}
              Viral hashtags
            </Button>
            <ScheduleControl
              initialIso={scheduleIso}
              onSchedule={(iso) => saveMut.mutate({ status: "scheduled", scheduled_at: iso })}
              disabled={!edited}
            />
            <Button
              onClick={() => publishMut.mutate()}
              disabled={!edited || publishMut.isPending}
              className="bg-brand-gradient text-brand-foreground"
            >
              {publishMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Publish now
            </Button>
          </div>

          <div className="mt-6 border-t border-border pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
                  <ImageIcon className="h-4 w-4 text-brand" /> Visual for this post
                </h3>
                <p className="text-xs text-muted-foreground">AI-generated square image tuned for LinkedIn engagement.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={generateImage} disabled={imgBusy || !edited}>
                  {imgBusy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Rendering…</> : <><Sparkles className="mr-2 h-4 w-4" /> {imgSrc ? "Regenerate image" : "Generate image"}</>}
                </Button>
                {imgSrc && imgFinal ? (
                  <Button size="sm" variant="outline" onClick={downloadImage}>
                    <Download className="mr-2 h-4 w-4" /> Download
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center rounded-xl border border-dashed border-border bg-background/40 p-4">
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt="Generated post visual"
                  className={`aspect-square w-full max-w-md rounded-lg object-cover transition-[filter] duration-500 ${imgFinal ? "blur-0" : "blur-2xl"}`}
                />
              ) : (
                <div className="flex aspect-square w-full max-w-md items-center justify-center rounded-lg text-xs text-muted-foreground">
                  {imgBusy ? "Warming up…" : "Draft a post, then generate a matching visual."}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
                  <VideoIcon className="h-4 w-4 text-brand" /> Video for this post
                </h3>
                <p className="text-xs text-muted-foreground">
                  Upload an MP4 (max 200 MB). It will publish to LinkedIn with your caption at the scheduled time.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label>
                  <input
                    type="file"
                    accept="video/mp4"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleVideoSelected(f);
                      e.target.value = "";
                    }}
                    disabled={videoBusy}
                  />
                  <span className="inline-flex h-9 cursor-pointer items-center whitespace-nowrap rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
                    {videoBusy ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</>
                    ) : (
                      <><VideoIcon className="mr-2 h-4 w-4" /> {videoPath ? "Replace" : "Upload MP4"}</>
                    )}
                  </span>
                </label>
                {videoPath ? (
                  <Button size="sm" variant="outline" onClick={removeVideo} disabled={videoBusy}>
                    <X className="mr-2 h-4 w-4" /> Remove
                  </Button>
                ) : null}
              </div>
            </div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!videoBusy) setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (videoBusy) return;
                const f = e.dataTransfer.files?.[0];
                if (f) handleVideoSelected(f);
              }}
              className={`mt-4 flex items-center justify-center rounded-xl border border-dashed p-4 transition-colors ${
                isDragging ? "border-brand bg-brand/10" : "border-border bg-background/40"
              }`}
            >
              {videoBusy ? (
                <div className="flex aspect-video w-full max-w-md flex-col items-center justify-center gap-3 rounded-lg px-6 text-center">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Loader2 className="h-4 w-4 animate-spin text-brand" />
                    Uploading… {videoProgress}%
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-brand-gradient transition-[width] duration-150"
                      style={{ width: `${videoProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Please keep this tab open until upload finishes.</p>
                </div>
              ) : videoPreviewUrl ? (
                <video
                  src={videoPreviewUrl}
                  controls
                  className="aspect-video w-full max-w-md rounded-lg bg-black object-contain"
                />
              ) : (
                <div className="flex aspect-video w-full max-w-md flex-col items-center justify-center gap-1 rounded-lg text-center text-xs text-muted-foreground">
                  <VideoIcon className="h-6 w-6 opacity-60" />
                  <div>Drag & drop an MP4 here, or use the button above.</div>
                  <div className="opacity-70">Max 10 min · up to 5 GB</div>
                </div>
              )}
            </div>
            {videoPath ? (
              <p className="mt-2 text-xs text-muted-foreground">
                When published, your caption above becomes the LinkedIn post text and the MP4 is attached as the video.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ScheduleControl({ onSchedule, disabled, initialIso }: { onSchedule: (iso: string) => void; disabled?: boolean; initialIso?: string | null }) {
  const [dt, setDt] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });
  useEffect(() => {
    if (initialIso) {
      const d = new Date(initialIso);
      d.setSeconds(0, 0);
      setDt(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    }
  }, [initialIso]);
  return (
    <div className="flex items-center gap-2">
      <Input type="datetime-local" value={dt} onChange={(e) => setDt(e.target.value)} className="w-52" />
      <Button variant="outline" disabled={disabled} onClick={() => onSchedule(new Date(dt).toISOString())}>Schedule</Button>
    </div>
  );
}