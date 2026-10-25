import { z } from "zod";
import { normalizeSaudiMobile, toLatinDigits } from "../phone";

const optInt = z.preprocess(
  (v) => (v === "" || v == null ? undefined : Number(toLatinDigits(String(v)).replace(/[,\s]/g, ""))),
  z.number().int().min(0).max(1_000_000_000).optional(),
);

/** Public lead submission. Error messages are dictionary keys, resolved per locale on the client. */
export const publicLeadSchema = z
  .object({
    name: z.string().trim().min(2, "invalidName").max(120, "invalidName"),
    phone: z
      .string()
      .trim()
      .max(30)
      .refine((v) => normalizeSaudiMobile(v) !== null, "invalidPhone"),
    email: z.union([z.literal(""), z.email("invalidEmail").max(200)]).optional(),
    message: z.string().trim().max(2000).optional(),
    propertyTypeKey: z.string().trim().max(60).optional(),
    preferredLocation: z.string().trim().max(120).optional(),
    budgetMin: optInt,
    budgetMax: optInt,
    bedrooms: optInt,
    projectId: z.string().max(40).optional(),
    unitId: z.string().max(40).optional(),
    source: z.enum(["PROJECT_INQUIRY", "CONTACT_FORM", "HOME_SEARCH", "AI_ASSISTANT"]),
    landingPage: z.string().max(300).optional(),
    locale: z.enum(["ar", "en"]).default("ar"),
    consent: z.literal(true, { error: "consentRequired" }),
    // Honeypot: real users never fill this hidden field.
    website: z.string().max(0).optional(),
  })
  .refine((d) => d.budgetMin == null || d.budgetMax == null || d.budgetMin <= d.budgetMax, {
    path: ["budgetMax"],
    message: "invalidBudget",
  });

export type PublicLeadInput = z.infer<typeof publicLeadSchema>;
