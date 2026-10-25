import { describe, expect, it } from "vitest";

import { financingSchema } from "@/lib/financing/schema";
import { publicLeadSchema } from "@/lib/leads/schema";

const lead = { name: "محمد", phone: "0570800002", source: "CONTACT_FORM", consent: true };
const fin = {
  operation: "PURCHASE",
  fullName: "محمد أحمد",
  phone: "0570800002",
  monthlySalary: "15,000",
  employerSector: "GOVERNMENT",
  bank: "مصرف الراجحي",
  monthlyObligations: "0",
  hasRealEstateLoan: "no",
  age: "35",
  consent: true,
};

describe("lead validation", () => {
  it("accepts a minimal valid lead", () => expect(publicLeadSchema.safeParse(lead).success).toBe(true));
  it("requires consent", () => {
    const r = publicLeadSchema.safeParse({ ...lead, consent: false });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0]!.message).toBe("consentRequired");
  });
  it("rejects invalid phone and email", () => {
    expect(publicLeadSchema.safeParse({ ...lead, phone: "12345" }).error!.issues[0]!.message).toBe("invalidPhone");
    expect(publicLeadSchema.safeParse({ ...lead, email: "nope" }).success).toBe(false);
  });
  it("rejects disallowed sources (e.g. spoofing FINANCING)", () => expect(publicLeadSchema.safeParse({ ...lead, source: "FINANCING" }).success).toBe(false));
  it("flags honeypot content as invalid", () => expect(publicLeadSchema.safeParse({ ...lead, website: "spam" }).success).toBe(false));
});

describe("financing validation", () => {
  it("parses formatted numbers and yes/no", () => {
    const r = financingSchema.parse(fin);
    expect(r.monthlySalary).toBe(15000);
    expect(r.hasRealEstateLoan).toBe(false);
    expect(r.age).toBe(35);
  });
  it.each([
    ["age", "17", "age"],
    ["age", "", "age"],
    ["monthlySalary", "0", "salary"],
    ["monthlyObligations", "-5", "obligations"],
    ["hasRealEstateLoan", undefined, "loan"],
    ["employerSector", "", "employer"],
  ])("rejects %s=%s with key %s", (field, value, key) => {
    const r = financingSchema.safeParse({ ...fin, [field]: value });
    expect(r.success).toBe(false);
    expect(r.error!.issues.find((i) => i.path[0] === field)?.message).toBe(key);
  });
  it("requires consent", () => expect(financingSchema.safeParse({ ...fin, consent: false }).success).toBe(false));
});
