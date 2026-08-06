import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2, MessageSquarePlus, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateComments, refineComment } from "@/lib/comments.functions";

export const Route = createFileRoute("/_authenticated/comments")({
  head: () => ({
    meta: [
      { title: "AI comment generator — Postpilot" },
      {
        name: "description",
        content:
          "Generate thoughtful, on-brand LinkedIn comments on other people's posts in seconds, then refine them in one click.",
      },
      { property: "og:title", content: "AI comment generator — Postpilot" },
      {
        property: "og:description",
        content: "Paste a post, pick a style, get three ready-to-use LinkedIn comments in your voice.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommentGenerator,
});

type StyleKey = "thoughtful" | "supportive" | "question" | "experience" | "punchy";

const STYLES: Array<{ key: StyleKey; label: string; blurb: string }> = [
  { key: "thoughtful", label: "Thoughtful / insightful", blurb: "Adds a sharp perspective" },
  { key: "supportive", label: "Supportive + add value", blurb: "Affirm, then add a tip" },
  { key: "question", label: "Question-based", blurb: "Starts a conversation" },
  { key: "experience", label: "Personal experience", blurb: "Short, concrete anecdote" },
  { key: "punchy", label: "Short & punchy", blurb: "One or two lines" },
];

const REFINEMENTS = [
  "Make it shorter",
  "Add a question",
  "Make it more professional",
  "Make it warmer",
  "Make it more specific",
];

function CommentGenerator() {
  const generate = useServerFn(generateComments);
  const refine = useServerFn(refineComment);

  const [postText, setPostText] = useState("");
  const [url, setUrl] = useState("");
  const [style, setStyle] = useState<StyleKey>("thoughtful");
  const [comments, setComments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [refiningIndex, setRefiningIndex] = useState<number | null>(null);

  async function onGenerate() {
    setLoading(true);
    try {
      const res = await generate({
        data: {
          style,
          useVoice: true,
          ...(postText.trim() ? { postText: postText.trim() } : {}),
          ...(url.trim() ? { url: url.trim() } : {}),
        },
      });
      setComments(res.comments);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate comments");
    } finally {
      setLoading(false);
    }
  }

  async function onRefine(index: number, instruction: string) {
    setRefiningIndex(index);
    try {
      const res = await refine({
        data: {
          comment: comments[index],
          instruction,
          ...(postText.trim() ? { postText: postText.trim() } : {}),
        },
      });
      setComments((prev) => prev.map((c, i) => (i === index ? res.comment : c)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not refine that comment");
    } finally {
      setRefiningIndex(null);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Comment copied");
    } catch {
      toast.error("Copy failed — select the text manually");
    }
  }

  return (
    <AppShell title="AI comment generator">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold">The post you're commenting on</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste the post text for best results. LinkedIn blocks bots, so links often can't be read.
          </p>

          <div className="mt-4 space-y-2">
            <Label htmlFor="postText">Post text</Label>
            <Textarea
              id="postText"
              rows={9}
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="Paste the full post here…"
            />
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="url">Or a link (article / newsletter)</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>

          <div className="mt-5">
            <Label>Comment style</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {STYLES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStyle(s.key)}
                  className={
                    "rounded-xl border p-3 text-left transition " +
                    (style === s.key
                      ? "border-brand bg-brand/10"
                      : "border-border hover:border-brand/50")
                  }
                >
                  <span className="block text-sm font-medium">{s.label}</span>
                  <span className="block text-xs text-muted-foreground">{s.blurb}</span>
                </button>
              ))}
            </div>
          </div>

          <Button
            className="mt-5 w-full bg-brand-gradient text-brand-foreground"
            onClick={onGenerate}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate 3 comments
          </Button>
        </div>

        <div className="space-y-4">
          {comments.length === 0 && !loading ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <MessageSquarePlus className="mx-auto h-6 w-6 text-brand" />
              <p className="mt-3 font-display text-base font-semibold">Comments show up here</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Commenting well on other people's posts is the fastest way to grow reach. Paste a post,
                pick a style, and you'll get three options in your own voice.
              </p>
            </div>
          ) : null}

          {comments.map((c, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Option {i + 1}</span>
                <Button size="sm" variant="ghost" onClick={() => copy(c)}>
                  <Copy className="mr-2 h-3.5 w-3.5" /> Copy
                </Button>
              </div>
              <Textarea
                rows={5}
                className="mt-2"
                value={c}
                onChange={(e) =>
                  setComments((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                }
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {REFINEMENTS.map((r) => (
                  <Button
                    key={r}
                    size="sm"
                    variant="outline"
                    disabled={refiningIndex !== null}
                    onClick={() => onRefine(i, r)}
                  >
                    {refiningIndex === i ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                    {r}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}