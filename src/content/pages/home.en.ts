import type { Benefit, FAQ, Metric, ProcessStep } from "@/src/types";

export const homeEn = {
  path: "/",
  alternateHref: "/el/seo-agency/",
  seoTitle: "Rank First on Google & AI | Multilingual SEO Agency - Freya SEO",
  metaDescription:
    "Freya SEO builds AI-powered SEO, automation, reporting and custom tools for businesses that want measurable organic growth.",
  announcement: "AI-powered SEO and digital growth for Google, ChatGPT, Gemini and beyond.",
  hero: {
    eyebrow: "AI-Powered SEO & Digital Growth",
    title: "SEO strategies built for visibility, growth and measurable results.",
    text: "Freya combines technical SEO, AI-driven analysis, automation and custom reporting to help modern businesses improve visibility and make smarter decisions.",
    primary: "Let’s Work Together",
    secondary: "Explore Services",
  },
  trustLogos: ["Google", "Semrush", "IBM", "Coursera", "Ahrefs", "OpenAI"],
  stats: [
    { label: "Completed Projects", value: 42, suffix: "+" },
    { label: "Happy Clients", value: 28, suffix: "+" },
    { label: "Years of Experience", value: 9, suffix: "+" },
    { label: "Total Traffic", value: 2.4, suffix: "M", note: "tracked across SEO projects" },
  ] satisfies Metric[],
  about: {
    eyebrow: "About Freya",
    title: "Multilingual SEO, clear strategy and AI-aware growth without the jargon.",
    text: "Freya SEO is led by Pavlina Hörmann, an SEO Manager and AI marketer with experience across content, social media, digital marketing and technical SEO. The work stays personal, practical and focused on useful outcomes.",
    highlights: ["AI SEO & Growth Marketing", "Multilanguage SEO", "Certificates from Google, IBM and Semrush", "Direct collaboration with Pavlina"],
  },
  dashboard: {
    eyebrow: "Performance Analytics",
    title: "A living view of visibility, traffic quality and AI-search momentum.",
    text: "Demo data shows how Freya brings rankings, leads, AI mentions and conversion movement into one readable performance view.",
  },
  why: {
    eyebrow: "Why Freya SEO",
    title: "Strategy sharp enough for search, simple enough for your team to use.",
    items: [
      { title: "Strategic thinking", text: "Every tactic starts with business goals, market reality and user intent." },
      { title: "Data-driven decisions", text: "No guessing. Priorities come from analytics, search data and practical constraints." },
      { title: "AI-assisted workflows", text: "AI is used to accelerate analysis and production, not to replace judgment." },
      { title: "Tailored solutions", text: "Dashboards, content plans and automations are shaped around your actual operations." },
      { title: "Clear reporting", text: "You see what changed, why it matters and what happens next." },
      { title: "Direct collaboration", text: "You work with the specialist doing the strategy, not a maze of account layers." },
      { title: "Technical knowledge", text: "Crawlability, schema, site speed and structured content are treated as growth work." },
      { title: "Continuous optimisation", text: "Performance is reviewed and improved instead of set once and forgotten." },
    ] satisfies Benefit[],
  },
  process: {
    eyebrow: "Process",
    title: "A calm, transparent SEO workflow.",
    steps: [
      { title: "Discovery", text: "We understand goals, markets, content, data and internal constraints." },
      { title: "Audit", text: "Technical SEO, content quality, analytics and AI-search readiness are reviewed." },
      { title: "Strategy", text: "You get priorities, timelines and the reasoning behind every recommendation." },
      { title: "Implementation", text: "We optimize pages, build dashboards, automate workflows or create tools." },
      { title: "Reporting", text: "Performance is explained in plain language and connected to business outcomes." },
      { title: "Optimisation", text: "The work keeps improving as the market, search and your business change." },
    ] satisfies ProcessStep[],
  },
  faq: {
    eyebrow: "FAQs",
    title: "Still have questions?",
    intro: "Find answers to common questions about SEO, AI search, reporting and working with Freya.",
    items: [
      {
        question: "What is the difference between normal SEO and AI SEO?",
        answer:
          "Normal SEO helps you get found on search engines like Google. AI SEO also helps AI tools such as ChatGPT, Gemini and Perplexity understand and recommend your business.",
      },
      {
        question: "Do I need all four services?",
        answer:
          "No. Many projects start with AI SEO or reporting, then add automation or custom tools once the priorities are clearer.",
      },
      {
        question: "How long until SEO results appear?",
        answer:
          "Most sites start seeing meaningful movement within two to three months, with stronger results building over time. Automations and dashboards can save time much sooner.",
      },
      {
        question: "Can Freya work alongside our marketing team?",
        answer:
          "Yes. Freya can support your existing team with strategy, dashboards, audits, automation and practical implementation support.",
      },
    ] satisfies FAQ[],
  },
  cta: {
    title: "Let’s grow your organic presence.",
    text: "Tell us about your business and we’ll show you where you stand today, and where you could go next.",
    label: "Let’s Talk Strategy",
  },
};
