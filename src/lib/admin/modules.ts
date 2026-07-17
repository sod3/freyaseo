import {
  Activity,
  BookOpenText,
  Boxes,
  BriefcaseBusiness,
  ContactRound,
  FileText,
  FolderTree,
  FormInput,
  GalleryHorizontalEnd,
  Globe2,
  LayoutDashboard,
  Link2,
  ListChecks,
  MessageSquareQuote,
  Navigation,
  NotebookTabs,
  Search,
  Settings,
  ShieldCheck,
  Tags,
  Trophy,
  Users,
} from "lucide-react";

export type AdminModuleSlug =
  | "dashboard"
  | "pages"
  | "blog"
  | "services"
  | "tools"
  | "certificates"
  | "faqs"
  | "testimonials"
  | "media"
  | "navigation"
  | "footer"
  | "languages"
  | "seo"
  | "google-integrations"
  | "redirects"
  | "forms"
  | "users"
  | "settings"
  | "audit-logs"
  | "taxonomy"
  | "backups";

export type AdminModule = {
  slug: AdminModuleSlug;
  label: string;
  description: string;
  permission: string;
  icon: typeof LayoutDashboard;
};

export const adminModules: AdminModule[] = [
  { slug: "dashboard", label: "Dashboard", description: "Content health, recent activity and quick actions.", permission: "dashboard.view", icon: LayoutDashboard },
  { slug: "pages", label: "Website Pages", description: "Edit every public page, service page, SEO, tags, text and images.", permission: "content.read", icon: FileText },
  { slug: "blog", label: "Blog", description: "Create, edit, publish and translate articles.", permission: "content.read", icon: BookOpenText },
  { slug: "services", label: "Services", description: "Manage service pages, related tools and SEO.", permission: "content.read", icon: BriefcaseBusiness },
  { slug: "tools", label: "Tools", description: "Manage tool cards, logos, categories and related content.", permission: "content.read", icon: Boxes },
  { slug: "certificates", label: "Certificates", description: "Manage credential cards and certificate metadata.", permission: "content.read", icon: Trophy },
  { slug: "faqs", label: "FAQs", description: "Manage reusable questions, answers and schema eligibility.", permission: "content.read", icon: ListChecks },
  { slug: "testimonials", label: "Testimonials", description: "Manage client quotes without inventing content.", permission: "content.read", icon: MessageSquareQuote },
  { slug: "media", label: "Media", description: "Upload, replace, tag and audit media assets.", permission: "content.read", icon: GalleryHorizontalEnd },
  { slug: "navigation", label: "Header", description: "Edit header menu labels, order, visibility and dropdowns.", permission: "content.read", icon: Navigation },
  { slug: "footer", label: "Footer", description: "Edit footer copy, links, social profiles and contact details.", permission: "content.read", icon: ContactRound },
  { slug: "languages", label: "Languages", description: "Add, edit and activate website languages.", permission: "settings.manage", icon: Globe2 },
  { slug: "seo", label: "SEO", description: "Review metadata, canonical URLs, schema and indexability.", permission: "seo.write", icon: Search },
  { slug: "google-integrations", label: "Google Integrations", description: "Configure analytics, tags and verification IDs.", permission: "integrations.write", icon: Globe2 },
  { slug: "redirects", label: "Redirects", description: "Manage legacy URLs and slug-change redirects.", permission: "content.read", icon: Link2 },
  { slug: "forms", label: "Forms", description: "Edit public form copy and review submissions.", permission: "forms.read", icon: FormInput },
  { slug: "users", label: "Users", description: "Manage admin accounts, roles and session access.", permission: "users.manage", icon: Users },
  { slug: "settings", label: "Settings", description: "Website, branding, language, maintenance and security settings.", permission: "settings.manage", icon: Settings },
  { slug: "audit-logs", label: "Audit Logs", description: "Review security and content activity.", permission: "audit.read", icon: Activity },
  { slug: "taxonomy", label: "Tags & Categories", description: "Manage reusable tags and content categories.", permission: "content.read", icon: Tags },
  { slug: "backups", label: "Backups", description: "Export content backups and form submission CSVs.", permission: "backups.export", icon: ShieldCheck },
];

export const adminPrimaryModules = adminModules.filter((item) =>
  ["dashboard", "pages", "blog", "services", "tools", "media", "forms", "languages", "seo", "settings"].includes(item.slug),
);

export function getAdminModule(slug: string) {
  return adminModules.find((item) => item.slug === slug);
}

export const quickCreateModules = [
  { slug: "pages", label: "New Page", icon: NotebookTabs },
  { slug: "blog", label: "New Post", icon: BookOpenText },
  { slug: "tools", label: "New Tool", icon: Boxes },
  { slug: "services", label: "New Service", icon: FolderTree },
] as const;
