export function extrairDadosProjeto(texto = "") {

  const lower = texto.toLowerCase();

  const areaMatch =
    texto.match(/(\d+)\s?m²/i) ||
    texto.match(/(\d+)\s?m2/i);

  const area = areaMatch
    ? Number(areaMatch[1])
    : 150;

  const quartosMatch =
    texto.match(/(\d+)\s?quartos/i) ||
    texto.match(/(\d+)\s?suítes/i);

  const quartos = quartosMatch
    ? Number(quartosMatch[1])
    : 2;

  const banheirosMatch =
    texto.match(/(\d+)\s?banheiros/i);

  const banheiros = banheirosMatch
    ? Number(banheirosMatch[1])
    : 2;

  const pavimentosMatch =
    texto.match(/(\d+)\s?pavimentos/i);

  const pavimentos = pavimentosMatch
    ? Number(pavimentosMatch[1])
    : 1;

  const piscina =
    lower.includes("piscina");

  const automacao =
    lower.includes("automação") ||
    lower.includes("automacao");

  const gourmet =
    lower.includes("gourmet");

  let padrao = "medio";

  if (
    lower.includes("alto padrão") ||
    lower.includes("luxo") ||
    automacao ||
    piscina
  ) {
    padrao = "alto";
  }

  if (
    lower.includes("popular") ||
    lower.includes("econômica")
  ) {
    padrao = "baixo";
  }

  return {
    area,
    quartos,
    banheiros,
    pavimentos,
    piscina,
    automacao,
    gourmet,
    padrao
  };
}