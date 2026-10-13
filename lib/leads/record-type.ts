export type CrmRecordType = "lead" | "contact";

export function getRecordType(custom: unknown): CrmRecordType {
  if (!custom || typeof custom !== "object" || Array.isArray(custom)) return "lead";
  return (custom as Record<string, unknown>).record_type === "contact" ? "contact" : "lead";
}

export function withRecordType(custom: unknown, recordType: CrmRecordType) {
  const metadata = custom && typeof custom === "object" && !Array.isArray(custom)
    ? custom as Record<string, unknown>
    : {};
  return { ...metadata, record_type: recordType };
}
