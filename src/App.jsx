import { useState, useRef } from "react";

const SYSTEM_PROMPT = `
Você é um engenheiro orçamentista especialista em SINAPI.

Retorne SOMENTE JSON válido.

Use exatamente esta estrutura:

{
  "projeto": {
    "nome": "Casa Residencial",
    "tipo": "Residencial",
    "area_total": "150m²",
    "descricao": "Casa em alvenaria convencional",
    "cidade": "São Paulo",
    "estado": "SP"
  },

  "prazo_estimado_meses": 8,

  "resumo_financeiro": {
    "total_material": 120000,
    "total_mao_de_obra": 85000,
    "bdi_valor": 30000,
    "encargos_sociais_valor": 12000,
    "impostos_valor": 8000,
    "custo_por_m2": 1700,
    "total_geral": 255000
  },

  "quantitativos": [
    {
      "categoria": "Fundação",
      "subtotal": 25000,
      "itens": [
        {
          "descricao": "Escavação manual",
          "unidade": "m³",
          "quantidade": 25,
          "custo_unitario_material": 0,
          "custo_unitario_mao_de_obra": 95,
          "total_item": 2375
        }
      ]
    }
  ]
}

NÃO escreva explicações.
NÃO use markdown.
NÃO escreva texto fora do JSON.

Os valores devem ser estimados com referência SINAPI.
`;


const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const fmtn = (v) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(v || 0);

export default function App() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("upload");
  const [expanded, setExpanded] = useState({});
  const fileRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    const ok = ["application/pdf","image/jpeg","image/png","image/webp"];
    if (!ok.includes(f.type)) { setError("Use PDF, JPG, PNG ou WEBP."); return; }
    setFile(f); setError(null);
  };

  const analyze = async () => {
    if (!file && !text.trim()) { setError("Insira um arquivo ou descreva o projeto."); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      let messages = [];
      if (file) {
        const b64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result.split(",")[1]);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        messages = [{ role: "user", content: [
          file.type === "application/pdf"
            ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }
            : { type: "image", source: { type: "base64", media_type: file.type, data: b64 } },
          { type: "text", text: text || "Analise e gere o orcamento completo." }
        ]}];
      } else {
        messages = [{ role: "user", content: text }];
      }

      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-opus-4-8",
          max_tokens: 8000,
          system: SYSTEM_PROMPT,
          messages
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(JSON.stringify(err));
      }

      const data = await res.json();
  const txt = data.content?.map(i => i.text || "").join("") || "";

const cleanTxt = txt
  .replaceAll("```json", "")
  .replaceAll("```", "")
  .trim();

let parsed;

try {
  parsed = JSON.parse(cleanTxt);
} catch {
  const jsonMatch = cleanTxt.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("A IA retornou um JSON inválido.");
  }

  parsed = JSON.parse(jsonMatch[0]);
}

if (parsed.quantitativos) {
  parsed.quantitativos = parsed.quantitativos.map((cat) => ({
    ...cat,
    subtotal:
      cat.subtotal ??
      (cat.itens || []).reduce((acc, item) => {
        const total =
          item.total_item ??
          (
            ((item.custo_unitario_material || 0) +
              (item.custo_unitario_mao_de_obra || 0)) *
            (item.quantidade || 0)
          );

        return acc + total;
      }, 0),

    itens: (cat.itens || []).map((item) => ({
      ...item,

      total_item:
        item.total_item ??
        (
          ((item.custo_unitario_material || 0) +
            (item.custo_unitario_mao_de_obra || 0)) *
          (item.quantidade || 0)
        )
    }))
  }));
}

setResult(parsed);
setTab("result");

setExpanded(
  Object.fromEntries(
    (parsed.quantitativos || []).map((_, i) => [i, i < 2])
  )
);
    } catch(e) {
      setError("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0f", fontFamily:"monospace", color:"#e8e0d0" }}>
      <div style={{ borderBottom:"1px solid #1a1a25", padding:"20px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:22, fontWeight:800, color:"#f4a742" }}>OBRA<span style={{color:"#e8e0d0"}}>·IA</span></div>
        <div style={{ fontSize:10, color:"#444", letterSpacing:2 }}>QUANTITATIVO E ORCAMENTO POR IA</div>
      </div>

      <div style={{ borderBottom:"1px solid #1a1a25", padding:"0 24px", display:"flex" }}>
        {[["upload","// Projeto"],["result","// Orcamento"]].map(([id,label]) => (
          <button key={id} onClick={() => (id==="upload" || result) && setTab(id)}
            style={{ background:"none", border:"none", cursor:"pointer", padding:"12px 20px", fontSize:12, letterSpacing:2,
              color: tab===id ? "#f4a742" : "#555", borderBottom: tab===id ? "2px solid #f4a742" : "2px solid transparent",
              opacity: id==="result" && !result ? 0.3 : 1 }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"32px 24px" }}>
        {tab === "upload" && (
          <div style={{ display:"grid", gap:20 }}>
            <div onClick={() => fileRef.current?.click()}
              style={{ border:"1px dashed #333", borderRadius:4, padding:48, textAlign:"center", cursor:"pointer", background:"#0d0d15" }}>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])} />
              {file ? <div style={{color:"#f4a742"}}>{file.name}</div> : <div style={{color:"#555"}}>Arraste o projeto aqui (PDF, PNG, JPG) ou clique</div>}
            </div>
            <textarea value={text} onChange={e=>setText(e.target.value)} rows={5}
              placeholder="Ou descreva o projeto: Ex: Casa 120m2, 3 quartos, fundacao radier, alvenaria estrutural, Sao Paulo/SP"
              style={{ width:"100%", background:"#0d0d15", border:"1px solid #222", color:"#e8e0d0", fontFamily:"monospace", fontSize:13, padding:16, resize:"vertical", outline:"none", borderRadius:4 }} />
            {error && <div style={{background:"rgba(255,80,80,0.1)", border:"1px solid rgba(255,80,80,0.3)", padding:"12px 16px", color:"#ff8080", fontSize:12, borderRadius:4}}>
              {error}
            </div>}
            <button onClick={analyze} disabled={loading || (!file && !text.trim())}
              style={{ background: loading ? "#333" : "#f4a742", color: loading ? "#666" : "#0a0a0f", border:"none", cursor: loading ? "not-allowed" : "pointer",
                fontFamily:"monospace", fontSize:13, fontWeight:600, letterSpacing:2, padding:"14px 32px", width:"100%", borderRadius:4 }}>
              {loading ? "ANALISANDO..." : "GERAR QUANTITATIVO E ORCAMENTO"}
            </button>
          </div>
        )}

        {tab === "result" && result && (
          <div style={{ display:"grid", gap:20 }}>
            <div style={{ background:"#0d0d15", border:"1px solid #1a1a25", padding:"20px 24px", borderRadius:4, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
              <div>
                <div style={{ fontSize:20, fontWeight:800 }}>{result.projeto?.nome}</div>
                <div style={{ fontSize:12, color:"#888", marginTop:6 }}>{result.projeto?.tipo} · {result.projeto?.area_total} · {result.prazo_estimado_meses} meses</div>
                <div style={{ fontSize:12, color:"#666", marginTop:8 }}>{result.projeto?.descricao}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:10, color:"#444", letterSpacing:2 }}>TOTAL GERAL</div>
                <div style={{ fontSize:28, fontWeight:800, color:"#f4a742" }}>{fmt(result.resumo_financeiro?.total_geral)}</div>
                <div style={{ fontSize:11, color:"#555" }}>{fmt(result.resumo_financeiro?.custo_por_m2)}/m2</div>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12 }}>
              {[["Materiais", result.resumo_financeiro?.total_material,"#4a9eff"],
                ["Mao de Obra", result.resumo_financeiro?.total_mao_de_obra,"#a78bfa"],
                ["BDI", result.resumo_financeiro?.bdi_valor,"#34d399"],
                ["Enc. Sociais", result.resumo_financeiro?.encargos_sociais_valor,"#fb923c"],
                ["Impostos", result.resumo_financeiro?.impostos_valor,"#f43f5e"]
              ].map(([label,value,color]) => (
                <div key={label} style={{ background:"#0d0d15", border:"1px solid #1a1a25", padding:"16px", borderRadius:4 }}>
                  <div style={{ fontSize:16, fontWeight:600, color }}>{fmt(value)}</div>
                  <div style={{ fontSize:10, color:"#555", marginTop:4, letterSpacing:1 }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ display:"grid", gap:8 }}>
              {result.quantitativos?.map((cat, idx) => (
                <div key={idx} style={{ border:"1px solid #1a1a25", borderRadius:4, overflow:"hidden" }}>
                  <div onClick={() => setExpanded(p=>({...p,[idx]:!p[idx]}))}
                    style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 20px", cursor:"pointer", background:"#0d0d15" }}>
                    <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                      <span style={{ color:"#f4a742" }}>{expanded[idx]?"▼":"▶️"}</span>
                      <span style={{ fontSize:13 }}>{cat.categoria}</span>
                      <span style={{ fontSize:10, color:"#555" }}>{cat.itens?.length} itens</span>
                    </div>
                    <div style={{ color:"#f4a742", fontWeight:600 }}>{fmt(cat.subtotal)}</div>
                  </div>
                  {expanded[idx] && (
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                        <thead>
                          <tr style={{ background:"#080810" }}>
                            {["Descricao","Un","Qtd","Mat/Un","MO/Un","Total"].map(h=>(
                              <th key={h} style={{ padding:"8px 12px", textAlign:h==="Descricao"?"left":"right", fontSize:9, color:"#444", letterSpacing:1 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {cat.itens?.map((item, i) => (
                            <tr key={i} style={{ borderBottom:"1px solid #111" }}>
                              <td style={{ padding:"10px 12px", color:"#ccc" }}>{item.descricao}</td>
                              <td style={{ padding:"10px 12px", textAlign:"right", color:"#888" }}>{item.unidade}</td>
                              <td style={{ padding:"10px 12px", textAlign:"right", color:"#888" }}>{fmtn(item.quantidade)}</td>
                              <td style={{ padding:"10px 12px", textAlign:"right", color:"#4a9eff" }}>{fmt(item.custo_unitario_material)}</td>
                              <td style={{ padding:"10px 12px", textAlign:"right", color:"#a78bfa" }}>{fmt(item.custo_unitario_mao_de_obra)}</td>
                              <td style={{ padding:"10px 12px", textAlign:"right", color:"#f4a742", fontWeight:600 }}>{fmt(item.total_item)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button onClick={() => { setResult(null); setFile(null); setText(""); setTab("upload"); }}
              style={{ background:"transparent", border:"1px solid #333", color:"#888", cursor:"pointer", fontFamily:"monospace", fontSize:13, padding:"12px", borderRadius:4 }}>
              NOVO PROJETO
            </button>
          </div>
        )}
      </div>
    </div>
  );
}