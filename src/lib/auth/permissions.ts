import type { Role } from "@prisma/client";

export const PERMISSIONS = [
  "dashboard.view",
  "content.manage", // homepage sections, company profile, contact info
  "projects.manage",
  "units.manage",
  "articles.manage",
  "media.manage",
  "seo.manage",
  "integrations.manage",
  "assistant.manage",
  "assistant.conversations.view",
  "leads.view",
  "leads.view_all", // otherwise only leads assigned to the user
  "leads.manage",
  "leads.assign",
  "leads.export",
  "financing.view",
  "financing.manage",
  "financing.export",
  "users.manage",
  "audit.view",
  "settings.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS,
  CONTENT_EDITOR: [
    "dashboard.view",
    "content.manage",
    "projects.manage",
    "units.manage",
    "articles.manage",
    "media.manage",
    "seo.manage",
  ],
  SALES_AGENT: [
    "dashboard.view",
    "leads.view",
    "leads.manage",
    "units.manage",
    "assistant.conversations.view",
  ],
  FINANCING_MANAGER: ["dashboard.view", "financing.view", "financing.manage", "financing.export"],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "مدير النظام",
  CONTENT_EDITOR: "محرر المحتوى",
  SALES_AGENT: "مندوب مبيعات",
  FINANCING_MANAGER: "مدير التمويل",
};
