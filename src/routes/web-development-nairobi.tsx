import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import frequencyImage from "@/assets/project-frequency.jpg";

const TITLE = "Web Development Company in Nairobi, Kenya | Nia Studio";
const DESCRIPTION =
  "Nia Studio builds fast, secure websites and web apps in Nairobi, Kenya — custom development, e-commerce, integrations and ongoing support. See our stack, timelines and costs.";
const URL = "https://app.mywork.co.ke/web-development-nairobi";

const capabilities = [
  ["01", "Custom websites", "Hand-built front ends with a content setup your team can actually edit, tuned for speed on mobile data."],
  ["02", "Web applications", "Dashboards, portals and internal tools with secure accounts, roles and permissions."],
  ["03", "E-commerce & payments", "Product catalogues, checkout and payment integrations including mobile money and card gateways."],
  ["04", "Integrations & automation", "Connecting CRMs, email, LinkedIn, analytics and internal systems so data moves without manual work."],
  ["05", "Performance & SEO builds", "Server-rendered pages, clean structure and technical SEO so search engines can read every page."],
  ["06", "Care & support", "Monitoring, updates and a named person to call when something needs changing."],
];

const faqs = [
  {
    q: "What do you build with?",
    a: "Modern JavaScript and React with server-side rendering, plus a managed database, authentication and file storage. It keeps sites fast, secure and cheap to run.",
  },
  {
    q: "Can you take over an existing website?",
    a: "Yes. We audit what exists, tell you honestly whether to fix or rebuild, and can maintain sites we did not originally build.",
  },
  {
    q: "How much does web development cost in Kenya?",
    a: "Development is quoted per project after we scope the features together. A brochure site is a fixed, modest build; an application with accounts, payments or integrations is scoped in phases so you can start small. Email linkedin@mywork.co.ke for a quote.",
  },
  {
    q: "Do you offer ongoing support?",
    a: "Yes. Most clients keep a monthly care plan covering updates, monitoring, small changes and priority response.",
  },
];

export const Route = createFileRoute("/web-development-nairobi")({
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
          "@type": "Service",
          name: "Web development in Nairobi",
          serviceType: "Web development",
          description: DESCRIPTION,
          url: URL,
          provider: {
            "@type": "ProfessionalService",
            "@id": "https://app.mywork.co.ke/#studio",
            name: "Nia Studio",
            telephone: "+254716534393",
            email: "linkedin@mywork.co.ke",
            address: { "@type": "PostalAddress", addressLocality: "Nairobi", addressCountry: "KE" },
          },
          areaServed: [
            { "@type": "City", name: "Nairobi" },
            { "@type": "Country", name: "Kenya" },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Nia Studio", item: "https://app.mywork.co.ke/" },
            { "@type": "ListItem", position: 2, name: "Web development in Nairobi", item: URL },
          ],
        }),
      },
    ],
  }),
  component: WebDevelopmentPage,
});

function WebDevelopmentPage() {
  return (
    <main className="bg-background text-foreground">
      <section className="border-b border-border px-5 py-24 sm:px-10 md:py-32">
        <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Web development · Nairobi, Kenya</p>
            <h1 className="mt-6 font-display text-[clamp(2.9rem,6.5vw,6rem)] leading-[0.85]">
              Websites and web apps built to <span className="italic text-primary">last.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
              We are a Nairobi web development company building custom websites, platforms and integrations for Kenyan
              and international clients — engineered for speed, security and easy editing.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button asChild className="rounded-none px-6 uppercase tracking-[0.12em]">
                <a href="mailto:linkedin@mywork.co.ke">Start a project <ArrowUpRight /></a>
              </Button>
              <Button asChild variant="outline" className="rounded-none px-6 uppercase tracking-[0.12em]">
                <Link to="/web-design-nairobi">See web design</Link>
              </Button>
            </div>
          </div>
          <img
            src={frequencyImage}
            alt="Custom web platform built by Nia Studio in Nairobi"
            width={1600}
            height={1104}
            loading="lazy"
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      </section>

      <section className="px-5 py-20 sm:px-10">
        <div className="mx-auto max-w-[1400px]">
          <h2 className="font-display text-4xl md:text-6xl">What we build</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {capabilities.map(([number, title, body]) => (
              <div key={number} className="border-t border-border pt-5">
                <span className="font-mono text-xs text-primary">/{number}</span>
                <h3 className="mt-3 font-display text-2xl">{title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-foreground px-5 py-20 text-background sm:px-10">
        <div className="mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-[1fr_2fr]">
          <h2 className="font-display text-4xl md:text-6xl">Questions clients ask</h2>
          <div>
            {faqs.map((faq) => (
              <div key={faq.q} className="border-t border-background/25 py-6">
                <h3 className="font-display text-2xl">{faq.q}</h3>
                <p className="mt-2 leading-relaxed text-background/70">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary px-5 py-20 text-primary-foreground sm:px-10">
        <div className="mx-auto flex max-w-[1400px] flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <h2 className="max-w-2xl font-display text-4xl md:text-6xl">Let’s scope your build.</h2>
          <div className="flex flex-col gap-2 text-sm uppercase tracking-[0.14em]">
            <a href="mailto:linkedin@mywork.co.ke" className="underline">linkedin@mywork.co.ke</a>
            <a href="tel:+254716534393" className="underline">+254 716 534 393</a>
          </div>
        </div>
      </section>

      <footer className="bg-foreground px-5 py-8 text-background sm:px-10">
        <div className="mx-auto flex max-w-[1400px] flex-wrap gap-5 text-xs uppercase tracking-[0.14em]">
          <Link to="/" className="hover:text-primary">Nia Studio home</Link>
          <Link to="/web-design-nairobi" className="hover:text-primary">Web design Nairobi</Link>
          <Link to="/pricing" className="hover:text-primary">Postpilot pricing</Link>
          <Link to="/privacy" className="hover:text-primary">Privacy</Link>
        </div>
      </footer>
    </main>
  );
}
