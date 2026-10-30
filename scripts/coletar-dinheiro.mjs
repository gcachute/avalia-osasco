// Dinheiro federal e estadual que chega a Osasco e para onde ele vai. Gera data/dinheiro/*.json.
// Rode com: npm run coletar:dinheiro   (depois: npm run dados)
//
// 1. Entradas: Declaração de Contas Anuais (DCA, Anexo I-C) entregue ao SICONFI, receitas de transferências.
// 2. Emendas federais: arquivo de emendas do Portal da Transparência (CGU). Conta só o que a Prefeitura e os fundos
//    municipais receberam; empresas sediadas em Osasco que receberam de programas nacionais não são dinheiro para a cidade.
// 3. Transferências especiais federais ("emendas Pix"): Transferegov, com a finalidade de cada uma. Dados bancários ficam de fora.
// 4. Transferências especiais estaduais: planilha publicada pelo TCE-SP (posição de 31/08/2024).
// 4b. Autores das emendas: Câmara dos Deputados e Senado (cargo, partido, foto).
// 5. Gastos: arquivo anual de despesas do TCE-SP (o estado inteiro, cerca de 2 GB por ano), resumido para os pagamentos
//    da Prefeitura feitos com dinheiro federal e estadual. Pagamentos a pessoas físicas entram só nos totais.
import { spawn } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { baixar, sleep } from "./lib/baixar.mjs";
import { carregarBairros, reconhecedorDeBairros, reconhecedorDeEquipamentos } from "./lib/bairros.mjs";
import { readWorkbook } from "./lib/xlsx.mjs";
import { linhasDoZip } from "./lib/zip-linhas.mjs";

const IBGE = "3534401";
const CNPJ_PREFEITURA = "46523171000104";
const PASTA = "data/dinheiro";
const CACHE = "data/cache/dinheiro";
const ATUAL = new Date().getFullYear();
const DESDE = Number(process.env.DESDE ?? 2018);
const SO = (process.env.SO ?? "entradas,emendas,pix,parlamentares,estaduais,gastos,sancoes").split(",");
mkdirSync(PASTA, { recursive: true });
mkdirSync(CACHE, { recursive: true });

const grava = (nome, dados) => writeFileSync(`${PASTA}/${nome}`, JSON.stringify({ coletadoEm: new Date().toISOString().slice(0, 10), ...dados }, null, 1));
const valor = (s) => Number(String(s ?? "0").replace(/\./g, "").replace(",", ".")) || 0;
const centavos = (x) => Math.round(x * 100) / 100;
// Linha de CSV com ";" e campos entre aspas (arquivos da CGU).
const campos = (linha) => [...linha.matchAll(/(?:^|;)(?:"((?:[^"]|"")*)"|([^;]*))/g)].map((m) => (m[1] ?? m[2] ?? "").replace(/""/g, '"'));

// Os arquivos anuais do TCE-SP passam de 12 GB descompactados (zip64), além do que o leitor de zip do projeto aguenta
// em fluxo. O leitor de zip do Python lida com eles; aqui ele só despeja o CSV, linha a linha.
async function* linhasDoZipGrande(caminho) {
  const py = spawn(process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3"), [
    "-I",
    "-c",
    "import zipfile,sys,shutil; z=zipfile.ZipFile(sys.argv[1]); shutil.copyfileobj(z.open(z.infolist()[0]), sys.stdout.buffer, 1 << 20)",
    caminho,
  ]);
  py.stdout.setEncoding("latin1");
  yield* createInterface({ input: py.stdout, crlfDelay: Infinity });
  const codigo = await new Promise((r) => (py.exitCode != null ? r(py.exitCode) : py.on("close", r)));
  if (codigo) throw new Error(`leitura de ${caminho} falhou (código ${codigo})`);
}

async function* tabela(caminho, arquivo) {
  let cab = null;
  for await (const l of linhasDoZip(caminho, { arquivo })) {
    const c = campos(l);
    if (!cab) cab = c;
    else yield Object.fromEntries(cab.map((k, i) => [k, c[i] ?? ""]));
  }
}

// ---------- 1. Entradas (DCA) ----------
if (SO.includes("entradas")) {
  const anos = {};
  for (let ano = DESDE; ano < ATUAL; ano++) {
    const res = await baixar(`https://apidatalake.tesouro.gov.br/ords/siconfi/tt/dca?an_exercicio=${ano}&id_ente=${IBGE}&no_anexo=DCA-Anexo%20I-C`);
    const itens = (await res.json()).items ?? [];
    await sleep(1200);
    const linhas = itens
      .filter((i) => /^(RO)?(1\.7|2\.4)/.test(i.cod_conta))
      .map((i) => ({ cod: i.cod_conta.replace(/^RO/, ""), conta: i.conta.replace(/^[\d.\s]+-\s*/, "").trim(), coluna: i.coluna, valor: centavos(i.valor) }));
    if (!linhas.length) {
      console.log(`DCA ${ano}: ainda não entregue`);
      continue;
    }
    anos[ano] = linhas;
    console.log(`DCA ${ano}: ${linhas.length} linhas`);
  }
  grava("entradas.json", { fonte: "SICONFI, Declaração de Contas Anuais (Anexo I-C)", anos });
}

// ---------- 2. Emendas federais (CGU) ----------
if (SO.includes("emendas")) {
  const zip = `${CACHE}/emendas.zip`;
  console.log("Baixando o arquivo de emendas da CGU...");
  writeFileSync(zip, Buffer.from(await (await baixar("https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares/UNICO", { timeout: 15 * 60 * 1000 })).arrayBuffer()));

  const PREFEITURA = /^(Município|Fundo Público da Administração Direta Municipal|Autarquia Municipal|Fundação Pública de Direito Público Municipal)$/i;
  const ENTIDADE = /Associação Privada|Fundação Privada|Organização Religiosa|Serviço Social Autônomo|Entidade/i;
  const recebimentos = [];
  const empresas = { total: 0, quantidade: 0 };
  for await (const r of tabela(zip, /PorFavorecido\.csv$/i)) {
    if (r["Município Favorecido"].toUpperCase() !== "OSASCO" || r["UF Favorecido"] !== "SP") continue;
    const v = valor(r["Valor Recebido"]);
    const destino = PREFEITURA.test(r["Natureza Jurídica"]) ? "prefeitura" : ENTIDADE.test(r["Natureza Jurídica"]) && r["Tipo Favorecido"] !== "Pessoa Fisica" ? "entidade" : null;
    if (!destino) {
      empresas.total += v;
      empresas.quantidade++;
      continue;
    }
    recebimentos.push({
      codigo: r["Código da Emenda"],
      autor: r["Nome do Autor da Emenda"],
      tipo: r["Tipo de Emenda"],
      mes: `${r["Ano/Mês"].slice(0, 4)}-${r["Ano/Mês"].slice(4, 6)}`,
      favorecido: r["Favorecido"].trim(),
      cnpj: r["Código do Favorecido"],
      destino,
      valor: centavos(v),
    });
  }
  const codigos = new Set(recebimentos.map((r) => r.codigo));
  const emendas = {};
  // Código de todos os autores: o histórico de alguns pagamentos da Prefeitura cita emendas que não aparecem como
  // recebidas por Osasco (vieram por outro caminho); pelo código dá para saber de quem são.
  const autores = {};
  for await (const r of tabela(zip, /EmendasParlamentares\.csv$/i)) {
    if (/^\d{4}$/.test(r["Código do Autor da Emenda"])) autores[r["Código do Autor da Emenda"]] = r["Nome do Autor da Emenda"];
    if (!codigos.has(r["Código da Emenda"])) continue;
    emendas[r["Código da Emenda"]] = {
      ano: Number(r["Ano da Emenda"]),
      numero: r["Número da emenda"],
      localidade: r["Localidade de aplicação do recurso"],
      funcao: r["Nome Função"],
      subfuncao: r["Nome Subfunção"],
      programa: r["Nome Programa"],
      acao: r["Nome Ação"],
      planoOrcamentario: r["Nome Plano Orçamentário"],
      empenhado: centavos(valor(r["Valor Empenhado"])),
      liquidado: centavos(valor(r["Valor Liquidado"])),
      pago: centavos(valor(r["Valor Pago"]) + valor(r["Valor Restos A Pagar Pagos"])),
    };
  }
  const convenios = [];
  for await (const r of tabela(zip, /Convenios\.csv$/i)) {
    if (!codigos.has(r["Código da Emenda"]) || !/OSASCO/i.test(r["Convenente"])) continue;
    convenios.push({ codigo: r["Código da Emenda"], numero: r["Número Convênio"], data: r["Data Publicação Convênio"].split("/").reverse().join("-"), convenente: r["Convenente"], objeto: r["Objeto Convênio"], valor: centavos(valor(r["Valor Convênio"])) });
  }
  console.log(`Emendas: ${recebimentos.length} recebimentos (${codigos.size} emendas), ${convenios.length} convênios; ${empresas.quantidade} pagamentos a empresas de Osasco ficam de fora`);
  grava("emendas-federais.json", {
    fonte: "Portal da Transparência (CGU), emendas parlamentares",
    url: "https://portaldatransparencia.gov.br/emendas",
    recebimentos,
    emendas,
    convenios,
    autores,
    empresasForaDaConta: { total: centavos(empresas.total), quantidade: empresas.quantidade },
  });
}

// ---------- 3. Transferências especiais federais (Transferegov) ----------
if (SO.includes("pix")) {
  const API = "https://api.transferegov.gestao.gov.br/transferenciasespeciais/";
  const consulta = async (q) => {
    const r = await (await baixar(API + q)).json();
    await sleep(400);
    return r;
  };
  const planos = await consulta(`plano_acao_especial?cnpj_beneficiario_plano_acao=eq.${CNPJ_PREFEITURA}&order=ano_plano_acao`);
  const lista = [];
  for (const p of planos) {
    const executores = await consulta(`executor_especial?id_plano_acao=eq.${p.id_plano_acao}&select=nome_executor,objeto_executor,vl_custeio_executor,vl_investimento_executor`);
    const trabalho = (await consulta(`plano_trabalho_especial?id_plano_acao=eq.${p.id_plano_acao}&select=situacao_plano_trabalho,data_inicio_execucao_plano_trabalho,data_fim_execucao_plano_trabalho`))[0];
    lista.push({
      plano: p.codigo_plano_acao,
      ano: p.ano_plano_acao,
      situacao: p.situacao_plano_acao,
      parlamentar: p.nome_parlamentar_emenda_plano_acao,
      // Mesmo formato do código da emenda na CGU: ano + código do autor + número.
      codigoEmenda: `${p.ano_emenda_parlamentar_plano_acao}${String(p.codigo_parlamentar_emenda_plano_acao).padStart(4, "0")}${String(p.numero_emenda_parlamentar_plano_acao ?? p.sequencial_emenda_parlamentar_plano_acao ?? "").padStart(4, "0")}`,
      area: p.codigo_descricao_areas_politicas_publicas_plano_acao,
      custeio: Number(p.valor_custeio_plano_acao),
      investimento: Number(p.valor_investimento_plano_acao),
      objetos: executores.map((e) => ({ executor: e.nome_executor, objeto: e.objeto_executor?.trim(), valor: Number(e.vl_custeio_executor) + Number(e.vl_investimento_executor) })),
      planoTrabalho: trabalho ? { situacao: trabalho.situacao_plano_trabalho, inicio: trabalho.data_inicio_execucao_plano_trabalho?.slice(0, 10), fim: trabalho.data_fim_execucao_plano_trabalho?.slice(0, 10) } : null,
    });
  }
  console.log(`Transferências especiais federais: ${lista.length} planos`);
  grava("pix-federais.json", { fonte: "Transferegov, transferências especiais", url: "https://www.gov.br/transferegov/pt-br", planos: lista });
}

// ---------- 3b. Quem são os autores das emendas federais (Câmara dos Deputados e Senado) ----------
// A CGU grava só o nome curto do autor ("GIORDANO", "PR. MARCO FELICIANO"). Os nomes são procurados nas listas de
// deputados e senadores desde 2011; de cada um vem o cargo, o estado, os partidos ao longo do tempo e a foto oficial,
// guardada em public/fotos/parlamentares (o site não carrega imagens de outros endereços).
if (SO.includes("parlamentares")) {
  const sem = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z ]/g, " ").replace(/\s+/g, " ").trim();
  // Nomes que a CGU grava diferente do nome parlamentar.
  const APELIDOS = { "RIBAMAR ANTONIO DA SILVA": "RIBAMAR SILVA" };
  const emendas = JSON.parse(readFileSync(`${PASTA}/emendas-federais.json`, "utf8"));
  const pix = existsSync(`${PASTA}/pix-federais.json`) ? JSON.parse(readFileSync(`${PASTA}/pix-federais.json`, "utf8")) : { planos: [] };
  const nomes = [...new Set([...emendas.recebimentos.map((r) => r.autor), ...pix.planos.map((p) => p.parlamentar)])].filter((n) => !/^(RELATOR GERAL|COM\.|BANCADA|Sem informa)/i.test(n));

  // Anos das emendas de cada autor: quem foi deputado e depois senador (ou o contrário) é procurado na casa da época.
  const anosDe = {};
  for (const r of emendas.recebimentos) (anosDe[r.autor] ??= new Set()).add(Number(r.codigo.slice(0, 4)) || Number(r.mes.slice(0, 4)));
  for (const p of pix.planos) (anosDe[p.parlamentar] ??= new Set()).add(p.ano);
  const json = async (url) => {
    const r = await (await baixar(url, { headers: { Accept: "application/json" } })).json();
    await sleep(400);
    return r;
  };
  const camara = new Map();
  for (const leg of [54, 55, 56, 57]) {
    // A lista repete o deputado a cada troca de partido e vem em páginas.
    for (let url = `https://dadosabertos.camara.leg.br/api/v2/deputados?idLegislatura=${leg}&itens=100`; url; ) {
      const r = await json(url);
      for (const d of r.dados) camara.set(sem(d.nome), d.id);
      url = r.links.find((l) => l.rel === "next")?.href;
    }
  }
  const senado = new Map();
  const ls = await json("https://legis.senado.leg.br/dadosabertos/senador/lista/legislatura/54/57");
  for (const p of ls.ListaParlamentarLegislatura.Parlamentares.Parlamentar) senado.set(sem(p.IdentificacaoParlamentar.NomeParlamentar), p);
  const atuais = await json("https://legis.senado.leg.br/dadosabertos/senador/lista/atual");
  const senadoresAtuais = new Set(atuais.ListaParlamentarEmExercicio.Parlamentares.Parlamentar.map((p) => p.IdentificacaoParlamentar.CodigoParlamentar));
  // Anos cobertos pelos mandatos de senador (cada legislatura dura 4 anos, a 54ª começou em 2011).
  const anosSenado = (p) =>
    [].concat(p.Mandatos?.Mandato ?? []).flatMap((m) => [m.PrimeiraLegislaturaDoMandato?.NumeroLegislatura, m.SegundaLegislaturaDoMandato?.NumeroLegislatura]).filter(Boolean).flatMap((l) => [0, 1, 2, 3].map((i) => 2011 + (Number(l) - 54) * 4 + i));

  mkdirSync("public/fotos/parlamentares", { recursive: true });
  const foto = async (url, arquivo) => {
    if (existsSync(`public${arquivo}`)) return arquivo;
    try {
      writeFileSync(`public${arquivo}`, Buffer.from(await (await baixar(url, { tentativas: 2 })).arrayBuffer()));
      await sleep(300);
      return arquivo;
    } catch {
      return null;
    }
  };
  const parlamentares = {};
  for (const nome of nomes) {
    // "RIBAMAR ANTONIO DA SILVA (EX-PARLAMENTAR RICARDO SILVA, NOS TERMOS ...)": a indicação passou a outro deputado.
    const [, atual, antigo] = nome.match(/^(.*?)\s*\(EX-PARLAMENTAR ([^,]+),/i) ?? [null, nome, null];
    const chave = APELIDOS[sem(atual)] ?? sem(atual);
    const candidatos = [chave, sem(chave.replace(/^(PR|PASTOR|DELEGADO|DELEGADA|POLICIAL|CORONEL|CAPITAO|GENERAL) /, ""))];
    let idCamara = candidatos.map((c) => camara.get(c)).find(Boolean);
    const sen = candidatos.map((c) => senado.get(c)).find(Boolean);
    if (idCamara && sen && [...(anosDe[nome] ?? [])].every((a) => anosSenado(sen).includes(a))) idCamara = null;
    if (idCamara) {
      const d = (await json(`https://dadosabertos.camara.leg.br/api/v2/deputados/${idCamara}`)).dados;
      // As linhas "Nome no início da legislatura" vêm com data errada e embaralham a ordem dos partidos.
      const hist = (await json(`https://dadosabertos.camara.leg.br/api/v2/deputados/${idCamara}/historico`)).dados.filter((h) => !/^Nome no in/i.test(h.descricaoStatus ?? ""));
      const partidos = [];
      for (const h of hist.sort((a, b) => a.dataHora.localeCompare(b.dataHora)))
        if (h.siglaPartido && partidos.at(-1)?.sigla !== h.siglaPartido) partidos.push({ sigla: h.siglaPartido, desde: h.dataHora.slice(0, 10) });
      parlamentares[nome] = {
        casa: "camara",
        id: idCamara,
        nome: d.ultimoStatus.nome.trim(),
        sexo: d.sexo,
        uf: d.ultimoStatus.siglaUf,
        partido: d.ultimoStatus.siglaPartido,
        partidos,
        // "Exercício", "Licença", "Vacância", "Fim de Mandato"...
        situacao: d.ultimoStatus.situacao,
        legislaturas: [...new Set(hist.map((h) => h.idLegislatura))].sort(),
        perfil: `https://www.camara.leg.br/deputados/${idCamara}`,
        foto: await foto(d.ultimoStatus.urlFoto, `/fotos/parlamentares/camara-${idCamara}.jpg`),
        indicacaoDe: antigo ? antigo.trim() : null,
      };
    } else if (sen) {
      const id = sen.IdentificacaoParlamentar;
      const mandatos = [].concat(sen.Mandatos?.Mandato ?? []);
      const filiacoes = [].concat((await json(`https://legis.senado.leg.br/dadosabertos/senador/${id.CodigoParlamentar}/filiacoes`)).FiliacaoParlamentar.Parlamentar.Filiacoes?.Filiacao ?? []);
      const fimMandato = Math.max(...anosSenado(sen));
      parlamentares[nome] = {
        casa: "senado",
        id: id.CodigoParlamentar,
        nome: id.NomeParlamentar,
        sexo: id.SexoParlamentar === "Feminino" ? "F" : "M",
        uf: mandatos.at(-1)?.UfParlamentar ?? null,
        partido: id.SiglaPartidoParlamentar,
        partidos: filiacoes.map((f) => ({ sigla: f.Partido.SiglaPartido, desde: f.DataFiliacao })).sort((a, b) => a.desde.localeCompare(b.desde)),
        situacao: senadoresAtuais.has(id.CodigoParlamentar) ? "Exercício" : fimMandato >= ATUAL ? "Licença" : "Fim de Mandato",
        legislaturas: mandatos.flatMap((m) => [m.PrimeiraLegislaturaDoMandato?.NumeroLegislatura, m.SegundaLegislaturaDoMandato?.NumeroLegislatura]).filter(Boolean).map(Number),
        perfil: `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${id.CodigoParlamentar}`,
        foto: await foto(`https://www.senado.leg.br/senadores/img/fotos-oficiais/senador${id.CodigoParlamentar}.jpg`, `/fotos/parlamentares/senado-${id.CodigoParlamentar}.jpg`),
        indicacaoDe: antigo ? antigo.trim() : null,
      };
    } else console.log(`  autor sem cadastro encontrado: ${nome}`);
  }
  console.log(`Autores: ${Object.keys(parlamentares).length} de ${nomes.length} encontrados na Câmara ou no Senado`);
  grava("parlamentares.json", {
    fonte: "Câmara dos Deputados e Senado Federal, dados abertos",
    url: "https://dadosabertos.camara.leg.br",
    parlamentares,
  });
}

// ---------- 4. Transferências especiais estaduais (planilha do TCE-SP) ----------
if (SO.includes("estaduais")) {
  const URL = "https://tce.sp.gov.br/sites/default/files/legislacao/01-Repasses%20Estaduais_0.xlsx";
  const linhas = readWorkbook(Buffer.from(await (await baixar(URL)).arrayBuffer()))[0].rows;
  const data = (n) => new Date(Date.UTC(1899, 11, 30) + Number(n) * 864e5).toISOString().slice(0, 10);
  const repasses = linhas
    .filter((r) => String(r[0]).startsWith(CNPJ_PREFEITURA))
    .map((r) => ({ data: data(r[2]), valor: Number(r[1]), tipo: String(r[3]).replace(/^\d+ - /, ""), programa: String(r[9]).replace(/^\d+ - /, "") }));
  console.log(`Transferências especiais estaduais: ${repasses.length}`);
  grava("pix-estaduais.json", { fonte: "TCE-SP, planilha de repasses estaduais (Comunicado SDG 59/2024)", url: URL, posicao: "2024-08-31", repasses });
}

// ---------- 5. Gastos (TCE-SP) ----------
if (SO.includes("gastos")) {
  const malha = carregarBairros();
  const acha = malha ? reconhecedorDeBairros(malha.bairros) : () => [];
  const achaEquipamento = reconhecedorDeEquipamentos();
  const ORGAOS = /PREFEITURA MUNICIPAL DE OSASCO|FUNDA..O INSTITUTO TECNOL.GICO DE OSASCO/i;
  const grupo = (fonte) => (/FEDERA/i.test(fonte) ? "federal" : /ESTADUA/i.test(fonte) ? "estadual" : /EMENDAS PARLAMENTARES/i.test(fonte) ? "emendasVereadores" : null);
  const soma = (obj, k, v) => (obj[k] = centavos((obj[k] ?? 0) + v));

  for (let ano = DESDE; ano <= ATUAL; ano++) {
    const destino = `gastos-${ano}.json`;
    // REFAZER=1 baixa de novo também os anos fechados (quando o resumo ganha campos novos).
    if (existsSync(`${PASTA}/${destino}`) && ano < ATUAL - 1 && !process.env.REFAZER) continue;
    const zip = `${CACHE}/despesas-${ano}.zip`;
    if (!existsSync(zip)) {
      const url = `https://transparencia.tce.sp.gov.br/sites/default/files/conjunto-dados/despesas-${ano}.zip`;
      // O arquivo de um ano só aparece depois que ele fecha; até lá o endereço dá 404.
      if ((await fetch(url, { method: "HEAD" })).status === 404) {
        console.log(`Despesas de ${ano}: o TCE-SP ainda não publicou o arquivo do ano`);
        continue;
      }
      console.log(`Baixando despesas de ${ano} do TCE-SP (cerca de 2 GB)...`);
      const res = await baixar(url, { timeout: 60 * 60 * 1000 });
      await pipeline(Readable.fromWeb(res.body), createWriteStream(zip));
    }
    const fontes = {};
    const g = {};
    let ultimoMes = 0;
    let cab = null;
    for await (const linha of linhasDoZipGrande(zip)) {
      const c = linha.split(";");
      if (!cab) {
        cab = c;
        continue;
      }
      if (c[2] !== "Osasco" || !ORGAOS.test(c[4]) || !/^Valor Pago/i.test(c[7])) continue;
      const r = Object.fromEntries(cab.slice(0, 24).map((k, i) => [k, c[i]]));
      r.historico_despesa = c.slice(24).join(";");
      const v = valor(r.vl_despesa);
      ultimoMes = Math.max(ultimoMes, Number(r.mes_referencia));
      soma(fontes, r.ds_fonte_recurso, v);
      const k = grupo(r.ds_fonte_recurso);
      if (!k) continue;
      const x = (g[k] ??= { total: 0, funcoes: {}, aplicacoes: {}, modalidades: {}, fornecedores: {}, pessoasFisicas: 0, itensBairro: [], pagamentosEmendas: [] });
      x.total = centavos(x.total + v);
      soma(x.funcoes, r.ds_funcao_governo, v);
      soma(x.aplicacoes, r.ds_cd_aplicacao_fixo, v);
      soma(x.modalidades, r.ds_modalidade_lic.trim() || "Não informada", v);
      const pj = /CNPJ/i.test(r.tp_identificador_despesa);
      // Cada pagamento feito com dinheiro de emenda (códigos 0800 e 0801, ou a fonte das emendas de vereadores) fica
      // guardado com o histórico, para a página mostrar o caminho até a nota. De pessoas físicas, só data e valor.
      if (k === "emendasVereadores" || /^080[01]/.test(r.ds_cd_aplicacao_fixo))
        x.pagamentosEmendas.push({
          data: r.dt_emissao_despesa.split("/").reverse().join("-"),
          valor: centavos(v),
          empenho: r.nr_empenho.trim(),
          aplicacao: r.ds_cd_aplicacao_fixo,
          funcao: r.ds_funcao_governo,
          acao: r.ds_acao,
          modalidade: r.ds_modalidade_lic.trim(),
          cnpj: pj ? r.nr_identificador_despesa : null,
          fornecedor: pj ? r.ds_despesa.replace(/\s+/g, " ").trim() : null,
          texto: pj ? r.historico_despesa.replace(/\s+/g, " ").trim().slice(0, 300) : null,
        });
      if (!pj) {
        x.pessoasFisicas = centavos(x.pessoasFisicas + v);
        continue;
      }
      const f = (x.fornecedores[r.nr_identificador_despesa] ??= { nome: r.ds_despesa.replace(/\s+/g, " ").trim(), valor: 0, aplicacoes: {}, modalidades: {} });
      f.valor = centavos(f.valor + v);
      soma(f.aplicacoes, r.ds_cd_aplicacao_fixo, v);
      soma(f.modalidades, r.ds_modalidade_lic.trim() || "Não informada", v);
      // Valor por mês de pagamento: serve para comparar com o período de punições (listas da CGU).
      soma((f.meses ??= {}), `${ano}-${String(r.mes_referencia).padStart(2, "0")}`, v);
      const texto = r.historico_despesa;
      const bairros = [...new Set([...acha(texto), ...achaEquipamento(texto).map((e) => e.bairro)])];
      if (bairros.length)
        x.itensBairro.push({
          data: r.dt_emissao_despesa.split("/").reverse().join("-"),
          valor: centavos(v),
          fornecedor: f.nome,
          aplicacao: r.ds_cd_aplicacao_fixo,
          funcao: r.ds_funcao_governo,
          texto: texto.replace(/\s+/g, " ").trim().slice(0, 240),
          bairros,
        });
    }
    // Fornecedores: os 60 maiores de cada grupo com o detalhe; de todos, o CNPJ e o valor (para conferir as listas de
    // empresas punidas).
    for (const x of Object.values(g)) {
      const todos = Object.entries(x.fornecedores).sort((a, b) => b[1].valor - a[1].valor);
      x.fornecedores = Object.fromEntries(todos.slice(0, 60));
      x.outrosFornecedores = centavos(todos.slice(60).reduce((s, [, f]) => s + f.valor, 0));
      x.todosCnpjs = Object.fromEntries(todos.map(([cnpj, f]) => [cnpj, { nome: f.nome, meses: f.meses }]));
      for (const [, f] of todos) delete f.meses;
      x.quantidadeFornecedores = todos.length;
      x.pagamentosEmendas.sort((a, b) => a.data.localeCompare(b.data));
    }
    grava(destino, { fonte: "TCE-SP, despesas dos municípios (Audesp)", url: "https://transparencia.tce.sp.gov.br/conjunto-de-dados", ano, ultimoMes, fontes, grupos: g });
    console.log(`Gastos ${ano}: até o mês ${ultimoMes}; federal R$ ${((g.federal?.total ?? 0) / 1e6).toFixed(1)} mi, estadual R$ ${((g.estadual?.total ?? 0) / 1e6).toFixed(1)} mi`);
    // O arquivo do estado inteiro é grande demais para guardar; o resumo acima é o que fica.
    rmSync(zip);
  }
}

// ---------- 6. Listas de punidos da CGU ----------
// CEIS (empresas inidôneas e suspensas), CNEP (punidas pela Lei Anticorrupção) e CEPIM (entidades sem fins lucrativos
// impedidas de receber dinheiro federal). Cada lista sai todo dia com a data no nome, e só a mais recente fica no ar.
// Confere todos os CNPJs que receberam dinheiro federal, estadual ou de emenda (gastos-*.json e emendas-federais.json).
if (SO.includes("sancoes")) {
  const cnpjs = new Map();
  const anota = (cnpj, nome) => /^\d{14}$/.test(cnpj) && !cnpjs.has(cnpj) && cnpjs.set(cnpj, nome);
  for (const f of readdirSync(PASTA).filter((f) => /^gastos-\d{4}\.json$/.test(f))) {
    const g = JSON.parse(readFileSync(`${PASTA}/${f}`, "utf8"));
    for (const x of Object.values(g.grupos)) {
      for (const [c, fo] of Object.entries(x.fornecedores)) anota(c, fo.nome);
      for (const [c, f] of Object.entries(x.todosCnpjs ?? {})) anota(c, f.nome);
      for (const p of x.pagamentosEmendas ?? []) if (p.cnpj) anota(p.cnpj, p.fornecedor);
    }
  }
  for (const r of JSON.parse(readFileSync(`${PASTA}/emendas-federais.json`, "utf8")).recebimentos) anota(r.cnpj, r.favorecido);
  const raizes = new Map([...cnpjs.keys()].map((c) => [c.slice(0, 8), c]));
  const data = (s) => (s ? s.split("/").reverse().join("-") : null);
  const achados = [];
  const arquivos = {};
  for (const lista of ["ceis", "cnep", "cepim"]) {
    let zip = null;
    for (let i = 0; i < 10 && !zip; i++) {
      const dia = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10).replace(/-/g, "");
      const res = await fetch(`https://dadosabertos-download.cgu.gov.br/PortalDaTransparencia/saida/${lista}/${dia}_${lista.toUpperCase()}.zip`);
      if (!res.ok) continue;
      zip = `${CACHE}/${lista}.zip`;
      writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
      arquivos[lista] = `${dia.slice(0, 4)}-${dia.slice(4, 6)}-${dia.slice(6)}`;
    }
    if (!zip) {
      console.log(`Lista ${lista.toUpperCase()}: nenhum arquivo nos últimos 10 dias`);
      continue;
    }
    for await (const r of tabela(zip, /\.csv$/i)) {
      const doc = (r["CPF OU CNPJ DO SANCIONADO"] ?? r["CNPJ ENTIDADE"] ?? "").replace(/\D/g, "");
      if (doc.length !== 14) continue;
      // Mesmo CNPJ, ou outra unidade (filial ou matriz) da mesma empresa.
      const igual = cnpjs.has(doc);
      if (!igual && !raizes.has(doc.slice(0, 8))) continue;
      achados.push({
        lista: lista.toUpperCase(),
        cnpj: igual ? doc : raizes.get(doc.slice(0, 8)),
        cnpjPunido: doc,
        nome: r["NOME DO SANCIONADO"] ?? r["NOME ENTIDADE"],
        categoria: r["CATEGORIA DA SANÇÃO"] ?? r["MOTIVO DO IMPEDIMENTO"],
        inicio: data(r["DATA INÍCIO SANÇÃO"]),
        fim: data(r["DATA FINAL SANÇÃO"]),
        orgao: r["ÓRGÃO SANCIONADOR"] ?? r["ÓRGÃO CONCEDENTE"],
        esfera: r["ESFERA ÓRGÃO SANCIONADOR"] ?? "FEDERAL",
        abrangencia: r["ABRAGÊNCIA DA SANÇÃO"] ?? null,
        processo: r["NÚMERO DO PROCESSO"] ?? r["NÚMERO CONVÊNIO"] ?? null,
      });
    }
    rmSync(zip);
  }
  console.log(`Listas de punidos: ${cnpjs.size} CNPJs conferidos, ${achados.length} registros encontrados`);
  grava("sancoes.json", { fonte: "Portal da Transparência (CGU), CEIS, CNEP e CEPIM", url: "https://portaldatransparencia.gov.br/sancoes", arquivos, conferidos: cnpjs.size, achados });
}
