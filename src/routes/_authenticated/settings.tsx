import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Linkedin, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getMyProfile, updateProfile, connectLinkedIn, getLinkedInStatus } from "@/lib/profile.functions";

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