// Pilar E da nota do prefeito: transparência e entregas (ver scripts/coletar-transparencia.mjs).
//  - Transparência: índice do PNTP da Prefeitura (0 a 100%), usado diretamente como nota.
//  - Obras: parte do valor das obras do Executivo que está paralisada ou atrasada no Painel de
//    Obras do TCE-SP. 0% vale 10; LIMITE_OBRAS ou mais vale 0. Obras da Câmara ficam de fora.
import { existsSync, readFileSync } from "node:fs";
import { linear, media } from "./fiscal.mjs";

export const LIMITE_OBRAS = 0.3;
const PROBLEMA = /paralisada|atrasada/i;
const ler = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null);

export function calcularTransparencia() {
  const pares = ler("data/pares.json");
  const pntp = ler("data/transparencia/pntp.json");
  const obras = ler("data/transparencia/obras.json");
  if (!pares || (!pntp && !obras)) return null;

  const cidades = pares.cidades.map((c) => {
    const prefeitura = pntp?.avaliacoes.find((a) => a.ibge === c.ibge && a.poder === "Executivo") ?? null;
    const camara = pntp?.avaliacoes.find((a) => a.ibge === c.ibge && a.poder === "Legislativo") ?? null;
    const doExecutivo = (obras?.obras[c.ibge] ?? []).filter((o) => o.esfera === "MUNICIPAL" && !/c[âa]mara/i.test(o.contratante));
    const total = doExecutivo.reduce((a, o) => a + o.valor, 0);
    const problema = doExecutivo.filter((o) => PROBLEMA.test(o.situacao));
    const valorProblema = problema.reduce((a, o) => a + o.valor, 0);
    const parteProblema = total ? valorProblema / total : null;
    const componentes = {
      transparencia: prefeitura ? prefeitura.indice : null,
      obras: parteProblema == null ? null : linear(parteProblema, 0, 1, LIMITE_OBRAS, 0),
    };
    return {
      ibge: c.ibge,
      nome: c.nome,
      foco: c.ibge === pares.foco,
      pntp: prefeitura,
      pntpCamara: camara,
      obras: {
        quantidade: doExecutivo.length,
        paralisadas: doExecutivo.filter((o) => /paralisada/i.test(o.situacao)).length,
        atrasadas: doExecutivo.filter((o) => /atrasada/i.test(o.situacao)).length,
        valorTotal: total,
        valorProblema,
        parteProblema,
        lista: c.ibge === pares.foco ? doExecutivo.sort((a, b) => b.valor - a.valor) : undefined,
      },
      componentes,
      nota: media(Object.values(componentes)),
    };
  });
  const ordem = cidades.filter((c) => c.nota != null).sort((a, b) => b.nota - a.nota);
  ordem.forEach((c, i) => (c.ranking = i + 1));

  return {
    pilar: { nota: cidades.find((c) => c.foco).nota, anos: [pntp?.ciclo].filter(Boolean) },
    pntp: pntp && { ciclo: pntp.ciclo, fonte: pntp.fonte, arquivo: pntp.arquivo },
    obras: obras && { fonte: obras.fonte, dataBase: obras.dataBase },
    limiteObras: LIMITE_OBRAS,
    cidades,
  };
}
