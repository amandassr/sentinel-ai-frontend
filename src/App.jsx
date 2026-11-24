import { useState } from "react";
import {
  ShieldCheck, LayoutDashboard, Search, AlertTriangle,
  Settings, Menu, Send, PawPrint, BarChart3, Activity, Scale,
  FileSearch, ClipboardList, FolderSearch, ArrowLeftRight
} from "lucide-react";
import AnalyticsWorkspace from "./modules/analytics/AnalyticsWorkspace";

const modules = [
  { name: "Visão geral", icon: LayoutDashboard },
  { name: "Inteligência Analítica", icon: BarChart3 },
  { name: "Transacional e Chargeback", icon: Activity },
  { name: "Investigação", icon: Search },
  { name: "APIs e permissionamento", icon: ShieldCheck }
];

const domainContent = {
  "Transacional e Chargeback": {
    kicker: "MONITORAMENTO · PREVENÇÃO · DISPUTAS",
    description: "Acompanhe movimentações, identifique comportamentos fora do padrão e organize ocorrências transacionais e de chargeback em um único fluxo.",
    icon: Activity,
    stages: [
      { title: "Monitoramento transacional", text: "Leitura de bases, acompanhamento de volumes, valores, frequência e comportamento das transações.", icon: ArrowLeftRight },
      { title: "Detecção de padrões e alertas", text: "Identificação de concentrações, recorrências, anomalias e sinais que merecem análise.", icon: AlertTriangle },
      { title: "Chargebacks e contestações", text: "Organização de ocorrências, motivos, valores, recorrência e acompanhamento dos desfechos.", icon: Scale }
    ],
    note: "Os critérios, regras de alerta, indicadores e etapas de tratamento serão configurados a partir do Manual Transacional e da documentação de chargeback."
  },
  "Investigação": {
    kicker: "ECs · CREDENCIADORAS · PARCEIROS",
    description: "Centralize investigações cadastrais e de risco, evidências, apontamentos e gestão de casos, mantendo um fluxo integrado para pessoas e empresas.",
    icon: Search,
    stages: [
      { title: "Abertura e triagem", text: "Registro do caso, identificação da entidade envolvida, origem da demanda e priorização.", icon: FolderSearch },
      { title: "Investigação e análise", text: "Background Check, validações cadastrais, pesquisa de vínculos, red flags e avaliação de risco.", icon: FileSearch },
      { title: "Gestão e conclusão do caso", text: "Organização de evidências, histórico, responsáveis, status, parecer e encerramento.", icon: ClipboardList }
    ],
    note: "KYC e KYB serão tratados como dimensões da mesma investigação, não como módulos separados. Os fluxos específicos de EC e credenciadora serão preservados conforme a documentação."
  }
};

function DomainWorkspace({ name }) {
  const config = domainContent[name];
  const Icon = config.icon;
  return (
    <section className="domain-workspace">
      <div className="domain-heading">
        <div>
          <span className="section-kicker">{config.kicker}</span>
          <h2>{name}</h2>
          <p>{config.description}</p>
        </div>
        <div className="domain-mark"><Icon size={25} /></div>
      </div>
      <div className="domain-flow-label">
        <span>FLUXO OPERACIONAL</span>
        <small>Estrutura inicial · critérios em configuração</small>
      </div>
      <div className="domain-stage-grid">
        {config.stages.map((stage, index) => {
          const StageIcon = stage.icon;
          return (
            <article className="domain-stage" key={stage.title}>
              <div className="domain-stage-top">
                <span className="domain-stage-number">0{index + 1}</span>
                <div className="domain-stage-icon"><StageIcon size={19} /></div>
              </div>
              <h3>{stage.title}</h3>
              <p>{stage.text}</p>
            </article>
          );
        })}
      </div>
      <div className="domain-note">
        <ShieldCheck size={18} />
        <div><strong>Próxima etapa de configuração</strong><p>{config.note}</p></div>
      </div>
      <p className="disclaimer">O SENTINEL AI é um protótipo de apoio à análise. As regras e decisões devem ser validadas por um analista.</p>
    </section>
  );
}

export default function App() {
  const [active, setActive] = useState("Visão geral");
  const [message, setMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><PawPrint size={25} /></div>
          <div><h1>SENTINEL<span> AI</span></h1><small>INTELIGÊNCIA & RISCO</small></div>
        </div>
        <div className="sidebar-label">CENTRAL DE INTELIGÊNCIA</div>
        <nav>
          {modules.map(({ name, icon: Icon }) => (
            <button key={name} className={`nav-item ${active === name ? "selected" : ""}`} onClick={() => { setActive(name); setMenuOpen(false); }}>
              <Icon size={18} /><span>{name}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item"><Settings size={18} /><span>Configurações</span></button>
          <div className="version">SENTINEL AI · PROTÓTIPO 1.0</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)}><Menu size={22} /></button>
          <span>PLATAFORMA DE INTELIGÊNCIA</span>
          <div className="status"><i /> Sistema de apoio à análise</div>
        </header>

        {active === "APIs e permissionamento" ? (
          <section className="api-workspace">
            <div className="api-intro">
              <span className="section-kicker">MOTOR DE REGRAS · PREVENÇÃO</span>
              <h2>APIs e permissionamento</h2>
              <p>Calcule o nível de permissionamento, consulte atividades e revise os critérios aplicáveis.</p>
            </div>
            <iframe title="Calculadora de APIs e permissionamento" src="/api-calculator.html" />
          </section>
        ) : active === "Inteligência Analítica" ? (
          <AnalyticsWorkspace />
        ) : domainContent[active] ? (
          <DomainWorkspace name={active} />
        ) : (
          <>
            <section className="welcome">
              <div className="eyebrow"><span /> INTELIGÊNCIA QUE OBSERVA. PRECISÃO QUE PROTEGE.</div>
              <h2>Bem-vindo ao <em>SENTINEL.</em></h2>
              <p>Sua central de inteligência em prevenção a fraudes. Integre informações transacionais e investigativas, identifique inconsistências e organize evidências para decisões mais seguras.</p>
            </section>
            <section className="workspace">
              <div className="workspace-heading">
                <div><span className="section-kicker">ASSISTENTE INTELIGENTE</span><h3>Como posso ajudar?</h3></div>
                <div className="ai-symbol"><ShieldCheck size={22} /></div>
              </div>
              <div className="assistant-message">
                <div className="assistant-avatar"><PawPrint size={19} /></div>
                <div><strong>SENTINEL AI</strong><p>Olá! Posso apoiar a organização de análises transacionais, chargebacks, investigações e indicadores de risco. Qual cenário vamos explorar?</p></div>
              </div>
              <div className="suggestions">
                {["Explorar monitoramento transacional", "Organizar uma investigação", "Analisar indicadores e bases"].map((item) => <button key={item} onClick={() => setMessage(item)}>{item}</button>)}
              </div>
              <form className="chat-input" onSubmit={(e) => e.preventDefault()}>
                <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Descreva o cenário que deseja analisar..." />
                <button type="submit" aria-label="Enviar mensagem"><Send size={18} /></button>
              </form>
              <p className="disclaimer">O SENTINEL AI é um protótipo de apoio à análise. A validação humana e a decisão final permanecem sob responsabilidade do analista.</p>
            </section>
          </>
        )}
        <footer>© 2026 SENTINEL AI · INTELIGÊNCIA EM PREVENÇÃO A FRAUDES</footer>
      </main>
    </div>
  );
}
