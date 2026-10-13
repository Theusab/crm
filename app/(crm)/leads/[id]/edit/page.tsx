import Link from "next/link";
import { notFound } from "next/navigation";
import { createAppClient } from "@/lib/supabase/app";
import { LeadForm } from "@/components/leads/lead-form";

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createAppClient();
  const { data: lead, error } = await supabase.from("leads").select("id,name,email,phone,company,job_title,source,value,tags,next_follow_up_at").eq("id", id).maybeSingle();
  if (error) throw new Error(`Falha ao carregar o lead: ${error.message}`);
  if (!lead) notFound();
  return <div><div className="crm-page-head"><div><div className="crm-eyebrow">LEADS / EDITAR</div><h1>Editar lead</h1><p>Atualize os dados deste contato.</p></div><Link className="text-link" href={`/leads/${id}`}>Cancelar</Link></div><LeadForm lead={{ ...lead, value: lead.value === null ? null : Number(lead.value) }} /></div>;
}
