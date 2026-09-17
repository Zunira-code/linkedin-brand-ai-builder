import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUpRight, Asterisk, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import atelierImage from "@/assets/project-atelier.jpg";
import habitatImage from "@/assets/project-habitat.jpg";
import frequencyImage from "@/assets/project-frequency.jpg";
import niaLogo from "@/assets/nia-studio-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Web Design & Development Agency in Nairobi | Nia Studio" },
      {
        name: "description",
        content:
          "Nia Studio is an independent web design and development agency in Nairobi, Kenya, building strategy-led websites and digital products for ambitious brands.",
      },
      { property: "og:title", content: "Web Design & Development Agency in Nairobi | Nia Studio" },
      {
        property: "og:description",
        content: "Independent Nairobi web design and development studio building memorable, high-performance websites and digital products.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://app.mywork.co.ke/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Web Design & Development Agency in Nairobi | Nia Studio" },
      {
        name: "twitter:description",
        content: "Independent Nairobi web design and development studio building memorable, high-performance websites and digital products.",
      },
    ],
    links: [{ rel: "canonical", href: "https://app.mywork.co.ke/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          "@id": "https://app.mywork.co.ke/#studio",
          name: "Nia Studio",
          description:
            "Independent web design and development agency in Nairobi, Kenya, offering strategy, web design, development and creative technology.",
          url: "https://app.mywork.co.ke/",
          email: "linkedin@mywork.co.ke",
          telephone: "+254716534393",
          priceRange: "$$",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Nairobi",
            addressCountry: "KE",
          },
          areaServed: [
            { "@type": "Country", name: "Kenya" },
            { "@type": "Place", name: "Worldwide" },
          ],
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Services",
            itemListElement: [
              "Strategy & direction",
              "Web design",
              "Web development",
              "Creative technology",
            ].map((service) => ({
              "@type": "Offer",
              itemOffered: { "@type": "Service", name: service },
            })),
          },
        }),
      },
    ],
  }),
  component: Index,
});

const projects = [
  {
    number: "01",
    title: "Atelier Nia",
    type: "Digital flagship / Art direction",
    year: "2026",
    image: atelierImage,
    className: "lg:col-span-7",
  },
  {
    number: "02",
    title: "Kijani House",
    type: "Web platform / Digital identity",
    year: "2026",
    image: habitatImage,
    className: "lg:col-span-5 lg:mt-48",
  },
  {
    number: "03",
    title: "Frequency",
    type: "Culture platform / Commerce",
    year: "2025",
    image: frequencyImage,
    className: "lg:col-span-9 lg:col-start-3",
  },
];

const services = [
  ["01", "Strategy & direction", "Research, positioning and digital roadmaps that turn ambitious ideas into focused experiences."],
  ["02", "Web design", "Editorial interfaces and brand systems created to feel unmistakably yours on every screen."],
  ["03", "Development", "Fast, accessible websites and digital products engineered for lasting performance."],
  ["04", "Creative technology", "Motion, interaction and experimental technology that give every project a pulse."],
];

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 48 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12%" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Project({ project }: { project: (typeof projects)[number] }) {
  const reduceMotion = useReducedMotion();
  return (
    <Reveal className={project.className}>
      <a href="#contact" className="group block" aria-label={`Discuss a project like ${project.title}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <motion.img
            src={project.image}
            alt={`${project.title} featured project`}
            width={1600}
            height={1104}
            loading="lazy"
            className="h-full w-full object-cover"
            whileHover={reduceMotion ? undefined : { scale: 1.035 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
          <div className="absolute right-5 top-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition-all duration-300 group-hover:opacity-100 md:h-20 md:w-20">
            <ArrowUpRight className="h-6 w-6 md:h-8 md:w-8" />
          </div>
        </div>
        <div className="grid grid-cols-[auto_1fr_auto] items-baseline gap-4 border-b border-border py-5">
          <span className="font-mono text-xs text-primary">/{project.number}</span>
          <div>
            <h3 className="font-display text-3xl md:text-5xl">{project.title}</h3>
            <p className="mt-1 text-xs uppercase text-muted-foreground">{project.type}</p>
          </div>
          <span className="font-mono text-xs text-muted-foreground">{project.year}</span>
        </div>
      </a>
    </Reveal>
  );
}

function Index() {
  const reduceMotion = useReducedMotion();

  return (
    <main className="overflow-hidden bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-5 md:px-10">
          <a href="#top" className="flex items-center gap-3" aria-label="Nia Studio home">
            <img src={niaLogo} alt="Nia Studio" width={1200} height={800} className="h-9 w-auto" />
          </a>
          <nav className="hidden items-center gap-8 text-xs uppercase tracking-[0.14em] md:flex" aria-label="Main navigation">
            <a href="#work" className="agency-link">Work</a>
            <a href="#studio" className="agency-link">Studio</a>
            <a href="#services" className="agency-link">Services</a>
          </nav>
          <Button asChild className="hidden rounded-none px-6 uppercase tracking-[0.12em] md:inline-flex">
            <a href="#contact">Start a project <ArrowUpRight /></a>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation" asChild>
            <a href="#contact"><Menu /></a>
          </Button>
        </div>
      </header>

      <section id="top" className="relative min-h-[94svh] border-b border-border pt-20">
        <div className="mx-auto grid min-h-[calc(94svh-5rem)] max-w-[1600px] grid-cols-1 lg:grid-cols-12">
          <aside className="hidden items-center justify-center border-r border-border lg:col-span-1 lg:flex">
            <span className="-rotate-90 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">Nairobi · Worldwide · 2026</span>
          </aside>
          <div className="flex flex-col justify-between px-5 py-12 sm:px-10 md:py-16 lg:col-span-7 lg:border-r lg:border-border lg:px-16">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 28 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <p className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Independent digital agency
              </p>
              <h1 className="mt-10 max-w-4xl font-display text-[clamp(4.25rem,10vw,9.5rem)] leading-[0.78]">
                We build
                <br />
                <span className="ml-[8%] italic text-primary">digital</span>
                <br />
                landmarks.
              </h1>
            </motion.div>
            <div className="mt-16 grid items-end gap-8 border-t border-border pt-8 md:grid-cols-[1fr_auto]">
              <p className="max-w-lg text-lg leading-relaxed text-muted-foreground md:text-xl">
                Strategy, design and technology for ambitious brands ready to become impossible to ignore.
              </p>
              <a href="#work" className="flex items-center gap-3 text-xs uppercase tracking-[0.16em]">
                Explore our work <ArrowDown className="h-4 w-4 text-primary" />
              </a>
            </div>
          </div>
          <div className="flex min-h-[440px] flex-col bg-primary text-primary-foreground lg:col-span-4">
            <div className="flex-1 p-8 md:p-10">
              <div className="mb-20 flex justify-between font-mono text-[10px] uppercase tracking-[0.18em]">
                <span>[ What we do ]</span><span>01—04</span>
              </div>
              <ul>
                {services.map(([number, title]) => (
                  <li key={number} className="group flex items-center justify-between border-b border-primary-foreground/35 py-5">
                    <span className="text-sm uppercase tracking-[0.12em]">{title}</span>
                    <span className="font-mono text-xs opacity-60">/{number}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-primary-foreground/35 p-8 md:p-10">
              <Asterisk className="mb-8 h-10 w-10" />
              <p className="font-display text-3xl italic leading-tight">Built in Nairobi.<br />Made for everywhere.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="marquee border-b border-border bg-foreground py-5 text-background" aria-hidden="true">
        <div className="marquee-track flex w-max items-center gap-8 font-display text-4xl italic md:text-6xl">
          {[0, 1].map((set) => (
            <div key={set} className="flex items-center gap-8">
              <span>Ideas with impact</span><Asterisk className="h-9 w-9 text-primary" />
              <span>Design with purpose</span><Asterisk className="h-9 w-9 text-primary" />
              <span>Technology with soul</span><Asterisk className="h-9 w-9 text-primary" />
            </div>
          ))}
        </div>
      </div>

      <section id="work" className="px-5 py-24 sm:px-10 md:py-36">
        <div className="mx-auto max-w-[1500px]">
          <Reveal className="mb-16 grid gap-8 md:grid-cols-2 md:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Selected work / 2025—26</p>
              <h2 className="mt-5 font-display text-6xl leading-none md:text-8xl">Made to<br /><span className="italic text-muted-foreground">move people.</span></h2>
            </div>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground md:justify-self-end">Three worlds, built from the first idea to the final interaction. Every detail exists to make the brand felt.</p>
          </Reveal>
          <div className="grid gap-x-8 gap-y-24 lg:grid-cols-12">
            {projects.map((project) => <Project key={project.title} project={project} />)}
          </div>
        </div>
      </section>

      <section id="studio" className="bg-foreground px-5 py-24 text-background sm:px-10 md:py-40">
        <div className="mx-auto max-w-[1500px]">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Our point of view</p>
            <p className="mt-10 max-w-6xl font-display text-[clamp(2.8rem,7vw,7rem)] leading-[0.95]">
              The internet has enough ordinary websites. <span className="italic text-primary">We make the ones you remember.</span>
            </p>
          </Reveal>
          <div className="mt-20 grid gap-10 border-t border-background/25 pt-10 md:grid-cols-3 md:gap-16">
            <p className="text-xs uppercase tracking-[0.18em] text-background/55">Independent by design</p>
            <p className="leading-relaxed text-background/70">We bring senior thinkers, designers and engineers directly to the work—small teams, sharp decisions and no layers of noise.</p>
            <p className="leading-relaxed text-background/70">From a first sketch to launch day, we blend strategy and craft into digital experiences that perform as beautifully as they look.</p>
          </div>
        </div>
      </section>

      <section id="services" className="px-5 py-24 sm:px-10 md:py-36">
        <div className="mx-auto max-w-[1500px]">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Capabilities</p>
              <h2 className="mt-5 font-display text-6xl md:text-8xl">All the way<br /><span className="italic text-muted-foreground">through.</span></h2>
            </div>
            <div className="lg:col-span-8">
              {services.map(([number, title, description]) => (
                <Reveal key={number} className="grid gap-4 border-t border-border py-8 sm:grid-cols-[64px_1fr_1fr] sm:gap-8">
                  <span className="font-mono text-xs text-primary">/{number}</span>
                  <h3 className="font-display text-3xl md:text-4xl">{title}</h3>
                  <p className="leading-relaxed text-muted-foreground">{description}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="relative bg-primary px-5 py-24 text-primary-foreground sm:px-10 md:py-36">
        <div className="mx-auto max-w-[1500px]">
          <p className="font-mono text-xs uppercase tracking-[0.2em]">Have a project in mind?</p>
          <a href="mailto:linkedin@mywork.co.ke" className="group mt-8 flex items-end justify-between border-b border-primary-foreground pb-8">
            <h2 className="max-w-5xl font-display text-[clamp(3.8rem,10vw,10rem)] leading-[0.78]">Let’s make<br /><span className="italic">it matter.</span></h2>
            <ArrowUpRight className="mb-2 h-12 w-12 shrink-0 transition-transform duration-300 group-hover:-translate-y-2 group-hover:translate-x-2 md:h-24 md:w-24" />
          </a>
          <div className="mt-10 flex flex-col justify-between gap-5 text-sm sm:flex-row">
            <a href="mailto:linkedin@mywork.co.ke">linkedin@mywork.co.ke</a>
            <a href="tel:+254716534393">+254 716 534 393</a>
            <span>Nairobi, Kenya · Working worldwide</span>
          </div>
        </div>
      </section>

      <footer className="bg-foreground px-5 py-8 text-background sm:px-10">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-4 text-xs uppercase tracking-[0.14em] sm:flex-row">
          <span>Nia Studio — Web design &amp; development agency, Nairobi</span>
          <nav className="flex flex-wrap gap-5" aria-label="Footer">
            <Link to="/web-design-nairobi" className="hover:text-primary">Web design Nairobi</Link>
            <Link to="/web-development-nairobi" className="hover:text-primary">Web development Nairobi</Link>
            <a href="mailto:linkedin@mywork.co.ke" className="hover:text-primary">Contact</a>
          </nav>
          <span>© {new Date().getFullYear()} All rights reserved</span>
        </div>
      </footer>
    </main>
  );
}