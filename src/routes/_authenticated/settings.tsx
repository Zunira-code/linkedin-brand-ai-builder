import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Linkedin, CheckCircle2, Sparkles, Loader2, Wand2, Mic, Trash2, Palette, Upload, Image as ImageIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getMyProfile, updateProfile, startLinkedInOAuth, disconnectLinkedIn, getLinkedInStatus } from "@/lib/profile.functions";
import { runCalibration, getCalibration, type Calibration } from "@/lib/calibration.functions";
import {
  listVoiceSamples,
  addVoiceSamples,
  deleteVoiceSample,
} from "@/lib/voice-samples.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Postpilot" }] }),
  component: Settings,
});

function Settings() {
  const profileFn = useServerFn(getMyProfile);
  const updateFn = useServerFn(updateProfile);
  const startOAuthFn = useServerFn(startLinkedInOAuth);
  const disconnectFn = useServerFn(disconnectLinkedIn);
  const statusFn = useServerFn(getLinkedInStatus);
  const client = useQueryClient();

  const profile = useQuery({ queryKey: ["profile"], queryFn: () => profileFn() });
  const status = useQuery({ queryKey: ["linkedin-status"], queryFn: () => statusFn() });

  const calibrationFn = useServerFn(getCalibration);
  const runCalibrationFn = useServerFn(runCalibration);
  const calibration = useQuery({ queryKey: ["calibration"], queryFn: () => calibrationFn() });
  const [profileText, setProfileText] = useState("");
  const [profileUrl, setProfileUrl] = useState("");

  const calibrate = useMutation({
    mutationFn: () => runCalibrationFn({ data: { profileText, profileUrl } }),
    onSuccess: (data) => {
      toast.success(`Calibrated to your niche: ${data.niche}`);
      client.invalidateQueries({ queryKey: ["calibration"] });
      client.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const [displayName, setDisplayName] = useState("");
  const [voice, setVoice] = useState("");
  const [tz, setTz] = useState("UTC");

  useEffect(() => {
    if (profile.data) {
      setDisplayName(profile.data.display_name ?? "");
      setVoice(profile.data.brand_voice ?? "");
      setTz(profile.data.timezone ?? "UTC");
    }
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () => updateFn({ data: { display_name: displayName, brand_voice: voice, timezone: tz } }),
    onSuccess: () => { toast.success("Saved"); client.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const connect = useMutation({
    mutationFn: async () => {
      const popup = window.open("", "linkedin-oauth", "width=600,height=720");
      if (!popup) throw new Error("Popup blocked. Allow popups and try again.");
      let authorizationUrl: string;
      try {
        const res = await startOAuthFn({ data: { origin: window.location.origin } });
        authorizationUrl = res.authorizationUrl;
      } catch (e) {
        popup.close();
        throw e;
      }
      popup.location.href = authorizationUrl;
      return await new Promise<{ name: string | null }>((resolve, reject) => {
        const cleanup = () => {
          window.removeEventListener("message", onMessage);
          clearInterval(timer);
        };
        const onMessage = (event: MessageEvent) => {
          const data = event.data;
          if (!data || data.type !== "linkedin-oauth") return;
          cleanup();
          try { popup.close(); } catch { /* ignore */ }
          if (data.success) resolve({ name: data.name ?? null });
          else reject(new Error(data.error ?? "LinkedIn sign-in failed"));
        };
        window.addEventListener("message", onMessage);
        const timer = setInterval(() => {
          if (popup.closed) {
            cleanup();
            reject(new Error("Sign in was cancelled"));
          }
        }, 500);
      });
    },
    onSuccess: () => {
      toast.success("LinkedIn connected");
      client.invalidateQueries({ queryKey: ["linkedin-status"] });
      client.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const disconnect = useMutation({
    mutationFn: () => disconnectFn(),
    onSuccess: () => {
      toast.success("LinkedIn disconnected");
      client.invalidateQueries({ queryKey: ["linkedin-status"] });
      client.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  return (
    <AppShell title="Settings">
      <div className="grid gap-6 lg:grid-cols-2">
        <CalibrationCard
          className="lg:col-span-2"
          calibration={calibration.data ?? null}
          profileText={profileText}
          setProfileText={setProfileText}
          profileUrl={profileUrl}
          setProfileUrl={setProfileUrl}
          onRun={() => calibrate.mutate()}
          running={calibrate.isPending}
          linkedInConnected={!!status.data?.connected}
        />
        <VoiceTrainingCard className="lg:col-span-2" linkedInConnected={!!status.data?.connected} />
        <BrandKitCard className="lg:col-span-2" />
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Profile</h2>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="dn">Display name</Label>
              <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="tz">Timezone</Label>
              <Input id="tz" value={tz} onChange={(e) => setTz(e.target.value)} placeholder="UTC" />
            </div>
            <div>
              <Label htmlFor="voice">Brand voice</Label>
              <Textarea
                id="voice"
                rows={8}
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                placeholder="Describe how you write. Example: I write short, punchy sentences. Vulnerable, no jargon, always end on a question."
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Postpilot uses this every time it drafts a post so your voice stays consistent.
              </p>
            </div>
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-brand-gradient text-brand-foreground">
              Save changes
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Linkedin className="h-4 w-4" /> LinkedIn
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect LinkedIn so Postpilot can publish your posts and pull profile data.
          </p>
          {status.data?.connected ? (
            <div className="mt-4 rounded-lg border border-success/40 bg-success/10 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium text-success">
                <CheckCircle2 className="h-4 w-4" /> Connected as {status.data.name ?? "your account"}
              </div>
              <p className="mt-1 text-muted-foreground">You can publish and schedule posts.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => connect.mutate()} disabled={connect.isPending}>
                Refresh
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 ml-2 text-destructive hover:text-destructive"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
              >
                {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
              </Button>
            </div>
          ) : (
            <Button onClick={() => connect.mutate()} disabled={connect.isPending} className="mt-4 bg-[#0A66C2] text-white hover:bg-[#0A66C2]/90">
              <Linkedin className="mr-2 h-4 w-4" /> Connect LinkedIn
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function CalibrationCard({
  className,
  calibration,
  profileText,
  setProfileText,
  profileUrl,
  setProfileUrl,
  onRun,
  running,
  linkedInConnected,
}: {
  className?: string;
  calibration: Calibration | null;
  profileText: string;
  setProfileText: (v: string) => void;
  profileUrl: string;
  setProfileUrl: (v: string) => void;
  onRun: () => void;
  running: boolean;
  linkedInConnected: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-6 ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Wand2 className="h-4 w-4 text-brand" /> AI calibration
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Scan your LinkedIn profile so Postpilot writes viral posts in your voice and niche.
          </p>
        </div>
        {calibration ? (
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
            Calibrated
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <Label htmlFor="purl">Your LinkedIn profile URL</Label>
            <Input
              id="purl"
              value={profileUrl}
              onChange={(e) => setProfileUrl(e.target.value)}
              placeholder="https://www.linkedin.com/in/your-handle/"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Paste the link — Postpilot will scan it in seconds to learn your niche and voice.
            </p>
          </div>
          <div>
            <Label htmlFor="pt">Optional: paste headline / about / recent posts</Label>
            <Textarea
              id="pt"
              rows={6}
              value={profileText}
              onChange={(e) => setProfileText(e.target.value)}
              placeholder={`Boost the signal by pasting your headline, About section, and 2–3 recent posts.`}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {linkedInConnected
                ? "We combine URL scan + your connected LinkedIn identity + any text you paste."
                : "Connect LinkedIn on the right for a richer signal, or use URL + pasted text."}
            </p>
          </div>
          <Button onClick={onRun} disabled={running} className="bg-brand-gradient text-brand-foreground">
            {running ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing your profile…</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" /> {calibration ? "Re-calibrate" : "Calibrate AI to my profile"}</>
            )}
          </Button>
        </div>

        <div className="rounded-xl border border-dashed border-border bg-background/40 p-4">
          {calibration ? (
            <div className="space-y-3 text-sm">
              <Row label="Niche" value={calibration.niche} />
              <Row label="Audience" value={calibration.audience} />
              <Row label="Voice" value={calibration.voice} />
              {calibration.topics.length > 0 && (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Viral topic ideas for your niche
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {calibration.topics.slice(0, 6).map((t, i) => (
                      <li key={i}>
                        <Link
                          to="/generator"
                          search={{ topic: t }}
                          className="group flex items-start gap-2 rounded-lg p-2 hover:bg-accent/50"
                        >
                          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                          <span className="flex-1 text-foreground/90 group-hover:text-brand">{t}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <Sparkles className="mb-2 h-6 w-6 text-brand/60" />
              Once calibrated, your niche, voice profile, and 10 viral topic ideas appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BrandKitCard({ className }: { className?: string }) {
  const client = useQueryClient();
  const profileFn = useServerFn(getMyProfile);
  const updateFn = useServerFn(updateProfile);
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => profileFn() });

  const [primary, setPrimary] = useState("#0F172A");
  const [secondary, setSecondary] = useState("#FFFFFF");
  const [accent, setAccent] = useState("#3B82F6");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [font, setFont] = useState<string>("inter");
  const [uploading, setUploading] = useState(false);

  // Hydrate local state from the server ONCE. Subsequent refetches (e.g. after
  // the color picker steals window focus) must NOT reset the user's in-progress
  // edits back to the last saved values — that was silently discarding changes.
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current || !profile.data) return;
    hydrated.current = true;
    const p = profile.data as {
      brand_primary_color?: string | null;
      brand_secondary_color?: string | null;
      brand_accent_color?: string | null;
      brand_logo_url?: string | null;
      brand_font?: string | null;
    };
    setPrimary(p.brand_primary_color ?? "#0F172A");
    setSecondary(p.brand_secondary_color ?? "#FFFFFF");
    setAccent(p.brand_accent_color ?? "#3B82F6");
    setLogoUrl(p.brand_logo_url ?? null);
    setFont(p.brand_font ?? "inter");
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          brand_primary_color: normalizeHex(primary),
          brand_secondary_color: normalizeHex(secondary),
          brand_accent_color: normalizeHex(accent),
          brand_logo_url: logoUrl,
          brand_font: font as "inter" | "space-grotesk" | "dm-serif" | "geist" | "georgia",
        },
      }),
    onSuccess: () => {
      toast.success("Brand kit saved");
      client.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  async function onLogoSelected(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Logo must be an image");
    if (file.size > 2 * 1024 * 1024) return toast.error("Logo must be under 2 MB");
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${uid}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("brand-assets")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("brand-assets")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      setLogoUrl(signed?.signedUrl ?? path);
      toast.success("Logo uploaded — click Save brand kit");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={`rounded-2xl border border-border bg-card p-6 ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Palette className="h-4 w-4 text-brand" /> Brand kit
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your logo and pick brand colors once. Postpilot reuses them on every carousel you build.
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <Label>Logo</Label>
            <div className="mt-2 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40">
                {logoUrl ? (
                  <img src={logoUrl} alt="Brand logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent">
                  <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => e.target.files?.[0] && onLogoSelected(e.target.files[0])}
                  />
                </label>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl(null)}
                    className="ml-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                )}
                <p className="text-xs text-muted-foreground">PNG or SVG on transparent background works best. Max 2 MB.</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ColorField label="Primary" value={primary} onChange={setPrimary} />
            <ColorField label="Secondary" value={secondary} onChange={setSecondary} />
            <ColorField label="Accent" value={accent} onChange={setAccent} />
          </div>
          <div>
            <Label>Font</Label>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {[
                { id: "inter", label: "Inter", stack: "Inter, system-ui, sans-serif" },
                { id: "space-grotesk", label: "Space Grotesk", stack: "'Space Grotesk', system-ui, sans-serif" },
                { id: "dm-serif", label: "DM Serif", stack: "'DM Serif Display', Georgia, serif" },
                { id: "geist", label: "Geist", stack: "Geist, system-ui, sans-serif" },
                { id: "georgia", label: "Georgia", stack: "Georgia, serif" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFont(f.id)}
                  className={`rounded-lg border p-2 text-center transition ${
                    font === f.id ? "border-brand ring-2 ring-brand/30" : "border-border hover:border-brand/40"
                  }`}
                  style={{ fontFamily: f.stack }}
                >
                  <div className="text-xl font-semibold leading-tight">Aa</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{f.label}</div>
                </button>
              ))}
            </div>
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-brand-gradient text-brand-foreground">
            {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save brand kit
          </Button>
        </div>
        <div className="rounded-xl border border-dashed border-border p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</div>
          <div
            className="mt-3 aspect-square w-full overflow-hidden rounded-lg p-6"
            style={{ background: primary, color: secondary }}
          >
            <div className="flex h-full flex-col justify-between">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-8 w-auto max-w-[60%] object-contain" style={{ filter: "brightness(0) invert(1)" }} />
              ) : (
                <div className="text-xs opacity-70">Your logo</div>
              )}
              <div>
                <div className="text-2xl font-bold leading-tight">3 lessons from year one.</div>
                <div className="mt-3 h-1 w-12 rounded-full" style={{ background: accent }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-xs outline-none"
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-foreground/90">{value}</div>
    </div>
  );
}

function VoiceTrainingCard({
  className,
  linkedInConnected,
}: {
  className?: string;
  linkedInConnected: boolean;
}) {
  const client = useQueryClient();
  const listFn = useServerFn(listVoiceSamples);
  const addFn = useServerFn(addVoiceSamples);
  const delFn = useServerFn(deleteVoiceSample);

  const samples = useQuery({ queryKey: ["voice-samples"], queryFn: () => listFn() });
  const [raw, setRaw] = useState("");

  const count = samples.data?.length ?? 0;
  const trained = count >= 10;

  const add = useMutation({
    mutationFn: () => addFn({ data: { raw, source: "paste" } }),
    onSuccess: (out) => {
      toast.success(`Added ${out.added} sample${out.added === 1 ? "" : "s"}`);
      setRaw("");
      client.invalidateQueries({ queryKey: ["voice-samples"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["voice-samples"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const pct = Math.min(100, Math.round((count / 10) * 100));

  return (
    <div className={`rounded-2xl border border-border bg-card p-6 ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Mic className="h-4 w-4 text-brand" /> Brand voice training
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Give Postpilot 10–20 of your past LinkedIn posts. Every new draft will match your vocabulary,
            sentence length, and tone — not a generic "professional" voice.
          </p>
        </div>
        {trained ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> Voice trained
          </span>
        ) : (
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {count}/10 samples
          </span>
        )}
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full transition-[width] duration-300 ${trained ? "bg-success" : "bg-brand-gradient"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="samples">Paste your past posts</Label>
              <span className="text-[11px] text-muted-foreground">Separate with a blank line or ---</span>
            </div>
            <Textarea
              id="samples"
              rows={10}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={`Paste 10–20 of your recent LinkedIn posts here.\n\nSeparate each post with a blank line.\n\n---\n\nOr use --- between them.`}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Each post needs at least 40 characters. Max 40 stored samples.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => add.mutate()}
              disabled={add.isPending || !raw.trim()}
              className="bg-brand-gradient text-brand-foreground"
            >
              {add.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Save samples
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground/80">Why can't we auto-import from LinkedIn?</p>
            <p className="mt-1">
              LinkedIn's API only lets approved Marketing Partners read a member's past posts
              (<code className="rounded bg-background/60 px-1">r_member_social</code> scope). Our
              connector can publish on your behalf but can't fetch your history. Paste your posts
              above — it takes ~2 minutes and gives the model the same signal.
            </p>
            <p className="mt-2">
              Tip: open your LinkedIn profile → <em>Show all posts</em> → copy the text of your
              10–20 best-performing posts, one per block.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-border bg-background/40 p-4">
          {count === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <Mic className="mb-2 h-6 w-6 text-brand/60" />
              Your saved voice samples will appear here.
            </div>
          ) : (
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {samples.data!.map((s) => (
                <div
                  key={s.id}
                  className="group rounded-lg border border-border bg-card/60 p-3 text-xs"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {s.source === "linkedin" ? "LinkedIn" : "Pasted"} · {new Date(s.created_at).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => del.mutate(s.id)}
                      className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      aria-label="Delete sample"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="line-clamp-4 whitespace-pre-wrap text-foreground/80">{s.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}