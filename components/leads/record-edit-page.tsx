import Link from "next/link";
import { notFound } from "next/navigation";
import { createAppClient } from "@/lib/supabase/app";
import { LeadForm } from "@/components/leads/lead-form";
import { getRecordType } from "@/lib/leads/record-type";

export async function RecordEditPage({ id, recordType }: { id: string; recordType: "lead" | "contact" }) {
  const supabase = await createAppClient();
  const { data: record, error } = await supabase
    .from("leads")
    .select("id,name,email,phone,company,job_title,source,value,tags,next_follow_up_at,custom")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Falha ao carregar o registro: ${error.message}`);
  if (!record || getRecordType(record.custom) !== recordType) notFound();

  const basePath = recordType === "contact" ? "/contacts" : "/leads";
  const label = recordType === "contact" ? "contato" : "lead";
  return <div><div className="crm-page-head"><div><div className="crm-eyebrow">{recordType === "contact" ? "CONTATOS" : "LEADS"} / EDITAR</div><h1>Editar {label}</h1><p>Atualize os dados deste registro.</p></div><Link className="text-link" href={`${basePath}/${id}`}>Cancelar</Link></div><LeadForm lead={{ ...record, value: record.value === null ? null : Number(record.value) }} basePath={basePath} /></div>;
}
