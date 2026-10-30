// Monta os dados da página "Verbas de fora" (/verbas) a partir de data/dinheiro/*.json (ver scripts/coletar-dinheiro.mjs):
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
  // Receita da própria cidade. A previdência dos servidores (contribuições, rendimentos e compensações do instituto de
  // previdência) vem antes, para não se misturar a impostos e taxas: é dinheiro reservado às aposentadorias.
  propria: [
    ["previdencia", /Regimes? Pr[oó]prios? de Previd|RPPS|Seguridade Social|CPSSS|Contribui[cç][aã]o do Servidor|Compensa[cç][oõ]es Financeiras entre os Regimes|Patronal/i],
    ["iss", /Servi[cç]os de Qualquer Natureza|ISSQN/i],
    ["iptu", /Propriedade Predial e Territorial Urbana/i],
    ["itbi", /Transmiss[aã]o/i],
    ["irrf", /Renda.*Retido na Fonte/i],
    ["taxas", /^([\d.]+\s+)?Taxas\b/i],
    ["iluminacao", /Ilumina[cç][aã]o P[uú]blica/i],
  ],
};
// O SICONFI devolve o travessão como "¿" ("Sistema Único de Saúde ¿ SUS").
const limpaConta = (s) => s.replace(/^[\d.]+\s+/, "").replace(/\s*¿\s*/g, " – ").replace(/\s+/g, " ").trim();
const significativo = (cod) => cod.split(".").reduce((acc, p, i, arr) => (arr.slice(i).every((x) => /^0+$/.test(x)) ? acc : [...acc, p]), []).join(".");

function classificarAno(linhas) {
  const brutas = linhas.filter((l) => l.coluna === "Receitas Brutas Realizadas").map((l) => ({ ...l, sig: significativo(l.cod) }));
  const total = (prefixos) => brutas.filter((l) => prefixos.includes(l.sig)).reduce((a, l) => a + l.valor, 0);
  // 20% do FPM, do ICMS, do IPVA (e de outras cotas) ficam retidos para formar o FUNDEB e voltam na linha do FUNDEB.
  // A declaração traz essa retenção numa coluna própria; sem descontá-la, a soma União + Estado + FUNDEB conta esse
  // dinheiro duas vezes.
  const retido = new Map(linhas.filter((l) => l.coluna === "Deduções - FUNDEB").map((l) => [significativo(l.cod), l.valor]));
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
    // As contas que formam cada linha, para quem abrir o detalhe: as filhas diretas da conta da categoria (ou ela mesma,
    // quando não tem filhas). Em "outras" entram as contas mais altas que não somam nenhuma categoria nem estão dentro de uma.
    const nivel = (l) => l.sig.split(".").length;
    const filhas = (l) => sob.filter((o) => o.sig.startsWith(l.sig + ".") && nivel(o) === nivel(l) + 1);
    // Contas do grupo 2.4 são transferências de capital (para obras e equipamentos); têm o mesmo nome das correntes.
    const item = (l) => ({ conta: limpaConta(l.conta) + (l.sig.startsWith("2.") ? " (para obras e equipamentos)" : ""), valor: r2(l.valor) });
    const contas = Object.fromEntries(CATEGORIAS[nome].map(([k]) => [k, []]));
    for (const l of topo) contas[l.cat].push(...(filhas(l).length ? filhas(l) : [l]).map(item));
    const livres = sob.filter((l) => !marcadas.some((m) => m.sig === l.sig || m.sig.startsWith(l.sig + ".") || l.sig.startsWith(m.sig + ".")));
    contas.outras = livres.filter((l) => !livres.some((o) => o !== l && l.sig.startsWith(o.sig + "."))).map(item);
    for (const k of Object.keys(contas)) contas[k] = contas[k].filter((c) => c.valor > 0).sort((a, b) => b.valor - a.valor);
    const paraFundeb = Object.fromEntries(CATEGORIAS[nome].map(([k]) => [k, 0]));
    for (const l of topo) paraFundeb[l.cat] += retido.get(l.sig) ?? 0;
    const retidoTotal = prefixos.reduce((a, p) => a + (retido.get(p) ?? 0), 0);
    paraFundeb.outras = Math.max(0, retidoTotal - somaObj(paraFundeb));
    return {
      ...Object.fromEntries(Object.entries(out).map(([k, v]) => [k, r2(v)])),
      total: r2(t),
      contas,
      paraFundeb: Object.fromEntries(Object.entries(paraFundeb).map(([k, v]) => [k, r2(v)])),
      paraFundebTotal: r2(retidoTotal),
    };
  };
  return {
    uniao: esfera("uniao", ["1.7.1", "2.4.1"]),
    estado: esfera("estado", ["1.7.2", "2.4.2"]),
    propria: esfera("propria", ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.9"]),
    // O FUNDEB junta parte dos impostos do Estado e dos municípios (e um complemento da União) e redistribui pelo número
    // de alunos; entra como "outras instituições públicas" no plano de contas.
    fundeb: r2(brutas.filter((l) => /^1\.7\.5(\.|$)/.test(l.sig) && /FUNDEB|Manuten[cç][aã]o e Desenvolvimento da Educa/i.test(l.conta)).reduce((a, l) => Math.max(a, l.valor), 0)),
    contasFundeb: brutas
      .filter((l) => /^1\.7\.5\.\d+/.test(l.sig) && /FUNDEB|Manuten[cç][aã]o e Desenvolvimento da Educa|Complementa/i.test(l.conta) && l.valor > 0)
      .filter((l, _, todas) => !todas.some((o) => o !== l && o.sig.startsWith(l.sig + ".")))
      .map((l) => ({ conta: limpaConta(l.conta), valor: r2(l.valor) }))
      .sort((a, b) => b.valor - a.valor),
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

// Endereço curto de cada autor (/verbas?autor=tabata-amaral).
const slug = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
// Texto oficial em maiúsculas vira frase.
const frase = (s) => (s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s);
// "JILMAR TATTO" -> "Jilmar Tatto".
const nomeLegivel = (s) => (s === s.toUpperCase() ? s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m) => m.toUpperCase()).replace(/ (De|Da|Do|Dos|Das|E) /g, (m) => m.toLowerCase()) : s);

// ---------- Montagem ----------
export function montarDinheiro({ acha, achaEquipamento, achaLugares = () => [], vereadores = [] }) {
  const entradas = ler("entradas.json");
  const emendas = ler("emendas-federais.json");
  const pix = ler("pix-federais.json");
  const pixEst = ler("pix-estaduais.json");
  if (!entradas || !emendas) return null;
  // Bairros citados pelo texto: pelo nome, por uma escola ou unidade de saúde, ou por uma rua, córrego ou lugar (todos os
  // bairros por onde ela passa). Nunca um bairro só quando o texto vale para vários.
  const bairrosDe = (texto) =>
    [...new Set([...acha(texto ?? ""), ...achaEquipamento(texto ?? "").map((e) => e.bairro), ...achaLugares(texto ?? "").flatMap((l) => l.bairros)])];
  const lugaresDe = (texto) => achaLugares(texto ?? "").map((l) => l.nome);
  const porBairro = {};
  // O valor é dividido igualmente entre os bairros citados. O que vale para a cidade toda (sem bairro, rua ou lugar no
  // texto) não entra nas estatísticas dos bairros.
  const noBairro = (bairros, item) => {
    const via = item.texto ? lugaresDe(item.texto) : [];
    for (const b of bairros) {
      const x = (porBairro[b] ??= { valor: 0, itens: [] });
      x.valor = r2(x.valor + item.valor / bairros.length);
      x.itens.push({ ...item, texto: item.texto?.slice(0, 300), outrosBairros: bairros.length - 1, bairros, via: via.length ? via : undefined });
    }
  };

  // Entradas por ano.
  const anosEntradas = Object.entries(entradas.anos).map(([ano, linhas]) => ({ ano: Number(ano), ...classificarAno(linhas) }));

  // Emendas federais, uma a uma, agrupadas por autor. O valor de cada autor é o que a Prefeitura e os fundos municipais
  // receberam; o que foi direto a entidades da cidade aparece na emenda, à parte.
  // Entidade com sede em Osasco que recebeu emenda destinada a outro lugar (Bancada do Rio de Janeiro para eventos
  // esportivos em várias cidades, senadora do DF para o DF) não é dinheiro para Osasco: fica fora da conta, como as
  // empresas. Conta quando a emenda é para Osasco, para o estado de SP, ou para várias cidades com autor de SP.
  const parlamentaresTodos = ler("parlamentares.json")?.parlamentares ?? {};
  const localDe = (r) => emendas.emendas[r.codigo]?.localidade ?? "";
  const deSP = (autor) => parlamentaresTodos[autor]?.uf === "SP" || /^BANCADA DE SAO PAULO|^COM\.|^RELATOR/i.test(autor);
  const paraOsasco = (r) =>
    r.destino !== "entidade" || r.codigo === "Sem informação" || /OSASCO|^S[ÃA]O PAULO \(UF\)/i.test(localDe(r)) || (/M[ÚU]LTIPLO|NACIONAL/i.test(localDe(r)) && deSP(r.autor));
  const rec = emendas.recebimentos.filter(paraOsasco);
  const entidadesFora = emendas.recebimentos.filter((r) => !paraOsasco(r));
  const parlamentares = ler("parlamentares.json")?.parlamentares ?? {};
  const autorDe = new Map(rec.map((r) => [r.codigo, r.autor]));
  // No Transferegov o código da emenda vem com o ano e o autor repetidos ("2020 2520 2020 2520 0003"); na CGU é
  // ano + autor + número ("2020 2520 0003").
  const codigoPix = (c) => (c.length > 12 ? c.slice(0, 4) + c.slice(-8) : c);
  const planos = (pix?.planos ?? []).map((p) => {
    const objetos = p.objetos.filter((o) => o.objeto).map((o) => ({ ...o, bairros: bairrosDe(o.objeto) }));
    return { codigo: codigoPix(p.codigoEmenda), ano: p.ano, parlamentar: p.parlamentar, valor: r2(p.custeio + p.investimento), situacao: p.situacao, area: p.area, planoTrabalho: p.planoTrabalho, objetos };
  });
  const convPorCodigo = {};
  for (const c of emendas.convenios) (convPorCodigo[c.codigo] ??= []).push({ numero: c.numero, data: c.data, objeto: c.objeto, valor: c.valor, bairros: bairrosDe(c.objeto) });

  // Partido do autor quando a emenda foi apresentada: as emendas ao Orçamento de um ano são apresentadas em
  // novembro do ano anterior. A lista de partidos vem em ordem, com a data de entrada em cada um.
  const partidoEm = (perfil, ano) => (perfil ? ([...perfil.partidos].reverse().find((p) => !p.desde || p.desde <= `${ano - 1}-11-30`) ?? perfil.partidos[0])?.sigla ?? perfil.partido : null);
  const tipoEmenda = (t) =>
    /Especiais/i.test(t) ? "pix" : /Finalidade Definida/i.test(t) ? "finalidade" : /Bancada/i.test(t) ? "bancada" : /Comiss/i.test(t) ? "comissao" : /Relator/i.test(t) ? "relator" : "outra";
  const tipoAutor = (nome) =>
    /^RELATOR GERAL/i.test(nome) ? "relator" : /^COM\./i.test(nome) ? "comissao" : /^BANCADA/i.test(nome) ? "bancada" : /^Sem informa/i.test(nome) ? "semAutor" : null;
  const COLETIVA = /^(RELATOR GERAL|COM\.|BANCADA|Sem informa)/i;
  const autores = {};
  const novoAutor = (nome) => {
    const perfil = parlamentares[nome] ?? null;
    return {
      nome,
      coletiva: COLETIVA.test(nome),
      tipo: tipoAutor(nome) ?? (perfil?.casa === "senado" ? "senador" : perfil ? "deputado" : "desconhecido"),
      perfil: perfil && { ...perfil, partidos: perfil.partidos.filter((p) => p.sigla) },
      total: 0,
      totalEntidades: 0,
      porAno: {},
      funcoes: {},
      emendas: {},
    };
  };
  const novaEmenda = (codigo, ano, tipo, perfil) => ({
    codigo,
    ano,
    numero: null,
    tipo,
    partido: partidoEm(perfil, ano),
    funcao: null,
    subfuncao: null,
    programa: null,
    acao: null,
    planoOrcamentario: null,
    localidade: null,
    valorEmenda: null,
    recebido: 0,
    paraEntidades: 0,
    recebimentos: [],
    convenios: (codigo && convPorCodigo[codigo]) || [],
    pix: null,
  });
  for (const r of rec) {
    const a = (autores[r.autor] ??= novoAutor(r.autor));
    // "Sem informação" não é um código: a CGU junta aí emendas sem número, e o detalhe guardado seria de outra emenda.
    const e = r.codigo === "Sem informação" ? {} : (emendas.emendas[r.codigo] ?? {});
    const ano = e.ano ?? Number(r.mes.slice(0, 4));
    // Recebimentos sem código de emenda ("Sem informação") ficam um por linha.
    const semCodigo = r.codigo === "Sem informação";
    const em = (a.emendas[semCodigo ? `${r.mes}-${r.cnpj}` : r.codigo] ??= Object.assign(novaEmenda(semCodigo ? null : r.codigo, ano, tipoEmenda(r.tipo), a.perfil), {
      numero: e.numero && e.numero !== "S/I" ? e.numero : null,
      funcao: e.funcao ?? null,
      subfuncao: e.subfuncao ?? null,
      programa: e.programa ?? null,
      acao: e.acao ?? null,
      planoOrcamentario: e.planoOrcamentario ?? null,
      localidade: e.localidade ?? null,
      valorEmenda: e.empenhado != null ? { empenhado: e.empenhado, pago: e.pago } : null,
    }));
    em.recebimentos.push({ mes: r.mes, favorecido: r.favorecido, cnpj: r.cnpj, entidade: r.destino === "entidade", valor: r.valor });
    if (r.destino === "prefeitura") {
      em.recebido = r2(em.recebido + r.valor);
      a.total += r.valor;
      a.porAno[r.mes.slice(0, 4)] = r2((a.porAno[r.mes.slice(0, 4)] ?? 0) + r.valor);
      if (e.funcao) a.funcoes[e.funcao] = r2((a.funcoes[e.funcao] ?? 0) + r.valor);
    } else {
      em.paraEntidades = r2(em.paraEntidades + r.valor);
      a.totalEntidades += r.valor;
    }
  }
  // Emendas Pix: o plano entra na emenda de mesmo código; as que não chegaram (impedidas, por exemplo) entram assim mesmo.
  const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  for (const p of planos) {
    const nome = autorDe.get(p.codigo) ?? Object.keys(autores).find((n) => semAcento(n) === semAcento(p.parlamentar)) ?? p.parlamentar;
    const a = (autores[nome] ??= novoAutor(nome));
    const em = (a.emendas[p.codigo] ??= Object.assign(novaEmenda(p.codigo, p.ano, "pix", a.perfil), { numero: p.codigo.slice(-4) }));
    em.pix = {
      valor: p.valor,
      situacao: p.situacao,
      area: p.area?.replace(/^\d+-/, "").replace(/ \/ \d+-/, " / ") ?? null,
      planoTrabalho: p.planoTrabalho,
      objetos: p.objetos,
    };
  }
  const listaAutores = Object.values(autores)
    .map((a) => {
      const lista = Object.values(a.emendas)
        .map((e) => ({
          ...e,
          recebimentos: e.recebimentos.sort((x, y) => x.mes.localeCompare(y.mes)),
          bairros: [...new Set([...e.convenios.flatMap((c) => c.bairros), ...(e.pix?.objetos.flatMap((o) => o.bairros) ?? [])])],
        }))
        .sort((x, y) => y.ano - x.ano || y.recebido - x.recebido);
      return {
        nome: a.nome,
        coletiva: a.coletiva,
        tipo: a.tipo,
        perfil: a.perfil,
        total: r2(a.total),
        totalEntidades: r2(a.totalEntidades),
        porAno: a.porAno,
        quantidade: lista.length,
        funcoes: Object.entries(a.funcoes).sort((x, y) => y[1] - x[1]).map(([k]) => k),
        partidosNaEpoca: [...new Set(lista.map((e) => e.partido).filter(Boolean))],
        emendas: lista,
      };
    })
    .sort((a, b) => b.total - a.total || b.totalEntidades - a.totalEntidades);
  // Por partido, na época de cada emenda (só autores individuais; o valor é o que a Prefeitura recebeu).
  const porPartido = {};
  for (const a of listaAutores.filter((x) => !x.coletiva)) for (const e of a.emendas) if (e.partido && e.recebido) porPartido[e.partido] = r2((porPartido[e.partido] ?? 0) + e.recebido);
  const entidades = {};
  for (const r of rec.filter((r) => r.destino === "entidade")) {
    const x = (entidades[r.favorecido] ??= { nome: r.favorecido, cnpj: r.cnpj, total: 0, autores: new Set() });
    x.total += r.valor;
    x.autores.add(r.autor);
  }
  const recebidoPorAno = {};
  for (const r of rec.filter((r) => r.destino === "prefeitura")) recebidoPorAno[r.mes.slice(0, 4)] = r2((recebidoPorAno[r.mes.slice(0, 4)] ?? 0) + r.valor);

  // Convênios gerados por emendas (texto do objeto cita bairro?).
  const convenios = emendas.convenios
    .map((c) => ({ codigo: c.codigo, data: c.data, objeto: c.objeto, valor: c.valor, numero: c.numero, autor: autorDe.get(c.codigo) ?? null, bairros: bairrosDe(c.objeto) }))
    .sort((a, b) => b.data.localeCompare(a.data));
  // No mapa, cada emenda leva o nome legível do autor e a chave da ficha dele na página do dinheiro.
  const quemE = (nome) => {
    const a = listaAutores.find((x) => x.nome === nome);
    return a && !a.coletiva ? { quem: nomeLegivel(a.perfil?.nome ?? a.nome), autor: slug(a.perfil?.nome ?? a.nome) } : { quem: nome ? nomeLegivel(nome) : null, autor: null };
  };
  // O valor de um convênio na CGU pode ser o do programa inteiro (o do Minha Casa Minha Vida de 2011 passa de R$ 1,5 bi):
  // no mapa entra no máximo o que Osasco recebeu pela emenda que gerou o convênio.
  const recebidoPorCodigo = {};
  for (const r of rec) if (r.codigo !== "Sem informação") recebidoPorCodigo[r.codigo] = (recebidoPorCodigo[r.codigo] ?? 0) + r.valor;
  for (const c of convenios) {
    const recebido = recebidoPorCodigo[c.codigo];
    const valor = recebido != null ? Math.min(c.valor, recebido) : c.valor;
    // Sem bairro, rua ou lugar no texto (vale para a cidade toda): fica fora das estatísticas dos bairros.
    if (c.bairros.length) noBairro(c.bairros, { origem: "convenio", ano: Number(c.data.slice(0, 4)), valor: r2(valor), texto: c.objeto, ...quemE(c.autor) });
  }
  // Emenda Pix barrada (impedimento técnico) não trouxe dinheiro: fica fora do mapa.
  for (const p of planos.filter((p) => !/IMPEDIDO/i.test(p.situacao)))
    for (const o of p.objetos) if (o.bairros.length) noBairro(o.bairros, { origem: "pix", ano: p.ano, valor: o.valor, texto: o.objeto, ...quemE(autorDe.get(p.codigo) ?? Object.keys(autores).find((n) => semAcento(n) === semAcento(p.parlamentar)) ?? p.parlamentar) });

  // Gastos pagos com dinheiro federal e estadual, por ano.
  const arquivosGastos = readdirSync(PASTA).filter((f) => /^gastos-\d{4}\.json$/.test(f)).sort();
  const brutosGastos = arquivosGastos.map((f) => JSON.parse(readFileSync(`${PASTA}/${f}`, "utf8")));
  const gastos = brutosGastos.map((g) => {
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
        // Os pagamentos com dinheiro de emenda entram mais abaixo, pela lista completa deles.
        if (grupo === "emendasVereadores" || /^080[01]/.test(i.aplicacao ?? "")) continue;
        const bairros = [...new Set([...i.bairros, ...bairrosDe(i.texto)])].sort();
        const k = `${bairros.join(",")}|${i.fornecedor}|${i.aplicacao}`;
        const j = (juntos[k] ??= { bairros, valor: 0, pagamentos: 0, fornecedor: i.fornecedor, aplicacao: i.aplicacao, texto: i.texto });
        j.valor += i.valor;
        j.pagamentos++;
      }
      for (const j of Object.values(juntos))
        noBairro(j.bairros, { origem: grupo === "federal" ? "gastoFederal" : "gastoEstadual", ano: g.ano, valor: r2(j.valor), texto: j.texto, quem: j.fornecedor, pagamentos: j.pagamentos });
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

  // ---------- Pagamentos feitos com dinheiro de emenda ----------
  // O histórico de muitos pagamentos cita o número da emenda federal ("REFERENTE A EMENDA PARLAMENTAR N 37730001",
  // isto é, autor 3773, emenda 0001). Esses pagamentos entram na própria emenda: é o caminho do parlamentar até a nota.
  const pagamentosBrutos = brutosGastos.flatMap((g) => Object.entries(g.grupos).flatMap(([grupo, x]) => (x.pagamentosEmendas ?? []).map((p) => ({ ...p, ano: g.ano, grupo }))));
  const emendaPorCodigo = new Map();
  for (const a of listaAutores) for (const e of a.emendas) if (e.codigo) emendaPorCodigo.set(e.codigo, e);
  const porFinal = {};
  for (const c of emendaPorCodigo.keys()) (porFinal[c.slice(-8)] ??= []).push(c);
  // Devolve a emenda citada no histórico: o código completo, quando Osasco aparece como recebedora dela na CGU, ou só
  // o autor e o número (os 8 últimos dígitos), quando ela chegou por outro caminho.
  const numeroDaEmenda = (texto, ano) => {
    for (const m of (texto ?? "").matchAll(/EMENDA[^0-9]{0,40}?((?:\d[\s./-]?){8,12})/gi)) {
      const d = m[1].replace(/\D/g, "");
      if (d.length !== 8 && d.length !== 12) continue;
      if (d.length === 12 && emendaPorCodigo.has(d)) return { codigo: d };
      const c = (porFinal[d.slice(-8)] ?? []).filter((x) => Number(x.slice(0, 4)) <= ano).sort().at(-1);
      if (c) return { codigo: c };
      const autor = emendas.autores?.[d.slice(-8, -4)];
      if (autor) return { codigo: null, final: d.slice(-8), ano: d.length === 12 ? Number(d.slice(0, 4)) : null, autor };
    }
    return null;
  };
  // Emenda de vereador: "EMENDA PARLAMENTAR VEREADOR EMERSON PARA ASSOCIACAO ...".
  const vereadorDoTexto = (texto) => texto?.match(/VEREADOR(?:A)?\.?\s+([A-ZÀ-Ü][A-ZÀ-Ü'.]*(?:\s+(?!PARA\b|PRA\b|AO?\b|À\b|NO\b|NA\b|REF|CONF|DESTINAD|EM\b|DE\s+(?:CUSTEIO|INVEST))[A-ZÀ-Ü][A-ZÀ-Ü'.]*){0,3})/)?.[1].trim() ?? null;
  // Compras do mesmo empenho (uma compra ou um contrato) viram uma linha, com o número de pagamentos.
  const juntarPagamentos = (lista) => {
    const g = {};
    for (const p of lista) {
      const k = `${p.ano}|${p.empenho}|${p.cnpj ?? "pf"}`;
      const j = (g[k] ??= { data: p.data, valor: 0, fornecedor: p.fornecedor, cnpj: p.cnpj, modalidade: p.modalidade, texto: p.texto, pagamentos: 0 });
      j.valor = r2(j.valor + p.valor);
      j.pagamentos++;
      if (p.data < j.data) j.data = p.data;
    }
    return Object.values(g).sort((a, b) => b.valor - a.valor);
  };
  // "EMENDA PARLAMENTAR DA DEPUTADA BRUNA FURLAN PARA A JUCO": o nome é procurado entre os autores conhecidos.
  const semAcentoD = (x) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  const deputadoDoTexto = (texto) => {
    const m = texto?.match(/(?:DEPUTAD[OA]|SENADOR[A]?)\s+(?:FEDERAL\s+|ESTADUAL\s+)?([A-Z][A-Z ]{3,40})/);
    if (!m) return null;
    const t = semAcentoD(m[1]);
    return listaAutores.find((a) => !a.coletiva && [a.nome, a.perfil?.nome ?? ""].some((n) => n && t.startsWith(semAcentoD(n))))?.nome ?? null;
  };
  const ligados = {};
  const semRegistro = {};
  const deVereador = {};
  for (const p of pagamentosBrutos) {
    const achada = numeroDaEmenda(p.texto, p.ano);
    p.codigo = achada?.codigo ?? achada?.final ?? null;
    const deputado = achada ? null : deputadoDoTexto(p.texto);
    if (achada?.codigo) (ligados[achada.codigo] ??= []).push(p);
    else if (achada) (semRegistro[achada.final] ??= { ...achada, pagamentos: [] }).pagamentos.push(p);
    else if (deputado) (semRegistro[`${deputado}|${p.ano}`] ??= { codigo: null, final: null, ano: null, autor: deputado, pagamentos: [] }).pagamentos.push(p);
    else if (vereadorDoTexto(p.texto)) (deVereador[vereadorDoTexto(p.texto)] ??= []).push(p);
    p.identificada = Boolean(achada || deputado || vereadorDoTexto(p.texto));
  }
  for (const [codigo, lista] of Object.entries(ligados)) {
    const e = emendaPorCodigo.get(codigo);
    e.pagamentos = juntarPagamentos(lista);
    e.pagoNasNotas = r2(lista.reduce((s, p) => s + p.valor, 0));
  }
  // Emendas que a Prefeitura diz ter usado, mas que não aparecem como recebidas por Osasco na CGU: entram no autor,
  // marcadas, com o ano do primeiro pagamento quando o histórico não traz o ano da emenda.
  for (const s of Object.values(semRegistro)) {
    let a = listaAutores.find((x) => x.nome === s.autor);
    if (!a) {
      const perfil = ler("parlamentares.json")?.parlamentares?.[s.autor] ?? null;
      a = {
        nome: s.autor,
        coletiva: COLETIVA.test(s.autor),
        tipo: tipoAutor(s.autor) ?? (perfil?.casa === "senado" ? "senador" : perfil ? "deputado" : "desconhecido"),
        perfil: perfil && { ...perfil, partidos: perfil.partidos.filter((p) => p.sigla) },
        total: 0,
        totalEntidades: 0,
        porAno: {},
        quantidade: 0,
        funcoes: [],
        partidosNaEpoca: [],
        emendas: [],
      };
      listaAutores.push(a);
    }
    const ano = s.ano ?? Math.min(...s.pagamentos.map((p) => p.ano));
    a.emendas.push({
      ...novaEmenda(s.ano && s.final ? `${s.ano}${s.final}` : null, ano, "outra", a.perfil),
      numero: s.final?.slice(-4) ?? null,
      semRegistro: true,
      bairros: [],
      pagamentos: juntarPagamentos(s.pagamentos),
      pagoNasNotas: r2(s.pagamentos.reduce((t, p) => t + p.valor, 0)),
    });
    a.quantidade = a.emendas.length;
  }
  for (const a of listaAutores) for (const e of a.emendas) if (!e.pagamentos) Object.assign(e, { pagamentos: [], pagoNasNotas: 0 });

  // Vereadores de Osasco: cada entidade ou fornecedor que recebeu a emenda de um vereador num ano vira uma "emenda".
  const semAcentoV = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  const listaVereadores = Object.entries(deVereador)
    .map(([nome, lista]) => {
      // Nome igual; ou só o primeiro nome ("VEREADOR EMERSON"); ou primeiro e último iguais ("DELBIO CAMARGO TERUEL" = "Délbio Teruel").
      const pal = (x) => semAcentoV(x).split(" ");
      const n = pal(nome);
      const v =
        vereadores.find((x) => semAcentoV(x.nome) === semAcentoV(nome)) ??
        vereadores.find((x) => pal(x.nome)[0] === n[0] && (n.length === 1 || pal(x.nome).at(-1) === n.at(-1)));
      const grupos = {};
      for (const p of lista) (grupos[`${p.ano}|${p.cnpj ?? p.fornecedor}`] ??= []).push(p);
      const emendasV = Object.values(grupos)
        .map((ps) => ({
          codigo: null,
          ano: ps[0].ano,
          numero: null,
          tipo: "vereador",
          partido: v?.partido ?? null,
          funcao: ps[0].funcao ? frase(ps[0].funcao) : null,
          subfuncao: null,
          programa: null,
          acao: ps[0].acao ?? null,
          planoOrcamentario: null,
          localidade: null,
          valorEmenda: null,
          recebido: r2(ps.reduce((s, p) => s + p.valor, 0)),
          paraEntidades: 0,
          recebimentos: [],
          convenios: [],
          pix: null,
          bairros: [],
          pagamentos: juntarPagamentos(ps),
          pagoNasNotas: r2(ps.reduce((s, p) => s + p.valor, 0)),
        }))
        .sort((a, b) => b.ano - a.ano || b.recebido - a.recebido);
      const porAno = {};
      for (const p of lista) porAno[p.ano] = r2((porAno[p.ano] ?? 0) + p.valor);
      return {
        chave: `vereador-${slug(nome)}`,
        nome: v?.nome ?? frase(nome).replace(/(^|\s)(\p{L})/gu, (m) => m.toUpperCase()),
        coletiva: false,
        tipo: "vereador",
        perfil: null,
        vereador: v ? { id: v.id, partido: v.partido, foto: v.foto } : null,
        total: r2(lista.reduce((s, p) => s + p.valor, 0)),
        totalEntidades: 0,
        porAno,
        quantidade: emendasV.length,
        funcoes: [...new Set(emendasV.map((e) => e.funcao).filter(Boolean))],
        partidosNaEpoca: v?.partido ? [v.partido] : [],
        emendas: emendasV,
      };
    })
    .sort((a, b) => b.total - a.total);

  // ---------- Ano em andamento (relatório bimestral) ----------
  // Soma os meses do ano em andamento e os mesmos meses do ano anterior, para comparar.
  const rreo = ler("rreo.json");
  const tu = ler("transferencias-uniao.json");
  const mesesUniao = tu?.meses ?? {};
  let parcial = null;
  const anoParcial = Math.max(...Object.keys(rreo?.anos ?? {}).map(Number));
  const rp = rreo?.anos?.[anoParcial];
  if (rp && rp.periodo < 6 && rp.anoAnterior) {
    const idx = rp.meses.map((m, i) => [m, i]).filter(([m]) => m.startsWith(String(anoParcial))).map(([, i]) => i);
    const soma = (bloco, cod) => (bloco.linhas[cod] ? r2(idx.reduce((t, i) => t + (bloco.linhas[cod].meses[i] ?? 0), 0)) : null);
    const LINHAS = [
      ["propria", "iss", "ISS", "ISSLiquidoExcetoTransferenciasEFUNDEB"],
      ["propria", "iptu", "IPTU", "IPTULiquidoExcetoTransferenciasEFUNDEB"],
      ["propria", "itbi", "ITBI", "ITBILiquidoExcetoTransferenciasEFUNDEB"],
      ["propria", "irrf", "Imposto de Renda retido na fonte", "IRRFLiquidoExcetoTransferenciasEFUNDEB"],
      ["propria", "outrosTributos", "Taxas e outros tributos", "OutrasReceitasTributarias"],
      ["estado", "icms", "ICMS", "RREO3CotaParteDoICMS"],
      ["estado", "ipva", "IPVA", "RREO3CotaParteDoIPVA"],
      ["uniao", "fpm", "FPM", "RREO3CotaParteDoFPM"],
      ["fundeb", "fundeb", "FUNDEB", "RREO3TransferenciasDoFUNDEB"],
      ["outras", "outrasTransf", "Outros repasses da União e do Estado (SUS, educação, convênios...)", "RREO3OutrasTransferenciasCorrentes"],
      ["retencao", "retencao", "Retido do FPM, ICMS e IPVA para o FUNDEB", "DeducaoDeReceitaParaFormacaoDoFUNDEB"],
    ];
    const ultimo = rp.meses[idx.at(-1)];
    // Detalhe federal do mesmo período, pelo arquivo da CGU (se os meses já saíram).
    const mesesCgu = (ano) => idx.map((i) => `${ano}${rp.meses[i].slice(5, 7)}`);
    const cgu = (ano, cat) => {
      const ms = mesesCgu(ano);
      return ms.every((m) => mesesUniao[m]) ? r2(ms.reduce((t, m) => t + (mesesUniao[m].prefeitura[cat] ?? 0), 0)) : null;
    };
    parcial = {
      ano: anoParcial,
      ateMes: Number(ultimo.slice(5, 7)),
      linhas: LINHAS.map(([grupo, chave, nome, cod]) => ({
        grupo,
        chave,
        nome,
        atual: soma(rp, cod),
        anterior: soma(rp.anoAnterior, cod),
        previsao: rp.linhas[cod]?.previsao ?? null,
      })).filter((l) => l.atual != null),
      uniao: ["sus", "educacao", "assistencia", "especiais"]
        .map((cat) => ({ chave: cat, atual: cgu(anoParcial, cat), anterior: cgu(anoParcial - 1, cat) }))
        .filter((x) => x.atual != null),
      fonte: { nome: rreo.fonte, url: rreo.url },
    };
  }

  // ---------- Conferência dos números ----------
  // Cada valor da página é comparado com outra fonte: o relatório bimestral (a mesma Prefeitura, outro relatório) e o
  // arquivo de transferências do governo federal (fonte independente). Diferença de até 0,1% conta como igual; até 3%,
  // como próxima (datas de lançamento, restituições); acima disso, como diferente, com a explicação quando ela é conhecida.
  const anosFechados = anosEntradas.filter((e) => rreo?.anos?.[e.ano]?.periodo === 6);
  const rreoTotal = (ano, cod) => rreo?.anos?.[ano]?.linhas?.[cod]?.total ?? null;
  const cguAno = (ano, cat) => {
    const ms = Object.entries(mesesUniao).filter(([m]) => m.startsWith(String(ano)));
    return ms.length === 12 ? r2(ms.reduce((t, [, x]) => t + (x.prefeitura[cat] ?? 0), 0)) : null;
  };
  const situacao = (a, b) => {
    const d = Math.abs(b - a) / Math.max(Math.abs(a), 1);
    return d <= 0.001 ? "igual" : d <= 0.03 ? "proximo" : "diferente";
  };
  // notasAno: explicação de uma diferença num ano específico, quando ela foi conferida numa terceira fonte.
  const conferencia = (chave, nome, fonteA, fonteB, nota, par, notasAno = {}) => {
    const anos = anosFechados
      .map((e) => {
        const [a, b] = par(e);
        return a == null || b == null || (!a && !b) ? null : { ano: e.ano, a: r2(a), b: r2(b), situacao: situacao(a, b), nota: notasAno[e.ano] ?? null };
      })
      .filter(Boolean);
    return anos.length ? { chave, nome, fonteA, fonteB, nota, anos } : null;
  };
  const sefaz = ler("repasses-estado.json");
  const estadoAno = (ano, campo) => {
    const ms = Object.values(sefaz?.anos?.[ano] ?? {});
    return ms.length === 12 ? r2(ms.reduce((t, m) => t + m[campo], 0)) : null;
  };
  const DCA = "Declaração anual (SICONFI)";
  const SEFAZ = "Repasses do Estado (Secretaria da Fazenda de SP)";
  const RREO = "Relatório bimestral (RREO)";
  const CGU = "Transferências do governo federal (CGU)";
  const EMENDAS = "Emendas recebidas (CGU)";
  const recebidoTipo = (ano, re) => rec.filter((r) => r.destino === "prefeitura" && r.mes.startsWith(String(ano)) && re.test(r.tipo)).reduce((t, r) => t + r.valor, 0);
  const conferencias = [
    conferencia("fpm", "FPM bruto", DCA, RREO, null, (e) => [e.uniao.fpm, rreoTotal(e.ano, "RREO3CotaParteDoFPM")], {
      2018: "O relatório bimestral deixou fora da linha do FPM as cotas extras de 1% (julho e dezembro), que a declaração anual inclui.",
      2019: "O relatório bimestral deixou fora da linha do FPM parte das cotas extras de 1% (julho e dezembro), que a declaração anual inclui.",
    }),
    conferencia("icms", "ICMS bruto", DCA, RREO, null, (e) => [e.estado.icms, rreoTotal(e.ano, "RREO3CotaParteDoICMS")], {
      2019: "Os repasses do Estado confirmam o valor da declaração anual (R$ 421,2 mi); o relatório bimestral de 2019 da Prefeitura ficou abaixo.",
    }),
    conferencia("ipva", "IPVA bruto", DCA, RREO, null, (e) => [e.estado.ipva, rreoTotal(e.ano, "RREO3CotaParteDoIPVA")], {
      2019: "Os repasses do Estado confirmam o valor da declaração anual (R$ 117,9 mi); o relatório bimestral de 2019 da Prefeitura ficou abaixo.",
    }),
    conferencia(
      "icmsEstado",
      "ICMS bruto",
      DCA,
      SEFAZ,
      "O Estado publica o ICMS já sem os 20% do FUNDEB; aqui o valor do Estado foi dividido por 0,8. Em 2023 o Estado também pagou às cidades uma compensação por perdas de ICMS (Lei Complementar 201/2023), uma explicação possível para a diferença daquele ano.",
      (e) => [e.estado.icms, estadoAno(e.ano, "icmsLiquido") && estadoAno(e.ano, "icmsLiquido") / 0.8],
    ),
    conferencia("ipvaEstado", "IPVA bruto", DCA, SEFAZ, "Repasses do fim de dezembro podem cair em janeiro do ano seguinte.", (e) => [e.estado.ipva, estadoAno(e.ano, "ipva")]),
    conferencia("fundeb", "FUNDEB recebido", DCA, RREO, null, (e) => [e.fundeb, rreoTotal(e.ano, "RREO3TransferenciasDoFUNDEB")]),
    conferencia("retencao", "Retido para o FUNDEB", DCA, RREO, null, (e) => [e.uniao.paraFundebTotal + e.estado.paraFundebTotal, rreoTotal(e.ano, "DeducaoDeReceitaParaFormacaoDoFUNDEB")]),
    conferencia("iss", "ISS", DCA, RREO, "O relatório bimestral desconta restituições, por isso pode ficar um pouco abaixo.", (e) => [e.propria.iss, rreoTotal(e.ano, "ISSLiquidoExcetoTransferenciasEFUNDEB")]),
    conferencia("iptu", "IPTU", DCA, RREO, "O relatório bimestral desconta restituições, por isso pode ficar um pouco abaixo.", (e) => [e.propria.iptu, rreoTotal(e.ano, "IPTULiquidoExcetoTransferenciasEFUNDEB")]),
    conferencia("itbi", "ITBI", DCA, RREO, null, (e) => [e.propria.itbi, rreoTotal(e.ano, "ITBILiquidoExcetoTransferenciasEFUNDEB")]),
    conferencia(
      "fpmUniao",
      "FPM que chegou livre",
      DCA,
      CGU,
      "O governo federal registra o FPM já sem a parte do FUNDEB. Em alguns anos as cotas extras de julho e dezembro aparecem em outra linha do arquivo federal.",
      (e) => [e.uniao.fpm - (e.uniao.paraFundeb?.fpm ?? 0), cguAno(e.ano, "fpm")],
      { 2025: "No arquivo federal de 2025 a linha do FPM não traz as cotas extras de 1% de julho e dezembro (R$ 17,3 mi); sem elas, os valores são iguais." },
    ),
    conferencia("susUniao", "Saúde (SUS) da União", DCA, CGU, "Diferenças pequenas vêm de repasses lançados em meses diferentes e de rendimentos das contas da saúde.", (e) => [e.uniao.sus, cguAno(e.ano, "sus")]),
    conferencia("educacaoUniao", "Educação da União (salário-educação, merenda e outros)", DCA, CGU, "Valores menores, em que o mês de lançamento e os rendimentos das contas pesam mais na diferença.", (e) => [e.uniao.educacao, cguAno(e.ano, "educacao")]),
    conferencia("assistenciaUniao", "Assistência social da União", DCA, CGU, "Valores pequenos (cerca de R$ 6 mi por ano), em que o mês de lançamento pesa mais na diferença.", (e) => [e.uniao.assistencia, cguAno(e.ano, "assistencia")]),
    conferencia("pix", "Emendas Pix", EMENDAS, CGU, "As duas listas são do governo federal; a data de cada registro pode cair em meses diferentes.", (e) => [recebidoTipo(e.ano, /Especiais/i), cguAno(e.ano, "especiais")]),
    conferencia(
      "emendasIndividuais",
      "Emendas individuais recebidas",
      EMENDAS,
      RREO,
      "Em 2024 a Prefeitura declarou R$ 49,5 mi em emendas individuais (e R$ 28,7 mi de bancada), mas a lista da CGU por recebedor só identifica R$ 21,4 mi: o restante chegou ao Fundo Municipal de Saúde como “incremento temporário” sem o autor na lista. Por isso 2024 aparece com menos emendas do que houve.",
      (e) => [recebidoTipo(e.ano, /Individual/i), rreoTotal(e.ano, "RREO3TransferenciasObrigatoriasDaUniaoRelativasAsEmendasIndividuais")],
    ),
  ].filter(Boolean);

  // ---------- Integridade ----------
  const sancoes = ler("sancoes.json");
  const mesesPorCnpj = {};
  const nomePorCnpj = {};
  for (const g of brutosGastos)
    for (const x of Object.values(g.grupos))
      for (const [c, f] of Object.entries(x.todosCnpjs ?? {})) {
        nomePorCnpj[c] ??= f.nome;
        for (const [m, v] of Object.entries(f.meses ?? {})) (mesesPorCnpj[c] ??= {})[m] = r2((mesesPorCnpj[c]?.[m] ?? 0) + v);
      }
  for (const r of rec) {
    nomePorCnpj[r.cnpj] ??= r.favorecido;
    (mesesPorCnpj[r.cnpj] ??= {})[r.mes] = r2((mesesPorCnpj[r.cnpj][r.mes] ?? 0) + r.valor);
  }
  const deEmendaPorCnpj = {};
  for (const p of pagamentosBrutos) if (p.cnpj) deEmendaPorCnpj[p.cnpj] = r2((deEmendaPorCnpj[p.cnpj] ?? 0) + p.valor);
  // Uma punição que proíbe contratar vale para Osasco quando abrange todos os governos, quando é declaração de
  // inidoneidade ou quando foi aplicada pela própria Prefeitura de Osasco. Multas não proíbem contratar.
  const proibe = (s) => /Impedimento|Suspens|Inidoneidade|Proibi/i.test(s.categoria) && s.lista !== "CEPIM";
  const valeAqui = (s) => proibe(s) && (/Todas as Esferas/i.test(s.abrangencia ?? "") || /Inidoneidade/i.test(s.categoria) || /OSASCO/i.test(s.orgao));
  const punidos = {};
  for (const s of sancoes?.achados ?? []) {
    const meses = mesesPorCnpj[s.cnpj] ?? {};
    const ini = s.inicio?.slice(0, 7) ?? "0000-00";
    const fim = s.fim?.slice(0, 7) ?? "9999-99";
    const p = (punidos[s.cnpj] ??= {
      cnpj: s.cnpj,
      nome: nomePorCnpj[s.cnpj] ?? s.nome,
      recebeu: r2(Object.values(meses).reduce((a, v) => a + v, 0)),
      anos: [...new Set(Object.keys(meses).map((m) => m.slice(0, 4)))].sort(),
      deEmenda: deEmendaPorCnpj[s.cnpj] ?? 0,
      punicoes: [],
    });
    const chave = `${s.lista}|${s.categoria}|${s.inicio}|${s.orgao}`;
    if (p.punicoes.some((x) => `${x.lista}|${x.categoria}|${x.inicio}|${x.orgao}` === chave)) continue;
    p.punicoes.push({
      lista: s.lista,
      categoria: s.categoria,
      inicio: s.inicio,
      fim: s.fim,
      orgao: s.orgao,
      abrangencia: s.abrangencia,
      valeParaOsasco: valeAqui(s),
      outraUnidade: s.cnpj !== s.cnpjPunido,
      pagoDurante: s.inicio ? r2(Object.entries(meses).filter(([m]) => m >= ini && m <= fim).reduce((a, [, v]) => a + v, 0)) : 0,
    });
  }
  const listaPunidos = Object.values(punidos)
    .map((p) => ({ ...p, punicoes: p.punicoes.sort((a, b) => Number(b.valeParaOsasco) - Number(a.valeParaOsasco) || b.pagoDurante - a.pagoDurante) }))
    .sort((a, b) => {
      const peso = (x) => Math.max(...x.punicoes.map((s) => (s.valeParaOsasco && s.pagoDurante > 0 ? 2 : s.valeParaOsasco ? 1 : 0)));
      return peso(b) - peso(a) || b.recebeu - a.recebeu;
    });

  // Forma de contratação: licitação, dispensa, inexigibilidade ou pagamento que não passa por contratação (salários,
  // repasses a entidades). Compras pela Bolsa Eletrônica de Compras do Estado contam como licitação.
  const classe = (m) =>
    /DISPENSA/i.test(m) ? "dispensa" : /INEXIG|CREDENCIAMENTO/i.test(m) ? "inexigivel" : /PREG|CONCORR|TOMADA|CONVITE|CONCURSO|LEIL|RDC|BEC/i.test(m) ? "licitacao" : "semContratacao";
  const vazio = () => ({ licitacao: 0, dispensa: 0, inexigivel: 0, semContratacao: 0, total: 0 });
  const somaM = (o, m, v) => {
    o[classe(m)] = r2(o[classe(m)] + v);
    o.total = r2(o.total + v);
  };
  const modalidades = brutosGastos
    .filter((g) => Object.values(g.grupos).some((x) => x.modalidades))
    .map((g) => {
      const todos = vazio();
      for (const x of Object.values(g.grupos)) for (const [m, v] of Object.entries(x.modalidades ?? {})) somaM(todos, m, v);
      const emendasM = vazio();
      for (const p of pagamentosBrutos.filter((p) => p.ano === g.ano)) somaM(emendasM, p.modalidade, p.valor);
      return { ano: g.ano, emendas: emendasM, todos };
    });
  const dispensas = {};
  for (const p of pagamentosBrutos.filter((p) => p.cnpj && ["dispensa", "inexigivel"].includes(classe(p.modalidade)))) {
    const d = (dispensas[p.cnpj] ??= { fornecedor: p.fornecedor, valor: 0, anos: new Set(), modalidade: classe(p.modalidade) === "dispensa" ? "dispensa de licitação" : "inexigibilidade" });
    d.valor = r2(d.valor + p.valor);
    d.anos.add(p.ano);
  }

  const relator = listaAutores.find((a) => a.tipo === "relator");
  const hoje = new Date().toISOString().slice(0, 10);
  const concentracao = brutosGastos
    .map((g) => {
      const ps = pagamentosBrutos.filter((p) => p.ano === g.ano);
      const total = ps.reduce((s, p) => s + p.valor, 0);
      const porF = {};
      for (const p of ps.filter((p) => p.cnpj)) porF[p.fornecedor] = (porF[p.fornecedor] ?? 0) + p.valor;
      const [fornecedor, valor] = Object.entries(porF).sort((a, b) => b[1] - a[1])[0] ?? [];
      return fornecedor && total >= 1e6 ? { ano: g.ano, total: r2(total), fornecedor, valor: r2(valor) } : null;
    })
    .filter(Boolean);
  const rastreio = brutosGastos
    .map((g) => {
      const ps = pagamentosBrutos.filter((p) => p.ano === g.ano);
      return { ano: g.ano, total: r2(ps.reduce((s, p) => s + p.valor, 0)), comNumero: r2(ps.filter((p) => p.identificada).reduce((s, p) => s + p.valor, 0)) };
    })
    .filter((x) => x.total > 0);
  const recebeuVereador = {};
  for (const v of listaVereadores) for (const e of v.emendas) for (const p of e.pagamentos) if (p.cnpj) (recebeuVereador[p.cnpj] ??= { valor: 0, nomes: new Set() }), (recebeuVereador[p.cnpj].valor += p.valor), recebeuVereador[p.cnpj].nomes.add(v.nome);
  const entidadesVariasFontes = Object.values(entidades)
    .filter((e) => recebeuVereador[e.cnpj])
    .map((e) => ({ nome: e.nome, federal: r2(e.total), vereadores: r2(recebeuVereador[e.cnpj].valor), autores: [...[...e.autores].map((n) => nomeLegivel(n)), ...recebeuVereador[e.cnpj].nomes] }));

  const integridade = {
    conferidos: sancoes?.conferidos ?? 0,
    listas: sancoes?.arquivos ?? {},
    fonteListas: { nome: sancoes?.fonte ?? "Portal da Transparência (CGU)", url: sancoes?.url ?? "https://portaldatransparencia.gov.br/sancoes" },
    punidos: listaPunidos,
    modalidades,
    dispensasEmendas: Object.values(dispensas)
      .map((d) => ({ ...d, anos: [...d.anos].sort() }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10),
    relator: { total: relator?.total ?? 0, quantidade: relator?.quantidade ?? 0, anos: Object.keys(relator?.porAno ?? {}).map(Number).sort() },
    pix: {
      impedidos: planos.filter((p) => /IMPEDIDO/i.test(p.situacao)).map((p) => ({ autor: p.parlamentar, ano: p.ano, valor: p.valor })),
      atrasados: planos
        .filter((p) => p.planoTrabalho?.fim && p.planoTrabalho.fim < hoje && !/CONCLUIDO/i.test(p.planoTrabalho.situacao))
        .map((p) => ({ autor: p.parlamentar, ano: p.ano, valor: p.valor, fim: p.planoTrabalho.fim, situacao: p.planoTrabalho.situacao })),
      semObjeto: planos.filter((p) => !/IMPEDIDO/i.test(p.situacao) && !p.objetos.length).length,
    },
    atrasadas: listaAutores
      .flatMap((a) =>
        a.emendas
          .filter((e) => e.codigo && e.recebido > 0)
          .map((e) => ({ autor: nomeLegivel(a.perfil?.nome ?? a.nome), codigo: e.codigo, ano: e.ano, anosRecebido: [...new Set(e.recebimentos.filter((r) => !r.entidade).map((r) => Number(r.mes.slice(0, 4))))].sort(), valor: e.recebido })),
      )
      .filter((x) => Math.max(...x.anosRecebido) - x.ano >= 3)
      .sort((a, b) => b.valor - a.valor),
    concentracao,
    rastreio,
    entidadesVariasFontes,
  };

  // Compras pagas com dinheiro de emenda cujo histórico cita bairro, escola, unidade de saúde, rua, córrego ou lugar.
  {
    const juntos = {};
    for (const p of pagamentosBrutos.filter((p) => p.texto)) {
      const bairros = bairrosDe(p.texto).sort();
      if (!bairros.length) continue;
      const k = `${p.ano}|${bairros.join(",")}|${p.cnpj}|${p.empenho}`;
      const j = (juntos[k] ??= { ano: p.ano, bairros, valor: 0, pagamentos: 0, fornecedor: p.fornecedor, texto: p.texto });
      j.valor += p.valor;
      j.pagamentos++;
    }
    for (const j of Object.values(juntos)) noBairro(j.bairros, { origem: "gastoEmenda", ano: j.ano, valor: r2(j.valor), texto: j.texto, quem: j.fornecedor, pagamentos: j.pagamentos });
  }

  // No mapa vão os 15 itens de maior valor de cada bairro (a soma do bairro conta todos).
  const GRUPO = { pix: "emendas", convenio: "emendas", gastoEmenda: "emendas", gastoFederal: "federal", gastoEstadual: "estadual", gastoVereadores: "vereadores" };
  for (const b of Object.values(porBairro)) {
    b.quantidade = b.itens.length;
    // Soma de cada grupo com todos os itens (inclusive os que ficam fora dos 15), já dividida entre os bairros citados.
    b.porGrupo = {};
    for (const i of b.itens) b.porGrupo[GRUPO[i.origem]] = r2((b.porGrupo[GRUPO[i.origem]] ?? 0) + i.valor / (i.outrosBairros + 1));
    // Pela parte de cada bairro (um pagamento que cita 17 bairros vale 1/17 aqui).
    b.itens = b.itens.sort((a, c) => c.valor / (c.outrosBairros + 1) - a.valor / (a.outrosBairros + 1)).slice(0, 15);
  }
  const parl = ler("parlamentares.json");

  return {
    pagina: {
      fontes: {
        entradas: { nome: entradas.fonte, url: "https://siconfi.tesouro.gov.br/siconfi/pages/public/consulta_finbra/finbra_list.jsf", coletadoEm: entradas.coletadoEm },
        emendas: { nome: emendas.fonte, url: emendas.url, coletadoEm: emendas.coletadoEm },
        pix: pix && { nome: pix.fonte, url: pix.url, coletadoEm: pix.coletadoEm },
        pixEstaduais: pixEst && { nome: pixEst.fonte, url: pixEst.url, posicao: pixEst.posicao },
        gastos: { nome: "TCE-SP, despesas dos municípios (Audesp)", url: "https://transparencia.tce.sp.gov.br/conjunto-de-dados" },
        parlamentares: parl && { nome: parl.fonte, url: parl.url, coletadoEm: parl.coletadoEm },
      },
      entradas: anosEntradas,
      emendas: {
        recebidoPorAno,
        autores: listaAutores.map((a) => ({ chave: slug(a.perfil?.nome ?? a.nome), vereador: null, ...a })),
        porPartido: Object.entries(porPartido)
          .map(([sigla, valor]) => ({ sigla, valor, autores: listaAutores.filter((a) => !a.coletiva && a.emendas.some((e) => e.partido === sigla && e.recebido)).length }))
          .sort((a, b) => b.valor - a.valor),
        entidades: Object.values(entidades).map((e) => ({ nome: e.nome, total: r2(e.total), autores: [...e.autores] })).sort((a, b) => b.total - a.total),
        empresasForaDaConta: emendas.empresasForaDaConta,
        entidadesForaDaConta: entidadesFora.map((r) => ({
          entidade: r.favorecido,
          autor: nomeLegivel(parlamentaresTodos[r.autor]?.nome ?? r.autor),
          destino: nomeLegivel(localDe(r).replace(/\s*\(UF\)/, "")) || null,
          ano: Number(r.codigo.slice(0, 4)) || null,
          valor: r.valor,
        })),
      },
      vereadores: listaVereadores,
      pixEstaduais: pixEst?.repasses ?? [],
      convenios,
      gastos,
      integridade,
      parcial,
      conferencias,
      fontesConferencia: {
        rreo: rreo && { nome: rreo.fonte, url: rreo.url },
        uniao: tu && { nome: tu.fonte, url: tu.url },
        estado: sefaz && { nome: sefaz.fonte, url: sefaz.url },
      },
    },
    porBairro,
  };
}
