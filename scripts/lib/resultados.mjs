// Pilar D da nota do prefeito: resultados para o cidadão (ver scripts/coletar-resultados.mjs).
//  - Educação: IDEB dos anos iniciais da rede municipal.
//  - Saúde: mortalidade infantil (óbitos de menores de 1 ano por mil nascidos vivos).
// Cada item vale metade pela posição entre as cidades comparadas e metade pela evolução
// em relação à edição anterior (gestão passada).
import { existsSync, readFileSync } from "node:fs";
import { linear, media, percentil } from "./fiscal.mjs";

export const EVOLUCAO = { ideb: 0.3, mortalidade: 1.5 }; // variação que vale nota máxima (ou zero, se for piora)

const ler = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null);

export function calcularResultados() {
  const pares = ler("data/pares.json");
  const ideb = ler("data/resultados/ideb.json");
  const mort = ler("data/resultados/mortalidade.json");
  if (!pares || (!ideb && !mort)) return null;

  const anoSaude = mort ? Math.max(...Object.keys(mort.anos).map(Number).filter((a) => a >= pares.inicioMandato)) : null;
  const cidades = pares.cidades.map((c) => {
    const serie = ideb?.cidades[c.ibge] ?? null;
    const valorIdeb = serie?.[ideb.edicao] ?? null;
    const anteriorIdeb = serie?.[ideb.edicao - 2] ?? null;
    const taxa = (ano) => {
      const d = mort?.anos[ano]?.[c.ibge];
      return d?.nascidos ? (d.obitos / d.nascidos) * 1000 : null;
    };
    return {
      ibge: c.ibge,
      nome: c.nome,
      foco: c.ibge === pares.foco,
      ideb: { serie, valor: valorIdeb, anterior: anteriorIdeb, delta: valorIdeb != null && anteriorIdeb != null ? valorIdeb - anteriorIdeb : null },
      mortalidade: {
        ...(mort?.anos[anoSaude]?.[c.ibge] ?? {}),
        taxa: anoSaude ? taxa(anoSaude) : null,
        anterior: anoSaude ? taxa(anoSaude - 1) : null,
        serie: mort ? Object.fromEntries(Object.keys(mort.anos).map((a) => [a, taxa(a)])) : {},
      },
    };
  });

  const idebs = cidades.map((c) => c.ideb.valor);
  const taxas = cidades.map((c) => c.mortalidade.taxa);
  for (const c of cidades) {
    const m = c.mortalidade;
    m.delta = m.taxa != null && m.anterior != null ? m.taxa - m.anterior : null;
    const parteEducacao = { posicao: c.ideb.valor == null ? null : percentil(idebs, c.ideb.valor), evolucao: c.ideb.delta == null ? null : linear(c.ideb.delta, -EVOLUCAO.ideb, 0, EVOLUCAO.ideb, 1) };
    const parteSaude = { posicao: m.taxa == null ? null : percentil(taxas, m.taxa, false), evolucao: m.delta == null ? null : linear(m.delta, EVOLUCAO.mortalidade, 0, -EVOLUCAO.mortalidade, 1) };
    const educacao = c.ideb.valor == null ? null : media([parteEducacao.posicao, parteEducacao.evolucao]);
    const saude = m.taxa == null ? null : media([parteSaude.posicao, parteSaude.evolucao]);
    c.componentes = { educacao, saude };
    c.partes = { educacao: parteEducacao, saude: parteSaude };
    c.nota = media([educacao, saude]);
  }
  const ordem = cidades.filter((c) => c.nota != null).sort((a, b) => b.nota - a.nota);
  ordem.forEach((c, i) => (c.ranking = i + 1));

  const foco = cidades.find((c) => c.foco);
  return {
    pilar: { nota: foco.nota, anos: [...new Set([ideb?.edicao, anoSaude].filter((a) => a >= pares.inicioMandato))] },
    ideb: ideb && { edicao: ideb.edicao, anterior: ideb.edicao - 2, etapa: ideb.etapa, rede: ideb.rede, fonte: ideb.fonte },
    mortalidade: mort && { ano: anoSaude, fonte: mort.fonte, fonteNascidos: mort.fonteNascidos, preliminar: anoSaude >= new Date().getFullYear() - 1 },
    evolucao: EVOLUCAO,
    cidades,
  };
}
