import { RecordDetailPage } from "@/components/leads/record-detail-page";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RecordDetailPage id={id} recordType="lead" />;
}
