import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, UserCog, FileText, Star, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingHeader, MarketingFooter, FaqList, faqSchema } from "@/components/marketing-chrome";

const TITLE = "LinkedIn Profile Optimizer — AI Headline & About | Postpilot";
const DESC =
  "AI LinkedIn profile optimizer: rewrite your headline and About section, plan Featured picks, and fix your photo and banner. Built into Postpilot's LinkedIn branding tool.";

const faqs = [
  {
    q: "What does the LinkedIn profile optimizer change?",
    a: "It generates five headline styles under 220 characters, four About versions (storytelling, results, authority, conversational), Featured section ideas, and a checklist for your banner and profile photo.",
  },
  {
    q: "Will it sound like me or like AI?",
    a: "Turn on Brand Voice and the optimizer writes from your own past LinkedIn posts, so your headline and About read like you wrote them on a good day.",
  },
  {
    q: "Can I save the versions I like?",
    a: "Yes — save any headline, About draft or Featured idea to your Profile Kit, and a profile strength meter tracks what's still missing.",
  },
  {
    q: "Which plan includes the profile optimizer?",
    a: "The LinkedIn profile optimizer is available on Growth (KES 3,500/month) and Agency plans.",
  },
];

export const Route = createFileRoute("/linkedin-profile-optimizer")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://app.mywork.co.ke/linkedin-profile-optimizer" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: "https://app.mywork.co.ke/linkedin-profile-optimizer" }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(faqSchema(faqs)) }],
  }),
  component: ProfileOptimizerLanding,
});

const blocks = [
  {
    icon: UserCog,
    title: "Headlines that get clicked",
    desc: "Five distinct headline styles under 220 characters, written around who you help and the outcome you deliver.",
  },
  {
    icon: FileText,
    title: "An About section people finish",
    desc: "Four rewritten versions — storytelling, results, authority and conversational — so you can pick the voice that fits.",
  },
  {
    icon: Star,
    title: "Featured picks that convert",
    desc: "Four to six Featured ideas with titles and descriptions that turn profile visits into enquiries.",
  },
  {
    icon: ImageIcon,
    title: "Banner & photo guidance",
    desc: "A practical checklist plus tagline options for your banner, so the top of your profile stops looking like a default.",
  },
];

function ProfileOptimizerLanding() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-40" aria-hidden />
        <div className="absolute -left-40 top-24 h-96 w-96 rounded-full bg-brand/25 blur-3xl" aria-hidden />
        <MarketingHeader />

        <section className="relative z-10 mx-auto max-w-4xl px-6 pb-20 pt-12 text-center md:pt-20">
          <p className="font-display text-sm uppercase tracking-widest text-brand">
            LinkedIn profile optimizer
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-6xl">
            Your profile is the landing page.{" "}
            <span className="text-brand-gradient">Make it convert.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Postpilot's AI LinkedIn profile optimizer rewrites your headline and About section, plans
            your Featured picks and fixes your visuals — so the traffic your posts earn actually turns
            into conversations.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="bg-brand-gradient text-brand-foreground shadow-glow hover:opacity-95">
                Optimize my profile
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline">
                Compare plans
              </Button>
            </Link>
          </div>
        </section>
      </div>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mx-auto max-w-2xl text-center font-display text-3xl font-semibold md:text-4xl">
          A complete LinkedIn personal branding tool
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
          <h2 className="font-display text-3xl font-semibold md:text-4xl">
            Pair it with the posts that bring people there
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            An optimized profile plus a consistent feed is how you grow LinkedIn with AI without
            spending your evenings writing.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/ai-linkedin-post-generator">
              <Button size="lg" variant="outline">
                AI LinkedIn post generator
              </Button>
            </Link>
            <Link to="/linkedin-content-calendar">
              <Button size="lg" variant="outline">
                LinkedIn content calendar
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center font-display text-3xl font-semibold md:text-4xl">
          Profile optimizer FAQ
        </h2>
        <FaqList items={faqs} />
        <div className="mt-12 text-center">
          <Link to="/auth">
            <Button size="lg" className="bg-brand-gradient text-brand-foreground shadow-glow">
              Start free
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}