import { prisma } from "../db";
import { rangesFromUnits } from "./inventory";

/** Recomputes stored ranges for AUTO projects after any unit change. */
export async function syncProjectRanges(projectId: string): Promise<void> {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { rangeMode: true } });
  if (!project || project.rangeMode !== "AUTO_FROM_UNITS") return;
  const units = await prisma.unit.findMany({
    where: { projectId },
    select: { status: true, price: true, area: true, bedrooms: true },
  });
  await prisma.project.update({ where: { id: projectId }, data: rangesFromUnits(units) });
}
