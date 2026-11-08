// Junta o que veio de coletar-cidade, coletar-contratos e coletar-campanhas nos arquivos que o site lê.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { obrasFederais } from "./obras.mjs";
import { temaDoContrato } from "./temas-contrato.mjs";

const ler = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
const r2 = (v) => Math.round(v * 100) / 100;
const dobra = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const SETORES = {
  A: "Agropecuária",
  B: "Indústrias extrativas",
  C: "Indústria",
  D: "Eletricidade e gás",
  E: "Água, esgoto e resíduos",
  F: "Construção",
  G: "Comércio",
  H: "Transporte e armazenagem",
  I: "Alojamento e alimentação",
  J: "Informação e comunicação",
  K: "Finanças e seguros",
  L: "Atividades imobiliárias",
  M: "Atividades profissionais e técnicas",
  N: "Serviços administrativos",
  O: "Administração pública",
  P: "Educação",
  Q: "Saúde e assistência social",
  R: "Artes, cultura e esporte",
  S: "Outros serviços",
  T: "Serviços domésticos",
  U: "Organismos internacionais",
};

const MODOS = { PEDESTRE: "A pé", BICICLETA: "Bicicleta", MOTOCICLETA: "Moto", AUTOMOVEL: "Carro", ONIBUS: "Ônibus", CAMINHAO: "Caminhão", "NAO DISPONIVEL": "Não informado" };

function empregos(e) {
  if (!e) return null;
  const meses = Object.keys(e.meses).sort();
  const porAno = {};
  for (const m of meses) {
    const a = (porAno[m.slice(0, 4)] ??= { admissoes: 0, desligamentos: 0, meses: 0 });
    a.admissoes += e.meses[m].admissoes;
    a.desligamentos += e.meses[m].desligamentos;
    a.meses++;
  }
  const doze = meses.slice(-12);
  const setores = {};
  for (const m of doze) for (const [k, s] of Object.entries(e.meses[m].setores)) setores[SETORES[k] ?? "Não informado"] = (setores[SETORES[k] ?? "Não informado"] ?? 0) + s;
  return {
    fonte: e.fonte,
    url: e.url,
    ultimoMes: meses.at(-1),
    porAno: Object.entries(porAno).map(([ano, a]) => ({ ano: Number(ano), ...a, saldo: a.admissoes - a.desligamentos })),
    saldo12: doze.reduce((s, m) => s + e.meses[m].admissoes - e.meses[m].desligamentos, 0),
    setores12: Object.entries(setores)
      .map(([nome, saldo]) => ({ nome, saldo }))
      .sort((a, b) => b.saldo - a.saldo),
  };
}

function transito(t) {
  if (!t) return null;
  return {
    fonte: t.fonte,
    url: t.url,
    porAno: Object.entries(t.porAno).map(([ano, v]) => ({ ano: Number(ano), ...v })),
    mortesPorModo: Object.entries(t.mortesPorModo).map(([ano, m]) => ({ ano: Number(ano), modos: Object.fromEntries(Object.entries(m).map(([k, n]) => [MODOS[k] ?? "Outros", n])) })),
    ruas: t.ruas,
    ruasDesde: t.ruasDesde,
    semLocal: t.semLocal,
  };
}

// Um resumo por órgão (Prefeitura e Câmara), cada um com seus anos e suas empresas.
function resumoContratos(c, nomesBairros) {
  if (!c) return null;
  // Coletas antigas guardavam as pessoas físicas só por ano, todas da Prefeitura.
  const pf = Object.keys(c.pessoasFisicas ?? {}).every((k) => /^\d{4}$/.test(k)) ? { prefeitura: c.pessoasFisicas ?? {} } : c.pessoasFisicas;
  const orgaos = {};
  for (const orgao of [...new Set(c.contratos.map((x) => x.orgao))]) orgaos[orgao] = resumoOrgao(c.contratos.filter((x) => x.orgao === orgao), pf[orgao] ?? {}, c.coletadoEm, nomesBairros);
  return { fonte: c.fonte, url: c.url, coletadoEm: c.coletadoEm, orgaos };
}

// Em vigor: contratos cujo prazo final não passou na data da coleta.
// Tema e bairros já vêm em cada contrato (ver montarCidade). No bairro, o contrato que cita vários bairros entra com o
// valor dividido igualmente entre eles; o que não cita bairro nenhum fica fora dessa conta.
function resumoOrgao(contratos, pessoasFisicas, coletadoEm, nomesBairros = {}) {
  const porAno = {};
  const porTema = {};
  const porBairro = {};
  const porCategoria = {};
  const fornecedores = {};
  const vigentes = { quantidade: 0, valor: 0 };
  for (const x of contratos) {
    const k = (porCategoria[x.categoria ?? "Não informado"] ??= { categoria: x.categoria ?? "Não informado", quantidade: 0, valor: 0 });
    k.quantidade++;
    k.valor += x.valor ?? 0;
    const t = (porTema[x.tema] ??= { tema: x.tema, quantidade: 0, valor: 0 });
    t.quantidade++;
    t.valor += x.valor ?? 0;
    for (const b of x.bairros ?? []) {
      const q = (porBairro[b] ??= { id: b, nome: nomesBairros[b] ?? b, quantidade: 0, valor: 0 });
      q.quantidade++;
      q.valor += (x.valor ?? 0) / x.bairros.length;
    }
    if (x.fim && x.fim >= coletadoEm) {
      vigentes.quantidade++;
      vigentes.valor += x.valor ?? 0;
    }
    const a = (porAno[x.ano] ??= { ano: x.ano, quantidade: 0, valor: 0 });
    a.quantidade++;
    a.valor += x.valor ?? 0;
    const f = (fornecedores[x.cnpj] ??= { cnpj: x.cnpj, nome: x.fornecedor, quantidade: 0, valor: 0 });
    f.quantidade++;
    f.valor += x.valor ?? 0;
  }
  return {
    total: contratos.length,
    valor: r2(contratos.reduce((s, x) => s + (x.valor ?? 0), 0)),
    vigentes: { quantidade: vigentes.quantidade, valor: r2(vigentes.valor) },
    porCategoria: Object.values(porCategoria)
      .sort((a, b) => b.valor - a.valor)
      .map((k) => ({ ...k, valor: r2(k.valor) })),
    porTema: Object.values(porTema)
      .sort((a, b) => b.valor - a.valor)
      .map((k) => ({ ...k, valor: r2(k.valor) })),
    porBairro: Object.values(porBairro)
      .sort((a, b) => b.valor - a.valor)
      .map((k) => ({ ...k, valor: r2(k.valor) })),
    porAno: Object.values(porAno)
      .sort((a, b) => a.ano - b.ano)
      .map((a) => ({ ...a, valor: r2(a.valor) })),
    pessoasFisicas,
    fornecedores: Object.keys(fornecedores).length,
    maiores: Object.values(fornecedores)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 15)
      .map((f) => ({ ...f, valor: r2(f.valor) })),
  };
}

// O nome na urna nem sempre é o nome usado na Câmara: tenta igual, depois palavras contidas.
function candidatoDe(v, candidatos) {
  const alvo = dobra(v.nome);
  const iguais = candidatos.filter((c) => [dobra(c.urna), dobra(c.nome)].includes(alvo));
  if (iguais.length === 1) return iguais[0];
  const palavras = alvo.split(" ").filter((p) => p.length > 2);
  const parecidos = candidatos.filter((c) => {
    const t = ` ${dobra(c.urna)} ${dobra(c.nome)} `;
    return palavras.every((p) => t.includes(` ${p} `));
  });
  return parecidos.length === 1 ? parecidos[0] : null;
}

export function montarCidade({ vereadores, acha = null, nomesBairros = {} }) {
  const contratos = ler("data/dinheiro/contratos.json");
  // Tema (pelas palavras do objeto) e bairros citados no objeto de cada contrato.
  if (contratos) for (const x of contratos.contratos) Object.assign(x, { tema: temaDoContrato(x.objeto), bairros: acha ? acha(x.objeto) : [] });
  const dengue = ler("data/cidade/dengue.json");
  const empresas = ler("data/cidade/empresas.json");
  const bolsa = ler("data/cidade/bolsa-familia.json");
  const obras = obrasFederais();
  writeFileSync(
    "src/data/cidade.json",
    JSON.stringify({
      transito: transito(ler("data/cidade/transito.json")),
      dengue,
      empresas,
      empregos: empregos(ler("data/cidade/empregos.json")),
      bolsa,
      obras,
      riscos: ler("data/cidade/riscos.json"),
      contratos: resumoContratos(contratos, nomesBairros),
    }),
  );
  // A lista completa de contratos é aberta só quando alguém busca, para não pesar a página.
  if (contratos) {
    mkdirSync("public/dados", { recursive: true });
    const lista = contratos.contratos.map(({ ano, sequencial, numero, tipo, categoria, cnpj, fornecedor, objeto, valor, assinatura, fim, orgao, url, tema, bairros }) => ({ ano, sequencial, numero, tipo, categoria, cnpj, fornecedor, objeto, valor, assinatura, fim, orgao, url, tema, bairros }));
    writeFileSync("public/dados/contratos.json", JSON.stringify(lista.sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0))));
  }

  const campanhas = ler("data/campanhas.json");
  if (campanhas) {
    const candidatos = campanhas.candidatos.filter((c) => c.cargo === "Vereador");
    const porId = {};
    const semPar = [];
    for (const v of vereadores) {
      const c = candidatoDe(v, candidatos);
      if (c) porId[v.id] = c;
      else semPar.push(v.nome);
    }
    if (semPar.length) console.log(`Sem candidatura encontrada em 2024: ${semPar.join(", ")}`);
    const soma = (lista, f) => r2(lista.reduce((s, c) => s + f(c), 0));
    // Trajetória nas urnas (scripts/coletar-trajetorias.mjs): ligada a cada vereador e ao prefeito pela candidatura de 2024.
    const trajetorias = ler("data/tse/trajetorias.json");
    const porSq = new Map((trajetorias?.pessoas ?? []).filter((x) => x.sq2024).map((x) => [x.sq2024, x.candidaturas]));
    const prefeitoEleito = campanhas.candidatos.find((c) => c.cargo === "Prefeito" && /^ELEITO/.test(c.situacao));
    const trajetoria = Object.fromEntries(
      [...Object.entries(porId).map(([id, c]) => [id, porSq.get(c.sq)]), ["prefeito", prefeitoEleito && porSq.get(prefeitoEleito.sq)]].filter(([, t]) => t),
    );
    writeFileSync(
      "src/data/campanhas.json",
      JSON.stringify({
        fonte: campanhas.fonte,
        url: campanhas.url,
        coletadoEm: campanhas.coletadoEm,
        porId,
        trajetoria,
        fonteTrajetoria: trajetorias ? { fonte: trajetorias.fonte, url: trajetorias.url, coletadoEm: trajetorias.coletadoEm } : null,
        prefeitos: campanhas.candidatos.filter((c) => c.cargo === "Prefeito"),
        vereadores: { candidaturas: candidatos.length, receitas: soma(candidatos, (c) => c.receitas.total), gastos: soma(candidatos, (c) => c.despesas.contratado) },
      }),
    );
  }
}
