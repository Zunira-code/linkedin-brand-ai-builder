import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const TITLE = "Postpilot Pricing — LinkedIn Growth Plans from KES 1,500 | Nia Studio";
const DESCRIPTION =
  "Postpilot pricing by Nia Studio: Starter KES 1,500, Growth KES 3,500 and Agency KES 12,000 per month for AI LinkedIn posts, carousels, video and warm leads.";
const URL = "https://app.mywork.co.ke/pricing";

const plans = [
  {
    name: "Starter",
    price: "KES 1,500",
    summary: "For one person building a consistent LinkedIn habit.",
    features: [
      "AI text posts with your trained brand voice",
      "Scheduling calendar and first comments",
      "AI comment generator",
      "Profile optimizer",
    ],
  },
  {
    name: "Growth",
    price: "KES 3,500",
    summary: "For founders and creators who post to win business.",
    features: [
      "Everything in Starter",
      "Video posts and carousel builder",
      "Warm leads tracking",
      "Full analytics dashboard",
    ],
    featured: true,
  },
  {
    name: "Agency",
    price: "KES 12,000",
    summary: "For teams and agencies running LinkedIn for clients.",
    features: [
      "Everything in Growth",
      "Unlimited generation across all features",
      "Brand kit with carousel templates",
      "Priority support from the Nia Studio team",
    ],
  },
];

const faqs = [
  {
    q: "Are the prices per month?",
    a: "Yes. Every Postpilot plan is billed monthly in Kenyan shillings and you can change plan at any time.",
  },
  {
    q: "Do I need a LinkedIn developer account?",
    a: "No. You connect your own LinkedIn profile securely from Settings after signing in, and you can disconnect it whenever you like.",
  },
  {
    q: "Can Nia Studio also build my website?",
    a: "Yes. Nia Studio is a Nairobi web design and development agency; Postpilot is our own product. Email linkedin@mywork.co.ke to talk about a website or digital product.",
  },
];

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "Postpilot",
          description: DESCRIPTION,
          brand: { "@type": "Brand", name: "Nia Studio" },
          url: URL,
          offers: plans.map((plan) => ({
            "@type": "Offer",
            name: plan.name,
            price: plan.price.replace(/[^0-9]/g, ""),
            priceCurrency: "KES",
            url: URL,
            availability: "https://schema.org/InStock",
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Nia Studio", item: "https://app.mywork.co.ke/" },
            { "@type": "ListItem", position: 2, name: "Postpilot pricing", item: URL },
          ],
        }),
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <main className="bg-background text-foreground">
      <section className="border-b border-border px-5 py-24 sm:px-10 md:py-32">
        <div className="mx-auto max-w-[1200px]">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Postpilot by Nia Studio</p>
          <h1 className="mt-6 max-w-3xl font-display text-[clamp(3rem,7vw,6rem)] leading-[0.85]">
            Pricing that grows <span className="italic text-primary">with you.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Postpilot is our AI LinkedIn studio: posts in your own voice, carousels, video, scheduling and warm leads.
            Pick a plan below, or talk to us about a full website instead.
          </p>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-10">
        <div className="mx-auto grid max-w-[1200px] gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col border p-8 ${plan.featured ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
            >
              <h2 className="font-display text-3xl">{plan.name}</h2>
              <p className={`mt-2 text-sm ${plan.featured ? "opacity-80" : "text-muted-foreground"}`}>{plan.summary}</p>
              <p className="mt-8 font-display text-5xl">
                {plan.price}
                <span className="ml-2 align-middle font-mono text-xs uppercase tracking-[0.16em] opacity-70">/ month</span>
              </p>
              <ul className="mt-8 flex-1 space-y-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className={plan.featured ? "" : "text-muted-foreground"}>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant={plan.featured ? "secondary" : "default"}
                className="mt-10 rounded-none uppercase tracking-[0.12em]"
              >
                <Link to="/auth">Get started <ArrowUpRight /></Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border px-5 py-20 sm:px-10">
        <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[1fr_2fr]">
          <h2 className="font-display text-4xl md:text-5xl">Common questions</h2>
          <div>
            {faqs.map((faq) => (
              <div key={faq.q} className="border-t border-border py-6">
                <h3 className="font-display text-2xl">{faq.q}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary px-5 py-20 text-primary-foreground sm:px-10">
        <div className="mx-auto flex max-w-[1200px] flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <h2 className="max-w-xl font-display text-4xl md:text-6xl">Need a website, not a plan?</h2>
          <a href="mailto:linkedin@mywork.co.ke" className="text-sm uppercase tracking-[0.16em] underline">
            linkedin@mywork.co.ke
          </a>
        </div>
      </section>

      <footer className="bg-foreground px-5 py-8 text-background sm:px-10">
        <div className="mx-auto flex max-w-[1200px] flex-wrap gap-5 text-xs uppercase tracking-[0.14em]">
          <Link to="/" className="hover:text-primary">Nia Studio home</Link>
          <Link to="/web-design-nairobi" className="hover:text-primary">Web design Nairobi</Link>
          <Link to="/web-development-nairobi" className="hover:text-primary">Web development</Link>
          <Link to="/privacy" className="hover:text-primary">Privacy</Link>
        </div>
      </footer>
    </main>
  );
}
