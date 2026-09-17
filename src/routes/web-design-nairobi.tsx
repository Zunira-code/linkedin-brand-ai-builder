import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import atelierImage from "@/assets/project-atelier.jpg";

const TITLE = "Web Design Company in Nairobi, Kenya | Nia Studio";
const DESCRIPTION =
  "Nia Studio is a web design company in Nairobi, Kenya designing brand-led websites for businesses, startups and organisations. See our process, what projects cost and how to start.";
const URL = "https://app.mywork.co.ke/web-design-nairobi";

const steps = [
  ["01", "Discovery", "We learn your business, your customers and what a win looks like, then agree the pages and content the site needs."],
  ["02", "Art direction", "You see typography, colour and layout directions early, so the look is agreed before we build anything."],
  ["03", "Design", "Every page is designed for mobile and desktop, with real copy and real images instead of placeholder text."],
  ["04", "Handover", "We build the site, test it on real devices, train your team and stay available after launch."],
];

const deliverables = [
  "Multi-page marketing websites",
  "Brand and visual identity systems for digital",
  "Landing pages for campaigns and launches",
  "E-commerce and booking experiences",
  "Design systems your team can extend",
  "Website redesigns and rescue projects",
];

const faqs = [
  {
    q: "How much does a website cost in Kenya?",
    a: "Most of our Nairobi projects fall into three bands: a focused one-page or landing site, a full multi-page company website, and a larger platform with custom features or e-commerce. We quote a fixed price after a short discovery call so there are no surprises — email linkedin@mywork.co.ke for a figure for your scope.",
  },
  {
    q: "How long does a website take?",
    a: "A landing page is usually two to three weeks. A full company website is typically four to eight weeks, depending on how quickly content and feedback come back.",
  },
  {
    q: "Do you work with clients outside Nairobi?",
    a: "Yes. We are based in Nairobi and work with clients across Kenya, East Africa and internationally, entirely remotely when needed.",
  },
  {
    q: "Do you write the words and take the photos?",
    a: "We can. We offer copywriting and art direction, and we brief photographers or create imagery when a project needs it.",
  },
];

export const Route = createFileRoute("/web-design-nairobi")({
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
          name: "Web design in Nairobi",
          serviceType: "Web design",
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
            { "@type": "ListItem", position: 2, name: "Web design in Nairobi", item: URL },
          ],
        }),
      },
    ],
  }),
  component: WebDesignPage,
});

function WebDesignPage() {
  return (
    <main className="bg-background text-foreground">
      <section className="border-b border-border px-5 py-24 sm:px-10 md:py-32">
        <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Web design · Nairobi, Kenya</p>
            <h1 className="mt-6 font-display text-[clamp(2.9rem,6.5vw,6rem)] leading-[0.85]">
              A web design company for brands that <span className="italic text-primary">refuse to blend in.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
              We design websites in Nairobi for businesses, startups and organisations across Kenya and beyond — sites
              that look like your brand, load fast on Kenyan mobile networks and turn visitors into enquiries.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button asChild className="rounded-none px-6 uppercase tracking-[0.12em]">
                <a href="mailto:linkedin@mywork.co.ke">Start a project <ArrowUpRight /></a>
              </Button>
              <Button asChild variant="outline" className="rounded-none px-6 uppercase tracking-[0.12em]">
                <a href="tel:+254716534393">+254 716 534 393</a>
              </Button>
            </div>
          </div>
          <img
            src={atelierImage}
            alt="Editorial website design work by Nia Studio in Nairobi"
            width={1600}
            height={1104}
            loading="lazy"
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      </section>

      <section className="px-5 py-20 sm:px-10">
        <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[1fr_2fr]">
          <h2 className="font-display text-4xl md:text-6xl">What we design</h2>
          <ul className="grid gap-x-10 sm:grid-cols-2">
            {deliverables.map((item) => (
              <li key={item} className="border-t border-border py-5 text-lg text-muted-foreground">{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-foreground px-5 py-20 text-background sm:px-10">
        <div className="mx-auto max-w-[1400px]">
          <h2 className="font-display text-4xl md:text-6xl">How a project runs</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map(([number, title, body]) => (
              <div key={number} className="border-t border-background/25 pt-5">
                <span className="font-mono text-xs text-primary">/{number}</span>
                <h3 className="mt-3 font-display text-2xl">{title}</h3>
                <p className="mt-2 leading-relaxed text-background/70">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-10">
        <div className="mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-[1fr_2fr]">
          <h2 className="font-display text-4xl md:text-6xl">Questions clients ask</h2>
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
        <div className="mx-auto flex max-w-[1400px] flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <h2 className="max-w-2xl font-display text-4xl md:text-6xl">Tell us about your website.</h2>
          <div className="flex flex-col gap-2 text-sm uppercase tracking-[0.14em]">
            <a href="mailto:linkedin@mywork.co.ke" className="underline">linkedin@mywork.co.ke</a>
            <a href="tel:+254716534393" className="underline">+254 716 534 393</a>
          </div>
        </div>
      </section>

      <footer className="bg-foreground px-5 py-8 text-background sm:px-10">
        <div className="mx-auto flex max-w-[1400px] flex-wrap gap-5 text-xs uppercase tracking-[0.14em]">
          <Link to="/" className="hover:text-primary">Nia Studio home</Link>
          <Link to="/web-development-nairobi" className="hover:text-primary">Web development</Link>
        </div>
      </footer>
    </main>
  );
}
