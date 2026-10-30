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

export function NotaBadge({ valor, grande = false }: { valor: number | null; grande?: boolean }) {
  const f = faixa(valor);
  return (
    <span className={`inline-flex items-baseline gap-1 rounded-lg px-2.5 py-1 font-semibold tabular-nums ring-1 ring-inset ${f.classe} ${grande ? "text-3xl" : "text-base"}`}>
      {nota(valor)}
      {grande && valor != null && <span className="text-sm font-medium">/ 10</span>}
    </span>
  );
}

export function Barra({ valor, classe = "bg-blue-700", altura = "h-2" }: { valor: number; classe?: string; altura?: string }) {
  return (
    <div className={`${altura} w-full overflow-hidden rounded-full bg-slate-100`}>
      <div className={`barra-anim h-full rounded-full ${classe}`} style={{ width: `${Math.max(0, Math.min(1, valor)) * 100}%` }} />
    </div>
  );
}

export function Cartao({ titulo, valor, detalhe }: { titulo: string; valor: React.ReactNode; detalhe?: React.ReactNode }) {
  return (
    <div className="revelar rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="text-sm text-slate-500">{titulo}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{valor}</div>
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
    <section id={id ?? ancora(titulo)} className="revelar mt-10 scroll-mt-28 md:mt-12">
      <h2 className="text-xl font-semibold text-slate-900">{titulo}</h2>
      {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}
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
    <aside role="note" className={`flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 ${className}`}>
      <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
      <div className="space-y-1">
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
