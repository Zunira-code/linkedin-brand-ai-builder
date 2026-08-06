import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  BadgeCheck,
  Bookmark,
  Camera,
  Copy,
  FileText,
  Image as ImageIcon,
  Loader2,
  Pin,
  RefreshCw,
  Sparkles,
  Trash2,
  Type,
  Wand2,
  Check,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  generateHeadlines,
  generateAbout,
  refineText,
  recommendFeatured,
  describeFeaturedItem,
  generateBannerTaglines,
  listProfileKit,
  saveProfileKitItem,
  deleteProfileKitItem,
  HEADLINE_STYLES,
} from "@/lib/profile-optimizer.functions";

export const Route = createFileRoute("/_authenticated/profile-optimizer")({
  head: () => ({
    meta: [
      { title: "LinkedIn Profile Optimizer — Postpilot" },
      {
        name: "description",
        content:
          "Rewrite your LinkedIn headline, About section, Featured picks and banner with AI that writes in your own trained voice.",
      },
      { property: "og:title", content: "LinkedIn Profile Optimizer — Postpilot" },
      {
        property: "og:description",
        content: "Five headline styles, four About versions, Featured recommendations and banner guidance in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfileOptimizer,
});

type TabKey = "overview" | "headline" | "about" | "featured" | "visuals";

const TABS: Array<{ key: TabKey; label: string; icon: typeof Type }> = [
  { key: "overview", label: "Overview", icon: BadgeCheck },
  { key: "headline", label: "Headline", icon: Type },
  { key: "about", label: "About", icon: FileText },
  { key: "featured", label: "Featured", icon: Pin },
  { key: "visuals", label: "Visuals", icon: ImageIcon },
];

const TONES = ["professional", "confident", "humble", "bold"] as const;
const LENGTHS = [
  { key: "short", label: "Shorter" },
  { key: "medium", label: "Medium" },
  { key: "long", label: "Longer" },
] as const;

const ASSET_TYPES = [
  "LinkedIn posts",
  "Long-form articles",
  "Newsletter",
  "Case studies",
  "Media mentions",
  "Talks / webinars",
  "Portfolio / website",
  "Testimonials",
  "Lead magnet / PDF",
  "Podcast",
  "Product demo",
  "Open roles / hiring",
];

const ABOUT_LABELS: Record<string, string> = {
  storytelling: "Storytelling",
  results: "Results-focused",
  authority: "Authority / thought leadership",
  conversational: "Conversational & approachable",
};

const STYLE_LABEL: Record<string, string> = Object.fromEntries(
  HEADLINE_STYLES.map((s) => [s.key, s.label]),
);

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("rounded-2xl border border-border bg-card p-5", className)}
    >
      {children}
    </motion.div>
  );
}

function ProfileOptimizer() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [useVoice, setUseVoice] = useState(true);

  const qc = useQueryClient();
  const listKit = useServerFn(listProfileKit);
  const saveItem = useServerFn(saveProfileKitItem);
  const deleteItem = useServerFn(deleteProfileKitItem);
  const kitQ = useQuery({ queryKey: ["profile-kit"], queryFn: () => listKit() });
  const kit = kitQ.data?.items ?? [];

  async function save(kind: "headline" | "about" | "featured" | "banner_tagline", content: string, title?: string) {
    try {
      await saveItem({ data: { kind, content, ...(title ? { title } : {}) } });
      await qc.invalidateQueries({ queryKey: ["profile-kit"] });
      toast.success("Saved to your Profile Kit");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  }

  async function remove(id: string) {
    try {
      await deleteItem({ data: { id } });
      await qc.invalidateQueries({ queryKey: ["profile-kit"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    }
  }

  const counts = useMemo(() => {
    const by = (k: string) => kit.filter((i) => i.kind === k).length;
    return {
      headline: by("headline"),
      about: by("about"),
      featured: by("featured"),
      banner_tagline: by("banner_tagline"),
    };
  }, [kit]);

  const done = [counts.headline > 0, counts.about > 0, counts.featured > 0, counts.banner_tagline > 0];
  const strength = 20 + done.filter(Boolean).length * 20;

  return (
    <AppShell title="Profile Optimizer">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold">Profile strength</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Save one headline, one About version, your Featured plan and a banner tagline to reach 100%.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Progress value={strength} className="h-2 w-40" />
              <span className="text-sm font-semibold text-brand">{strength}%</span>
            </div>
          </div>
          <label className="flex shrink-0 items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm">
            <Wand2 className="h-4 w-4 text-brand" />
            <span className="flex-1">Write in my brand voice</span>
            <Switch checked={useVoice} onCheckedChange={setUseVoice} />
          </label>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  tab === t.key
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "overview" && (
          <Overview counts={counts} kit={kit} onRemove={remove} onJump={setTab} />
        )}
        {tab === "headline" && <HeadlineTool useVoice={useVoice} onSave={save} />}
        {tab === "about" && <AboutTool useVoice={useVoice} onSave={save} />}
        {tab === "featured" && <FeaturedTool onSave={save} />}
        {tab === "visuals" && <VisualsTool useVoice={useVoice} onSave={save} />}
      </div>
    </AppShell>
  );
}

type KitItem = { id: string; kind: string; title: string | null; content: string; created_at: string };

function Overview({
  counts,
  kit,
  onRemove,
  onJump,
}: {
  counts: Record<string, number>;
  kit: KitItem[];
  onRemove: (id: string) => void;
  onJump: (t: TabKey) => void;
}) {
  const tools: Array<{ key: TabKey; title: string; desc: string; icon: typeof Type; count: number }> = [
    { key: "headline", title: "Headline", desc: "5 styles, under 220 characters each", icon: Type, count: counts['headline'] ?? 0 },
    { key: "about", title: "About section", desc: "4 rewrites with LinkedIn-friendly formatting", icon: FileText, count: counts['about'] ?? 0 },
    { key: "featured", title: "Featured", desc: "What to pin, and why it works", icon: Pin, count: counts['featured'] ?? 0 },
    { key: "visuals", title: "Photo & banner", desc: "Checklists plus 3 tagline ideas", icon: Camera, count: counts['banner_tagline'] ?? 0 },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map((t) => (
          <Card key={t.key}>
            <button className="w-full text-left" onClick={() => onJump(t.key)}>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
                  <t.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-base font-semibold">{t.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
                </div>
                {t.count > 0 && <BadgeCheck className="ml-auto h-5 w-5 shrink-0 text-success" />}
              </div>
            </button>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold">Profile Kit</h2>
        <p className="mt-1 text-sm text-muted-foreground">Everything you saved, ready to paste into LinkedIn.</p>
        {kit.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center">
            <Bookmark className="mx-auto h-6 w-6 text-brand" />
            <p className="mt-3 font-display text-base font-semibold">Nothing saved yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate a headline or About version, then hit Save to keep your best options here.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {kit.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-brand">
                      {item.kind.replace("_", " ")}
                      {item.title ? ` · ${item.title}` : ""}
                    </span>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{item.content}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon" variant="ghost" onClick={() => copyText(item.content)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => onRemove(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function copyText(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copied");
}

type SaveFn = (
  kind: "headline" | "about" | "featured" | "banner_tagline",
  content: string,
  title?: string,
) => void;

function HeadlineTool({ useVoice, onSave }: { useVoice: boolean; onSave: SaveFn }) {
  const run = useServerFn(generateHeadlines);
  const [current, setCurrent] = useState("");
  const [goal, setGoal] = useState("");
  const [industry, setIndustry] = useState("");
  const [keywords, setKeywords] = useState("");
  const [items, setItems] = useState<Array<{ style: string; text: string }>>([]);
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (goal.trim().length < 3 || industry.trim().length < 2) {
      toast.error("Add your target role/goal and industry first.");
      return;
    }
    setLoading(true);
    try {
      const res = await run({
        data: { current, goal, industry, keywords, useVoice },
      });
      setItems(res.headlines);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="h-fit">
        <h2 className="font-display text-base font-semibold">Headline inputs</h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="hl-current">Current headline (optional)</Label>
            <Textarea id="hl-current" rows={2} value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Product Manager at Acme" />
          </div>
          <div>
            <Label htmlFor="hl-goal">Target role / goal</Label>
            <Input id="hl-goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Senior Product Manager · attract freelance clients" />
          </div>
          <div>
            <Label htmlFor="hl-industry">Industry</Label>
            <Input id="hl-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="B2B SaaS, fintech, healthcare…" />
          </div>
          <div>
            <Label htmlFor="hl-keywords">Key strengths or keywords (optional)</Label>
            <Textarea id="hl-keywords" rows={2} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="0→1 products, pricing, growth loops" />
          </div>
          <Button className="w-full bg-brand-gradient text-brand-foreground" onClick={generate} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate 5 headlines
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        {items.length === 0 && !loading ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <Type className="mx-auto h-6 w-6 text-brand" />
            <p className="mt-3 font-display text-base font-semibold">Five headline angles, one click</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Results-focused, authority, story-driven, keyword-optimized and bold — all under LinkedIn's 220 character limit.
            </p>
          </div>
        ) : null}
        {items.map((h, i) => (
          <Card key={i}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-brand">
                {STYLE_LABEL[h.style] ?? h.style}
              </span>
              <span className={cn("text-xs", h.text.length > 220 ? "text-destructive" : "text-muted-foreground")}>
                {h.text.length}/220
              </span>
            </div>
            <Textarea
              rows={3}
              className="mt-2"
              value={h.text}
              onChange={(e) =>
                setItems((prev) => prev.map((v, idx) => (idx === i ? { ...v, text: e.target.value } : v)))
              }
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => copyText(h.text)}>
                <Copy className="mr-2 h-3.5 w-3.5" /> Copy
              </Button>
              <Button size="sm" variant="outline" onClick={() => onSave("headline", h.text, STYLE_LABEL[h.style] ?? h.style)}>
                <Bookmark className="mr-2 h-3.5 w-3.5" /> Save favorite
              </Button>
              <Button size="sm" variant="ghost" onClick={generate} disabled={loading}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" /> Regenerate
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AboutTool({ useVoice, onSave }: { useVoice: boolean; onSave: SaveFn }) {
  const run = useServerFn(generateAbout);
  const refine = useServerFn(refineText);
  const [current, setCurrent] = useState("");
  const [audience, setAudience] = useState("Recruiters");
  const [goal, setGoal] = useState("");
  const [tone, setTone] = useState<(typeof TONES)[number]>("professional");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [versions, setVersions] = useState<Array<{ kind: string; text: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  async function generate() {
    if (goal.trim().length < 3) {
      toast.error("Tell us the main goal of your About section.");
      return;
    }
    setLoading(true);
    try {
      const res = await run({ data: { current, audience, goal, tone, length, useVoice } });
      setVersions(res.versions);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function tweak(i: number, instruction: string) {
    const version = versions[i];
    if (!version) return;
    setBusy(i);
    try {
      const res = await refine({ data: { text: version.text, instruction } });
      setVersions((prev) => prev.map((v, idx) => (idx === i ? { ...v, text: res.text } : v)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rewrite failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="h-fit">
        <h2 className="font-display text-base font-semibold">About inputs</h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="ab-current">Current About section</Label>
            <Textarea id="ab-current" rows={6} value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Paste what's on your profile today…" />
          </div>
          <div>
            <Label htmlFor="ab-audience">Target audience</Label>
            <Input id="ab-audience" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Recruiters, clients, peers…" />
          </div>
          <div>
            <Label htmlFor="ab-goal">Main goal</Label>
            <Input id="ab-goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Get inbound consulting enquiries" />
          </div>
          <div>
            <Label>Tone</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {TONES.map((t) => (
                <Button key={t} size="sm" variant={tone === t ? "default" : "outline"} onClick={() => setTone(t)} className="capitalize">
                  {t}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label>Length</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {LENGTHS.map((l) => (
                <Button key={l.key} size="sm" variant={length === l.key ? "default" : "outline"} onClick={() => setLength(l.key)}>
                  {l.label}
                </Button>
              ))}
            </div>
          </div>
          <Button className="w-full bg-brand-gradient text-brand-foreground" onClick={generate} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate 4 versions
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        {versions.length === 0 && !loading ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <FileText className="mx-auto h-6 w-6 text-brand" />
            <p className="mt-3 font-display text-base font-semibold">Four ways to tell your story</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Storytelling, results, authority and conversational — each formatted with short paragraphs that survive the "see more" cut.
            </p>
          </div>
        ) : null}
        {versions.map((v, i) => (
          <Card key={i}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-brand">
                {ABOUT_LABELS[v.kind] ?? v.kind}
              </span>
              <span className="text-xs text-muted-foreground">{v.text.length}/2600</span>
            </div>
            <Textarea
              rows={12}
              className="mt-2 whitespace-pre-wrap"
              value={v.text}
              onChange={(e) =>
                setVersions((prev) => prev.map((x, idx) => (idx === i ? { ...x, text: e.target.value } : x)))
              }
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => copyText(v.text)}>
                <Copy className="mr-2 h-3.5 w-3.5" /> Copy
              </Button>
              <Button size="sm" variant="outline" onClick={() => onSave("about", v.text, ABOUT_LABELS[v.kind] ?? v.kind)}>
                <Bookmark className="mr-2 h-3.5 w-3.5" /> Save
              </Button>
              {["Make it shorter", "Make it longer", "Add a stronger hook", "Make it more specific"].map((ins) => (
                <Button key={ins} size="sm" variant="ghost" disabled={busy !== null} onClick={() => tweak(i, ins)}>
                  {busy === i ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                  {ins}
                </Button>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function FeaturedTool({ onSave }: { onSave: SaveFn }) {
  const run = useServerFn(recommendFeatured);
  const describe = useServerFn(describeFeaturedItem);
  const [assets, setAssets] = useState<string[]>(["LinkedIn posts"]);
  const [industry, setIndustry] = useState("");
  const [goal, setGoal] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Array<{ title: string; description: string; pin: string; why: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  function toggle(a: string) {
    setAssets((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  async function generate() {
    if (assets.length === 0 || industry.trim().length < 2 || goal.trim().length < 3) {
      toast.error("Pick your content types, industry and goal.");
      return;
    }
    setLoading(true);
    try {
      const res = await run({ data: { assets, industry, goal, notes } });
      setItems(res.items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function regenDescription(i: number) {
    const item = items[i];
    if (!item) return;
    setBusy(i);
    try {
      const res = await describe({ data: { title: item.title, context: `${industry}. Goal: ${goal}` } });
      setItems((prev) => prev.map((x, idx) => (idx === i ? { ...x, description: res.text } : x)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not write a description");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="h-fit">
        <h2 className="font-display text-base font-semibold">What do you have?</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {ASSET_TYPES.map((a) => (
            <button
              key={a}
              onClick={() => toggle(a)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
                assets.includes(a)
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {assets.includes(a) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 opacity-40" />}
              {a}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="ft-industry">Industry</Label>
            <Input id="ft-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ft-goal">Goal</Label>
            <Input id="ft-goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Get hired · attract clients" />
          </div>
          <div>
            <Label htmlFor="ft-notes">Anything specific to feature? (optional)</Label>
            <Textarea id="ft-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button className="w-full bg-brand-gradient text-brand-foreground" onClick={generate} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Recommend Featured items
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        {items.length === 0 && !loading ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <Pin className="mx-auto h-6 w-6 text-brand" />
            <p className="mt-3 font-display text-base font-semibold">Your Featured section is prime real estate</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tell us what you have and we'll rank what to pin, with ready-to-paste titles and descriptions.
            </p>
          </div>
        ) : null}
        {items.map((it, i) => (
          <Card key={i}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-base font-semibold">{it.title}</h3>
              <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">#{i + 1}</span>
            </div>
            <p className="mt-2 text-sm text-foreground">{it.description}</p>
            {it.pin && (
              <p className="mt-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Pin: </span>
                {it.pin}
              </p>
            )}
            {it.why && (
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Why it works: </span>
                {it.why}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => copyText(`${it.title}\n${it.description}`)}>
                <Copy className="mr-2 h-3.5 w-3.5" /> Copy
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSave("featured", `${it.description}\n\nPin: ${it.pin}\nWhy: ${it.why}`, it.title)}
              >
                <Bookmark className="mr-2 h-3.5 w-3.5" /> Save
              </Button>
              <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => regenDescription(i)}>
                {busy === i ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Wand2 className="mr-2 h-3.5 w-3.5" />}
                New description
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

const PHOTO_DOS = [
  "Face fills roughly 60% of the frame, shoulders visible",
  "Soft, even light on your face — window light beats overheads",
  "Plain or gently blurred background, nothing competing",
  "Eyes to camera, natural half-smile",
  "Dress one notch above your day-to-day work outfit",
  "Recent — within the last two years",
];

const PHOTO_DONTS = [
  "Group photos or cropped wedding shots",
  "Sunglasses, hats or heavy filters",
  "Busy backgrounds, car selfies, bathroom mirrors",
  "Logos or text pasted over your face",
  "Low-resolution or heavily zoomed crops",
];

const BANNER_TIPS = [
  "1584 × 396 px, PNG or JPG under 8MB",
  "Keep the left third clear — your photo overlaps it on desktop",
  "One idea only: a value proposition, proof, or an availability line",
  "Text at least 28px so it survives mobile scaling",
  "Two colours max plus your brand accent — high contrast wins",
];

function VisualsTool({ useVoice, onSave }: { useVoice: boolean; onSave: SaveFn }) {
  const run = useServerFn(generateBannerTaglines);
  const [industry, setIndustry] = useState("");
  const [goal, setGoal] = useState("");
  const [taglines, setTaglines] = useState<string[]>([]);
  const [artDirection, setArtDirection] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (industry.trim().length < 2 || goal.trim().length < 3) {
      toast.error("Add your industry and goal first.");
      return;
    }
    setLoading(true);
    try {
      const res = await run({ data: { industry, goal, useVoice } });
      setTaglines(res.taglines);
      setArtDirection(res.artDirection);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-brand" />
          <h2 className="font-display text-base font-semibold">Profile photo</h2>
        </div>
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-success">Do</p>
        <ul className="mt-2 space-y-2">
          {PHOTO_DOS.map((d) => (
            <li key={d} className="flex gap-2 text-sm text-muted-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              {d}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs font-medium uppercase tracking-wide text-destructive">Don't</p>
        <ul className="mt-2 space-y-2">
          {PHOTO_DONTS.map((d) => (
            <li key={d} className="flex gap-2 text-sm text-muted-foreground">
              <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              {d}
            </li>
          ))}
        </ul>
        {industry.trim().length > 1 && (
          <p className="mt-5 rounded-xl border border-border bg-background p-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Tip for {industry}: </span>
            {/creative|design|art|media|market/i.test(industry)
              ? "you can push personality — colour in the background, a hint of your workspace, warmer editing."
              : "keep it conservative: neutral background, structured clothing, minimal editing. Credibility beats character here."}
          </p>
        )}
      </Card>

      <div className="space-y-6">
        <Card>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-brand" />
            <h2 className="font-display text-base font-semibold">Banner image</h2>
          </div>
          <ul className="mt-3 space-y-2">
            {BANNER_TIPS.map((t) => (
              <li key={t} className="flex gap-2 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                {t}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="font-display text-base font-semibold">Banner tagline ideas</h2>
          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="vs-industry">Industry</Label>
              <Input id="vs-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="vs-goal">Goal</Label>
              <Input id="vs-goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Open to opportunities · attract clients" />
            </div>
            <Button className="w-full bg-brand-gradient text-brand-foreground" onClick={generate} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate 3 taglines
            </Button>
          </div>
          {taglines.length > 0 && (
            <div className="mt-4 space-y-3">
              {taglines.map((t, i) => (
                <div key={i} className="rounded-xl border border-border bg-background p-3">
                  <p className="text-sm font-medium">{t}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => copyText(t)}>
                      <Copy className="mr-2 h-3.5 w-3.5" /> Copy
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onSave("banner_tagline", t)}>
                      <Bookmark className="mr-2 h-3.5 w-3.5" /> Save
                    </Button>
                  </div>
                </div>
              ))}
              {artDirection && (
                <p className="rounded-xl border border-border bg-background p-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Art direction: </span>
                  {artDirection}
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}