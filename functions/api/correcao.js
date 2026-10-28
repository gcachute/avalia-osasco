// Pedido de correção enviado pelo formulário do site (componente PedidoCorrecao): vira uma issue no GitHub.
// Roda como Pages Function na Cloudflare (o wrangler publica a pasta functions/ junto com out/).
// O token do GitHub fica só na Cloudflare, no segredo GITHUB_TOKEN (fine-grained, só este repositório,
// permissão Issues: escrita); o workflow publicar.yml o copia do secret GH_ISSUES_TOKEN do repositório.
const REPO = "gcachute/avalia-osasco";
const ROTULO = "correção";
const LIMITES = { titulo: [5, 120], descricao: [20, 4000], pagina: [0, 300], fonte: [0, 500] };
const TEMPO_MINIMO = 4000; // ms com o formulário aberto; menos que isso é robô

const resposta = (status, corpo) => new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
const limpar = (s) => String(s ?? "").replace(/\r\n/g, "\n").trim();
// Evita que um pedido marque pessoas (@nome) ou feche issues (#123 com "fixes") no GitHub.
const neutro = (s) => s.replace(/@/g, "@​").replace(/\b(close[sd]?|fix(e[sd])?|resolve[sd]?)\b(\s*#)/gi, "$1​$3");

export async function onRequestPost({ request, env }) {
  let d;
  try {
    d = await request.json();
  } catch {
    return resposta(400, { erro: "Pedido em formato inválido." });
  }
  // Campo escondido que só robôs preenchem, e tempo mínimo de preenchimento.
  if (d.site || !(Number(d.aberto) > 0) || Date.now() - Number(d.aberto) < TEMPO_MINIMO) return resposta(400, { erro: "Não foi possível enviar. Tente de novo em alguns segundos." });

  const campos = Object.fromEntries(Object.keys(LIMITES).map((k) => [k, limpar(d[k])]));
  for (const [k, [min, max]] of Object.entries(LIMITES)) {
    if (campos[k].length < min || campos[k].length > max) {
      const nome = { titulo: "O título", descricao: "A descrição", pagina: "A página", fonte: "O link da fonte" }[k];
      return resposta(400, { erro: `${nome} precisa ter entre ${min} e ${max} caracteres.` });
    }
  }
  if (campos.fonte && !/^https?:\/\/\S+$/i.test(campos.fonte)) return resposta(400, { erro: "O link da fonte precisa começar com http:// ou https://." });
  if (!env.GITHUB_TOKEN) return resposta(503, { erro: "O envio automático não está configurado neste endereço.", semToken: true });

  const corpo = [
    `**Página:** ${campos.pagina ? neutro(campos.pagina) : "não informada"}`,
    `**Fonte oficial:** ${campos.fonte ? neutro(campos.fonte) : "não informada"}`,
    "",
    neutro(campos.descricao),
    "",
    "---",
    `Enviado pelo formulário de correção do site em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`,
  ].join("\n");

  const gh = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "deolhoemoz-correcoes",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: neutro(campos.titulo), body: corpo, labels: [ROTULO] }),
  });
  if (!gh.ok) {
    console.log("GitHub recusou a issue", gh.status, (await gh.text()).slice(0, 300));
    return resposta(502, { erro: "O GitHub não aceitou o pedido agora. Tente de novo mais tarde." });
  }
  const issue = await gh.json();
  return resposta(201, { numero: issue.number, url: issue.html_url });
}
