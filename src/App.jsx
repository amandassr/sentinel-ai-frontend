
import { useState } from "react";
import {
  ShieldCheck,
  LayoutDashboard,
  Search,
  FileSearch,
  Network,
  AlertTriangle,
  Settings,
  Menu,
  Send,
  PawPrint
} from "lucide-react";

const modules = [
  { name: "Visão geral", icon: LayoutDashboard },
  { name: "Análise KYC", icon: Search },
  { name: "Análise KYB", icon: FileSearch },
  { name: "Background Check", icon: Network },
  { name: "Inteligência de risco", icon: AlertTriangle },
  { name: "APIs e permissionamento", icon: ShieldCheck }
];

export default function App() {
  const [active, setActive] = useState("Visão geral");
  const [message, setMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><PawPrint size={25} /></div>
          <div>
            <h1>SENTINEL<span> AI</span></h1>
            <small>INTELIGÊNCIA & RISCO</small>
          </div>
        </div>

        <div className="sidebar-label">CENTRAL DE INTELIGÊNCIA</div>

        <nav>
          {modules.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${active === name ? "selected" : ""}`}
              onClick={() => {
                setActive(name);
                setMenuOpen(false);
              }}
            >
              <Icon size={18} />
              <span>{name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item">
            <Settings size={18} />
            <span>Configurações</span>
          </button>
          <div className="version">SENTINEL AI · PROTÓTIPO 1.0</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>
            <Menu size={22} />
          </button>
          <span>PLATAFORMA DE INTELIGÊNCIA</span>
          <div className="status"><i /> Sistema de apoio à análise</div>
        </header>

        <section className="welcome">
          <div className="eyebrow"><span /> INTELIGÊNCIA QUE OBSERVA. PRECISÃO QUE PROTEGE.</div>
          <h2>Bem-vindo ao <em>SENTINEL.</em></h2>
          <p>
            Sua central de inteligência em KYC, KYB e prevenção a fraudes.
            Analise cenários, identifique inconsistências e organize informações
            para decisões mais seguras.
          </p>
        </section>

        <section className="workspace">
          <div className="workspace-heading">
            <div>
              <span className="section-kicker">ASSISTENTE INTELIGENTE</span>
              <h3>{active === "Visão geral" ? "Como posso ajudar?" : active}</h3>
            </div>
            <div className="ai-symbol"><ShieldCheck size={22} /></div>
          </div>

          <div className="assistant-message">
            <div className="assistant-avatar"><PawPrint size={19} /></div>
            <div>
              <strong>SENTINEL AI</strong>
              <p>
                Olá! Estou pronto para apoiar suas análises de KYC, KYB,
                background check, inteligência de risco e permissionamento
                de APIs. O que vamos investigar hoje?
              </p>
            </div>
          </div>

          <div className="suggestions">
            {[
              "Analisar um cenário de KYC",
              "Avaliar riscos de uma empresa",
              "Revisar permissionamento de APIs"
            ].map((item) => (
              <button key={item} onClick={() => setMessage(item)}>
                {item}
              </button>
            ))}
          </div>

          <form className="chat-input" onSubmit={(e) => e.preventDefault()}>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva o cenário que deseja analisar..."
            />
            <button type="submit" aria-label="Enviar mensagem">
              <Send size={18} />
            </button>
          </form>
          <p className="disclaimer">
            O SENTINEL AI é um protótipo de apoio à análise. A validação humana
            e a decisão final permanecem sob responsabilidade do analista.
          </p>
        </section>

        <footer>© 2026 SENTINEL AI · INTELIGÊNCIA EM PREVENÇÃO A FRAUDES</footer>
      </main>
    </div>
  );
}
