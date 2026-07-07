import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Send, Trash2, Pencil } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { listPosts, publishPostNow, deletePost } from "@/lib/posts.functions";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Content calendar — Postpilot" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const listFn = useServerFn(listPosts);
  const posts = useQuery({ queryKey: ["posts"], queryFn: () => listFn() });
  const client = useQueryClient();
  const publishFn = useServerFn(publishPostNow);
  const delFn = useServerFn(deletePost);

  const publishMut = useMutation({
    mutationFn: (id: string) => publishFn({ data: { id } }),
    onSuccess: () => { client.invalidateQueries({ queryKey: ["posts"] }); toast.success("Published"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { client.invalidateQueries({ queryKey: ["posts"] }); toast.success("Deleted"); },
  });

  const days = useMemo(() => buildCalendar(month), [month]);
  const byDay = useMemo(() => {
    const map = new Map<string, typeof posts.data>();
    (posts.data ?? []).forEach((p) => {
      const when = p.scheduled_at ?? p.posted_at ?? p.created_at;
      if (!when) return;
      const key = new Date(when).toISOString().slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr as typeof posts.data);
    });
    return map;
  }, [posts.data]);

  const monthLabel = month.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <AppShell title="Content calendar">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-display text-lg font-semibold">{monthLabel}</div>
          <Button size="sm" variant="outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Link to="/generator"><Button size="sm" className="bg-brand-gradient text-brand-foreground">New post</Button></Link>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-border bg-border text-xs">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
          <div key={d} className="bg-card px-3 py-2 font-medium text-muted-foreground">{d}</div>
        ))}
        {days.map((d) => {
          const key = d.date.toISOString().slice(0, 10);
          const items = byDay.get(key) ?? [];
          return (
            <div key={key} className={`min-h-28 bg-card p-2 ${d.inMonth ? "" : "opacity-40"}`}>
              <div className="mb-1 text-[10px] text-muted-foreground">{d.date.getDate()}</div>
              <div className="space-y-1">
                {items.map((p) => (
                  <div key={p.id} className={`group rounded-md border px-2 py-1 ${statusBg(p.status)}`}>
                    <p className="line-clamp-2 text-[11px] leading-snug">{p.content}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[9px] uppercase tracking-wide">{p.status}</span>
                      <div className="flex gap-1">
                        {p.status !== "posted" && (
                          <Link
                            to="/generator"
                            search={{ postId: p.id }}
                            title="Edit"
                            className="text-foreground/70 hover:text-brand"
                          >
                            <Pencil className="h-3 w-3" />
                          </Link>
                        )}
                        {p.status !== "posted" && (
                          <button title="Publish now" onClick={() => publishMut.mutate(p.id)} className="text-brand hover:opacity-80">
                            <Send className="h-3 w-3" />
                          </button>
                        )}
                        <button title="Delete" onClick={() => delMut.mutate(p.id)} className="text-destructive hover:opacity-80">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Scheduled posts publish automatically to LinkedIn when their time comes.
      </p>
    </AppShell>
  );
}

function statusBg(s: string) {
  if (s === "posted") return "border-success/40 bg-success/10 text-success";
  if (s === "scheduled") return "border-brand/40 bg-brand/10 text-brand";
  if (s === "failed") return "border-destructive/40 bg-destructive/10 text-destructive";
  return "border-border bg-background text-foreground";
}

function buildCalendar(month: Date) {
  const first = new Date(month);
  const startDow = (first.getDay() + 6) % 7; // Monday = 0
  const start = new Date(first);
  start.setDate(first.getDate() - startDow);
  const days: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({ date: d, inMonth: d.getMonth() === month.getMonth() });
  }
  return days;
}