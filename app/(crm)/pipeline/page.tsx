import { createAppClient } from "@/lib/supabase/app";
import { Board } from "@/components/pipeline/board";

export default async function PipelinePage() {
  const supabase = await createAppClient();
  const [{ data: stages, error: stagesError }, { data: leads, error: leadsError }] = await Promise.all([
    supabase.from("pipeline_stages").select("id,name,color,slug").order("position"),
    supabase.from("leads").select("id,name,company,value,stage_id,score,position").order("position"),
  ]);
  if (stagesError || leadsError) throw new Error(`Falha ao carregar o funil: ${stagesError?.message ?? leadsError?.message}`);
  return <div>
    <div className="crm-page-head"><div><div className="crm-eyebrow">OPORTUNIDADES</div><h1>Funil de vendas</h1><p>Arraste leads entre as etapas para atualizar seu progresso.</p></div></div>
    {!leads?.length && <div className="crm-panel crm-empty"><strong>Seu funil ainda está vazio</strong><span>Leads recebidos ou cadastrados aparecerão nas etapas do banco.</span></div>}
    <Board stages={stages ?? []} leads={leads ?? []} />
  </div>;
}
