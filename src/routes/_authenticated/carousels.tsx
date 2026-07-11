import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
import {
  Sparkles,
  Loader2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Download,
  Images,
  Palette,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@tanstack/react-router";
import {
  listCarousels,
  getCarousel,
  saveCarousel,
  deleteCarousel,
  generateCarouselSlides,
  saveCarouselAsPost,
  markCarouselPosted,
  SLIDE_TITLE_MAX,
  SLIDE_BODY_MAX,
  CAROUSEL_WIDTH,
  CAROUSEL_HEIGHT,
  type Slide,
} from "@/lib/carousels.functions";
import { getMyProfile } from "@/lib/profile.functions";

type SearchParams = { id?: string };

export const Route = createFileRoute("/_authenticated/carousels")({
  head: () => ({ meta: [{ title: "Carousels — Postpilot" }] }),
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  component: CarouselsPage,
});

type Template = "bold" | "minimal" | "editorial";
const TEMPLATES: Array<{ id: Template; label: string; description: string }> = [
  { id: "bold", label: "Bold", description: "Big type on your brand color" },
  { id: "minimal", label: "Minimal", description: "White canvas, thin accent" },
  { id: "editorial", label: "Editorial", description: "Serif headline, muted paper" },
];

function CarouselsPage() {
  const search = useSearch({ from: "/_authenticated/carousels" });
  return search.id ? <Editor id={search.id} /> : <Library />;
}

function Library() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const listFn = useServerFn(listCarousels);
  const saveFn = useServerFn(saveCarousel);
  const delFn = useServerFn(deleteCarousel);
  const list = useQuery({ queryKey: ["carousels"], queryFn: () => listFn() });

  const createBlank = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          title: "Untitled carousel",
          template: "bold",
          slides: [
            { title: "Your hook goes here", body: "A one-line promise readers can't scroll past." },
            { title: "Point 1", body: "Say something specific here." },
            { title: "Point 2", body: "Say something specific here." },
            { title: "Follow for more", body: "Comment 'yes' if this helped." },
          ],
          status: "draft",
        },
      }),
    onSuccess: (out) => {
      client.invalidateQueries({ queryKey: ["carousels"] });
      if (out?.id) navigate({ to: "/carousels", search: { id: out.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["carousels"] }),
  });

  return (
    <AppShell title="Carousels">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Break down a topic or long-form article into a swipeable LinkedIn carousel.
          </p>
        </div>
        <Button onClick={() => createBlank.mutate()} className="bg-brand-gradient text-brand-foreground">
          {createBlank.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          New carousel
        </Button>
      </div>

      {list.isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (list.data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Images className="mx-auto h-8 w-8 text-brand" />
          <h3 className="mt-3 font-display text-lg font-semibold">No carousels yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Turn a topic or article into a 5–8 slide swipeable deck. Paste your source, pick a template, edit inline, then schedule or publish.
          </p>
          <Button onClick={() => createBlank.mutate()} className="mt-5 bg-brand-gradient text-brand-foreground">
            <Plus className="mr-2 h-4 w-4" /> Start your first carousel
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(list.data ?? []).map((c) => {
            const slides = (c.slides as unknown as Slide[]) ?? [];
            return (
              <Link
                key={c.id}
                to="/carousels"
                search={{ id: c.id }}
                className="group rounded-2xl border border-border bg-card p-4 transition hover:border-brand/60"
              >
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-muted/40 p-4">
                  <MiniSlide slide={slides[0] ?? { title: "Empty", body: "" }} template={c.template as Template} brand={{ primary: "#0F172A", secondary: "#FFFFFF", accent: "#3B82F6", logo: null }} />
                </div>
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {slides.length} slide{slides.length === 1 ? "" : "s"} · {c.status}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      if (confirm("Delete this carousel?")) del.mutate(c.id);
                    }}
                    className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

type Brand = {
  primary: string;
  secondary: string;
  accent: string;
  logo: string | null;
  font: string;
};

const FONT_STACKS: Record<string, string> = {
  inter: "Inter, system-ui, sans-serif",
  "space-grotesk": "'Space Grotesk', system-ui, sans-serif",
  "dm-serif": "'DM Serif Display', Georgia, serif",
  geist: "Geist, system-ui, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
};

function fontStack(brand: Brand, fallback: string) {
  return FONT_STACKS[brand.font] || fallback;
}

function Editor({ id }: { id: string }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const getFn = useServerFn(getCarousel);
  const saveFn = useServerFn(saveCarousel);
  const genFn = useServerFn(generateCarouselSlides);
  const saveAsPostFn = useServerFn(saveCarouselAsPost);
  const markPostedFn = useServerFn(markCarouselPosted);
  const profileFn = useServerFn(getMyProfile);

  const q = useQuery({ queryKey: ["carousel", id], queryFn: () => getFn({ data: { id } }) });
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => profileFn() });

  const brand = useMemo<Brand>(() => {
    const p = profile.data as unknown as {
      brand_primary_color?: string | null;
      brand_secondary_color?: string | null;
      brand_accent_color?: string | null;
      brand_logo_url?: string | null;
      brand_font?: string | null;
    } | undefined;
    return {
      primary: p?.brand_primary_color || "#0F172A",
      secondary: p?.brand_secondary_color || "#FFFFFF",
      accent: p?.brand_accent_color || "#3B82F6",
      logo: p?.brand_logo_url ?? null,
      font: p?.brand_font || "inter",
    };
  }, [profile.data]);

  const [title, setTitle] = useState("Untitled carousel");
  const [template, setTemplate] = useState<Template>("bold");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [selected, setSelected] = useState(0);
  const [caption, setCaption] = useState("");
  const [source, setSource] = useState("");
  const [slideCount, setSlideCount] = useState(6);

  useEffect(() => {
    if (!q.data) return;
    setTitle(q.data.title);
    setTemplate((q.data.template as Template) ?? "bold");
    setSlides((q.data.slides as unknown as Slide[]) ?? []);
  }, [q.data]);

  const generate = useMutation({
    mutationFn: () => genFn({ data: { source, slideCount } }),
    onSuccess: (out) => {
      setTitle(out.title);
      setSlides(out.slides);
      setSelected(0);
      toast.success(`Generated ${out.slides.length} slides — edit them below.`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const save = useMutation({
    mutationFn: (input: { status: "draft" | "ready" | "posted" }) =>
      saveFn({
        data: {
          id,
          title,
          template,
          slides,
          status: input.status,
        },
      }),
    onSuccess: (_out, vars) => {
      client.invalidateQueries({ queryKey: ["carousels"] });
      client.invalidateQueries({ queryKey: ["carousel", id] });
      toast.success(vars.status === "posted" ? "Marked as posted" : "Saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);

  async function renderAllToPngDataUrls(): Promise<string[]> {
    const urls: string[] = [];
    for (let i = 0; i < slides.length; i++) {
      const node = slideRefs.current[i];
      if (!node) throw new Error(`Slide ${i + 1} not rendered yet`);
      const url = await htmlToImage.toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
      });
      urls.push(url);
    }
    return urls;
  }

  const exportPdf = useMutation({
    mutationFn: async () => {
      if (slides.length < 2) throw new Error("Add at least 2 slides.");
      await save.mutateAsync({ status: "ready" });
      const urls = await renderAllToPngDataUrls();
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [CAROUSEL_WIDTH, CAROUSEL_HEIGHT],
        hotfixes: ["px_scaling"],
      });
      urls.forEach((url, i) => {
        if (i > 0) pdf.addPage([CAROUSEL_WIDTH, CAROUSEL_HEIGHT], "portrait");
        pdf.addImage(url, "PNG", 0, 0, CAROUSEL_WIDTH, CAROUSEL_HEIGHT, undefined, "FAST");
      });
      const filename = `${(title || "carousel").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
      pdf.save(filename);
      // Log a "ready to post manually" post row so it shows on Dashboard/Calendar.
      await saveAsPostFn({ data: { id, caption } });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["carousels"] });
      client.invalidateQueries({ queryKey: ["carousel", id] });
      client.invalidateQueries({ queryKey: ["posts"] });
      toast.success("PDF downloaded. Upload it on LinkedIn to publish.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const markPosted = useMutation({
    mutationFn: () => markPostedFn({ data: { id } }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["carousels"] });
      client.invalidateQueries({ queryKey: ["carousel", id] });
      client.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Marked as posted — nice work.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  function updateSlide(i: number, patch: Partial<Slide>) {
    setSlides((s) => s.map((sl, idx) => (idx === i ? { ...sl, ...patch } : sl)));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    setSlides((s) => {
      const next = [...s];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setSelected(j);
  }
  function addSlide() {
    if (slides.length >= 12) return toast.error("LinkedIn caps carousels at 12 slides.");
    setSlides((s) => [...s, { title: "New slide", body: "" }]);
    setSelected(slides.length);
  }
  function removeSlide(i: number) {
    if (slides.length <= 1) return;
    setSlides((s) => s.filter((_, idx) => idx !== i));
    setSelected((sel) => Math.min(sel, slides.length - 2));
  }

  return (
    <AppShell title="Carousel editor">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/carousels", search: {} })}>
          ← Back to library
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => save.mutate({ status: "draft" })}
            disabled={save.isPending}
          >
            <Save className="mr-2 h-3.5 w-3.5" /> Save draft
          </Button>
          {q.data?.status === "ready" || q.data?.status === "posted" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markPosted.mutate()}
              disabled={markPosted.isPending || q.data?.status === "posted"}
            >
              <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
              {q.data?.status === "posted" ? "Posted" : "Mark as posted"}
            </Button>
          ) : null}
          <Button
            className="bg-brand-gradient text-brand-foreground"
            size="sm"
            onClick={() => exportPdf.mutate()}
            disabled={exportPdf.isPending || slides.length < 2}
          >
            {exportPdf.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-2 h-3.5 w-3.5" />}
            Download PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* LEFT: brief + slide list */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" />
              <h2 className="font-display font-semibold">Generate slides</h2>
            </div>
            <div className="mt-3 space-y-3">
              <div>
                <Label className="text-xs">Topic or long-form text</Label>
                <Textarea
                  rows={5}
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Paste an article, transcript, or write a topic like: 5 mistakes I made in my first year as a founder."
                />
              </div>
              <div>
                <Label className="text-xs">Number of slides</Label>
                <Input
                  type="number"
                  min={5}
                  max={8}
                  value={slideCount}
                  onChange={(e) => setSlideCount(Math.max(5, Math.min(8, Number(e.target.value) || 6)))}
                />
              </div>
              <Button
                onClick={() => generate.mutate()}
                disabled={generate.isPending || source.trim().length < 20}
                className="w-full bg-brand-gradient text-brand-foreground"
              >
                {generate.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate {slideCount} slides</>}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-brand" />
              <h2 className="font-display font-semibold">Template</h2>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`rounded-lg border p-2 text-left text-xs transition ${
                    template === t.id ? "border-brand ring-2 ring-brand/30" : "border-border hover:border-brand/40"
                  }`}
                >
                  <div className="mb-1 aspect-square overflow-hidden rounded">
                    <MiniSlide
                      slide={{ title: "Aa", body: "Preview" }}
                      template={t.id}
                      brand={brand}
                    />
                  </div>
                  <div className="font-medium">{t.label}</div>
                  <div className="text-[10px] text-muted-foreground">{t.description}</div>
                </button>
              ))}
            </div>
            {!profile.data ||
            !((profile.data as { brand_primary_color?: string | null }).brand_primary_color) ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Using default colors.{" "}
                <Link to="/settings" className="text-brand hover:underline">
                  Add your brand kit
                </Link>{" "}
                for on-brand slides.
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-brand" />
                <h2 className="font-display font-semibold">Slides ({slides.length})</h2>
              </div>
              <Button size="sm" variant="ghost" onClick={addSlide}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
              {slides.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  className={`flex w-full items-start gap-2 rounded-md border p-2 text-left text-xs transition ${
                    selected === i ? "border-brand bg-brand/5" : "border-border hover:bg-accent/40"
                  }`}
                >
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-muted text-[10px] font-medium">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{s.title || "Untitled"}</span>
                    <span className="block truncate text-muted-foreground">{s.body || "No body"}</span>
                  </span>
                  <span className="flex flex-shrink-0 flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); move(i, -1); }}
                      disabled={i === 0}
                      className="text-muted-foreground disabled:opacity-30 hover:text-foreground"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); move(i, 1); }}
                      disabled={i === slides.length - 1}
                      className="text-muted-foreground disabled:opacity-30 hover:text-foreground"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeSlide(i); }}
                    className="text-muted-foreground hover:text-destructive"
                    disabled={slides.length <= 1}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: preview + editor */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-0 bg-transparent px-0 font-display text-xl font-semibold shadow-none focus-visible:ring-0"
            />
          </div>

          {slides.length === 0 ? (
            <div className="flex h-[520px] items-center justify-center rounded-2xl border border-dashed border-border bg-card text-center text-sm text-muted-foreground">
              Paste a topic or article on the left and click Generate.
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-border bg-muted/30 p-6">
                <div className="mx-auto flex aspect-square w-full max-w-[520px] items-center justify-center overflow-hidden rounded-xl shadow-lg">
                  <SlidePreview
                    slide={slides[selected]}
                    template={template}
                    brand={brand}
                    index={selected}
                    total={slides.length}
                    scale={1}
                  />
                </div>

                <div className="mt-4 grid gap-3">
                  <div>
                    <Label className="text-xs">Slide {selected + 1} title</Label>
                    <Input
                      value={slides[selected]?.title ?? ""}
                      onChange={(e) => updateSlide(selected, { title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Body</Label>
                    <Textarea
                      rows={3}
                      value={slides[selected]?.body ?? ""}
                      onChange={(e) => updateSlide(selected, { body: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Off-screen full-resolution renderers used for publishing/download */}
              <div className="pointer-events-none fixed left-[-99999px] top-0" aria-hidden>
                {slides.map((s, i) => (
                  <div
                    key={i}
                    ref={(el) => {
                      slideRefs.current[i] = el;
                    }}
                  >
                    <SlidePreview slide={s} template={template} brand={brand} index={i} total={slides.length} scale={1} exportSize />
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <Label className="text-xs">Post caption (paste this on LinkedIn along with the PDF)</Label>
                <Textarea
                  rows={4}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder={`A one-line hook. Then a swipeable ${slides.length}-slide breakdown ↓`}
                />
              </div>

              <div className="rounded-2xl border border-brand/30 bg-brand/5 p-5">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" />
                  <div className="text-sm">
                    <div className="font-medium">Carousels can&rsquo;t auto-post — that&rsquo;s a LinkedIn limitation, not ours.</div>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                      <li>Click <span className="font-medium text-foreground">Download PDF</span> above.</li>
                      <li>On LinkedIn, click <span className="font-medium text-foreground">Start a post</span> → the <span className="font-medium text-foreground">document icon</span> → upload the file.</li>
                      <li>Paste the caption above, publish, then hit <span className="font-medium text-foreground">Mark as posted</span> here.</li>
                    </ol>
                    <div className="mt-2 text-xs text-muted-foreground">Takes about 30 seconds.</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Slide renderers — SlidePreview at 1080x1080, MiniSlide as thumb.  */
/* ------------------------------------------------------------------ */

function SlidePreview({
  slide,
  template,
  brand,
  index,
  total,
  exportSize,
}: {
  slide: Slide;
  template: Template;
  brand: Brand;
  index: number;
  total: number;
  scale?: number;
  exportSize?: boolean;
}) {
  // Fixed 1080x1080 canvas; scaled to fit its parent via CSS transform.
  const SIZE = 1080;
  return (
    <div
      className="relative"
      style={
        exportSize
          ? { width: SIZE, height: SIZE }
          : {
              width: SIZE,
              height: SIZE,
              transform: `scale(${520 / SIZE})`,
              transformOrigin: "top left",
              // Container is 520x520 (parent aspect-square). Prevent parent overflow.
              marginRight: -(SIZE - 520),
              marginBottom: -(SIZE - 520),
            }
      }
    >
      <TemplateSurface template={template} brand={brand} slide={slide} index={index} total={total} />
    </div>
  );
}

function TemplateSurface({
  template,
  brand,
  slide,
  index,
  total,
}: {
  template: Template;
  brand: Brand;
  slide: Slide;
  index: number;
  total: number;
}) {
  const isCover = index === 0;
  const isCta = index === total - 1;

  if (template === "bold") {
    return (
      <div
        className="flex h-full w-full flex-col justify-between p-20"
        style={{ background: brand.primary, color: brand.secondary, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
      >
        <div className="flex items-center justify-between">
          {brand.logo ? (
            <img
              src={brand.logo}
              alt=""
              className="h-14 w-auto max-w-[240px] object-contain"
              style={{ filter: "brightness(0) invert(1)" }}
              crossOrigin="anonymous"
            />
          ) : <span />}
          <span className="text-xl opacity-70">{index + 1} / {total}</span>
        </div>
        <div>
          <div className="text-[92px] font-bold leading-[1.02] tracking-tight">
            {slide.title || "Your headline"}
          </div>
          {slide.body ? (
            <div className="mt-8 whitespace-pre-wrap text-[36px] leading-[1.35] opacity-90">
              {slide.body}
            </div>
          ) : null}
          <div className="mt-10 h-2 w-24 rounded-full" style={{ background: brand.accent }} />
        </div>
        <div className="text-xl opacity-60">{isCover ? "Swipe →" : isCta ? "↑ Follow for more" : ""}</div>
      </div>
    );
  }

  if (template === "minimal") {
    return (
      <div
        className="flex h-full w-full flex-col justify-between p-24"
        style={{ background: brand.secondary, color: brand.primary, fontFamily: "Inter, system-ui, sans-serif" }}
      >
        <div className="flex items-center justify-between">
          {brand.logo ? (
            <img src={brand.logo} alt="" className="h-12 w-auto max-w-[220px] object-contain" crossOrigin="anonymous" />
          ) : <span />}
          <span className="text-lg" style={{ color: brand.accent }}>
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>
        <div>
          <div className="h-1 w-16 rounded-full" style={{ background: brand.accent }} />
          <div className="mt-8 text-[82px] font-semibold leading-[1.05] tracking-tight">
            {slide.title || "Your headline"}
          </div>
          {slide.body ? (
            <div className="mt-8 whitespace-pre-wrap text-[32px] leading-[1.4] opacity-80">
              {slide.body}
            </div>
          ) : null}
        </div>
        <div className="text-lg opacity-40">{isCover ? "Swipe →" : ""}</div>
      </div>
    );
  }

  // editorial
  return (
    <div
      className="flex h-full w-full flex-col justify-between p-24"
      style={{ background: "#F5F1EA", color: brand.primary, fontFamily: "'Space Grotesk', Georgia, serif" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg uppercase tracking-[0.3em]" style={{ color: brand.accent }}>
          {isCover ? "Essay" : isCta ? "The takeaway" : `Chapter ${index}`}
        </span>
        {brand.logo ? (
          <img src={brand.logo} alt="" className="h-10 w-auto max-w-[180px] object-contain" crossOrigin="anonymous" />
        ) : null}
      </div>
      <div className="max-w-[880px]">
        <div className="text-[76px] font-semibold leading-[1.08] tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
          {slide.title || "Your headline"}
        </div>
        {slide.body ? (
          <div className="mt-8 whitespace-pre-wrap text-[30px] leading-[1.45]">
            {slide.body}
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between text-lg opacity-60">
        <span>—</span>
        <span>{index + 1} of {total}</span>
      </div>
    </div>
  );
}

function MiniSlide({ slide, template, brand }: { slide: Slide; template: Template; brand: Brand }) {
  const bg = template === "minimal" ? brand.secondary : template === "editorial" ? "#F5F1EA" : brand.primary;
  const fg = template === "bold" ? brand.secondary : brand.primary;
  return (
    <div
      className="flex h-full w-full flex-col justify-between p-2"
      style={{ background: bg, color: fg }}
    >
      <div className="h-1 w-4 rounded-full" style={{ background: brand.accent }} />
      <div className="line-clamp-3 text-[10px] font-bold leading-tight">{slide.title}</div>
    </div>
  );
}