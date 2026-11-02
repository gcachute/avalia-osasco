// Dados gerais da cidade: trânsito, dengue, empresas, empregos, Bolsa Família e obras federais.
// Rode com: npm run coletar:cidade   (depois: npm run dados)   SO=transito,dengue escolhe as partes.
//
// Gera data/cidade/*.json só com totais. Nada de pessoa identificada é guardado: os arquivos do Bolsa Família e do trânsito têm
// nomes ou dados de vítimas, mas aqui viram contagens. Os arquivos brutos ficam em data/cache e os mensais grandes são apagados.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { baixar, emCache, sleep } from "./lib/baixar.mjs";
import { localizadorDeBairros } from "./lib/bairros.mjs";
import { linhasDoZip } from "./lib/zip-linhas.mjs";

const IBGE = "3534401";
const CNPJ_PREFEITURA = "46523171";
const PASTA = "data/cidade";
const ATUAL = new Date().getFullYear();
const SO = (process.env.SO ?? "transito,dengue,empresas,caged,bolsa,obras").split(",");
const hoje = () => new Date().toISOString().slice(0, 10);
const grava = (nome, dados) => writeFileSync(`${PASTA}/${nome}`, `${JSON.stringify({ ...dados, coletadoEm: hoje() }, null, 1)}\n`);
const inteiro = (s) => Number(s) || 0;
mkdirSync(PASTA, { recursive: true });

// ---------- Trânsito (Infosiga, Detran-SP) ----------
if (SO.includes("transito")) {
  const arquivo = await emCache("https://infosiga.detran.sp.gov.br/painel/download/file/dados_infosiga.zip", "infosiga/dados_infosiga.zip");
  const localiza = await localizadorDeBairros();
  const porAno = {};
  const porBairro = {};
  const ruas = {};
  let semLocal = 0;
  const conta = (o, k) => (o[k] ??= { sinistros: 0, mortos: 0, graves: 0, leves: 0 });
  let cab = null;
  for await (const l of linhasDoZip(arquivo, { arquivo: /^sinistros_.*\.csv$/ })) {
    if (l.startsWith("id_sinistro")) {
      cab = Object.fromEntries(l.split(";").map((k, i) => [k.trim(), i]));
      continue;
    }
    if (!l.includes(`;${IBGE};`)) continue;
    const c = l.split(";");
    if (c[cab.cod_ibge] !== IBGE) continue;
    const ano = inteiro(c[cab.ano_sinistro]);
    if (ano < 2015) continue;
    const q = { sinistros: 1, mortos: inteiro(c[cab.qtd_gravidade_fatal]), graves: inteiro(c[cab.qtd_gravidade_grave]), leves: inteiro(c[cab.qtd_gravidade_leve]) };
    const lat = Number((c[cab.latitude] ?? "").replace(",", "."));
    const lon = Number((c[cab.longitude] ?? "").replace(",", "."));
    const bairro = lat && lon ? localiza(lon, lat) : null;
    const rua = c[cab.logradouro]?.trim();
    const alvos = [conta(porAno, ano)];
    if (bairro) alvos.push(conta((porBairro[bairro] ??= {}), ano));
    else semLocal++;
    if (rua && ano >= ATUAL - 2) alvos.push(conta(ruas, rua));
    for (const a of alvos) for (const k of Object.keys(q)) a[k] += q[k];
  }
  // As mortes por meio de transporte vêm da tabela de vítimas, que só é usada para contagem.
  const mortesPorModo = {};
  let cabP = null;
  for await (const l of linhasDoZip(arquivo, { arquivo: /^pessoas_.*\.csv$/ })) {
    if (l.startsWith("id_sinistro")) {
      cabP = Object.fromEntries(l.split(";").map((k, i) => [k.trim(), i]));
      continue;
    }
    if (!l.includes(`;${IBGE};`) || !l.includes(";FATAL;")) continue;
    const c = l.split(";");
    if (c[cabP.cod_ibge] !== IBGE || c[cabP.gravidade_lesao] !== "FATAL") continue;
    const ano = inteiro(c[cabP.ano_obito]) || inteiro(c[cabP.ano_sinistro]);
    if (ano < 2015) continue;
    const modo = c[cabP.modo_transporte_vitima]?.trim() || "NAO DISPONIVEL";
    (mortesPorModo[ano] ??= {})[modo] = (mortesPorModo[ano][modo] ?? 0) + 1;
  }
  const principais = Object.entries(ruas)
    .map(([rua, v]) => ({ rua, ...v }))
    .sort((a, b) => b.sinistros - a.sinistros)
    .slice(0, 15);
  grava("transito.json", { fonte: "Detran-SP, Infosiga", url: "https://infosiga.detran.sp.gov.br/", porAno, porBairro, semLocal, mortesPorModo, ruas: principais, ruasDesde: ATUAL - 2 });
  console.log("Trânsito:", JSON.stringify(porAno[ATUAL - 1]), "sem local:", semLocal);
}

// ---------- Dengue, chikungunya e zika (InfoDengue) ----------
if (SO.includes("dengue")) {
  const doencas = {};
  for (const doenca of ["dengue", "chikungunya", "zika"]) {
    doencas[doenca] = {};
    for (let ano = 2015; ano <= ATUAL; ano++) {
      const r = await baixar(`https://info.dengue.mat.br/api/alertcity?geocode=${IBGE}&disease=${doenca}&format=json&ew_start=1&ew_end=53&ey_start=${ano}&ey_end=${ano}`).catch(() => null);
      const semanas = r ? await r.json() : [];
      if (semanas.length) doencas[doenca][ano] = { notificados: semanas.reduce((s, x) => s + (x.casos ?? 0), 0), estimados: Math.round(semanas.reduce((s, x) => s + (x.casos_est ?? 0), 0)), semanas: semanas.length };
      await sleep(1000);
    }
  }
  grava("dengue.json", { fonte: "InfoDengue (Fiocruz e Fundação Getulio Vargas)", url: "https://info.dengue.mat.br/", doencas });
  console.log("Dengue:", JSON.stringify(doencas.dengue[ATUAL - 1]));
}

// ---------- Empresas (IBGE, Cadastro Central de Empresas) ----------
if (SO.includes("empresas")) {
  const sidra = async (c) => (await (await baixar(`https://apisidra.ibge.gov.br/values/t/6449/n6/${IBGE}/v/all/p/${c}?formato=json`)).json()).slice(1);
  const NOMES = { "Número de empresas e outras organizações": "empresas", "Pessoal ocupado total": "pessoal", "Pessoal ocupado assalariado": "assalariados", "Salário médio mensal": "salarioMedio", "Salários e outras remunerações": "salarios" };
  const porAno = {};
  for (const r of await sidra("all/c12762/117897")) if (NOMES[r.D2N] && Number.isFinite(Number(r.V))) (porAno[r.D3N] ??= {})[NOMES[r.D2N]] = Number(r.V);
  const ultimo = Object.keys(porAno).sort().at(-1);
  const setores = {};
  for (const r of await sidra(`${ultimo}/c12762/allxt`)) if (NOMES[r.D2N] && /^[A-U] /.test(r.D4N ?? "")) (setores[r.D4N.slice(2)] ??= {})[NOMES[r.D2N]] = Number(r.V) || 0;
  grava("empresas.json", { fonte: "IBGE, Cadastro Central de Empresas", url: "https://sidra.ibge.gov.br/tabela/6449", porAno, ultimo, setores });
  console.log("Empresas:", ultimo, JSON.stringify(porAno[ultimo]));
}

// ---------- Empregos com carteira (Novo CAGED) ----------
if (SO.includes("caged")) {
  const FTP = "ftp://ftp.mtps.gov.br/pdet/microdados/NOVO%20CAGED";
  const SETE = ["C:/Program Files/7-Zip/7z.exe", "7z"].find((c) => c === "7z" || existsSync(c));
  const MUNICIPIO = IBGE.slice(0, 6);
  const CACHE = "data/cache/caged";
  mkdirSync(CACHE, { recursive: true });
  const lista = (caminho) => spawnSync("curl", ["-s", "-m", "60", "--list-only", `${FTP}/${caminho}/`], { encoding: "utf8" }).stdout.split(/\r?\n/).filter(Boolean);
  // Saldo oficial = declarações no prazo + fora do prazo − excluídas, somadas pela competência do movimento.
  const leArquivo = async (caminho, sinal, soma) => {
    const f = spawn(SETE, ["e", "-so", caminho], { stdio: ["ignore", "pipe", "ignore"] });
    let cab = null;
    for await (const l of createInterface({ input: f.stdout })) {
      if (!cab) {
        cab = Object.fromEntries(l.replace(/^\uFEFF/, "").split(";").map((k, i) => [k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(), i]));
        continue;
      }
      if (!l.includes(`;${MUNICIPIO};`)) continue;
      const c = l.split(";");
      if (c[cab.municipio] !== MUNICIPIO) continue;
      const mes = c[cab.competenciamov];
      const s = inteiro(c[cab.saldomovimentacao]);
      const m = (soma[mes] ??= { admissoes: 0, desligamentos: 0, setores: {} });
      m[s > 0 ? "admissoes" : "desligamentos"] += sinal;
      m.setores[c[cab.secao]] = (m.setores[c[cab.secao]] ?? 0) + s * sinal;
    }
  };
  const meses = {};
  for (const ano of lista("").filter((a) => /^\d{4}$/.test(a) && Number(a) >= 2020)) {
    for (const pasta of lista(ano).filter((m) => /^\d{6}$/.test(m))) {
      const guardado = `${CACHE}/${pasta}.json`;
      if (!existsSync(guardado)) {
        const soma = {};
        for (const [tipo, sinal] of [["MOV", 1], ["FOR", 1], ["EXC", -1]]) {
          const nome = `CAGED${tipo}${pasta}.7z`;
          const local = `${CACHE}/${nome}`;
          const r = spawnSync("curl", ["-s", "-f", "-m", "600", "--retry", "2", "-o", local, `${FTP}/${ano}/${pasta}/${nome}`]);
          if (r.status !== 0) {
            console.log(`  sem ${nome}`);
            continue;
          }
          await leArquivo(local, sinal, soma);
          rmSync(local, { force: true });
        }
        writeFileSync(guardado, JSON.stringify(soma));
        console.log(`${pasta}: lido`);
      }
      for (const [mes, v] of Object.entries(JSON.parse(readFileSync(guardado, "utf8")))) {
        const m = (meses[mes] ??= { admissoes: 0, desligamentos: 0, setores: {} });
        m.admissoes += v.admissoes;
        m.desligamentos += v.desligamentos;
        for (const [k, s] of Object.entries(v.setores)) m.setores[k] = (m.setores[k] ?? 0) + s;
      }
    }
  }
  grava("empregos.json", { fonte: "Ministério do Trabalho, Novo CAGED", url: "https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/estatisticas-trabalho/novo-caged", meses });
  console.log(`Empregos: ${Object.keys(meses).length} meses`);
}

// ---------- Bolsa Família (CGU): só famílias e valor do mês ----------
if (SO.includes("bolsa")) {
  const CACHE = "data/cache/bolsa";
  mkdirSync(CACHE, { recursive: true });
  const destino = `${PASTA}/bolsa-familia.json`;
  const meses = existsSync(destino) ? JSON.parse(readFileSync(destino, "utf8")).meses : {};
  let recusas = 0;
  for (const mes of (process.env.MESES ?? "202306,202312,202406,202412,202506,202512,202608").split(",")) {
    if (meses[mes]) continue;
    const local = `${CACHE}/${mes}.zip`;
    const r = spawnSync("curl", ["-s", "-f", "-m", "900", "-A", "avalia-osasco/0.1 (coleta de dados publicos)", "-o", local, `https://dadosabertos-download.cgu.gov.br/PortalDaTransparencia/saida/novo-bolsa-familia/${mes}_NovoBolsaFamilia.zip`]);
    if (r.status !== 0) {
      console.log(`  ${mes}: recusado`);
      if (++recusas >= 3) break;
      continue;
    }
    let familias = 0;
    let valor = 0;
    for await (const l of linhasDoZip(local)) {
      if (!l.includes('"SP"') || !l.includes('"OSASCO"')) continue;
      const c = l.split(";").map((x) => x.replace(/"/g, ""));
      if (c[2] !== "SP" || c[4] !== "OSASCO") continue;
      familias++;
      valor += Number(c.at(-1).replace(/\./g, "").replace(",", ".")) || 0;
    }
    rmSync(local, { force: true });
    meses[mes] = { familias, valor: Math.round(valor * 100) / 100 };
    console.log(`Bolsa Família ${mes}: ${familias} famílias`);
    grava("bolsa-familia.json", { fonte: "CGU, Portal da Transparência, Novo Bolsa Família", url: "https://portaldatransparencia.gov.br/download-de-dados/novo-bolsa-familia", meses });
  }
}

// ---------- Obras com dinheiro federal (Obrasgov) ----------
if (SO.includes("obras")) {
  // A consulta não filtra por cidade, então lê todas as obras de São Paulo. Guarda o progresso porque o serviço às vezes para.
  const PROGRESSO = "data/cache/obras-progresso.json";
  const salvo = existsSync(PROGRESSO) ? JSON.parse(readFileSync(PROGRESSO, "utf8")) : { pagina: 0, obras: [] };
  const obras = salvo.obras;
  const vistos = new Set(obras.map((o) => o.id));
  let vazias = 0;
  let falhas = 0;
  for (let pagina = salvo.pagina; vazias < 2 && falhas < 5; pagina++) {
    let lista = null;
    try {
      lista = (await (await baixar(`https://api.obrasgov.gestao.gov.br/obrasgov/api/projeto-investimento?uf=SP&pagina=${pagina}&tamanhoDaPagina=100`, { tentativas: 2 })).json()).content ?? [];
      falhas = 0;
    } catch {
      falhas++;
      await sleep(30000);
      pagina--;
      continue;
    }
    if (!lista.length) {
      vazias++;
      continue;
    }
    for (const o of lista) {
      const daPrefeitura = [...(o.tomadores ?? []), ...(o.executores ?? [])].some((x) => String(x.codigo).startsWith(CNPJ_PREFEITURA) || /OSASCO/i.test(x.nome ?? ""));
      if ((!daPrefeitura && !/\bOSASCO\b/i.test(`${o.nome} ${o.descricao} ${o.endereco}`)) || vistos.has(o.idUnico)) continue;
      vistos.add(o.idUnico);
      obras.push({
        id: o.idUnico,
        nome: o.nome,
        descricao: o.descricao,
        endereco: o.endereco,
        situacao: o.situacao,
        natureza: o.natureza,
        especie: o.especie,
        tipo: o.tipos?.[0]?.descricao ?? null,
        inicioPrevisto: o.dataInicialPrevista,
        fimPrevisto: o.dataFinalPrevista,
        inicio: o.dataInicialEfetiva,
        fim: o.dataFinalEfetiva,
        tomador: o.tomadores?.[0]?.nome ?? null,
        executor: o.executores?.[0]?.nome ?? null,
        fontes: (o.fontesDeRecurso ?? []).map((f) => ({ origem: f.origem, valor: f.valorInvestimentoPrevisto })),
      });
    }
    if (pagina % 25 === 0) {
      console.log(`Obras: página ${pagina}, ${obras.length} de Osasco`);
      writeFileSync(PROGRESSO, JSON.stringify({ pagina, obras }));
    }
    await sleep(1000);
  }
  grava("obras-federais.json", { fonte: "Ministério da Gestão, Obrasgov", url: "https://www.gov.br/transferegov/pt-br/obrasgov", completo: vazias >= 2, obras });
  if (vazias >= 2) rmSync(PROGRESSO, { force: true });
  console.log(`Obras federais em Osasco: ${obras.length}`);
}
