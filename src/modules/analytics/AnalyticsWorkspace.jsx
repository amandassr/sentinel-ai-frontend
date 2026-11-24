import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Upload, FileSpreadsheet, Table2, CheckCircle2, AlertCircle,
  FileX, Database, RefreshCw
} from "lucide-react";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const PREVIEW_ROWS = 12;

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

export default function AnalyticsWorkspace() {
  const inputRef = useRef(null);
  const [workbook, setWorkbook] = useState(null);
  const [activeSheet, setActiveSheet] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      setWorkbook(parsed);
      setActiveSheet(parsed.SheetNames[0]);
      setFileName(file.name);
    } catch (err) {
      setError(err.message || "Não foi possível ler este arquivo. Verifique se ele não está corrompido.");
      setWorkbook(null);
      setFileName("");
    } finally {
      setLoading(false);
    }
  }

  function resetFile() {
    setWorkbook(null);
    setActiveSheet("");
    setFileName("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

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

      {!workbook ? (
        <div className="upload-panel">
          <div className="upload-icon"><FileSpreadsheet size={28} /></div>
          <h3>Comece com uma base de dados</h3>
          <p>Importe uma planilha para conhecer sua estrutura, validar os campos e preparar a análise.</p>
          <input
            ref={inputRef}
            className="file-input-hidden"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <button className="primary-action" onClick={() => inputRef.current?.click()} disabled={loading}>
            {loading ? <RefreshCw size={17} className="spin" /> : <Upload size={17} />}
            {loading ? "Lendo arquivo..." : "Selecionar arquivo"}
          </button>
          <div className="upload-meta">
            <span>Excel .xlsx / .xls</span><i /> <span>CSV</span><i /> <span>Até 15 MB</span>
          </div>
          {error && <div className="analytics-error"><AlertCircle size={16} />{error}</div>}
        </div>
      ) : (
        <>
          <div className="file-summary">
            <div className="file-summary-icon"><FileSpreadsheet size={22} /></div>
            <div className="file-summary-name">
              <strong>{fileName}</strong>
              <span><CheckCircle2 size={14} /> Arquivo lido com sucesso</span>
            </div>
            <button className="subtle-action" onClick={resetFile}><FileX size={16} /> Remover arquivo</button>
          </div>

          <div className="sheet-toolbar">
            <div className="sheet-label"><Table2 size={17} /> Aba selecionada</div>
            <select value={activeSheet} onChange={(event) => setActiveSheet(event.target.value)}>
              {workbook.SheetNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>

          <div className="analytics-kpis">
            <div className="analytics-kpi"><span>REGISTROS</span><strong>{sheetData.allRows.length.toLocaleString("pt-BR")}</strong><small>Linhas de dados</small></div>
            <div className="analytics-kpi"><span>COLUNAS</span><strong>{sheetData.headers.length}</strong><small>Campos identificados</small></div>
            <div className="analytics-kpi"><span>LINHAS DUPLICADAS</span><strong>{duplicateRows.toLocaleString("pt-BR")}</strong><small>Registros integralmente repetidos</small></div>
            <div className="analytics-kpi"><span>ABAS DISPONÍVEIS</span><strong>{workbook.SheetNames.length}</strong><small>No arquivo importado</small></div>
          </div>

          <div className="data-section">
            <div className="data-section-heading">
              <div><span className="section-kicker">LEITURA DA BASE</span><h3>Prévia dos dados</h3></div>
              <span className="preview-count">Exibindo até {PREVIEW_ROWS} registros</span>
            </div>
            {sheetData.headers.length ? (
              <div className="table-scroll">
                <table className="data-preview-table">
                  <thead><tr>{sheetData.headers.map((header, index) => <th key={index}>{header}</th>)}</tr></thead>
                  <tbody>
                    {sheetData.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>{sheetData.headers.map((_, colIndex) => <td key={colIndex}>{formatCell(row[colIndex])}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="empty-sheet">Esta aba não contém registros para pré-visualização.</div>}
          </div>

          <div className="data-section">
            <div className="data-section-heading">
              <div><span className="section-kicker">QUALIDADE E ESTRUTURA</span><h3>Diagnóstico das colunas</h3></div>
              <span className="preview-count">{columnStats.length} campos</span>
            </div>
            <div className="column-diagnostics">
              {columnStats.map((column, index) => (
                <div className="column-diagnostic" key={index}>
                  <div className="column-diagnostic-top"><strong>{column.name}</strong><span>{column.type}</span></div>
                  <div className="column-diagnostic-stats">
                    <span><b>{column.filled}</b> preenchidos</span>
                    <span><b>{column.empty}</b> vazios</span>
                    <span><b>{column.unique}</b> valores únicos</span>
                  </div>
                  <div className="completion-track"><i style={{ width: `${sheetData.allRows.length ? (column.filled / sheetData.allRows.length) * 100 : 0}%` }} /></div>
                </div>
              ))}
            </div>
          </div>

          <div className="analysis-next-step">
            <div className="analysis-next-icon"><CheckCircle2 size={20} /></div>
            <div><strong>Primeira leitura concluída</strong><p>A estrutura da planilha foi identificada. A próxima etapa será selecionar os indicadores e definir o objetivo da análise antes de gerar conclusões.</p></div>
          </div>
          {error && <div className="analytics-error"><AlertCircle size={16} />{error}</div>}
        </>
      )}
      <p className="analytics-privacy"><AlertCircle size={13} /> Nesta versão, a leitura e a prévia são processadas localmente no navegador. Não envie dados pessoais ou confidenciais sem autorização.</p>
    </section>
  );
}
