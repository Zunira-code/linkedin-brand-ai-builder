import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Sparkles,
  Calendar,
  Flame,
  BarChart3,
  Zap,
  Wand2,
  CheckCircle2,
  ArrowRight,
  Mail,
  Phone,
  Images,
  Video,
  Users,
  Palette,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:url", content: "https://app.mywork.co.ke/" },
    ],
    links: [{ rel: "canonical", href: "https://app.mywork.co.ke/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Postpilot",
          description: "AI-powered LinkedIn growth workspace with post generator, content calendar, viral inspiration library and personal analytics.",
          provider: { "@type": "Organization", name: "Postpilot", url: "https://app.mywork.co.ke" },
          areaServed: "Worldwide",
          serviceType: "LinkedIn content and growth automation",
        }),
      },
    ],
  }),
  component: Index,
});

const features = [
  { icon: Sparkles, title: "AI post generator", desc: "Turn a topic into a scroll-stopping text post in seconds. Trained on hooks that convert." },
  { icon: Video, title: "AI video posts", desc: "Generate a short vertical video from a prompt, add your caption, and publish straight to LinkedIn." },
  { icon: Images, title: "Carousel builder", desc: "Turn any topic or long-form text into a 5–8 slide branded carousel — download the PDF and upload to LinkedIn." },
  { icon: Calendar, title: "Content calendar", desc: "Plan a week of posts. We auto-publish text & video posts to LinkedIn when the time comes." },
  { icon: Flame, title: "Viral inspiration", desc: "A curated library of proven post patterns you can remix into your own draft with one click." },
  { icon: BarChart3, title: "Personal analytics", desc: "Track followers, reach and post performance right next to your drafts." },
  { icon: Users, title: "Warm leads", desc: "See who's engaging with your posts so you can turn interactions into conversations." },
  { icon: Wand2, title: "Your brand voice", desc: "Teach Postpilot how you write once. Every draft sounds like you, not like AI." },
  { icon: Palette, title: "Brand kit", desc: "Save your logo, colors and fonts once — reused across every carousel and visual you generate." },
  { icon: Zap, title: "One-click publish", desc: "Connect LinkedIn via OAuth and ship posts without leaving the app. Or schedule for peak hours." },
];

function Index() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-40" aria-hidden />
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-brand/30 blur-3xl" aria-hidden />
        <div className="absolute -right-40 top-60 h-96 w-96 rounded-full bg-brand-glow/20 blur-3xl" aria-hidden />

        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
            <a href="#contact" className="hover:text-foreground">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth">
              <Button size="sm" className="bg-brand-gradient text-brand-foreground hover:opacity-95">
                Start free
              </Button>
            </Link>
          </div>
        </header>

        <section className="relative z-10 mx-auto max-w-5xl px-6 pb-24 pt-16 text-center md:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            AI-powered LinkedIn growth workspace
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-6 font-display text-5xl font-semibold tracking-tight md:text-7xl"
          >
            Build your LinkedIn brand
            <br />
            <span className="text-brand-gradient">on autopilot.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
          >
            Postpilot writes, schedules and publishes posts that grow your audience. One workspace for
            drafting, planning, and tracking what actually works.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link to="/auth">
              <Button size="lg" className="bg-brand-gradient text-brand-foreground shadow-glow hover:opacity-95">
                Start writing for free
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <a href="#features"><Button size="lg" variant="outline">See how it works</Button></a>
          </motion.div>
          <p className="mt-4 text-xs text-muted-foreground">No credit card required · Connect LinkedIn in 30 seconds</p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mt-16"
          >
            <HeroMock />
          </motion.div>
        </section>
      </div>

      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-display text-sm uppercase tracking-widest text-brand">Everything you need</p>
          <h2 className="mt-3 font-display text-4xl font-semibold md:text-5xl">
            One workspace to run your LinkedIn.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Stop juggling docs and schedulers. Draft, plan and analyze — all in one place.
          </p>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/15 text-brand">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="how" className="border-y border-border bg-card/40 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-display text-sm uppercase tracking-widest text-brand">How it works</p>
            <h2 className="mt-3 font-display text-4xl font-semibold">From idea to feed in 3 steps.</h2>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              { n: "01", t: "Give a topic", d: "Type an idea, pick a tone, and let Postpilot draft your post." },
              { n: "02", t: "Refine your voice", d: "Edit inline, remix from viral templates, or regenerate variations." },
              { n: "03", t: "Publish or schedule", d: "Send it now, or drop it on your calendar and let us publish it." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-background p-6">
                <div className="font-display text-sm text-brand">{s.n}</div>
                <h3 className="mt-2 font-display text-xl font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="font-display text-4xl font-semibold md:text-5xl">
          Start writing better posts today.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Free while in beta. Connect your LinkedIn, teach Postpilot your voice, and never stare at a
          blinking cursor again.
        </p>
        <div className="mt-8">
          <Link to="/auth">
            <Button size="lg" className="bg-brand-gradient text-brand-foreground shadow-glow">
              Create your account
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> Unlimited drafts</span>
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> AI-powered scheduling</span>
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> Analytics dashboard</span>
        </div>
      </section>

      <section id="contact" className="border-t border-border bg-card/40 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="font-display text-sm uppercase tracking-widest text-brand">Contact</p>
          <h2 className="mt-3 font-display text-4xl font-semibold md:text-5xl">Get in touch</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Questions, partnerships, or feedback? We'd love to hear from you.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <a href="mailto:linkedin@mywork.co.ke" className="group rounded-2xl border border-border bg-background p-6 text-left transition hover:border-brand">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/15 text-brand">
                <Mail className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">Email us</h3>
              <p className="mt-1 text-sm text-muted-foreground">linkedin@mywork.co.ke</p>
            </a>
            <a href="tel:+254716534393" className="group rounded-2xl border border-border bg-background p-6 text-left transition hover:border-brand">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/15 text-brand">
                <Phone className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">Call us</h3>
              <p className="mt-1 text-sm text-muted-foreground">0716 534 393</p>
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-xs text-muted-foreground md:flex-row">
          <Logo />
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="mailto:linkedin@mywork.co.ke" className="inline-flex items-center gap-1 hover:text-foreground">
              <Mail className="h-3 w-3" /> linkedin@mywork.co.ke
            </a>
            <a href="tel:+254716534393" className="inline-flex items-center gap-1 hover:text-foreground">
              <Phone className="h-3 w-3" /> 0716 534 393
            </a>
            <Link to="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
          </div>
          <p>© {new Date().getFullYear()} Postpilot. Not affiliated with LinkedIn Corp.</p>
        </div>
      </footer>
    </main>
  );
}

function HeroMock() {
  return (
    <div className="mx-auto max-w-4xl rounded-3xl border border-border bg-card/70 p-2 shadow-glow backdrop-blur">
      <div className="rounded-2xl bg-background/80 p-6 text-left">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Sparkles className="h-4 w-4 text-brand" />
          <span className="text-xs font-medium text-muted-foreground">Post generator</span>
          <span className="ml-auto text-xs text-muted-foreground">Draft · 892 characters</span>
        </div>
        <div className="mt-4 space-y-3 font-display text-lg leading-relaxed">
          <p className="text-foreground">Everyone told me to post daily.</p>
          <p className="text-foreground/90">So I did — for 90 days. Here is what nobody warned me about:</p>
          <p className="text-muted-foreground">
            The first month feels invisible. The second feels awkward. The third quietly compounds.
          </p>
          <p className="text-muted-foreground">
            The people who broke through did not have better ideas. They just kept showing up after
            most people quit.
          </p>
          <p className="text-brand">What is the one thing you would keep doing even if nobody watched?</p>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Tone: Vulnerable</span>
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Hook: Story</span>
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Length: Medium</span>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="ghost">Regenerate</Button>
            <Button size="sm" className="bg-brand-gradient text-brand-foreground">Publish</Button>
          </div>
        </div>
      </div>
    </div>
  );
}