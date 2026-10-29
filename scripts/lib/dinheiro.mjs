// Monta os dados da página "Dinheiro de fora" a partir de data/dinheiro/*.json (ver scripts/coletar-dinheiro.mjs):
// quanto chega da União e do Estado, quem mandou emendas, para onde foi o dinheiro e quais bairros aparecem citados.
import { existsSync, readdirSync, readFileSync } from "node:fs";

const PASTA = "data/dinheiro";
const ler = (nome) => (existsSync(`${PASTA}/${nome}`) ? JSON.parse(readFileSync(`${PASTA}/${nome}`, "utf8")) : null);
const r2 = (x) => Math.round(x * 100) / 100;
const somaObj = (o) => Object.values(o).reduce((a, b) => a + b, 0);

// ---------- Entradas ----------
// O plano de contas mudou em 2022 (o FPM, por exemplo, era 1.7.1.8.01 e virou 1.7.1.1.51), então as categorias saem
// do nome da conta. Cada linha vai para a primeira categoria cujo nome casa; de cada categoria fica só a linha mais alta
// (as filhas já estão somadas nela), e o que sobra de cada esfera vira "outras". Emendas não têm categoria aqui: a
// Prefeitura lança quase todas dentro da área (saúde, convênios), e as poucas lançadas como "transferência especial"
// ficam em "outras". O valor das emendas vem do que a CGU registra como recebido.
const CATEGORIAS = {
  uniao: [
    ["convenios", /conv[eê]nio/i],
    ["sus", /sistema [uú]nico de sa[uú]de|\bSUS\b/i],
    ["educacao", /FNDE|educa[cç][aã]o|PNAE|escolar/i],
    ["assistencia", /assist[eê]ncia social|FNAS/i],
    ["fpm", /fundo de participa[cç][aã]o d[oe]s? munic[ií]pios/i],
  ],
  estado: [
    ["convenios", /conv[eê]nio/i],
    ["sus", /sistema [uú]nico de sa[uú]de|\bSUS\b/i],
    ["icms", /ICMS/],
    ["ipva", /IPVA/],
  ],
};
const significativo = (cod) => cod.split(".").reduce((acc, p, i, arr) => (arr.slice(i).every((x) => /^0+$/.test(x)) ? acc : [...acc, p]), []).join(".");

function classificarAno(linhas) {
  const brutas = linhas.filter((l) => l.coluna === "Receitas Brutas Realizadas").map((l) => ({ ...l, sig: significativo(l.cod) }));
  const total = (prefixos) => brutas.filter((l) => prefixos.includes(l.sig)).reduce((a, l) => a + l.valor, 0);
  const esfera = (nome, prefixos) => {
    const sob = brutas.filter((l) => prefixos.some((p) => l.sig.startsWith(p + ".")));
    const marcadas = [];
    for (const l of sob) {
      const cat = CATEGORIAS[nome].find(([, re]) => re.test(l.conta))?.[0];
      if (cat) marcadas.push({ ...l, cat });
    }
    const topo = marcadas.filter((l) => !marcadas.some((o) => o !== l && l.sig.startsWith(o.sig + ".")));
    const out = Object.fromEntries(CATEGORIAS[nome].map(([k]) => [k, 0]));
    for (const l of topo) out[l.cat] += l.valor;
    const t = total(prefixos);
    out.outras = Math.max(0, t - somaObj(out));
    return { ...Object.fromEntries(Object.entries(out).map(([k, v]) => [k, r2(v)])), total: r2(t) };
  };
  return {
    uniao: esfera("uniao", ["1.7.1", "2.4.1"]),
    estado: esfera("estado", ["1.7.2", "2.4.2"]),
    // O FUNDEB junta parte dos impostos do Estado e dos municípios (e um complemento da União) e redistribui pelo número
    // de alunos; entra como "outras instituições públicas" no plano de contas.
    fundeb: r2(brutas.filter((l) => /^1\.7\.5(\.|$)/.test(l.sig) && /FUNDEB|Manuten[cç][aã]o e Desenvolvimento da Educa/i.test(l.conta)).reduce((a, l) => Math.max(a, l.valor), 0)),
  };
}

// Salários pagos com dinheiro carimbado (o FUNDEB paga os professores) aparecem como pagamentos à própria Prefeitura,
// ao instituto de previdência ou com nomes como "FOLHA DE PAG AUXILIO DOENCA". Viram uma linha só, para não parecerem
// fornecedores.
const FOLHA = /^FOLHA|PREFEITURA DO MUNIC[IÍ]PIO DE OSASCO|INSTITUTO DE PREVID[EÊ]NCIA DO MUNIC[IÍ]PIO DE OSASCO|IPMO/i;
function juntarFolha(lista) {
  const folha = lista.filter((f) => FOLHA.test(f.nome));
  const resto = lista.filter((f) => !FOLHA.test(f.nome));
  const total = folha.reduce((a, f) => a + f.valor, 0);
  return (folha.length ? [...resto, { cnpj: "folha", nome: "Salários e encargos dos servidores", valor: r2(total), principal: null }] : resto).sort((a, b) => b.valor - a.valor);
}

// ---------- Montagem ----------
export function montarDinheiro({ acha, achaEquipamento }) {
  const entradas = ler("entradas.json");
  const emendas = ler("emendas-federais.json");
  const pix = ler("pix-federais.json");
  const pixEst = ler("pix-estaduais.json");
  if (!entradas || !emendas) return null;
  const bairrosDe = (texto) => [...new Set([...acha(texto ?? ""), ...achaEquipamento(texto ?? "").map((e) => e.bairro)])];
  const porBairro = {};
  const noBairro = (bairros, item) => {
    for (const b of bairros) {
      const x = (porBairro[b] ??= { valor: 0, itens: [] });
      x.valor = r2(x.valor + item.valor / bairros.length);
      x.itens.push({ ...item, texto: item.texto?.slice(0, 180), outrosBairros: bairros.length - 1 });
    }
  };

  // Entradas por ano.
  const anosEntradas = Object.entries(entradas.anos).map(([ano, linhas]) => ({ ano: Number(ano), ...classificarAno(linhas) }));

  // Emendas federais: por autor (só o que a Prefeitura e os fundos municipais receberam) e entidades locais.
  const rec = emendas.recebimentos;
  const COLETIVA = /^(RELATOR GERAL|COM\.|BANCADA|Sem informa)/i;
  const autores = {};
  for (const r of rec.filter((r) => r.destino === "prefeitura")) {
    const e = emendas.emendas[r.codigo] ?? {};
    const a = (autores[r.autor] ??= { nome: r.autor, coletiva: COLETIVA.test(r.autor), total: 0, porAno: {}, emendas: new Set(), funcoes: {}, tipos: new Set() });
    a.total += r.valor;
    a.porAno[r.mes.slice(0, 4)] = r2((a.porAno[r.mes.slice(0, 4)] ?? 0) + r.valor);
    a.emendas.add(r.codigo);
    a.tipos.add(r.tipo.replace(/^Emenda (Individual - )?/i, ""));
    if (e.funcao) a.funcoes[e.funcao] = r2((a.funcoes[e.funcao] ?? 0) + r.valor);
  }
  const listaAutores = Object.values(autores)
    .map((a) => ({ ...a, total: r2(a.total), emendas: a.emendas.size, tipos: [...a.tipos], funcoes: Object.entries(a.funcoes).sort((x, y) => y[1] - x[1]).map(([k]) => k) }))
    .sort((a, b) => b.total - a.total);
  const entidades = {};
  for (const r of rec.filter((r) => r.destino === "entidade")) {
    const x = (entidades[r.favorecido] ??= { nome: r.favorecido, total: 0, autores: new Set() });
    x.total += r.valor;
    x.autores.add(r.autor);
  }
  const recebidoPorAno = {};
  for (const r of rec.filter((r) => r.destino === "prefeitura")) recebidoPorAno[r.mes.slice(0, 4)] = r2((recebidoPorAno[r.mes.slice(0, 4)] ?? 0) + r.valor);

  // Convênios gerados por emendas (texto do objeto cita bairro?).
  const autorDe = new Map(rec.map((r) => [r.codigo, r.autor]));
  const convenios = emendas.convenios
    .map((c) => ({ data: c.data, objeto: c.objeto, valor: c.valor, numero: c.numero, autor: autorDe.get(c.codigo) ?? null, bairros: bairrosDe(c.objeto) }))
    .sort((a, b) => b.data.localeCompare(a.data));
  for (const c of convenios) if (c.bairros.length) noBairro(c.bairros, { origem: "convenio", ano: Number(c.data.slice(0, 4)), valor: c.valor, texto: c.objeto, quem: c.autor });

  // Transferências especiais federais, com a finalidade de cada uma.
  const planos = (pix?.planos ?? []).map((p) => {
    const objetos = p.objetos.filter((o) => o.objeto).map((o) => ({ ...o, bairros: bairrosDe(o.objeto) }));
    return { ano: p.ano, parlamentar: p.parlamentar, valor: r2(p.custeio + p.investimento), situacao: p.situacao, area: p.area, planoTrabalho: p.planoTrabalho, objetos };
  });
  for (const p of planos) for (const o of p.objetos) if (o.bairros.length) noBairro(o.bairros, { origem: "pix", ano: p.ano, valor: o.valor, texto: o.objeto, quem: p.parlamentar });

  // Gastos pagos com dinheiro federal e estadual, por ano.
  const arquivosGastos = readdirSync(PASTA).filter((f) => /^gastos-\d{4}\.json$/.test(f)).sort();
  const gastos = arquivosGastos.map((f) => {
    const g = JSON.parse(readFileSync(`${PASTA}/${f}`, "utf8"));
    const resumo = (x, top = 15) =>
      x && {
        total: x.total,
        pessoasFisicas: x.pessoasFisicas,
        quantidadeFornecedores: x.quantidadeFornecedores,
        funcoes: Object.entries(x.funcoes).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([nome, valor]) => ({ nome, valor })),
        aplicacoes: Object.entries(x.aplicacoes).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([nome, valor]) => ({ nome: nome.replace(/^\d+ - /, ""), valor })),
        fornecedores: juntarFolha(
          Object.entries(x.fornecedores).map(([cnpj, f]) => ({ cnpj, nome: f.nome, valor: f.valor, principal: Object.entries(f.aplicacoes).sort((a, b) => b[1] - a[1])[0]?.[0].replace(/^\d+ - /, "") ?? null })),
        ).slice(0, top),
      };
    // Pagamentos feitos com o dinheiro das emendas (códigos de aplicação 0800 e 0801 do sistema do TCE-SP).
    const deEmendas = (x, codigo) => {
      if (!x) return null;
      const total = Object.entries(x.aplicacoes).filter(([k]) => k.startsWith(codigo)).reduce((a, [, v]) => a + v, 0);
      if (!total) return null;
      const fornecedores = Object.entries(x.fornecedores)
        .map(([cnpj, f]) => ({ cnpj, nome: f.nome, valor: Object.entries(f.aplicacoes).filter(([k]) => k.startsWith(codigo)).reduce((a, [, v]) => a + v, 0) }))
        .filter((f) => f.valor > 0);
      return { total: r2(total), fornecedores: juntarFolha(fornecedores).slice(0, 10) };
    };
    for (const [grupo, x] of Object.entries(g.grupos)) {
      // Pagamentos do mesmo fornecedor no mesmo bairro e ano viram um item só (contratos mensais repetem o texto).
      const juntos = {};
      for (const i of x.itensBairro) {
        const k = `${i.bairros.join(",")}|${i.fornecedor}|${i.aplicacao}`;
        const j = (juntos[k] ??= { bairros: i.bairros, valor: 0, pagamentos: 0, fornecedor: i.fornecedor, aplicacao: i.aplicacao, texto: i.texto });
        j.valor += i.valor;
        j.pagamentos++;
      }
      for (const j of Object.values(juntos))
        noBairro(j.bairros, { origem: grupo === "federal" ? "gastoFederal" : grupo === "estadual" ? "gastoEstadual" : "gastoVereadores", ano: g.ano, valor: r2(j.valor), texto: j.texto, quem: j.fornecedor, pagamentos: j.pagamentos });
    }
    return {
      ano: g.ano,
      ultimoMes: g.ultimoMes,
      tesouro: g.fontes.TESOURO ?? 0,
      federal: resumo(g.grupos.federal),
      estadual: resumo(g.grupos.estadual),
      emendasFederais: deEmendas(g.grupos.federal, "0800"),
      emendasEstaduais: deEmendas(g.grupos.estadual, "0801"),
      emendasVereadores: g.grupos.emendasVereadores ? { total: g.grupos.emendasVereadores.total, fornecedores: resumo(g.grupos.emendasVereadores, 10).fornecedores } : null,
    };
  });
  // No mapa vão os 15 itens de maior valor de cada bairro (a soma do bairro conta todos).
  for (const b of Object.values(porBairro)) {
    b.quantidade = b.itens.length;
    b.itens = b.itens.sort((a, c) => c.valor - a.valor).slice(0, 15);
  }

  return {
    pagina: {
      fontes: {
        entradas: { nome: entradas.fonte, url: "https://siconfi.tesouro.gov.br/siconfi/pages/public/consulta_finbra/finbra_list.jsf", coletadoEm: entradas.coletadoEm },
        emendas: { nome: emendas.fonte, url: emendas.url, coletadoEm: emendas.coletadoEm },
        pix: pix && { nome: pix.fonte, url: pix.url, coletadoEm: pix.coletadoEm },
        pixEstaduais: pixEst && { nome: pixEst.fonte, url: pixEst.url, posicao: pixEst.posicao },
        gastos: { nome: "TCE-SP, despesas dos municípios (Audesp)", url: "https://transparencia.tce.sp.gov.br/conjunto-de-dados" },
      },
      entradas: anosEntradas,
      emendas: {
        recebidoPorAno,
        autores: listaAutores,
        entidades: Object.values(entidades).map((e) => ({ nome: e.nome, total: r2(e.total), autores: [...e.autores] })).sort((a, b) => b.total - a.total),
        empresasForaDaConta: emendas.empresasForaDaConta,
      },
      pix: planos.sort((a, b) => b.ano - a.ano || b.valor - a.valor),
      pixEstaduais: pixEst?.repasses ?? [],
      convenios,
      gastos,
    },
    porBairro,
  };
}
