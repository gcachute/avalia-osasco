import { comBase, faixa, nota } from "@/lib/formato";
import { Foto } from "./Foto";
import { TextoRecolhivel } from "./TextoRecolhivel";

export function Avatar({ nome, foto, tamanho = 40 }: { nome: string; foto: string | null; tamanho?: number }) {
  const style = { width: tamanho, height: tamanho, fontSize: tamanho * 0.38 };
  return (
    <Foto
      nome={nome}
      foto={foto}
      alt=""
      style={style}
      className="shrink-0 rounded-full object-cover object-top ring-1 ring-slate-200"
      classeIniciais="grid shrink-0 place-items-center rounded-full bg-blue-100 font-semibold text-blue-900"
    />
  );
}

// Foto em formato retrato (3:4), para cards e cabeçalhos de perfil.
export function Retrato({ nome, foto, className = "" }: { nome: string; foto: string | null; className?: string }) {
  return (
    <div className={`relative aspect-[3/4] overflow-hidden bg-slate-100 ${className}`}>
      <Foto
        nome={nome}
        foto={foto}
        alt={`Foto de ${nome}`}
        className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105"
        classeIniciais="grid h-full w-full place-items-center bg-slate-100 text-4xl font-semibold text-blue-900"
      />
    </div>
  );
}

// Partido: logo oficial quando existe (fundo branco fixo, para aparecer também no tema escuro);
// sem logo, a sigla num selo neutro.
export function SeloPartido({ sigla, logo, grande = false }: { sigla: string | null; logo?: string | null; grande?: boolean }) {
  if (!sigla) return null;
  if (logo)
    return (
      <span
        className={`inline-flex shrink-0 items-center rounded-md px-1.5 ring-1 ring-slate-200 ${grande ? "h-8" : "h-6"}`}
        style={{ background: "#fff" }}
        title={sigla}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={comBase(logo)} alt={`Partido: ${sigla}`} className={`w-auto max-w-24 object-contain ${grande ? "h-6" : "h-4"}`} loading="lazy" />
      </span>
    );
  return (
    <span className={`inline-flex shrink-0 items-center rounded-md bg-slate-900 px-2 font-semibold text-white ${grande ? "h-8 text-sm" : "h-6 text-xs"}`}>{sigla}</span>
  );
}

// Nota como número, com um ponto da cor da faixa ao lado (verde, âmbar, vermelho); o nome da faixa vai no título.
const PONTO: Record<string, string> = { Bom: "bg-emerald-600", Regular: "bg-amber-500", Fraco: "bg-rose-600", "Sem nota": "bg-slate-300" };
export function NotaBadge({ valor, grande = false }: { valor: number | null; grande?: boolean }) {
  const f = faixa(valor);
  return (
    <span title={f.texto} className={`inline-flex items-center gap-1.5 font-semibold tabular-nums ${valor == null ? "text-slate-500" : "text-slate-950"} ${grande ? "font-serif text-4xl" : "text-base"}`}>
      <span className={`shrink-0 rounded-full ${PONTO[f.texto]} ${grande ? "h-3 w-3" : "h-2 w-2"}`} aria-hidden />
      {nota(valor)}
      {grande && valor != null && <span className="font-sans text-sm font-medium text-slate-500">/ 10</span>}
    </span>
  );
}

export function Barra({ valor, classe = "bg-blue-700", altura = "h-2" }: { valor: number; classe?: string; altura?: string }) {
  return (
    <div className={`${altura} w-full overflow-hidden rounded-sm bg-slate-100`}>
      <div className={`barra-anim h-full rounded-full ${classe}`} style={{ width: `${Math.max(0, Math.min(1, valor)) * 100}%` }} />
    </div>
  );
}

export function Cartao({ titulo, valor, detalhe }: { titulo: string; valor: React.ReactNode; detalhe?: React.ReactNode }) {
  return (
    <div className="revelar border-t border-slate-900 pt-3 pb-1">
      <div className="text-sm text-slate-600">{titulo}</div>
      <div className="mt-1 font-serif text-[1.75rem] leading-tight font-semibold tabular-nums text-slate-950">{valor}</div>
      {detalhe && <div className="mt-1 text-xs text-slate-500">{detalhe}</div>}
    </div>
  );
}

// Âncora de cada seção a partir do título ("Projetos apresentados (8)" -> "projetos-apresentados"), usada pelos atalhos
// de seção (NavegacaoPagina) e para mandar o endereço direto de uma parte da página.
const ancora = (t: string) =>
  t
    .replace(/\(.*?\)/g, "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function Secao({ titulo, children, id, subtitulo }: { titulo: string; children: React.ReactNode; id?: string; subtitulo?: React.ReactNode }) {
  return (
    <section id={id ?? ancora(titulo)} className="revelar mt-12 scroll-mt-28 border-t border-slate-900 pt-4 md:mt-16">
      <h2 className="text-2xl font-semibold text-slate-950 md:text-[1.75rem]">{titulo}</h2>
      {subtitulo && <p className="mt-1.5 max-w-3xl text-sm text-slate-600">{subtitulo}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/* Bloco padrão do site: toda página termina com ele. Descreve o que está na tela e como foi montado, sem concluir nada. */
export function ComoLer({ children }: { children: React.ReactNode }) {
  return (
    <Secao titulo="Como ler esta página" id="como-ler">
      <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">{children}</ul>
    </Secao>
  );
}

const ALVO_AVISO = {
  geral: {
    quem: "dos vereadores e da Prefeitura",
    dados: "presença, votações, projetos, comissões, documentos que citam bairros e contas oficiais",
    formas: "reuniões, atendimento à população, articulação com o governo e com outras esferas, emendas e acompanhamento nos bairros",
  },
  vereador: {
    quem: "deste(a) vereador(a)",
    dados: "presença nas sessões, votações, projetos, comissões e documentos que citam bairros",
    formas: "reuniões, atendimento à população, pedidos e articulação com a Prefeitura e outras esferas, emendas e acompanhamento nos bairros",
  },
  prefeito: {
    quem: "deste prefeito",
    dados: "contas fiscais, mínimos de saúde e educação, indicadores de resultado, transparência, obras e documentos que citam bairros",
    formas: "gestão das secretarias, convênios e parcerias, articulação com o Estado e a União, programas e serviços no dia a dia dos bairros",
  },
} as const;

/* Aviso de que os números são um recorte: só mostram o que está nos registros públicos coletados. */
export function AvisoParcial({ alvo = "geral", className = "" }: { alvo?: keyof typeof ALVO_AVISO; className?: string }) {
  const a = ALVO_AVISO[alvo];
  return (
    <aside role="note" className={`border-l-[3px] border-amber-500 bg-slate-50 py-3 pr-4 pl-4 text-sm text-slate-800 ${className}`}>
      <div className="max-w-4xl space-y-1">
        <p className="font-semibold">Atenção: este é um retrato parcial da atuação {a.quem}.</p>
        <TextoRecolhivel rotulo="Ler o aviso completo">
          <p>
            A análise usa única e exclusivamente os dados públicos que coletamos: {a.dados}. Ela não reflete 100% do trabalho de um político. Há
            muitas outras formas de agir por Osasco, inclusive indiretas, como {a.formas}, que não aparecem nesses registros. Leia os números como uma
            parte da atuação, não como o mandato inteiro.
          </p>
        </TextoRecolhivel>
      </div>
    </aside>
  );
}
