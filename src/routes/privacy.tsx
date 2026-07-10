import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Mail, Phone } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Postpilot" },
      { name: "description", content: "Postpilot's privacy policy. Learn how we use LinkedIn OAuth 2.0, store tokens securely, and protect your personal data." },
      { property: "og:title", content: "Privacy Policy — Postpilot" },
      { property: "og:description", content: "Postpilot's privacy policy. Learn how we use LinkedIn OAuth 2.0, store tokens securely, and protect your personal data." },
      { property: "og:url", content: "https://app.mywork.co.ke/privacy" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Privacy Policy — Postpilot" },
      { name: "twitter:description", content: "Postpilot's privacy policy. Learn how we use LinkedIn OAuth 2.0, store tokens securely, and protect your personal data." },
    ],
    links: [
      { rel: "canonical", href: "https://app.mywork.co.ke/privacy" },
    ],
  }),
  component: PrivacyPage,
});

const lastUpdated = "July 10, 2026";

function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-30" aria-hidden />
        <div className="absolute -right-40 top-0 h-96 w-96 rounded-full bg-brand/20 blur-3xl" aria-hidden />

        <header className="relative z-10 mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
          <Link to="/" aria-label="Postpilot home">
            <Logo />
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Button>
          </Link>
        </header>

        <section className="relative z-10 mx-auto max-w-3xl px-6 pb-8 pt-8 md:pt-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Shield className="h-3.5 w-3.5 text-brand" />
            Your data is protected
          </div>
          <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
        </section>
      </div>

      <article className="mx-auto max-w-3xl px-6 pb-24">
        <div className="prose prose-invert mx-auto max-w-none text-foreground">
          <p className="lead text-muted-foreground">
            Postpilot ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and share your personal information when you use our website and services at{" "}
            <a href="https://app.mywork.co.ke" className="text-brand hover:underline">app.mywork.co.ke</a>.
          </p>

          <section className="mt-10">
            <h2 className="font-display text-2xl font-semibold">1. Information we collect</h2>
            <p className="mt-3 text-muted-foreground">
              We collect the following information when you create an account and use Postpilot:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
              <li><strong className="text-foreground">Account information:</strong> your name, email address, and profile picture (provided by LinkedIn during sign-in).</li>
              <li><strong className="text-foreground">Content you create:</strong> post drafts, scheduled posts, calendar events, brand voice preferences, and any text you enter into the app.</li>
              <li><strong className="text-foreground">LinkedIn connection data:</strong> an encrypted access token issued by LinkedIn OAuth 2.0, your LinkedIn member ID, and basic profile information required to publish posts on your behalf.</li>
              <li><strong className="text-foreground">Usage data:</strong> interactions with the app (e.g., posts generated, scheduling activity) used to improve the product and provide analytics.</li>
            </ul>
            <p className="mt-3 text-muted-foreground">
              We do not collect your LinkedIn password, financial information, or direct messages.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl font-semibold">2. LinkedIn authentication and access tokens</h2>
            <p className="mt-3 text-muted-foreground">
              Postpilot connects to LinkedIn using the official LinkedIn OAuth 2.0 API. When you choose to connect your LinkedIn account, you are redirected to LinkedIn's secure authorization page where you explicitly approve the permissions we request.
            </p>
            <p className="mt-3 text-muted-foreground">
              <strong className="text-foreground">We do not store your LinkedIn password.</strong> We only receive an access token from LinkedIn, which is used to publish scheduled posts on your behalf. Access tokens are stored encrypted at rest and are only decrypted by our secure server when a scheduled post is published.
            </p>
            <p className="mt-3 text-muted-foreground">
              You can revoke Postpilot's access to your LinkedIn account at any time by visiting your LinkedIn account settings and removing Postpilot under "Authorized applications" or by contacting us directly.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl font-semibold">3. How we use your information</h2>
            <p className="mt-3 text-muted-foreground">
              We use your information to:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Provide, operate, and maintain the Postpilot service.</li>
              <li>Generate, schedule, and publish LinkedIn posts according to your instructions.</li>
              <li>Display analytics and performance data for your LinkedIn content.</li>
              <li>Communicate with you about product updates, security alerts, and support requests.</li>
              <li>Improve the accuracy and relevance of our AI-generated content suggestions.</li>
            </ul>
            <p className="mt-3 text-muted-foreground">
              We do not sell your personal information. We do not use your content to train third-party AI models.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl font-semibold">4. Data sharing and subprocessors</h2>
            <p className="mt-3 text-muted-foreground">
              We share your data only with trusted service providers necessary to operate the platform:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
              <li><strong className="text-foreground">Lovable Cloud / backend hosting:</strong> for application hosting, authentication, and database services.</li>
              <li><strong className="text-foreground">LinkedIn:</strong> to publish posts on your behalf and retrieve public profile information.</li>
              <li><strong className="text-foreground">AI services:</strong> to generate post drafts based on your inputs. Inputs are processed in real time and are not retained by model providers.</li>
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl font-semibold">5. Data retention and deletion</h2>
            <p className="mt-3 text-muted-foreground">
              We retain your account data and content for as long as your account is active. If you delete your account, we will remove your personal data and LinkedIn tokens from our systems within a reasonable period, except where required by law or for legitimate security and fraud-prevention purposes.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl font-semibold">6. Security</h2>
            <p className="mt-3 text-muted-foreground">
              We take reasonable administrative, technical, and physical measures to protect your information, including encryption of access tokens at rest, HTTPS for all data in transit, and role-based access controls for our infrastructure.
            </p>
            <p className="mt-3 text-muted-foreground">
              No method of transmission over the internet is completely secure, so we cannot guarantee absolute security. If you have reason to believe your interaction with us is no longer secure, please contact us immediately.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl font-semibold">7. Your rights and choices</h2>
            <p className="mt-3 text-muted-foreground">
              Depending on your location, you may have the right to access, correct, delete, or restrict the processing of your personal data. You can manage most of your information directly in your account settings. To exercise other rights, contact us at{" "}
              <a href="mailto:linkedin@mywork.co.ke" className="text-brand hover:underline">linkedin@mywork.co.ke</a>.
            </p>
            <p className="mt-3 text-muted-foreground">
              You can also disconnect LinkedIn at any time from the Settings page or revoke permissions from LinkedIn's "Authorized applications" section.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl font-semibold">8. Cookies and analytics</h2>
            <p className="mt-3 text-muted-foreground">
              We may use essential cookies and analytics tools to keep the service running and understand how users interact with Postpilot. You can control cookie preferences through your browser settings.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl font-semibold">9. Children's privacy</h2>
            <p className="mt-3 text-muted-foreground">
              Postpilot is not intended for children under 16. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will delete it.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl font-semibold">10. Changes to this policy</h2>
            <p className="mt-3 text-muted-foreground">
              We may update this Privacy Policy from time to time. We will post the revised version on this page with an updated "Last updated" date. Continued use of the service after changes constitutes acceptance of the revised policy.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl font-semibold">11. Contact us</h2>
            <p className="mt-3 text-muted-foreground">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a href="mailto:linkedin@mywork.co.ke" className="flex items-center gap-2 rounded-xl border border-border bg-card/60 p-4 text-sm text-muted-foreground transition hover:border-brand">
                <Mail className="h-4 w-4 text-brand" />
                linkedin@mywork.co.ke
              </a>
              <a href="tel:+254716534393" className="flex items-center gap-2 rounded-xl border border-border bg-card/60 p-4 text-sm text-muted-foreground transition hover:border-brand">
                <Phone className="h-4 w-4 text-brand" />
                0716 534 393
              </a>
            </div>
          </section>
        </div>
      </article>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 px-6 text-xs text-muted-foreground md:flex-row">
          <Link to="/" aria-label="Postpilot home">
            <Logo />
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <a href="mailto:linkedin@mywork.co.ke" className="inline-flex items-center gap-1 hover:text-foreground">
              <Mail className="h-3 w-3" /> linkedin@mywork.co.ke
            </a>
            <a href="tel:+254716534393" className="inline-flex items-center gap-1 hover:text-foreground">
              <Phone className="h-3 w-3" /> 0716 534 393
            </a>
          </div>
          <p>© {new Date().getFullYear()} Postpilot. Not affiliated with LinkedIn Corp.</p>
        </div>
      </footer>
    </main>
  );
}
