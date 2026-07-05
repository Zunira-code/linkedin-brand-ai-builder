import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Linkedin, CheckCircle2, Sparkles, Loader2, Wand2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getMyProfile, updateProfile, connectLinkedIn, getLinkedInStatus } from "@/lib/profile.functions";
import { runCalibration, getCalibration, type Calibration } from "@/lib/calibration.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Postpilot" }] }),
  component: Settings,
});

function Settings() {
  const profileFn = useServerFn(getMyProfile);
  const updateFn = useServerFn(updateProfile);
  const connectFn = useServerFn(connectLinkedIn);
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
    mutationFn: () => connectFn(),
    onSuccess: () => {
      toast.success("LinkedIn connected");
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

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-foreground/90">{value}</div>
    </div>
  );
}