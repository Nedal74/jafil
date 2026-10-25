import { randomInt } from "node:crypto";
import type { FinancingApplication } from "@prisma/client";

import { prisma } from "../db";
import { notifyTeam } from "../notify";
import { normalizeSaudiMobile } from "../phone";
import type { FinancingInput } from "./schema";

function newReference(): string {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  return `FIN-${ymd}-${randomInt(100000, 999999)}`;
}

export async function createFinancingApplication(input: FinancingInput): Promise<FinancingApplication> {
  const phoneNormalized = normalizeSaudiMobile(input.phone);
  if (!phoneNormalized) throw new Error("invalid phone");

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const app = await prisma.financingApplication.create({
        data: {
          reference: newReference(),
          operation: input.operation,
          fullName: input.fullName,
          phone: input.phone,
          phoneNormalized,
          monthlySalary: input.monthlySalary,
          employerSector: input.employerSector,
          bank: input.bank,
          monthlyObligations: input.monthlyObligations,
          hasRealEstateLoan: input.hasRealEstateLoan,
          age: input.age,
          locale: input.locale,
          consent: true,
          consentAt: new Date(),
        },
      });
      await notifyTeam({ type: "financing.created", id: app.id, reference: app.reference });
      return app;
    } catch (err) {
      if ((err as { code?: string }).code !== "P2002") throw err; // retry only on reference collision
    }
  }
  throw new Error("could not allocate financing reference");
}
