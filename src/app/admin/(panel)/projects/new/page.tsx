import { PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ProjectForm } from "../ProjectForm";

export const metadata = { title: "مشروع جديد" };

export default async function NewProject() {
  await requireUser("projects.manage");
  const types = await prisma.propertyType.findMany({ orderBy: { order: "asc" } });
  return (
    <>
      <PageHeader title="مشروع جديد" description="يُحفظ المشروع كمسودة حتى تختار نشره." />
      <ProjectForm types={types} />
    </>
  );
}
