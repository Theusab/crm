import { updatePipelineStage } from "@/features/settings/actions";
import { createAppClient } from "@/lib/supabase/app";

export default async function PipelineSettingsPage() {
  const supabase = await createAppClient();
  const { data: stages, error } = await supabase.from("pipeline_stages").select("id,name,color,probability,position,is_won,is_lost").order("position");
  if (error) throw new Error(`Falha ao carregar etapas: ${error.message}`);
  return <div>
    <div className="crm-page-head"><div><div className="crm-eyebrow">GERENCIAMENTO</div><h1>Etapas do funil</h1><p>Personalize os nomes, cores e probabilidades das etapas.</p></div></div>
    {!stages?.length ? <section className="crm-panel crm-empty"><strong>Etapas não configuradas</strong><span>Execute a migration inicial do Supabase.</span></section> : stages.map((stage) => <section className="crm-panel crm-stage-setting" key={stage.id}>
      <form className="crm-form-grid crm-stage-form" action={updatePipelineStage}>
        <input type="hidden" name="id" value={stage.id} />
        <label>Nome<input name="name" required maxLength={100} defaultValue={stage.name} /></label>
        <label>Cor<input name="color" type="color" defaultValue={stage.color} /></label>
        <label>Probabilidade (%)<input name="probability" type="number" min="0" max="100" defaultValue={stage.probability} /></label>
        <div><button className="button button-secondary">Salvar etapa</button>{stage.is_won && <span className="crm-note">Etapa de ganho</span>}{stage.is_lost && <span className="crm-note">Etapa de perda</span>}</div>
      </form>
    </section>)}
    <p className="crm-note">As etapas iniciais e sua ordem são definidas pela migration. Alterações são protegidas por RLS e exigem cargo de admin ou gerente.</p>
  </div>;
}
