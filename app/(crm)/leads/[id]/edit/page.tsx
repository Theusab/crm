import { RecordEditPage } from "@/components/leads/record-edit-page";

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RecordEditPage id={id} recordType="lead" />;
}
