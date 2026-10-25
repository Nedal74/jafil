import type {
  ConstructionStatus, EmployerSector, FeatureKind, FinancingOperation, FinancingStatus, LeadSource, LeadStatus,
  PublishStatus, SalesStatus, UnitStatus,
} from "@prisma/client";

export const PUBLISH_LABELS: Record<PublishStatus, string> = { DRAFT: "مسودة", PUBLISHED: "منشور", ARCHIVED: "مؤرشف" };
export const PUBLISH_TONE: Record<PublishStatus, "gray" | "green" | "amber"> = { DRAFT: "gray", PUBLISHED: "green", ARCHIVED: "amber" };
export const CONSTRUCTION_LABELS: Record<ConstructionStatus, string> = { UPCOMING: "قادم", UNDER_CONSTRUCTION: "تحت الإنشاء", COMPLETED: "مكتمل" };
export const SALES_LABELS: Record<SalesStatus, string> = { COMING_SOON: "قريباً", AVAILABLE: "متاح للبيع", SOLD_OUT: "مباع بالكامل" };
export const UNIT_LABELS: Record<UnitStatus, string> = { AVAILABLE: "متاح", RESERVED: "محجوز", SOLD: "مباع", UNPUBLISHED: "غير منشور" };
export const UNIT_TONE: Record<UnitStatus, "green" | "amber" | "gray" | "red"> = { AVAILABLE: "green", RESERVED: "amber", SOLD: "red", UNPUBLISHED: "gray" };
export const FEATURE_LABELS: Record<FeatureKind, string> = { AMENITY: "خاصية", FACILITY: "مرفق", GUARANTEE: "ضمان" };
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "جديد", CONTACTED: "تم التواصل", QUALIFIED: "مؤهل", VISIT_SCHEDULED: "زيارة مجدولة", NEGOTIATION: "تفاوض", WON: "تم البيع", LOST: "مفقود",
};
export const LEAD_STATUS_TONE: Record<LeadStatus, "blue" | "sand" | "navy" | "amber" | "green" | "gray" | "red"> = {
  NEW: "blue", CONTACTED: "sand", QUALIFIED: "navy", VISIT_SCHEDULED: "amber", NEGOTIATION: "amber", WON: "green", LOST: "gray",
};
export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  PROJECT_INQUIRY: "استفسار مشروع", CONTACT_FORM: "نموذج التواصل", AI_ASSISTANT: "المساعد العقاري", FINANCING: "التمويل", HOME_SEARCH: "بحث الرئيسية", MANUAL: "إدخال يدوي",
};
export const FIN_STATUS_LABELS: Record<FinancingStatus, string> = {
  NEW: "جديد", IN_REVIEW: "قيد المراجعة", CONTACTED: "تم التواصل", DOCUMENTS_REQUESTED: "طلب مستندات", REFERRED_TO_BANK: "أحيل للجهة التمويلية", CLOSED: "مغلق",
};
export const FIN_OP_LABELS: Record<FinancingOperation, string> = { PURCHASE: "شراء", SELF_CONSTRUCTION: "بناء ذاتي", REFINANCE: "إعادة تمويل" };
export const EMPLOYER_LABELS: Record<EmployerSector, string> = { GOVERNMENT: "حكومي", MILITARY: "عسكري", PRIVATE: "خاص", RETIRED: "متقاعد", OTHER: "أخرى" };

export const options = <K extends string>(labels: Record<K, string>) =>
  (Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] }));
