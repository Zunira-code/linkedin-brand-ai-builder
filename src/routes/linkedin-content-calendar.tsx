import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, Clock, BarChart3, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingHeader, MarketingFooter, FaqList, faqSchema } from "@/components/marketing-chrome";

const TITLE = "LinkedIn Content Calendar & AI Scheduler | Postpilot";
const DESC =
  "Plan, schedule and auto-publish a month of LinkedIn posts. An AI LinkedIn scheduler with a drag-friendly content calendar, video posts and performance analytics.";

const faqs = [
  {
    q: "How does the LinkedIn content calendar work?",
    a: "Drop drafts onto any day and time. Postpilot auto-publishes text and video posts to LinkedIn when the slot arrives — no reminders to act on manually.",
  },
  {
    q: "Does the AI LinkedIn scheduler post automatically?",
    a: "Yes. Once you connect LinkedIn via official OAuth, scheduled posts publish on their own, and an optional first comment goes out a minute or two later so it looks natural.",
  },
  {
    q: "Can I schedule video posts and carousels?",
    a: "Video posts are included on Growth and above, and carousels on Agency. Both can be scheduled from the same calendar as your text posts.",
  },
  {
    q: "What if I run out of ideas mid-week?",
    a: "The built-in AI LinkedIn post generator fills empty slots from a topic, a link you want repurposed, or a viral pattern from the inspiration library.",
  },
];

export const Route = createFileRoute("/linkedin-content-calendar")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://app.mywork.co.ke/linkedin-content-calendar" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: "https://app.mywork.co.ke/linkedin-content-calendar" }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(faqSchema(faqs)) }],
  }),
  component: CalendarPage,
});

const blocks = [
  {
    icon: Calendar,
    title: "A week of posts at a glance",
    desc: "See every draft, scheduled post and gap in one LinkedIn content calendar instead of scattered docs and reminders.",
  },
  {
    icon: Clock,
    title: "Auto-publish at peak hours",
    desc: "The AI LinkedIn scheduler publishes for you — including an optional first comment sent shortly after the post lands.",
  },
  {
    icon: Video,
    title: "Text, video and carousels",
    desc: "Schedule short vertical video posts and branded carousels alongside your regular text posts.",
  },
  {
    icon: BarChart3,
    title: "Learn what to repeat",
    desc: "Analytics sit next to the calendar so you can double down on the formats that actually earn reach.",
  },
];

function CalendarPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-40" aria-hidden />
        <div className="absolute -right-40 top-24 h-96 w-96 rounded-full bg-brand-glow/20 blur-3xl" aria-hidden />
        <MarketingHeader />

        <section className="relative z-10 mx-auto max-w-4xl px-6 pb-20 pt-12 text-center md:pt-20">
          <p className="font-display text-sm uppercase tracking-widest text-brand">
            LinkedIn content calendar
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-6xl">
            Plan once. <span className="text-brand-gradient">Post all month.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Postpilot pairs a LinkedIn content calendar with an AI LinkedIn scheduler, so drafts are
            written, queued and published automatically — even on the weeks you're too busy to think
            about LinkedIn.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="bg-brand-gradient text-brand-foreground shadow-glow hover:opacity-95">
                Build my calendar free
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/ai-linkedin-post-generator">
              <Button size="lg" variant="outline">
                See the AI post generator
              </Button>
            </Link>
          </div>
        </section>
      </div>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mx-auto max-w-2xl text-center font-display text-3xl font-semibold md:text-4xl">
          Everything a LinkedIn scheduler should do
        </h2>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {blocks.map((b) => (
            <div key={b.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/15 text-brand">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{b.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card/40 py-20">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="font-染 font-display text-3xl font-semibold md:text-4xl">
            Consistency is the whole game
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            The accounts that grow aren't the ones with better ideas — they're the ones that keep
            showing up. Let the scheduler handle showing up.
          </p>
          <div className="mt-8">
            <Link to="/auth">
              <Button size="lg" className="bg-brand-gradient text-brand-foreground shadow-glow">
                Start scheduling free
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center font-display text-3xl font-semibold md:text-4xl">
          LinkedIn scheduling FAQ
        </h2>
        <FaqList items={faqs} />
      </section>

      <MarketingFooter />
    </main>
  );
}