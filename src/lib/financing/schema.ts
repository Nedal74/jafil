import { z } from "zod";
import { normalizeSaudiMobile, toLatinDigits } from "../phone";

const money = (key: string, min: number) =>
  z.preprocess(
    (v) => (v === "" || v == null ? NaN : Number(toLatinDigits(String(v)).replace(/[,\s]/g, ""))),
    z.number({ error: key }).int(key).min(min, key).max(10_000_000, key),
  );

export const financingSchema = z.object({
  operation: z.enum(["PURCHASE", "SELF_CONSTRUCTION", "REFINANCE"]),
  fullName: z.string().trim().min(3, "invalidName").max(150, "invalidName"),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => normalizeSaudiMobile(v) !== null, "invalidPhone"),
  monthlySalary: money("salary", 1),
  employerSector: z.enum(["GOVERNMENT", "MILITARY", "PRIVATE", "RETIRED", "OTHER"], { error: "employer" }),
  bank: z.string().trim().min(1, "bank").max(100, "bank"),
  monthlyObligations: money("obligations", 0),
  hasRealEstateLoan: z.enum(["yes", "no"], { error: "loan" }).transform((v) => v === "yes"),
  age: z.preprocess(
    (v) => (v === "" || v == null ? NaN : Number(toLatinDigits(String(v)))),
    z.number({ error: "age" }).int("age").min(18, "age").max(75, "age"),
  ),
  locale: z.enum(["ar", "en"]).default("ar"),
  consent: z.literal(true, { error: "consentRequired" }),
  website: z.string().max(0).optional(),
});

export type FinancingInput = z.infer<typeof financingSchema>;
