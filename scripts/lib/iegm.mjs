// Pilar C da nota do prefeito: IEG-M do TCE-SP (ver scripts/coletar-iegm.mjs).
// A nota do pilar é o valor padrão que o próprio TCE-SP atribui à faixa geral do IEG-M
// (A = 95%, B+ = 82,5%, B = 67,5%, C+ = 55%, C = 25%).
import { existsSync, readFileSync } from "node:fs";

export const INDICES = ["iegm", "iplanejamento", "ifiscal", "ieduc", "isaude", "iamb", "icidade", "igov"];

export function calcularIegm() {
  if (!existsSync("data/iegm/iegm.json") || !existsSync("data/pares.json")) return null;
  const pares = JSON.parse(readFileSync("data/pares.json", "utf8"));
  const bruto = JSON.parse(readFileSync("data/iegm/iegm.json", "utf8"));
  const v = (faixa) => bruto.valorFaixa[faixa] ?? null;

  const anos = bruto.anos
    .map((a) => {
      const cidades = pares.cidades.map((c) => {
        const linha = a.cidades.find((l) => l.codigo_municipio === c.ibge);
        const faixas = linha ? Object.fromEntries(INDICES.map((k) => [k, linha[k] ?? null])) : null;
        return { ibge: c.ibge, nome: c.nome, foco: c.ibge === pares.foco, faixas, nota: faixas ? v(faixas.iegm) : null };
      });
      const ordem = cidades.filter((c) => c.nota != null).sort((x, y) => y.nota - x.nota);
      // Empates dividem a posição (duas cidades em B ficam ambas em 1º).
      for (const c of ordem) c.ranking = ordem.filter((o) => o.nota > c.nota).length + 1;
      return {
        anoBase: a.anoBase,
        descricao: a.descricao,
        mandato: a.anoBase >= pares.inicioMandato,
        totalMunicipios: a.totalMunicipios,
        publicacoes: a.publicacoes,
        cidades,
      };
    })
    .sort((a, b) => a.anoBase - b.anoBase);

  const doMandato = anos.filter((a) => a.mandato);
  const notas = doMandato.map((a) => a.cidades.find((c) => c.foco)?.nota).filter((n) => n != null);
  return {
    fonte: bruto.fonte,
    coletadoEm: bruto.coletadoEm,
    valorFaixa: bruto.valorFaixa,
    pilar: { nota: notas.length ? notas.reduce((x, y) => x + y, 0) / notas.length : null, anos: doMandato.map((a) => a.anoBase) },
    ultimoAnoBase: anos.at(-1)?.anoBase ?? null,
    anos,
  };
}
