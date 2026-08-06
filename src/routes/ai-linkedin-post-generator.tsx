import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Sparkles, Wand2, Flame, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingHeader, MarketingFooter, FaqList, faqSchema } from "@/components/marketing-chrome";

const TITLE = "AI LinkedIn Post Generator — Free AI Posts | Postpilot";
const DESC =
  "Free AI LinkedIn post generator that writes scroll-stopping posts in your own voice. An AI LinkedIn content tool with carousels, scheduling and analytics built in.";

const faqs = [
  {
    q: "Is this a free AI LinkedIn post generator?",
    a: "Yes — you can create an account and start generating LinkedIn posts with AI for free. Paid plans from KES 1,500/month unlock video posts, carousels, warm leads and full analytics.",
  },
  {
    q: "Will the AI posts sound like me?",
    a: "Paste 10–20 of your past LinkedIn posts into Brand Voice and the AI LinkedIn post generator matches your vocabulary, sentence length and tone instead of sounding generic.",
  },
  {
    q: "Can I schedule the posts it writes?",
    a: "Yes. Every draft can be published straight to LinkedIn via official OAuth, or dropped on the LinkedIn content calendar and auto-published at your chosen time.",
  },
  {
    q: "Does it generate carousels and comments too?",
    a: "Postpilot includes an AI LinkedIn carousel generator and an AI comment generator for LinkedIn, so one workspace covers posts, slides and engagement.",
  },
];

export const Route = createFileRoute("/ai-linkedin-post-generator")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://app.mywork.co.ke/ai-linkedin-post-generator" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: "https://app.mywork.co.ke/ai-linkedin-post-generator" }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(faqSchema(faqs)) }],
  }),
  component: PostGeneratorPage,
});

const blocks = [
  {
    icon: Sparkles,
    title: "Hooks that stop the scroll",
    desc: "Give the AI LinkedIn post generator a topic and get a full draft with a strong first line, readable body and a question that pulls comments.",
  },
  {
    icon: Wand2,
    title: "Trained on your voice",
    desc: "Teach Postpilot how you write once. Every LinkedIn post generator AI output reuses your phrasing, not recycled AI filler.",
  },
  {
    icon: Flame,
    title: "Remix proven patterns",
    desc: "A library of viral post structures you can turn into your own draft in one click — the fastest way to grow LinkedIn with AI.",
  },
  {
    icon: Images,
    title: "Visuals included",
    desc: "Attach your own image, generate one with AI, or spin the topic into a branded 5–8 slide carousel before you publish.",
  },
];

function PostGeneratorPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-40" aria-hidden />
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-brand/30 blur-3xl" aria-hidden />
        <MarketingHeader />

        <section className="relative z-10 mx-auto max-w-4xl px-6 pb-20 pt-12 text-center md:pt-20">
          <p className="font-display text-sm uppercase tracking-widest text-brand">
            AI LinkedIn post generator
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-6xl">
            Write a month of LinkedIn posts{" "}
            <span className="text-brand-gradient">in an afternoon.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Postpilot is a free AI LinkedIn post generator and AI LinkedIn growth tool: describe an
            idea, get a publish-ready post in your own voice, then schedule it, track it and turn the
            comments into leads.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="bg-brand-gradient text-brand-foreground shadow-glow hover:opacity-95">
                Generate my first post free
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline">
                See pricing
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No credit card required · Connect LinkedIn in 30 seconds
          </p>
        </section>
      </div>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mx-auto max-w-2xl text-center font-display text-3xl font-semibold md:text-4xl">
          The AI LinkedIn content tool that does more than draft
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
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-display text-3xl font-semibold md:text-4xl">
            How the LinkedIn post generator AI works
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", t: "Give a topic", d: "A sentence, a link, or a rough note — even a blog post you want repurposed." },
              { n: "02", t: "Pick tone & hook", d: "Choose the angle and length. Regenerate variations until one feels like you." },
              { n: "03", t: "Publish or schedule", d: "Ship it now, or add it to your LinkedIn content calendar for peak hours." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-background p-6">
                <div className="font-display text-sm text-brand">{s.n}</div>
                <h3 className="mt-2 font-display text-xl font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-success" /> Official LinkedIn OAuth
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-success" /> No scraping, ever
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-success" /> Unlimited drafts
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center font-display text-3xl font-semibold md:text-4xl">
          AI LinkedIn post generator FAQ
        </h2>
        <FaqList items={faqs} />
        <div className="mt-12 text-center">
          <Link to="/auth">
            <Button size="lg" className="bg-brand-gradient text-brand-foreground shadow-glow">
              Start writing free
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}