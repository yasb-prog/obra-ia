
import { initAnalytics, pageView, trackEvent } from "./utils/analytics";
import { useState, useRef, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import jsPDF from "jspdf";
import logo from "./assets/logo.jpeg";
import * as XLSX from "xlsx";
import { onAuthStateChanged } from "firebase/auth";
import ReactGA from "react-ga4";





import { SINAPI } from "./data/sinapi";
import { gerarEstimativas } from "./utils/estimativas";
import { extrairDadosProjeto } from "./utils/extrator";
import {
  auth,
  provider,
  signInWithPopup,
  signOut
} from "./firebase";
ReactGA.initialize("G-6JFRXKH5LX");
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const SYSTEM_PROMPT = `
Você é um engenheiro orçamentista especialista em SINAPI.

Analise integralmente o PDF.

Leia TODAS as páginas.

Retorne SOMENTE JSON.

Formato obrigatório:

{
  "projeto": {},
  "prazo_estimado_meses": 0,

  "resumo_financeiro": {},

  "quantitativos": [
    {
      "categoria": "Fundação",
      "subtotal": 0,
      "itens": [
        {
          "codigo_sinapi": "",
          "descricao": "",
          "unidade": "",
          "quantidade": 0,
          "custo_unitario_material": 0,
          "custo_unitario_mao_de_obra": 0,
          "total_item": 0
        }
      ]
    }
  ]
}

Categorias obrigatórias:

- Fundação
- Estrutura
- Alvenaria
- Chapisco
- Emboço
- Reboco
- Contrapiso
- Pisos
- Revestimentos
- Forro
- Cobertura
- Impermeabilização
- Esquadrias
- Vidros
- Pintura
- Instalações Hidrossanitárias
- Instalações Elétricas
- SPDA
- Combate a Incêndio
- Climatização
- CFTV
- Automação
- Internet e Dados
- Louças e Metais
- Urbanização
- Paisagismo
- Limpeza Final

Para cada categoria gere itens reais SINAPI.

Nunca retorne itens vazios.

Nunca retorne:

"itens": []

Sempre preencher quantidade, unidade, código SINAPI e valor.
["SINAPI","Descricao","Un","Qtd","Mat/Un","MO/Un","Total"]<td>{item.codigo_sinapi}</td>
`;


const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const fmtn = (v) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(v || 0);

export default function App() {
  useEffect(() => {
  initAnalytics();
  pageView();
}, []);
  console.log(logo);


const exportarPDF = () => {
  trackEvent("Exportar PDF");

  if (!result) return;

  const doc = new jsPDF();


doc.setTextColor(20,20,20);

  doc.setFontSize(26);
  doc.text("OBRA AI", 20, 25);

  doc.setFontSize(12);
  doc.setTextColor(40,40,40);
  doc.text("Quantitativo e Orçamento Inteligente", 20, 33);

  doc.setDrawColor(37,99,235);
  doc.line(20, 38, 190, 38);

  doc.setTextColor(255,255,255);
  doc.setFillColor(240,240,240);
  doc.setTextColor(37,99,235);

  let y = 55;

  doc.setFontSize(14);
  doc.text("Resumo Financeiro", 20, y);

  y += 14;

  const resumo = [
    ["Materiais", result.resumo_financeiro?.total_material],
    ["Mão de obra", result.resumo_financeiro?.total_mao_de_obra],
    ["BDI", result.resumo_financeiro?.bdi_valor],
    ["Encargos", result.resumo_financeiro?.encargos_sociais_valor],
    ["Impostos", result.resumo_financeiro?.impostos_valor],
  ];

  resumo.forEach(([label, valor]) => {

    doc.setFillColor(15,23,42);
    doc.roundedRect(20, y-6, 170, 10, 2, 2, "F");

    doc.setTextColor(255,255,255);
    doc.text(label, 24, y);

    doc.setTextColor(96,165,250);
    doc.text(String(valor || "R$ 0"), 150, y);

    y += 14;
  });

  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(255,255,255);
  doc.text("Quantitativos", 20, y);

  y += 14;

  result.quantitativos?.forEach((cat) => {

    doc.setFillColor(37,99,235);
    doc.roundedRect(20, y-6, 170, 10, 2, 2, "F");

    doc.setTextColor(255,255,255);
    doc.text(cat.categoria, 24, y);

    y += 14;

    cat.itens?.forEach((item) => {

      doc.setTextColor(20,20,20);

doc.text(
  `${item.descricao}`,
  20,
  y
);

y += 6;

doc.setFontSize(9);

doc.text(
  `Qtd: ${item.quantidade} ${item.unidade}`,
  25,
  y
);

y += 5;

doc.text(
  `Material: R$ ${item.custo_unitario_material}`,
  25,
  y
);

y += 5;

doc.text(
  `Mão de obra: R$ ${item.custo_unitario_mao_de_obra}`,
  25,
  y
);

y += 5;

doc.text(
  `Total: R$ ${item.total_item}`,
  25,
  y
);

y += 10;

if (y > 260) {
  doc.addPage();
  y = 20;
}

      doc.text(
        `Total: R$ ${item.total_item}`,
        25,
        y
      );

      y += 10;

    });

  });

  doc.save("orcamento-obra-ai.pdf");

};
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("upload");
  const [expanded, setExpanded] = useState({});
  const [user, setUser] = useState(null);
  const fileRef = useRef(null);
  const [orcamentos, setOrcamentos] = useState([]);

  const handleFile = (f) => {
    trackEvent("Upload PDF");
    if (!f) return;
    const ok = ["application/pdf","image/jpeg","image/png","image/webp"];
    if (!ok.includes(f.type)) { setError("Use PDF, JPG, PNG ou WEBP."); return; }
    setFile(f); setError(null);
  };

  const analyze = async () => {
    trackEvent("Gerar Orcamento");
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
const dadosProjeto =
  extrairDadosProjeto(text);

  const area = Number(dadosProjeto.area || 150);

console.log("ENVIANDO PARA CLAUDE:");
console.log(JSON.stringify({
  model: "claude-sonnet-4-0",
  max_tokens: 8000,
  system: SYSTEM_PROMPT,
  messages
}, null, 2));
const response = await fetch("https://obra-ia.vercel.app/api/orcamento", 
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
body: JSON.stringify({
  model: "claude-sonnet-4-0",
  max_tokens: 8000,
  system: SYSTEM_PROMPT,
  messages
})
  }
);
console.log("STATUS:", response.status);

const texto = await response.text();

console.log("RESPOSTA API:");
console.log(texto);
const data = JSON.parse(texto);

console.log("DATA COMPLETA:");
console.log(data);

if (data.error) {
  throw new Error(data.error.message);
}
const textoClaude =
  data.content?.[0]?.text;
if (!textoClaude) {
  throw new Error("Claude não retornou conteúdo.");
}
const textoLimpo = textoClaude
  .replace(/```json/g, "")
  .replace(/```/g, "")
  .trim();

const parsed = JSON.parse(textoLimpo);
 
const historico = JSON.parse(
  localStorage.getItem("orcamentos") || "[]"
);

historico.unshift({
  id: Date.now(),
  criadoEm: new Date().toISOString(),
  resultado: parsed
});
console.log("RETORNO COMPLETO:", parsed);

console.log(
  "QUANTITATIVOS:",
  parsed.quantitativos?.map(cat => ({
    categoria: cat.categoria,
    quantidadeDeItens: cat.itens?.length,
    primeiroItem: cat.itens?.[0]
  }))
);

localStorage.setItem(
  "orcamentos",
  JSON.stringify(historico)
);
console.log("PARSED:", parsed);

setResult(parsed);

setTab("result");

setExpanded(
  Object.fromEntries(
    parsed.quantitativos.map((_, i) => [i, i < 2])
  )
);
      setTab("result");
      setExpanded(Object.fromEntries(parsed.quantitativos.map((_, i) => [i, i < 2])));
    } catch(e) {
      setError("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  };

const exportarExcel = () => {
  trackEvent("Exportar Excel");
  console.log(result);

  if (!result) return;

  const dados = [];

  result.quantitativos?.forEach((cat) => {

    cat.itens?.forEach((item) => {

dados.push({

  Categoria: cat.categoria || "",

  Descricao: item.descricao || "",

  Quantidade: item.quantidade || "",

  Unidade: item.unidade || "",

  Material:
    item.custo_unitario_material || 0,

  MaoDeObra:
    item.custo_unitario_mao_de_obra || 0,

Total:
  item.total_item || 0

});


});

});



  const worksheet = XLSX.utils.json_to_sheet(dados);
  worksheet["!cols"] = [

  { wch: 25 },
  { wch: 45 },
  { wch: 12 },
  { wch: 12 },
  { wch: 15 },
  { wch: 15 },
  { wch: 15 }

];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Orçamento"
  );

  XLSX.writeFile(
    workbook,
    "orcamento-obra-ai.xlsx"
  );
};

const loginGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);

    trackEvent("Login Google");

    setUser(result.user);
  } catch (err) {
    console.log(err);
  }
};

const logout = async () => {
  await signOut(auth);
  setUser(null);
};

const carregarOrcamentos = () => {

  const dados = JSON.parse(
    localStorage.getItem("orcamentos") || "[]"
  );

  setOrcamentos(dados);

};

useEffect(() => {
ReactGA.send("pageview");

  const unsubscribe = onAuthStateChanged(
    auth,
    (currentUser) => {

      setUser(currentUser);

    }
  );

  return () => unsubscribe();

}, []);
useEffect(() => {

  if(user){
    carregarOrcamentos();
  }

}, [user]);

if (!user) {

  return (

    <div
      style={{
        minHeight:"100vh",
        display:"flex",
        justifyContent:"center",
        alignItems:"center",
        background:"#020617"
      }}
    >

      <div
        style={{
          width:"380px",
          padding:"40px",
          borderRadius:"24px",
          background:"#0f172a",
          border:"1px solid rgba(255,255,255,0.08)",
          textAlign:"center"
        }}
      >

        <img
          src={logo}
          alt="logo"

          style={{
            width:"120px",
            marginBottom:"24px"
          }}
        />

        <h1
          style={{
            color:"#fff",
            fontFamily:"Arial",
            marginBottom:"12px"
          }}
        >
          OBRA AI
        </h1>

        <button
          onClick={loginGoogle}

          style={{
            width:"100%",
            padding:"16px",
            border:"none",
            borderRadius:"12px",
            background:"#2563eb",
            color:"#fff",
            fontWeight:"700",
            cursor:"pointer",
            fontFamily:"Arial"
          }}
        >
          Entrar com Google
        </button>

      </div>

    </div>
  );
}

return (

  
    <div 

    style={{ minHeight:"100vh",
overflowY:"auto", background:"#0a0a0f", fontFamily:"arial", color:"#e8e0d0" }}>

    <div
  style={{
    borderBottom:"1px solid #1a1a25",
    padding:"28px 32px",
    display:"flex",
    justifyContent:"space-between",
    alignItems:"center",
    background:"rgba(10,10,15,0.95)",
    backdropFilter:"blur(12px)",
    position:"sticky",
    top:0,
    zIndex:10
  }}
>


<div
  style={{
    display:"flex",
    justifyContent:"center",
    alignItems:"center",
    flexDirection:"column",
    width:"100%",
    paddingTop:"40px",
    paddingBottom:"20px"
  }}
>

<div
  style={{
    display:"flex",
    justifyContent:"center",
    alignItems:"center",
    width:"100%"
  }}
>

  <img
    src={logo}
    alt="Obra AI"

style={{
  width:"400px",
  objectFit:"contain",
  background:"transparent",
  mixBlendMode:"lighten"
}}
  
  />

</div>

</div>
</div>

      <div style={{ borderBottom:"1px solid #1a1a25", padding:"0 24px", display:"flex" }}>
        
 {[
  ["upload","// Projeto"],
  ["result","// Orcamento"],
  ["historico","// Historico"]
].map(([id,label]) => (

  <button
    key={id}

    onClick={() => {
      if (
        id === "upload" ||
        id === "historico" ||
        result
      ) {
        setTab(id);
      }
    }}

    style={{
      background:"none",
      border:"none",
      cursor:"pointer",
      padding:"12px 20px",
      fontSize:12
    }}
  >

    {label}

  </button>


        ))}
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"32px 24px" }}>
        {tab === "upload" && (
          <div style={{ display:"grid", gap:20 }}>
            <div onClick={() => fileRef.current?.click()}
              style={{border:"1px dashed rgba(59,130,246,0.35)",
boxShadow:"0 0 40px rgba(59,130,246,0.08)",
background:"rgba(255,255,255,0.02)",
transition:"0.3s", borderRadius:4, padding:48, textAlign:"center", cursor:"pointer", background:"#0d0d15" }}>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])} />
              {file ? <div style={{color:"#3b82f6"}}>{file.name}</div> : <div style={{color:"#555"}}>Arraste o projeto aqui (PDF) ou clique</div>}
            </div>
            <textarea value={text} onChange={e=>setText(e.target.value)} rows={5}
              placeholder="Ou descreva o projeto: Ex: Casa 120m2, 3 quartos, fundacao radier, alvenaria estrutural, Sao Paulo/SP"
              style={{ width:"100%", background:"#0d0d15", border:"1px solid #222", color:"#e8e0d0", fontFamily:"arial", fontSize:13, padding:16, resize:"vertical", outline:"none", borderRadius:4 }} />
            {error && <div style={{background:"rgba(255,80,80,0.1)", border:"1px solid rgba(255,80,80,0.3)", padding:"12px 16px", color:"#ff8080", fontSize:12, borderRadius:4}}>
              {error}
            </div>}
            <button onClick={analyze} disabled={loading || (!file && !text.trim())}
              style={{ background: loading ? "#333" : "#3b82f6", color: loading ? "#666" : "#0a0a0f", border:"none", cursor: loading ? "not-allowed" : "pointer",
                fontFamily:"arial", fontSize:13, fontWeight:600, letterSpacing:2, padding:"14px 32px", width:"100%", borderRadius:4 }}>
              {loading ? "ANALISANDO..." : "GERAR QUANTITATIVO E ORCAMENTO"}
            </button>
          </div>
        )}
{tab === "historico" && (

  <div
    style={{
      display:"grid",
      gap:"16px"
    }}
  >

    <h2
      style={{
        color:"#3b82f6",
        marginBottom:"20px"
      }}
    >
      Meus Orçamentos
    </h2>

    {orcamentos.length === 0 && (

      <div
        style={{
          color:"#888",
          padding:"20px",
          textAlign:"center"
        }}
      >
        Nenhum orçamento encontrado.
      </div>

    )}

    {orcamentos.map((orcamento) => (

      <div
        key={orcamento.id}

        style={{
          background:"#0d0d15",
          border:"1px solid #1a1a25",
          borderRadius:"12px",
          padding:"20px"
        }}
      >

        <div
          style={{
            fontSize:"18px",
            fontWeight:"700"
          }}
        >
          {orcamento.resultado?.projeto?.nome}
        </div>

        <div
          style={{
            color:"#888",
            marginTop:"8px"
          }}
        >
          {orcamento.resultado?.projeto?.tipo}
        </div>

        <div
          style={{
            color:"#3b82f6",
            fontSize:"24px",
            fontWeight:"800",
            marginTop:"12px"
          }}
        >
          {fmt(
            orcamento.resultado
            ?.resumo_financeiro
            ?.total_geral
          )}
        </div>

      </div>

    ))}

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
                <div style={{ fontSize:28, fontWeight:800, color:"#3b82f6" }}>{fmt(result.resumo_financeiro?.total_geral)}</div>
                <div style={{ fontSize:11, color:"#555" }}>{fmt(result.resumo_financeiro?.custo_por_m2)}/m2</div>
              </div>
            </div>

          <div
  style={{
    display:"grid",
    gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
    gap:16
  }}
>

  {[
    ["Materiais", result.resumo_financeiro?.total_material,"#60a5fa"],
    ["Mão de Obra", result.resumo_financeiro?.total_mao_de_obra,"#a78bfa"],
    ["BDI", result.resumo_financeiro?.bdi_valor,"#34d399"],
    ["Encargos", result.resumo_financeiro?.encargos_sociais_valor,"#fb923c"],
    ["Impostos", result.resumo_financeiro?.impostos_valor,"#f43f5e"]
  ].map(([label,value,color]) => (

    <div
      key={label}

      style={{
        background:"rgba(15,15,25,0.85)",
        border:`1px solid ${color}30`,
        padding:"22px",
        borderRadius:16,
        backdropFilter:"blur(10px)",
        boxShadow:`0 0 25px ${color}15`,
        transition:"0.3s"
      }}
    >

      <div
        style={{
          fontSize:11,
          color:"#666",
          letterSpacing:2,
          marginBottom:10,
          textTransform:"uppercase"
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize:22,
          fontWeight:800,
          color
        }}
      >
        {fmt(value)}
      </div>

    </div>
  ))}
</div>
<div style={{color:"red"}}>
  Quantitativos: {result.quantitativos?.length}
</div>
            <div style={{ display:"grid", gap:8 }}>
              {result.quantitativos?.map((cat, idx) => (
                <div key={idx} style={{ border:"1px solid #1a1a25", borderRadius:4, overflow:"hidden" }}>
                  <div onClick={() => setExpanded(p=>({...p,[idx]:!p[idx]}))}
                  
  style={{
    display:"flex",
    justifyContent:"center",
    alignItems:"center",

    padding:"24px 40px",

    borderBottom:"1px solid rgba(255,255,255,0.06)",

    background:"#000814",

    backdropFilter:"blur(20px)",

    boxShadow:"0 8px 40px rgba(0,0,0,0.45)"
  }}
>
                    <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                      <span style={{ color:"#3b82f6" }}>{expanded[idx]?"▼":"▶️"}</span>
                      <span style={{ fontSize:13 }}>{cat.categoria}</span>
                      <span style={{ fontSize:10, color:"#555" }}>{cat.itens?.length} itens</span>
                    </div>
                    <div style={{ color:"#3b82f6", fontWeight:600 }}>{fmt(cat.subtotal)}</div>
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
                              <td style={{ padding:"10px 12px", textAlign:"right", color:"#60a5fa" }}>{fmt(item.custo_unitario_material)}</td>
                              <td style={{ padding:"10px 12px", textAlign:"right", color:"#a78bfa" }}>{fmt(item.custo_unitario_mao_de_obra)}</td>
                              <td style={{ padding:"10px 12px", textAlign:"right", color:"#3b82f6", fontWeight:600 }}>{fmt(item.total_item)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
<button
  type="button"
  onClick={exportarPDF}

  style={{
    background:"linear-gradient(135deg,#2563eb,#3b82f6,#60a5fa)",
boxShadow:"0 0 35px rgba(59,130,246,0.45)",
transform:"translateY(0px)",
transition:"0.3s",
    border:"none",
    color:"#000",
    cursor:"pointer",
    fontFamily:"arial",
    fontSize:13,
    fontWeight:700,
    padding:"12px",
    borderRadius:4,
    marginRight:"12px"
  }}
>
  EXPORTAR PDF
</button>
            <button onClick={() => { setResult(null); setFile(null); setText(""); setTab("upload"); }}
              style={{ background:"transparent", border:"1px solid #333", color:"#888", cursor:"pointer", fontFamily:"arial", fontSize:13, padding:"12px", borderRadius:4 }}>
              NOVO PROJETO
            </button>
            <button
  type="button"
  onClick={exportarExcel}

  style={{
    width:"100%",
    padding:"18px",
    borderRadius:"14px",
    border:"1px solid #2563eb",
    background:"transparent",
    color:"#60a5fa",
    fontWeight:"700",
    cursor:"pointer",
    marginBottom:"12px",
    fontFamily:"Arial"
  }}
>
  EXPORTAR EXCEL
</button>
          </div>
        )}
      </div>
    </div>
);
  }
  
