import { Link } from "@tanstack/react-router";
import { Mail, Phone } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export function MarketingHeader() {
  return (
    <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <Link to="/" aria-label="Postpilot home">
        <Logo />
      </Link>
      <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
        <Link to="/ai-linkedin-post-generator" className="hover:text-foreground">
          Post generator
        </Link>
        <Link to="/linkedin-content-calendar" className="hover:text-foreground">
          Content calendar
        </Link>
        <Link to="/linkedin-profile-optimizer" className="hover:text-foreground">
          Profile optimizer
        </Link>
        <Link to="/pricing" className="hover:text-foreground">
          Pricing
        </Link>
      </nav>
      <div className="flex items-center gap-2">
        <Link to="/auth">
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
        </Link>
        <Link to="/auth">
          <Button size="sm" className="bg-brand-gradient text-brand-foreground hover:opacity-95">
            Start free
          </Button>
        </Link>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto max-w-6xl px-6">
        <nav aria-label="Footer" className="grid gap-6 text-sm sm:grid-cols-3">
          <div>
            <p className="font-display font-semibold">Product</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>
                <Link to="/ai-linkedin-post-generator" className="hover:text-foreground">
                  AI LinkedIn post generator
                </Link>
              </li>
              <li>
                <Link to="/linkedin-content-calendar" className="hover:text-foreground">
                  LinkedIn content calendar
                </Link>
              </li>
              <li>
                <Link to="/linkedin-profile-optimizer" className="hover:text-foreground">
                  LinkedIn profile optimizer
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-display font-semibold">Company</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>
                <Link to="/pricing" className="hover:text-foreground">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-foreground">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/auth" className="hover:text-foreground">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-display font-semibold">Contact</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>
                <a href="mailto:linkedin@mywork.co.ke" className="inline-flex items-center gap-1 hover:text-foreground">
                  <Mail className="h-3 w-3" /> linkedin@mywork.co.ke
                </a>
              </li>
              <li>
                <a href="tel:+254716534393" className="inline-flex items-center gap-1 hover:text-foreground">
                  <Phone className="h-3 w-3" /> 0716 534 393
                </a>
              </li>
            </ul>
          </div>
        </nav>
        <p className="mt-8 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Postpilot — LinkedIn personal branding tool. Not affiliated with
          LinkedIn Corp.
        </p>
      </div>
    </footer>
  );
}

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="mx-auto mt-10 max-w-3xl divide-y divide-border rounded-2xl border border-border bg-card">
      {items.map((f) => (
        <details key={f.q} className="group p-6">
          <summary className="cursor-pointer list-none font-display text-base font-semibold marker:hidden">
            {f.q}
          </summary>
          <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function faqSchema(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}