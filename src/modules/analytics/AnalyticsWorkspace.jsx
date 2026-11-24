import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Upload, FileSpreadsheet, Table2, CheckCircle2, AlertCircle,
  FileX, Database, RefreshCw, LayoutDashboard, History,
  ArrowLeft, Clock3, Rows3, Columns3, AlertTriangle, Trash2,
  Activity, Eye, FileText
} from "lucide-react";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const PREVIEW_ROWS = 12;
const HISTORY_KEY = "sentinel.analytics.history.v1";

function readHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function persistHistory(items) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 50)));
  } catch {
    // A sessão continua funcional mesmo se o navegador bloquear armazenamento local.
  }
}

function detectType(values) {
  const filled = values.filter((value) => value !== null && value !== undefined && String(value).trim() !== "");
  if (!filled.length) return "Vazio";
  const dates = filled.filter((value) => value instanceof Date || (!Number.isNaN(Date.parse(String(value))) && String(value).length > 5));
  const numbers = filled.filter((value) => typeof value === "number" || (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value.replace(",", ".")))));
  if (dates.length / filled.length > 0.8) return "Data provável";
  if (numbers.length / filled.length > 0.8) return "Numérico";
  return "Texto";
}

function formatCell(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (value instanceof Date) return value.toLocaleDateString("pt-BR");
  return String(value);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AnalyticsWorkspace() {
  const inputRef = useRef(null);
  const [workbook, setWorkbook] = useState(null);
  const [activeSheet, setActiveSheet] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(readHistory);
  const [view, setView] = useState("overview");
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => persistHistory(history), [history]);

  const sheetData = useMemo(() => {
    if (!workbook || !activeSheet) return { headers: [], rows: [], allRows: [] };
    const sheet = workbook.Sheets[activeSheet];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
    const nonEmpty = rows.filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
    if (!nonEmpty.length) return { headers: [], rows: [], allRows: [] };
    const headers = nonEmpty[0].map((cell, index) => String(cell || `Coluna ${index + 1}`).trim());
    const allRows = nonEmpty.slice(1).filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
    return { headers, rows: allRows.slice(0, PREVIEW_ROWS), allRows };
  }, [workbook, activeSheet]);

  const columnStats = useMemo(() => sheetData.headers.map((header, index) => {
    const values = sheetData.allRows.map((row) => row[index]);
    const filled = values.filter((value) => value !== null && value !== undefined && String(value).trim() !== "");
    return {
      name: header,
      type: detectType(values),
      filled: filled.length,
      empty: values.length - filled.length,
      unique: new Set(filled.map((value) => String(value).trim().toLowerCase())).size
    };
  }), [sheetData]);

  const duplicateRows = useMemo(() => {
    const keys = sheetData.allRows.map((row) => JSON.stringify(row));
    return keys.length - new Set(keys).size;
  }, [sheetData]);

  const selectedAnalysis = history.find((item) => item.id === selectedId);
  const totalRows = history.reduce((sum, item) => sum + (item.rows || 0), 0);
  const totalIssues = history.reduce((sum, item) => sum + (item.emptyCells || 0) + (item.duplicates || 0), 0);

  function openAnalysis(item) {
    setSelectedId(item.id);
    setView("detail");
  }

  function startNewAnalysis() {
    setWorkbook(null);
    setActiveSheet("");
    setFileName("");
    setError("");
    setSelectedId(null);
    setView("upload");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFile(file) {
    setError("");
    if (!file) return;
    const extension = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(extension)) {
      setError("Formato não suportado. Envie um arquivo .xlsx, .xls ou .csv.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("O arquivo ultrapassa o limite de 15 MB desta versão.");
      return;
    }
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = XLSX.read(buffer, { type: "array", cellDates: true });
      if (!parsed.SheetNames.length) throw new Error("Nenhuma aba foi encontrada no arquivo.");
      const firstSheet = parsed.SheetNames[0];
      const rawRows = XLSX.utils.sheet_to_json(parsed.Sheets[firstSheet], { header: 1, defval: "", raw: false });
      const nonEmpty = rawRows.filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
      const headers = nonEmpty[0] || [];
      const records = nonEmpty.slice(1).filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
      const duplicateCount = records.length - new Set(records.map((row) => JSON.stringify(row))).size;
      const emptyCells = records.reduce((sum, row) => sum + headers.filter((_, index) => row[index] === "" || row[index] == null).length, 0);
      const item = {
        id: makeId(),
        name: file.name,
        createdAt: new Date().toISOString(),
        status: "Concluída",
        rows: records.length,
        columns: headers.length,
        sheets: parsed.SheetNames.length,
        duplicates: duplicateCount,
        emptyCells,
        sheetName: firstSheet,
        size: file.size
      };
      setWorkbook(parsed);
      setActiveSheet(firstSheet);
      setFileName(file.name);
      setHistory((current) => [item, ...current].slice(0, 50));
      setSelectedId(item.id);
      setView("detail");
    } catch (err) {
      setError(err.message || "Não foi possível ler este arquivo. Verifique se ele não está corrompido.");
      setWorkbook(null);
      setFileName("");
    } finally {
      setLoading(false);
    }
  }

  function removeAnalysis(id) {
    setHistory((current) => current.filter((item) => item.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setView("overview");
      setWorkbook(null);
      setFileName("");
    }
  }

  const chartData = useMemo(() => history.slice(0, 8).reverse(), [history]);
  const maxRows = Math.max(1, ...chartData.map((item) => item.rows || 0));

  return (
    <section className="analytics-workspace">
      <div className="analytics-heading">
        <div>
          <span className="section-kicker">CENTRAL DE DADOS · ANÁLISE MULTIDIMENSIONAL</span>
          <h2>Inteligência Analítica</h2>
          <p>Transforme bases de dados em indicadores, análises e apresentações gerenciais.</p>
        </div>
        <div className="analytics-mark"><Database size={23} /></div>
      </div>

      <div className="analytics-nav" role="tablist" aria-label="Navegação da inteligência analítica">
        <button className={view === "overview" ? "active" : ""} onClick={() => { setView("overview"); setSelectedId(null); }}>
          <LayoutDashboard size={16} /> Painel de controle
        </button>
        <button className={view === "upload" ? "active" : ""} onClick={startNewAnalysis}>
          <Upload size={16} /> Nova análise
        </button>
        <button className={view === "history" ? "active" : ""} onClick={() => { setView("history"); setSelectedId(null); }}>
          <History size={16} /> Histórico <span>{history.length}</span>
        </button>
      </div>

      {view === "overview" && (
        <>
          <div className="analytics-overview-title">
            <div><span className="section-kicker">MONITORAMENTO</span><h3>Painel geral de análises</h3><p>Acompanhe as execuções registradas neste navegador.</p></div>
            <button className="primary-action" onClick={startNewAnalysis}><Upload size={16} /> Nova análise</button>
          </div>
          <div className="analytics-kpis">
            <div className="analytics-kpi"><span>ANÁLISES REGISTRADAS</span><strong>{history.length}</strong><small>Histórico local</small></div>
            <div className="analytics-kpi"><span>REGISTROS PROCESSADOS</span><strong>{totalRows.toLocaleString("pt-BR")}</strong><small>Soma das análises</small></div>
            <div className="analytics-kpi"><span>BASES CONCLUÍDAS</span><strong>{history.filter((item) => item.status === "Concluída").length}</strong><small>Leitura concluída</small></div>
            <div className="analytics-kpi"><span>PONTOS DE QUALIDADE</span><strong>{totalIssues.toLocaleString("pt-BR")}</strong><small>Vazios + duplicidades*</small></div>
          </div>
          <div className="analytics-dashboard-grid">
            <div className="data-section analytics-activity">
              <div className="data-section-heading"><div><span className="section-kicker">VOLUME POR ARQUIVO</span><h3>Registros analisados</h3></div><span className="preview-count">Últimas 8 análises</span></div>
              {chartData.length ? <div className="analytics-bars">{chartData.map((item) => <div className="analytics-bar-row" key={item.id}><span title={item.name}>{item.name}</span><div className="analytics-bar-track"><i style={{ width: `${Math.max(3, (item.rows / maxRows) * 100)}%` }} /></div><b>{item.rows.toLocaleString("pt-BR")}</b></div>)}</div> : <div className="empty-sheet">As análises realizadas aparecerão aqui.</div>}
            </div>
            <div className="data-section analytics-status-panel">
              <div className="data-section-heading"><div><span className="section-kicker">CONTROLE</span><h3>Etapas monitoradas</h3></div></div>
              {["Importação da base", "Leitura das abas", "Diagnóstico de qualidade", "Análise e interpretação", "Exportação de relatórios"].map((label, index) => <div className="control-step" key={label}><span className={index < 3 && history.length ? "done" : ""}>{index < 3 && history.length ? <CheckCircle2 size={14} /> : index + 1}</span><div><strong>{label}</strong><small>{index < 3 && history.length ? "Disponível nesta versão" : "Próxima etapa do desenvolvimento"}</small></div></div>)}
            </div>
          </div>
          <div className="data-section">
            <div className="data-section-heading"><div><span className="section-kicker">ATIVIDADE RECENTE</span><h3>Últimas análises</h3></div><button className="text-action" onClick={() => setView("history")}>Ver histórico <ArrowLeft size={14} /></button></div>
            {history.length ? <div className="analysis-list">{history.slice(0, 5).map((item) => <button className="analysis-list-item" key={item.id} onClick={() => openAnalysis(item)}><span className="analysis-list-icon"><FileSpreadsheet size={18} /></span><span className="analysis-list-main"><strong>{item.name}</strong><small>{formatDate(item.createdAt)} · {item.rows.toLocaleString("pt-BR")} registros · {item.columns} colunas</small></span><span className="analysis-status"><i />{item.status}</span><Eye size={16} className="analysis-open-icon" /></button>)}</div> : <div className="empty-sheet">Nenhuma análise registrada. Importe sua primeira planilha para começar.</div>}
          </div>
          <p className="analytics-privacy"><AlertCircle size={13} /> *Indicador soma células vazias e linhas duplicadas, não representa necessariamente falhas. Histórico armazenado localmente neste navegador; os arquivos originais não são guardados.</p>
        </>
      )}

      {view === "upload" && (
        <div className="upload-panel">
          <div className="upload-icon"><FileSpreadsheet size={28} /></div>
          <h3>Comece com uma base de dados</h3>
          <p>Importe uma planilha para conhecer sua estrutura, validar os campos e registrar uma nova análise.</p>
          <input ref={inputRef} className="file-input-hidden" type="file" accept=".xlsx,.xls,.csv" onChange={(event) => handleFile(event.target.files?.[0])} />
          <button className="primary-action" onClick={() => inputRef.current?.click()} disabled={loading}>
            {loading ? <RefreshCw size={17} className="spin" /> : <Upload size={17} />}
            {loading ? "Lendo arquivo..." : "Selecionar arquivo"}
          </button>
          <div className="upload-meta"><span>Excel .xlsx / .xls</span><i /><span>CSV</span><i /><span>Até 15 MB</span></div>
          {error && <div className="analytics-error"><AlertCircle size={16} />{error}</div>}
        </div>
      )}

      {view === "detail" && selectedAnalysis && (
        <>
          <div className="detail-back-row"><button className="text-action" onClick={() => { setView("overview"); setSelectedId(null); }}><ArrowLeft size={15} /> Voltar ao painel</button><span className="analysis-status"><i />{selectedAnalysis.status}</span></div>
          <div className="analytics-overview-title detail-title">
            <div><span className="section-kicker">ANÁLISE INDIVIDUAL · {selectedAnalysis.id.slice(0, 12)}</span><h3>{selectedAnalysis.name}</h3><p>Importada em {formatDate(selectedAnalysis.createdAt)}</p></div>
            <span className="detail-file-badge"><FileSpreadsheet size={18} /> Excel / CSV</span>
          </div>
          <div className="analytics-kpis">
            <div className="analytics-kpi"><span>REGISTROS</span><strong>{selectedAnalysis.rows.toLocaleString("pt-BR")}</strong><small>Linhas identificadas</small></div>
            <div className="analytics-kpi"><span>COLUNAS</span><strong>{selectedAnalysis.columns}</strong><small>Campos identificados</small></div>
            <div className="analytics-kpi"><span>VALORES VAZIOS</span><strong>{selectedAnalysis.emptyCells.toLocaleString("pt-BR")}</strong><small>Células sem preenchimento</small></div>
            <div className="analytics-kpi"><span>DUPLICIDADES</span><strong>{selectedAnalysis.duplicates.toLocaleString("pt-BR")}</strong><small>Linhas integralmente repetidas</small></div>
          </div>
          <div className="analytics-dashboard-grid">
            <div className="data-section">
              <div className="data-section-heading"><div><span className="section-kicker">RASTREAMENTO</span><h3>Etapas desta análise</h3></div></div>
              {["Arquivo recebido", "Abas e estrutura identificadas", "Diagnóstico inicial calculado"].map((label) => <div className="control-step" key={label}><span className="done"><CheckCircle2 size={14} /></span><div><strong>{label}</strong><small>Concluído · {formatDate(selectedAnalysis.createdAt)}</small></div></div>)}
              {["Indicadores e cruzamentos", "Interpretações e recomendações", "PDF e PowerPoint"].map((label) => <div className="control-step" key={label}><span className="pending"><Clock3 size={14} /></span><div><strong>{label}</strong><small>Disponível nas próximas etapas</small></div></div>)}
            </div>
            <div className="data-section">
              <div className="data-section-heading"><div><span className="section-kicker">RESUMO DA BASE</span><h3>Qualidade dos dados</h3></div></div>
              <div className="quality-metric"><span><Rows3 size={15} /> Registros</span><b>{selectedAnalysis.rows.toLocaleString("pt-BR")}</b></div>
              <div className="quality-metric"><span><Columns3 size={15} /> Campos</span><b>{selectedAnalysis.columns}</b></div>
              <div className="quality-metric"><span><AlertTriangle size={15} /> Células vazias</span><b>{selectedAnalysis.emptyCells.toLocaleString("pt-BR")}</b></div>
              <div className="quality-metric"><span><Activity size={15} /> Linhas duplicadas</span><b>{selectedAnalysis.duplicates.toLocaleString("pt-BR")}</b></div>
              <div className="quality-note">Os arquivos originais não são mantidos. Para reabrir a prévia completa, importe novamente a planilha.</div>
            </div>
          </div>
          {workbook && fileName === selectedAnalysis.name && (
            <>
              <div className="sheet-toolbar"><div className="sheet-label"><Table2 size={17} /> Prévia da aba atual</div><select value={activeSheet} onChange={(event) => setActiveSheet(event.target.value)}>{workbook.SheetNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></div>
              <div className="analytics-kpis"><div className="analytics-kpi"><span>REGISTROS NA ABA</span><strong>{sheetData.allRows.length.toLocaleString("pt-BR")}</strong><small>Linhas de dados</small></div><div className="analytics-kpi"><span>COLUNAS NA ABA</span><strong>{sheetData.headers.length}</strong><small>Campos identificados</small></div><div className="analytics-kpi"><span>DUPLICIDADES NA ABA</span><strong>{duplicateRows}</strong><small>Linhas repetidas</small></div><div className="analytics-kpi"><span>ABAS DISPONÍVEIS</span><strong>{workbook.SheetNames.length}</strong><small>No arquivo</small></div></div>
              <div className="data-section"><div className="data-section-heading"><div><span className="section-kicker">LEITURA DA BASE</span><h3>Prévia dos dados</h3></div><span className="preview-count">Até {PREVIEW_ROWS} registros</span></div>
                {sheetData.headers.length ? <div className="table-scroll"><table className="data-preview-table"><thead><tr>{sheetData.headers.map((header, index) => <th key={index}>{header}</th>)}</tr></thead><tbody>{sheetData.rows.map((row, rowIndex) => <tr key={rowIndex}>{sheetData.headers.map((_, colIndex) => <td key={colIndex}>{formatCell(row[colIndex])}</td>)}</tr>)}</tbody></table></div> : <div className="empty-sheet">Esta aba não contém registros.</div>}
              </div>
              <div className="data-section"><div className="data-section-heading"><div><span className="section-kicker">QUALIDADE E ESTRUTURA</span><h3>Diagnóstico das colunas</h3></div><span className="preview-count">{columnStats.length} campos</span></div><div className="column-diagnostics">{columnStats.map((column, index) => <div className="column-diagnostic" key={index}><div className="column-diagnostic-top"><strong>{column.name}</strong><span>{column.type}</span></div><div className="column-diagnostic-stats"><span><b>{column.filled}</b> preenchidos</span><span><b>{column.empty}</b> vazios</span><span><b>{column.unique}</b> valores únicos</span></div><div className="completion-track"><i style={{ width: `${sheetData.allRows.length ? (column.filled / sheetData.allRows.length) * 100 : 0}%` }} /></div></div>)}</div></div>
            </>
          )}
          <div className="detail-actions"><button className="subtle-action danger-action" onClick={() => removeAnalysis(selectedAnalysis.id)}><Trash2 size={15} /> Remover do histórico</button></div>
        </>
      )}

      {view === "history" && (
        <div className="data-section">
          <div className="data-section-heading"><div><span className="section-kicker">MEMÓRIA LOCAL</span><h3>Histórico de análises</h3></div><span className="preview-count">{history.length} registros</span></div>
          {history.length ? <div className="analysis-list">{history.map((item) => <div className="analysis-list-item history-item" key={item.id}><button className="history-open" onClick={() => openAnalysis(item)}><span className="analysis-list-icon"><FileSpreadsheet size={18} /></span><span className="analysis-list-main"><strong>{item.name}</strong><small>{formatDate(item.createdAt)} · {item.rows.toLocaleString("pt-BR")} registros · {item.columns} colunas</small></span><span className="analysis-status"><i />{item.status}</span><Eye size={16} className="analysis-open-icon" /></button><button className="history-delete" aria-label={`Remover ${item.name}`} onClick={() => removeAnalysis(item.id)}><Trash2 size={15} /></button></div>)}</div> : <div className="empty-sheet">O histórico está vazio.</div>}
        </div>
      )}

      <p className="analytics-privacy"><AlertCircle size={13} /> O painel atualiza ao concluir cada importação. O histórico guarda metadados no armazenamento local deste navegador; os arquivos originais não são salvos nem enviados a servidores.</p>
    </section>
  );
}
