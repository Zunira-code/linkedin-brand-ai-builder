import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Flame, Wand2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listInspiration } from "@/lib/inspiration.functions";

export const Route = createFileRoute("/_authenticated/inspiration")({
  head: () => ({ meta: [{ title: "Inspiration library — Postpilot" }] }),
  component: Inspiration,
});

function Inspiration() {
  const fn = useServerFn(listInspiration);
  const q = useQuery({ queryKey: ["inspiration"], queryFn: () => fn() });
  const navigate = useNavigate();
  const [filter, setFilter] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set((q.data ?? []).map((t) => t.category))).sort(),
    [q.data],
  );

  const items = useMemo(() => {
    return (q.data ?? []).filter((t) => {
      if (cat && t.category !== cat) return false;
      if (filter) {
        const f = filter.toLowerCase();
        return t.title.toLowerCase().includes(f) || t.template_text.toLowerCase().includes(f);
      }
      return true;
    });
  }, [q.data, filter, cat]);

  return (
    <AppShell title="Inspiration library">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search hooks and templates…" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
        <Button size="sm" variant={cat === null ? "default" : "outline"} onClick={() => setCat(null)}>All</Button>
        {categories.map((c) => (
          <Button key={c} size="sm" variant={cat === c ? "default" : "outline"} onClick={() => setCat(c)}>{c}</Button>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((t) => (
          <div key={t.id} className="flex flex-col rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Flame className="h-3.5 w-3.5 text-brand" />
              <span>{t.category}</span>
              <span>·</span>
              <span>{t.hook_type}</span>
            </div>
            <h3 className="mt-2 font-display text-base font-semibold">{t.title}</h3>
            <pre className="mt-3 flex-1 whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
              {t.template_text}
            </pre>
            <Button
              size="sm"
              className="mt-4 self-start bg-brand-gradient text-brand-foreground"
              onClick={() =>
                navigate({
                  to: "/generator",
                  search: { topic: t.title, hook: t.hook_type, template: t.template_text },
                })
              }
            >
              <Wand2 className="mr-2 h-3.5 w-3.5" /> Remix with AI
            </Button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}