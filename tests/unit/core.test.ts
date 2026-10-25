import { generateKeyPairSync, createVerify } from "node:crypto";
import { describe, expect, it } from "vitest";

import { hashPassword, passwordPolicyError, verifyPassword } from "@/lib/auth/password";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { buildJwtAssertion } from "@/lib/google/client";
import { csvCell } from "@/lib/leads/scope";
import { displaySaudiMobile, normalizeSaudiMobile, whatsappLink } from "@/lib/phone";
import { buildMetadata, jsonLdScript } from "@/lib/seo";
import { isSafeKey, sniffMime, validateUpload } from "@/lib/storage";
import { slugify } from "@/lib/utils";

describe("phone", () => {
  it.each([
    ["0570800002", "966570800002"],
    ["570800002", "966570800002"],
    ["+966570800002", "966570800002"],
    ["00966 57 080 0002", "966570800002"],
    ["٠٥٧٠٨٠٠٠٠٢", "966570800002"],
  ])("normalizes %s", (input, out) => expect(normalizeSaudiMobile(input)).toBe(out));
  it.each(["0112345678", "12345", "05708000021", "abc"])("rejects %s", (v) => expect(normalizeSaudiMobile(v)).toBeNull());
  it("formats display and whatsapp", () => {
    expect(displaySaudiMobile("966570800002")).toBe("0570800002");
    expect(whatsappLink("0570800002", "مرحبا")).toBe("https://wa.me/966570800002?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7");
  });
});

describe("passwords", () => {
  it("hashes and verifies", async () => {
    const h = await hashPassword("CorrectHorse99");
    expect(h).toMatch(/^scrypt:/);
    expect(await verifyPassword("CorrectHorse99", h)).toBe(true);
    expect(await verifyPassword("wrong-password1", h)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
  it("enforces policy", () => {
    expect(passwordPolicyError("short1")).not.toBeNull();
    expect(passwordPolicyError("onlyletterslong")).not.toBeNull();
    expect(passwordPolicyError("letters1234")).toBeNull();
  });
});

describe("permissions", () => {
  it("super admin has every permission", () => PERMISSIONS.forEach((p) => expect(can("SUPER_ADMIN", p)).toBe(true)));
  it("separates financing from sales and content", () => {
    expect(can("SALES_AGENT", "financing.view")).toBe(false);
    expect(can("CONTENT_EDITOR", "financing.view")).toBe(false);
    expect(can("CONTENT_EDITOR", "leads.view")).toBe(false);
    expect(can("FINANCING_MANAGER", "leads.view")).toBe(false);
    expect(can("FINANCING_MANAGER", "financing.export")).toBe(true);
  });
  it("only super admin manages users and exports leads", () => {
    for (const r of ["CONTENT_EDITOR", "SALES_AGENT", "FINANCING_MANAGER"] as const) {
      expect(can(r, "users.manage")).toBe(false);
      expect(can(r, "leads.export")).toBe(false);
    }
  });
});

describe("uploads", () => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
  it("detects type from content, not extension", () => {
    expect(sniffMime(png)).toBe("image/png");
    expect(sniffMime(Buffer.from("<svg onload=alert(1)></svg>....."))).toBeNull();
    expect(sniffMime(Buffer.from("%PDF-1.7 ........"))).toBe("application/pdf");
  });
  it("rejects disallowed and oversized files", () => {
    expect(validateUpload(Buffer.from("<html><script>x</script></html>")).ok).toBe(false);
    const big = Buffer.concat([png, Buffer.alloc(9 * 1024 * 1024)]);
    expect(validateUpload(big).ok).toBe(false);
  });
  it("only accepts generated storage keys (no traversal)", () => {
    expect(isSafeKey("2026/10/0123456789abcdef01234567.png")).toBe(true);
    expect(isSafeKey("../../etc/passwd")).toBe(false);
    expect(isSafeKey("2026/10/../../x.png")).toBe(false);
  });
});

describe("csv", () => {
  it("neutralises formula injection and escapes quotes", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell("+966")).toBe(`"'+966"`);
    expect(csvCell("عادي")).toBe(`"عادي"`);
  });
});

describe("seo", () => {
  it("builds canonical + hreflang alternates", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://aljafil.com";
    const m = buildMetadata({ locale: "en", title: "T", paths: { ar: "/ar/projects/أ", en: "/en/projects/a" } });
    expect(m.alternates?.canonical).toBe("https://aljafil.com/en/projects/a");
    expect((m.alternates?.languages as Record<string, string>).ar).toBe("https://aljafil.com/ar/projects/أ");
    expect(buildMetadata({ locale: "ar", title: "T", paths: { ar: "/ar", en: "/en" }, noindex: true }).robots).toEqual({ index: false, follow: false });
  });
  it("escapes JSON-LD so content cannot close the script tag", () => {
    expect(jsonLdScript({ name: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
  it("slugifies Arabic and English", () => {
    expect(slugify("Al Narjis Floors 100")).toBe("al-narjis-floors-100");
    expect(slugify("أدوار النرجس")).toBe("ادوار-النرجس");
  });
});

describe("google service-account JWT", () => {
  it("produces a verifiable RS256 assertion", () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const jwt = buildJwtAssertion("svc@example.iam.gserviceaccount.com", privateKey.export({ type: "pkcs8", format: "pem" }).toString(), 1000);
    const [h, c, sig] = jwt.split(".");
    const claims = JSON.parse(Buffer.from(c!, "base64url").toString());
    expect(claims).toMatchObject({ iss: "svc@example.iam.gserviceaccount.com", iat: 1000, exp: 4600, aud: "https://oauth2.googleapis.com/token" });
    const v = createVerify("RSA-SHA256");
    v.update(`${h}.${c}`);
    expect(v.verify(publicKey, Buffer.from(sig!, "base64url"))).toBe(true);
  });
});
