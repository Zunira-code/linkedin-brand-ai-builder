import { createFileRoute, Link } from "@tanstack/react-router";

const TITLE = "Privacy Policy — Nia Studio & Postpilot";
const DESCRIPTION =
  "How Nia Studio and the Postpilot app collect, use, store and delete your personal data, including LinkedIn account information.";
const URL = "https://app.mywork.co.ke/privacy";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: PrivacyPage,
});

const sections = [
  {
    heading: "Who we are",
    body: "Nia Studio is a web design and development agency based in Nairobi, Kenya. We also operate Postpilot, an AI LinkedIn publishing tool. You can reach us at linkedin@mywork.co.ke or +254 716 534 393.",
  },
  {
    heading: "What we collect",
    body: "When you create a Postpilot account we store your email address and profile details. If you connect LinkedIn, we store the access tokens LinkedIn issues to us and the profile, post, comment and analytics data needed to run the features you use. We also store content you create in the app, such as drafts, brand voice samples, carousels and uploaded images.",
  },
  {
    heading: "How we use it",
    body: "Your data is used only to provide the service: generating and publishing your posts, showing your analytics and leads, and supporting your account. We do not sell your data or use it for advertising.",
  },
  {
    heading: "AI processing",
    body: "Content you generate is processed by third-party AI models on our behalf to produce drafts and suggestions. We do not use your content to train our own models.",
  },
  {
    heading: "LinkedIn",
    body: "Postpilot acts on LinkedIn only on your instruction and only within the permissions you grant. You can disconnect LinkedIn from Settings at any time, which revokes our stored tokens.",
  },
  {
    heading: "Storage and security",
    body: "Data is stored on managed cloud infrastructure with access controls, and each account can only read its own records. Access tokens are kept server-side and never exposed to your browser.",
  },
  {
    heading: "Your choices",
    body: "You can request a copy of your data or ask us to delete your account and its content by emailing linkedin@mywork.co.ke. We remove account data within 30 days of a deletion request, except where we must keep records for legal reasons.",
  },
  {
    heading: "Changes",
    body: "If this policy changes materially we will update this page and notify account holders by email.",
  },
];

function PrivacyPage() {
  return (
    <main className="bg-background text-foreground">
      <section className="border-b border-border px-5 py-24 sm:px-10 md:py-32">
        <div className="mx-auto max-w-[900px]">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Legal</p>
          <h1 className="mt-6 font-display text-[clamp(2.75rem,6vw,5rem)] leading-[0.9]">Privacy Policy</h1>
          <p className="mt-6 text-sm text-muted-foreground">Last updated 16 September 2026</p>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-10">
        <div className="mx-auto max-w-[900px]">
          {sections.map((section) => (
            <div key={section.heading} className="border-t border-border py-8">
              <h2 className="font-display text-3xl">{section.heading}</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{section.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-foreground px-5 py-8 text-background sm:px-10">
        <div className="mx-auto flex max-w-[900px] flex-wrap gap-5 text-xs uppercase tracking-[0.14em]">
          <Link to="/" className="hover:text-primary">Nia Studio home</Link>
          <Link to="/pricing" className="hover:text-primary">Postpilot pricing</Link>
          <a href="mailto:linkedin@mywork.co.ke" className="hover:text-primary">Contact</a>
        </div>
      </footer>
    </main>
  );
}
