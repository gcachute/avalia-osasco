import { campanhas } from "@/components/Campanha";
import { rotuloPartido } from "@/lib/partidos";

export type Candidatura = {
  ano: number;
  cargo: string;
  local: string;
  partido: string;
  numero: string;
  urna: string;
  situacao: string | null;
  resultado: "Eleito" | "Suplente" | "Não eleito" | "Foi ao 2º turno" | null;
  votos: number | null;
  votos2turno?: number;
};

const dados = campanhas as unknown as {
  trajetoria?: Record<string, Candidatura[]>;
  fonteTrajetoria?: { fonte: string; url: string; coletadoEm: string } | null;
};
export const trajetoriaDe = (id: string) => dados.trajetoria?.[id] ?? null;

// O cargo pela instituição, para o rótulo não depender de gênero.
const CASA: Record<string, string> = {
  Vereador: "Câmara Municipal",
  Prefeito: "Prefeitura",
  "Vice-prefeito": "Vice na Prefeitura",
  "Deputado estadual": "Assembleia Legislativa",
  "Deputado federal": "Câmara dos Deputados",
  Senador: "Senado",
  Governador: "Governo do Estado",
  "Vice-governador": "Vice no Governo do Estado",
  "1º suplente de senador": "Suplência no Senado",
  "2º suplente de senador": "Suplência no Senado",
};
const RESULTADO: Record<string, { nome: string; cor: string }> = {
  Eleito: { nome: "Venceu", cor: "bg-blue-50 text-blue-900" },
  Suplente: { nome: "Suplência", cor: "bg-amber-50 text-amber-900" },
  "Não eleito": { nome: "Não obteve vaga", cor: "bg-slate-100 text-slate-700" },
  "Foi ao 2º turno": { nome: "Foi ao 2º turno", cor: "bg-slate-100 text-slate-700" },
};
const nomeUrna = (s: string) =>
  s
    .toLowerCase()
    .replace(/(^|\s)(\p{L})/gu, (m) => m.toUpperCase())
    .replace(/(De|Da|Do|Dos|Das|E)/g, (m) => m.toLowerCase());
const semResultado = (c: Candidatura) => (c.situacao && /INAPTO|INDEFERIDO|CANCELAMENTO|RENÚNCIA/.test(c.situacao) ? "Candidatura não seguiu" : "Sem resultado registrado");

// Todas as candidaturas da pessoa, da mais antiga para a mais recente: em Osasco (com os votos na cidade) e em São Paulo
// (Assembleia, Câmara dos Deputados, Senado, Governo). Só fatos do TSE; nada de leitura.
export function Trajetoria({ id }: { id: string }) {
  const lista = trajetoriaDe(id);
  if (!lista?.length) return null;
  const vitorias = lista.filter((c) => c.resultado === "Eleito").length;
  const fonte = dados.fonteTrajetoria;
  return (
    <div>
      <p className="text-sm text-slate-700">
        {lista.length === 1 ? "1 candidatura" : `${lista.length} candidaturas`} desde {lista[0].ano}, {vitorias === 1 ? "1 vitória" : `${vitorias} vitórias`}.
      </p>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((c, k) => {
          const r = c.resultado ? RESULTADO[c.resultado] : null;
          return (
            <li key={k} className="revelar cartao-seq flex gap-3 rounded-2xl bg-slate-50 px-4 py-3" style={{ ["--i" as string]: k % 3 }}>
              <span className="font-serif text-[1.6rem] leading-none tabular-nums text-slate-950">{c.ano}</span>
              <span className="min-w-0 flex-1 text-sm">
                <span className="block font-bold text-slate-950">
                  {CASA[c.cargo] ?? c.cargo}
                  {c.local === "São Paulo" && c.cargo !== "Governador" && c.cargo !== "Vice-governador" ? ", por São Paulo" : c.local === "Osasco" ? " de Osasco" : ""}
                </span>
                <span className="block text-slate-600">
                  {rotuloPartido(c.partido, c.ano)}
                  {c.numero ? `, número ${c.numero}` : ""}
                  {c.urna ? `, como ${nomeUrna(c.urna)}` : ""}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r?.cor ?? "bg-slate-100 text-slate-600"}`}>{r?.nome ?? semResultado(c)}</span>
                  {c.votos != null && c.votos > 0 && <span className="text-xs tabular-nums text-slate-600">{c.votos.toLocaleString("pt-BR")} votos</span>}
                  {c.votos2turno != null && <span className="text-xs tabular-nums text-slate-600">{c.votos2turno.toLocaleString("pt-BR")} no 2º turno</span>}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      {fonte && (
        <p className="mt-3 text-xs text-slate-500">
          Fonte:{" "}
          <a href={fonte.url} className="underline">
            {fonte.fonte}
          </a>
          , de 1996 a 2026 (o resultado de 2026 é o publicado pelo TSE até {fonte.coletadoEm.split("-").reverse().join("/")}). Votos contados em Osasco; nas eleições estaduais e
          federais aparece só o resultado.
        </p>
      )}
    </div>
  );
}
