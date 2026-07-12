import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check, Sparkles, Zap, Building2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { property: "og:url", content: "https://app.mywork.co.ke/pricing" },
      { title: "Pricing — Postpilot" },
      { name: "description", content: "Simple, predictable pricing plans for Postpilot, the AI LinkedIn brand builder. Plans start at KES 1,500/month." },
      { property: "og:title", content: "Pricing — Postpilot" },
      { property: "og:description", content: "Simple, predictable pricing plans for Postpilot, the AI LinkedIn brand builder. Plans start at KES 1,500/month." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Pricing — Postpilot" },
      { name: "twitter:description", content: "Simple, predictable pricing plans for Postpilot, the AI LinkedIn brand builder. Plans start at KES 1,500/month." },
    ],
    links: [{ rel: "canonical", href: "https://app.mywork.co.ke/pricing" }],
  }),
  component: Pricing,
});

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "1,500",
    icon: Sparkles,
    description: "Perfect for solo creators getting serious about LinkedIn.",
    features: [
      "LinkedIn post scheduling",
      "Content calendar",
      "Basic analytics",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: "3,500",
    icon: Zap,
    description: "For founders, coaches and creators ready to scale.",
    features: [
      "Everything in Starter",
      "Video publishing",
      "Carousel builder",
      "Warm leads",
      "Full analytics",
    ],
    cta: "Upgrade to Growth",
    popular: true,
  },
  {
    id: "agency",
    name: "Agency",
    price: "12,000",
    icon: Building2,
    description: "Manage multiple brands with hands-on support.",
    features: [
      "Everything in Growth",
      "Multiple LinkedIn profiles",
      "Priority support",
    ],
    cta: "Go Agency",
    popular: false,
  },
];

function Pricing() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-40" aria-hidden />
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-brand/25 blur-3xl" aria-hidden />
        <div className="absolute -right-40 top-40 h-96 w-96 rounded-full bg-brand-glow/15 blur-3xl" aria-hidden />

        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <Link to="/pricing" className="text-foreground">Pricing</Link>
            <a href="/#features" className="hover:text-foreground">Features</a>
            <a href="/#contact" className="hover:text-foreground">Contact</a>
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

        <section className="relative z-10 mx-auto max-w-5xl px-6 pb-20 pt-16 text-center md:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Plans priced in Kenyan Shillings
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-6 font-display text-4xl font-semibold tracking-tight md:text-6xl"
          >
            Simple, predictable plans
            <br />
            <span className="text-brand-gradient">priced in KES.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg"
          >
            Choose the plan that fits your LinkedIn workflow. Upgrade or downgrade anytime.
          </motion.p>
        </section>
      </div>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className={cn(
                "relative flex flex-col rounded-3xl border bg-card p-6 md:p-8",
                plan.popular
                  ? "border-brand shadow-glow"
                  : "border-border"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center rounded-full bg-brand px-3 py-1 text-xs font-medium text-brand-foreground">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/15 text-brand">
                <plan.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold">{plan.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold tracking-tight">KES {plan.price}</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="text-foreground/90">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link to="/auth" className="block">
                  <Button
                    size="lg"
                    className={cn(
                      "w-full",
                      plan.popular
                        ? "bg-brand-gradient text-brand-foreground shadow-glow hover:opacity-95"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-12 rounded-2xl border border-border bg-card/60 p-6 text-center md:p-8"
        >
          <h2 className="font-display text-xl font-semibold md:text-2xl">Need a custom plan?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Teams and agencies with unique workflows can request a tailored package, custom onboarding, and dedicated support.
          </p>
          <div className="mt-5">
            <a href="mailto:linkedin@mywork.co.ke">
              <Button variant="outline" size="lg">
                Contact Support
              </Button>
            </a>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-xs text-muted-foreground md:flex-row">
          <Logo />
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          </div>
          <p>© {new Date().getFullYear()} Postpilot. Not affiliated with LinkedIn Corp.</p>
        </div>
      </footer>
    </main>
  );
}

