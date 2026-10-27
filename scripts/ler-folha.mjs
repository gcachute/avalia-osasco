// Lê os relatórios "Folha de pagamento sintético" do Portal do Cidadão da Câmara (zips com páginas em HTML)
// guardados em data/cache/folha/AAAA-MM-<vínculo>.zip, com vínculo = agente-politico, comissionado ou todos.
// O portal assina cada pedido de relatório, por isso eles são gerados à mão (passo a passo em data/manual/LEIAME.md).
//
// Privacidade: os relatórios trazem o nome de cada servidor. Aqui só saem totais por cargo; o valor individual
// sai apenas para os vereadores, que são agentes políticos com remuneração pública. O relatório não informa o
// gabinete de cada assessor, então não há custo por gabinete.
// Gera data/camara-folha.json. Rode com: npm run ler:folha   (depois: npm run dados)
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { unzipSync } from "fflate";

const PASTA = "data/cache/folha";
const valor = (s) => Number(s.replace(/\./g, "").replace(",", "."));
const dobra = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, " ").trim().toUpperCase();
// Cargos dos gabinetes dos vereadores (Lei 5.038/2019); os "da Presidência" ficam com a Mesa.
const GABINETE = new Set(["CHEFE DE GABINETE", "ASSESSOR DE COORDENACAO", "ASSESSOR PARLAMENTAR I", "ASSESSOR PARLAMENTAR II", "ASSESSOR PARLAMENTAR III"]);

function ler(arquivo) {
  const zip = unzipSync(new Uint8Array(readFileSync(arquivo)));
  const texto = Object.keys(zip)
    .sort()
    .map((n) =>
      new TextDecoder("latin1")
        .decode(zip[n])
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&"),
    )
    .join(" ")
    .replace(/[\s ]+/g, " ");
  const re = /(\d{7}) (.+?) R\$ ([\d.,]+) R\$ ([\d.,]+) R\$ ([\d.,]+) R\$ ([\d.,]+) Admiss.o: (\S*) Demiss.o: (\S*) ?Cargo: ?(.*?) ?Escolaridade/g;
  const linhas = [...texto.matchAll(re)].map((m) => ({ nome: m[2], bruto: valor(m[4]), cargo: dobra(m[9]) }));
  const total = texto.match(/Totais R\$ ([\d.,]+)/)?.[1];
  const soma = linhas.reduce((a, l) => a + l.bruto, 0);
  if (total && Math.abs(valor(total) - soma) > 1) throw new Error(`${arquivo}: soma das linhas (${soma}) diferente do total do relatório (${total})`);
  return { linhas, folha: texto.match(/(FN|FE|AD|FD|FC)-\d+ [^0-9]*?\d{2}/)?.[0] ?? null };
}

const perfis = JSON.parse(readFileSync("data/perfis.json", "utf8")).perfis;
const politicos = JSON.parse(readFileSync("data/politicos.json", "utf8"));
const idDoVereador = new Map();
// O perfil da Câmara traz o nome completo; o id do site vem do cadastro (nome ou apelido) ou, sem ele, do perfil.
const idPorApelido = new Map((politicos.vereadores ?? []).flatMap((v) => [v.nome, ...(v.apelidos ?? [])].map((n) => [dobra(n), v.id])));
for (const [slug, p] of Object.entries(perfis)) if (p.nomeCompleto) idDoVereador.set(dobra(p.nomeCompleto), idPorApelido.get(dobra(p.nome)) ?? slug);
for (const v of politicos.vereadores ?? []) if (v.nomeCompleto) idDoVereador.set(dobra(v.nomeCompleto), v.id);

const arquivos = existsSync(PASTA) ? readdirSync(PASTA).filter((f) => /^\d{4}-\d{2}-(agente-politico|comissionado|todos)\.zip$/.test(f)) : [];
// Por mês: o relatório "todos" (todos os vínculos) basta, porque o cargo diz quem é vereador e quem é de gabinete;
// os relatórios por vínculo, quando existem, completam (comissionados da Presidência e da diretoria).
const porMes = {};
for (const f of arquivos) {
  const [, mes, vinculo] = f.match(/^(\d{4}-\d{2})-(.+)\.zip$/);
  (porMes[mes] ??= {})[vinculo] = ler(`${PASTA}/${f}`);
}
const soma = (ls) => ({ pessoas: ls.length, bruto: Math.round(ls.reduce((a, l) => a + l.bruto, 0) * 100) / 100 });
const meses = {};
for (const mes of Object.keys(porMes).sort()) {
  const r = porMes[mes];
  const todos = r.todos?.linhas ?? null;
  const vereadores = r["agente-politico"]?.linhas ?? todos?.filter((l) => l.cargo === "VEREADOR") ?? [];
  const base = todos ?? r.comissionado?.linhas ?? [];
  const gab = base.filter((l) => GABINETE.has(l.cargo));
  const porCargo = {};
  for (const l of gab) (porCargo[l.cargo] ??= []).push(l);
  meses[mes] = {
    folha: (r.todos ?? r["agente-politico"] ?? r.comissionado).folha,
    todos: todos ? soma(todos) : null,
    vereadores: {
      ...soma(vereadores),
      porVereador: vereadores.map((l) => ({ id: idDoVereador.get(dobra(l.nome)) ?? null, nome: l.nome, bruto: l.bruto })),
    },
    gabinetes: { ...soma(gab), porCargo: Object.entries(porCargo).map(([cargo, ls]) => ({ cargo, ...soma(ls) })).sort((a, b) => b.bruto - a.bruto) },
    comissionados: r.comissionado ? soma(r.comissionado.linhas) : null,
  };
  const semId = meses[mes].vereadores.porVereador.filter((x) => !x.id).map((x) => x.nome);
  if (semId.length) console.warn(`  ${mes}: vereadores sem correspondência no cadastro: ${semId.join(", ")}`);
  console.log(`${mes}: ${vereadores.length} vereadores, ${gab.length} em cargos de gabinete (R$ ${meses[mes].gabinetes.bruto.toLocaleString("pt-BR")}), total ${meses[mes].todos?.bruto.toLocaleString("pt-BR") ?? "—"}`);
}

writeFileSync(
  "data/camara-folha.json",
  JSON.stringify(
    {
      fonte: "Câmara Municipal de Osasco, Portal do Cidadão: Folha de pagamento sintético (Transparência › Prestando Contas › Outras Informações › Quadro Geral de Pessoal)",
      url: "https://cmo.rdmsistemas.com.br/portalcidadao/",
      nota: "Valores brutos (proventos) da folha normal do mês, servidores ativos. O relatório não informa o gabinete de cada assessor.",
      meses,
    },
    null,
    1,
  ),
);
console.log(`Gravado data/camara-folha.json: ${Object.keys(meses).join(", ") || "nenhum mês"}`);
