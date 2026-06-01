export function gerarEstimativas(area, descricao = "") {

  const texto = descricao.toLowerCase();

  let padrao = "medio";
  let multiplicador = 1;

  if (
    texto.includes("alto padrão") ||
    texto.includes("luxo") ||
    texto.includes("automação") ||
    texto.includes("piscina") ||
    texto.includes("esquadrias premium")
  ) {
    padrao = "alto";
    multiplicador = 1.18;
  }

  else if (
    texto.includes("popular") ||
    texto.includes("econômica") ||
    texto.includes("baixo padrão")
  ) {
    padrao = "baixo";
    multiplicador = 0.82;
  }

  else if (
    texto.includes("industrial") ||
    texto.includes("galpão")
  ) {
    padrao = "industrial";
    multiplicador = 1.15;
  }

  return {
    padrao,
    multiplicador,

    limpeza_terreno: area * 1.2,

    locacao_obra: area,

    fundacao_sapata: area * 0.12 * multiplicador,

    alvenaria_bloco: area * 2.2 * multiplicador,

    chapisco: area * 3.8,

    reboco: area * 3.8,

    emassamento_pva: area * 3.2,

    cobertura_telhas: area * 1.1 * multiplicador,

    piso_porcelanato: area * 1.05 * multiplicador,

    pintura_pva: area * 3.5,

    instalacao_eletrica: Math.round(area / 8),

    quadro_eletrico: 1,

    iluminacao_led: Math.round(area / 5),

    tubulacao_agua_fria: area * 1.8,

    tubulacao_esgoto: area * 1.2,

    caixa_sifonada: Math.max(2, Math.round(area / 60)),

    vaso_sanitario: Math.max(1, Math.round(area / 45)),

    lavatorio_banheiro: Math.max(1, Math.round(area / 45)),

    torneira_cromada: Math.max(2, Math.round(area / 30)),

    porta_madeira: Math.max(5, Math.round(area / 18)),

    janela_aluminio: area * 0.18,

    internet_estruturada: Math.round(area / 12),

    sistema_alarme:
      texto.includes("alarme") ? 1 : 0,

    cameras_seguranca:
      texto.includes("câmeras") ||
      texto.includes("camera")
        ? Math.max(2, Math.round(area / 80))
        : 0,

    automacao_residencial:
      texto.includes("automação") ? 1 : 0,

    custos_nao_previstos:
      area * 45 * multiplicador
  };
}