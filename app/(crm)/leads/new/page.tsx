import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { LeadForm } from "@/components/leads/lead-form";

export default function NewLeadPage() {
  return <div>
    <div className="crm-page-head"><div><div className="crm-eyebrow">LEADS / NOVO</div><h1>Novo lead</h1><p>Cadastre um contato e inicie o acompanhamento no funil.</p></div><Link className="text-link" href="/leads"><ChevronLeft size={15} /> Voltar para leads</Link></div>
    <LeadForm />
  </div>;
}
