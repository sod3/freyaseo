import { AdminRecordEditor } from "@/src/components/admin/AdminRecordEditor";
import type { AdminModuleSlug } from "@/src/lib/admin/modules";

export const dynamic = "force-dynamic";

export default async function AdminEditRecordPage({
  params,
}: {
  params: Promise<{ module: string; id: string }>;
}) {
  const { module, id } = await params;
  return <AdminRecordEditor moduleSlug={module} id={id} />;
}

export function generateStaticParams(): Array<{ module: AdminModuleSlug; id: string }> {
  return [];
}
