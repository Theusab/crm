import type { Metadata } from "next";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  History,
  MessageCircle,
  Sparkles,
  Target,
  Users,
  Workflow,
} from "lucide-react";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "BlackCore CRM | Da primeira conversa ao contrato",
  description:
    "Organize seus leads, priorize oportunidades com inteligência artificial e acompanhe cada negociação com o BlackCore CRM.",
};

const workflowSteps = [
  {
    number: "01",
    label: "CAPTURA",
    title: "Chegou. Já está no CRM.",
    description:
      "Leads dos formulários chegam organizados, com os dados que sua equipe precisa para começar a conversa.",
    icon: ArrowDownToLine,
    tone: "sage",
  },
  {
    number: "02",
    label: "PRIORIZAÇÃO",
    title: "Saiba por onde começar.",
    description:
      "A IA analisa as respostas e ajuda a identificar quem tem mais potencial e está pronto para avançar.",
    icon: Sparkles,
    tone: "butter",
  },
  {
    number: "03",
    label: "ACOMPANHAMENTO",
    title: "Cada oportunidade, em movimento.",
    description:
      "Acompanhe cada negócio por etapa, mantenha o histórico à mão e deixe claro qual é o próximo passo.",
    icon: Workflow,
    tone: "blue",
  },
];

const benefits = [
  {
    icon: Users,
    title: "Contatos com contexto",
    description:
      "Veja o histórico, as notas e os documentos de cada pessoa sem procurar informações em várias ferramentas.",
  },
  {
    icon: Target,
    title: "Foco nas boas oportunidades",
    description:
      "Use o lead scoring como apoio para priorizar o atendimento e direcionar o tempo da equipe comercial.",
  },
  {
    icon: MessageCircle,
    title: "Conversas que continuam",
    description:
      "Organize os acompanhamentos de WhatsApp por etapa para manter a comunicação fluindo no momento certo.",
  },
  {
    icon: FileText,
    title: "Tudo no mesmo lugar",
    description:
      "Reúna informações, arquivos e atividades no perfil do contato para que nenhuma conversa comece do zero.",
  },
  {
    icon: History,
    title: "Uma operação visível",
    description:
      "Saiba o que está em andamento, o que está parado e onde o time precisa agir em seguida.",
  },
  {
    icon: ArrowUpRight,
    title: "Menos trabalho manual",
    description:
      "Reduza tarefas repetitivas e abra espaço para relações melhores, matrículas e contratos fechados.",
  },
];

const pipeline = [
  {
    title: "Novo contato",
    count: "18",
    cards: [
      { name: "Camila Nunes", detail: "Curso de modelo", initials: "CN", score: 74, tone: "lilac" },
      { name: "Rafael Mendes", detail: "Orçamento", initials: "RM", score: 48, tone: "peach" },
    ],
  },
  {
    title: "Em conversa",
    count: "12",
    cards: [
      { name: "Marina Costa", detail: "Curso de modelo", initials: "MC", score: 92, tone: "mint" },
    ],
  },
  {
    title: "Próximo passo",
    count: "07",
    cards: [
      { name: "Julia Ferreira", detail: "Entrevista", initials: "JF", score: 86, tone: "yellow" },
    ],
  },
];

function Logo() {
  return (
    <a className={styles.brand} href="/" aria-label="BlackCore CRM — início">
      <span className={styles.brandMark} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className={styles.brandName}>
        blackcore<span>crm</span>
      </span>
    </a>
  );
}

export default function LandingPage() {
  return (
    <main className={styles.landing}>
      <header className={styles.header}>
        <div className={styles.navWrap}>
          <Logo />
          <nav className={styles.nav} aria-label="Navegação principal">
            <a href="#como-funciona">Como funciona</a>
            <a href="#recursos">Recursos</a>
            <a href="#para-quem">Para quem</a>
          </nav>
          <a className={styles.navButton} href="/">
            Conheça o painel <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              <i /> CRM DE VENDAS BLACKCORE
            </span>
            <h1>
              Da primeira conversa
              <br />
              ao contrato. <span>Sem perder o fio.</span>
            </h1>
            <p>
              Organize cada lead, entenda quem precisa de atenção e mantenha as
              oportunidades avançando — tudo em um só lugar.
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#como-funciona">
                Veja como funciona <ArrowRight size={16} aria-hidden="true" />
              </a>
              <a className={styles.textButton} href="#recursos">
                Explore os recursos <span aria-hidden="true">↓</span>
              </a>
            </div>
            <div className={styles.heroNote}>
              <span><Check size={11} aria-hidden="true" /></span>
              Mais clareza para o time. Mais tempo para fechar.
            </div>
          </div>

          <div className={styles.heroVisual} aria-label="Prévia ilustrativa da interface do BlackCore CRM">
            <div className={styles.visualOrb} />
            <div className={styles.dashWindow}>
              <div className={styles.windowBar}>
                <span className={styles.windowDots}><i /><i /><i /></span>
                <span>blackcore / visão geral</span>
                <span className={styles.windowBadge}><i /> DEMO</span>
              </div>
              <div className={styles.dashContent}>
                <aside className={styles.dashSidebar}>
                  <span className={styles.dashBrand}><b>b.</b> blackcore</span>
                  <span className={`${styles.dashNav} ${styles.dashNavActive}`}><i>◫</i> Visão geral</span>
                  <span className={styles.dashNav}><i>◎</i> Pipeline</span>
                  <span className={styles.dashNav}><i>♙</i> Contatos</span>
                  <span className={styles.dashNav}><i>▧</i> Atividades</span>
                  <span className={styles.dashProfile}><b>AL</b> Alex Lima</span>
                </aside>
                <div className={styles.dashMain}>
                  <div className={styles.dashWelcome}>
                    <div>
                      <span>VISÃO DA OPERAÇÃO</span>
                      <h2>Seu time em movimento <Sparkles size={13} aria-hidden="true" /></h2>
                    </div>
                    <span className={styles.dashFilter}>Últimos 30 dias&nbsp;⌄</span>
                  </div>
                  <div className={styles.metricGrid}>
                    <div className={styles.metricCard}>
                      <span>Leads ativos</span><strong>50</strong>
                      <small>↗ 12,8% <i>vs. mês passado</i></small>
                      <span className={`${styles.chartBars} ${styles.chartOne}`}><i /><i /><i /><i /><i /><i /><i /><i /></span>
                    </div>
                    <div className={styles.metricCard}>
                      <span>Oportunidades</span><strong>24</strong>
                      <small>↗ 8,2% <i>vs. mês passado</i></small>
                      <span className={`${styles.chartBars} ${styles.chartTwo}`}><i /><i /><i /><i /><i /><i /><i /><i /></span>
                    </div>
                    <div className={styles.metricCard}>
                      <span>Leads quentes</span><strong>14</strong>
                      <small className={styles.aiNote}><Sparkles size={9} /> Lead scoring IA</small>
                      <span className={styles.scoreRing}>IA</span>
                    </div>
                  </div>
                  <div className={styles.dashPipeline}>
                    <div className={styles.dashPipelineTitle}>
                      <strong>Pipeline de vendas</strong><span>Ver funil ↗</span>
                    </div>
                    <div className={styles.miniColumns}>
                      <div>
                        <span>NOVO <b>18</b></span>
                        <div className={styles.miniLead}><i className={styles.lilac}>CN</i><span>Camila N.<small>Curso de modelo</small></span><b>74</b></div>
                        <div className={styles.miniLead}><i className={styles.peach}>RM</i><span>Rafael M.<small>Orçamento</small></span><b>48</b></div>
                      </div>
                      <div>
                        <span>EM CONVERSA <b>12</b></span>
                        <div className={styles.miniLead}><i className={styles.mint}>MC</i><span>Marina C.<small>Curso de modelo</small></span><b className={styles.hotScore}>92</b></div>
                      </div>
                      <div>
                        <span>PRÓXIMO PASSO <b>07</b></span>
                        <div className={styles.miniLead}><i className={styles.yellow}>JF</i><span>Julia F.<small>Entrevista</small></span><b className={styles.hotScore}>86</b></div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.dashActivity}>
                    <Sparkles size={12} aria-hidden="true" />
                    <span><b>Marina Costa</b> está pronta para avançar <i>· pontuação 92</i></span>
                    <ArrowUpRight size={12} aria-hidden="true" />
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.scoreToast}>
              <span><Sparkles size={17} aria-hidden="true" /></span>
              <div><small>LEAD SCORING COM IA</small><strong>Oportunidade quente</strong></div>
              <b>92</b>
            </div>
            <span className={styles.sparkleDecoration} aria-hidden="true">✳</span>
            <span className={styles.previewCaption}>PRÉVIA ILUSTRATIVA · DADOS DE DEMONSTRAÇÃO</span>
          </div>
        </div>
      </section>

      <div className={styles.audienceBar} id="para-quem">
        <div>
          <span>PARA QUEM VENDE COM RELACIONAMENTO</span>
          <div><b>Escolas & cursos</b><i /> <b>Agências & modelos</b><i /> <b>Equipes comerciais</b></div>
        </div>
      </div>

      <section className={styles.workflowSection} id="como-funciona">
        <div className={styles.sectionWrap}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionKicker}>UM FLUXO, MENOS ATRITO</span>
            <h2>O próximo passo<br />fica <em>mais simples.</em></h2>
            <p>Uma rotina comercial conectada, do primeiro formulário à próxima boa conversa.</p>
          </div>
          <div className={styles.workflowGrid}>
            {workflowSteps.map(({ number, label, title, description, icon: Icon, tone }) => (
              <article className={styles.workflowCard} key={number}>
                <div className={styles.cardTop}><span>{number} / {label}</span><Icon size={17} aria-hidden="true" /></div>
                <h3>{title}</h3>
                <p>{description}</p>
                {number === "01" && (
                  <div className={styles.workflowSample}>
                    <span className={styles.sampleCheck}><Check size={12} /></span>
                    <span><b>Novo contato recebido</b><small>Formulário do site · agora</small></span>
                    <ArrowUpRight size={14} />
                  </div>
                )}
                {number === "02" && (
                  <div className={styles.workflowSample}>
                    <span className={styles.sampleScore}>86</span>
                    <span><b>Lead promissor</b><small>Respostas analisadas pela IA</small></span>
                    <span className={styles.hotPill}>QUENTE</span>
                  </div>
                )}
                {number === "03" && (
                  <div className={styles.workflowSample}>
                    <span className={styles.stageNew}>Novo contato</span>
                    <ArrowRight size={13} />
                    <span className={styles.stageNext}>Entrevista</span>
                  </div>
                )}
                <span className={`${styles.cardAccent} ${styles[tone]}`} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.pipelineSection}>
        <div className={styles.pipelineWrap}>
          <div className={styles.pipelineCopy}>
            <span className={styles.sectionKicker}>VISIBILIDADE DE PONTA A PONTA</span>
            <h2>Seu funil.<br />Sem pontos cegos.</h2>
            <p>
              Veja as negociações por etapa, identifique o que precisa de
              atenção e mantenha cada oportunidade avançando. Um pipeline
              compartilhado deixa o próximo passo claro para todo o time.
            </p>
            <div className={styles.pipelineNote}><span>01 <i>→</i> 02 <i>→</i> 03</span><small>Um processo claro, do primeiro contato ao fechamento.</small></div>
          </div>
          <div className={styles.kanban} aria-label="Exemplo ilustrativo de pipeline em três etapas">
            <div className={styles.kanbanHeader}><span><Workflow size={14} /> Pipeline comercial</span><span>•••</span></div>
            <div className={styles.kanbanColumns}>
              {pipeline.map((column) => (
                <div className={styles.kanbanColumn} key={column.title}>
                  <div className={styles.columnHeader}><span><i />{column.title}</span><b>{column.count}</b></div>
                  {column.cards.map((card) => (
                    <div className={styles.kanbanCard} key={card.name}>
                      <div className={styles.kanbanCardTop}><i className={styles[card.tone]}>{card.initials}</i><span>···</span></div>
                      <strong>{card.name}</strong>
                      <small>{card.detail}</small>
                      <div className={styles.kanbanCardBottom}><span>Lead</span><b className={card.score >= 70 ? styles.goodScore : ""}><Sparkles size={9} /> {card.score}</b></div>
                    </div>
                  ))}
                  <div className={styles.addContact}>＋ Adicionar contato</div>
                </div>
              ))}
            </div>
            <span className={styles.kanbanCaption}>VISUALIZAÇÃO ILUSTRATIVA</span>
          </div>
        </div>
      </section>

      <section className={styles.benefitsSection} id="recursos">
        <div className={styles.sectionWrap}>
          <div className={styles.benefitsHeading}>
            <div><span className={styles.sectionKicker}>FEITO PARA ACONTECER NO DIA A DIA</span><h2>Tudo conectado.<br /><em>Nada esquecido.</em></h2></div>
            <p>Uma visão completa do relacionamento para sua equipe atender melhor, trabalhar com foco e fechar com confiança.</p>
          </div>
          <div className={styles.benefitsGrid}>
            {benefits.map(({ icon: Icon, title, description }, index) => (
              <article className={styles.benefitCard} key={title}>
                <div><span><Icon size={16} aria-hidden="true" /></span><small>0{index + 1}</small></div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.closingSection} id="demonstracao">
        <div className={styles.closingCard}>
          <div className={styles.closingContent}>
            <span className={styles.closingKicker}><i /> BLACKCORE CRM</span>
            <h2>A próxima boa conversa<br />pode começar <em>agora.</em></h2>
            <p>Organize sua operação para cuidar de cada oportunidade e deixe o trabalho repetitivo para trás.</p>
            <a className={styles.lightButton} href="/">
              Conheça o painel <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>
          <div className={styles.closingGraphic} aria-hidden="true">
            <span className={styles.closingRingOne} /><span className={styles.closingRingTwo} />
            <span className={styles.closingSpark}>✳</span>
            <span className={styles.closingTagOne}>NOVO CONTATO</span>
            <span className={styles.closingTagTwo}>PRÓXIMO PASSO ↗</span>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Logo />
          <span>Menos operação manual. Mais relações que viram resultado.</span>
          <a href="#topo">Voltar ao topo ↑</a>
        </div>
      </footer>
    </main>
  );
}
