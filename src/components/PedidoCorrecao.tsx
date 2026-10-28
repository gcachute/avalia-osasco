"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Botão que abre uma janela com o pedido de correção. O envio vai para /api/correcao (functions/api/correcao.js),
// que abre uma issue no GitHub do projeto. Se o envio automático falhar, oferece abrir a mesma issue já preenchida
// direto no GitHub (aí a pessoa precisa de cadastro lá).
// Os textos da janela não usam termos de programação: quem visita não precisa saber o que é GitHub ou issue.
const NOVA_ISSUE = "https://github.com/gcachute/avalia-osasco/issues/new";
type Estado = { tipo: "editando" } | { tipo: "enviando" } | { tipo: "ok"; numero: number; url: string } | { tipo: "erro"; mensagem: string };

export function PedidoCorrecao({ children, className }: { children: React.ReactNode; className?: string }) {
  const janela = useRef<HTMLDialogElement>(null);
  const aberto = useRef(0);
  const [estado, setEstado] = useState<Estado>({ tipo: "editando" });
  const [campos, setCampos] = useState({ titulo: "", pagina: "", descricao: "", fonte: "" });
  const origem = useRef(""); // endereço da página onde a janela foi aberta, enviado junto sem aparecer no formulário
  // A janela vai direto no <body>: o botão pode estar dentro de um parágrafo (rodapé), e um <dialog> dentro de <p> é HTML inválido.
  const [montado, setMontado] = useState(false);
  const tituloId = useId();
  useEffect(() => setMontado(true), []);
  const muda = (k: keyof typeof campos) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setCampos({ ...campos, [k]: e.target.value });

  const abrir = () => {
    aberto.current = Date.now();
    if (estado.tipo !== "editando") setEstado({ tipo: "editando" });
    origem.current = window.location.href.split("#")[0];
    janela.current?.showModal();
  };

  const corpoIssue = () =>
    [
      `**Página:** ${campos.pagina || "não informada"}`,
      `**Onde conferir:** ${campos.fonte || "não informado"}`,
      `**Enviado de:** ${origem.current}`,
      "",
      campos.descricao,
    ].join("\n");
  const linkGithub = () => `${NOVA_ISSUE}?${new URLSearchParams({ title: campos.titulo, body: corpoIssue(), labels: "correção" })}`;

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEstado({ tipo: "enviando" });
    try {
      const site = (e.currentTarget.elements.namedItem("site") as HTMLInputElement | null)?.value ?? "";
      const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/correcao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...campos, origem: origem.current, site, aberto: aberto.current }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.url) {
        setEstado({ tipo: "ok", numero: d.numero, url: d.url });
        setCampos({ titulo: "", pagina: "", descricao: "", fonte: "" });
      } else setEstado({ tipo: "erro", mensagem: d.erro ?? "Não foi possível enviar agora." });
    } catch {
      setEstado({ tipo: "erro", mensagem: "Não foi possível enviar agora. Confira sua internet e tente de novo." });
    }
  };

  const rotulo = "block text-sm font-medium text-slate-800";
  const caixa =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";

  return (
    <>
      <button type="button" onClick={abrir} className={className}>
        {children}
      </button>
      {montado &&
        createPortal(
          <dialog
            ref={janela}
            aria-labelledby={tituloId}
            className="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm"
            onClick={(e) => e.target === janela.current && janela.current?.close()}
          >
            <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <h2 id={tituloId} className="text-lg font-semibold text-slate-900">
                  Pedir uma correção
                </h2>
                <button
                  type="button"
                  onClick={() => janela.current?.close()}
                  className="-m-1 rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                  aria-label="Fechar"
                >
                  <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
                    <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {estado.tipo === "ok" ? (
                <div className="mt-4 space-y-4">
                  <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
                    Pedido nº {estado.numero} registrado. Obrigado! Toda correção é feita na origem dos dados e vale para todo o site.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={estado.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      Acompanhar o pedido
                    </a>
                    <button
                      type="button"
                      onClick={() => setEstado({ tipo: "editando" })}
                      className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
                    >
                      Enviar outro
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={enviar} className="mt-3 space-y-4">
                  <label className={rotulo}>
                    Título
                    <input
                      required
                      minLength={5}
                      maxLength={120}
                      value={campos.titulo}
                      onChange={muda("titulo")}
                      placeholder="Ex.: presença de fulano na sessão de 12/03"
                      className={caixa}
                    />
                  </label>
                  <label className={rotulo}>
                    Descrição
                    <textarea
                      required
                      minLength={20}
                      maxLength={4000}
                      rows={5}
                      value={campos.descricao}
                      onChange={muda("descricao")}
                      placeholder="O que o site mostra, qual é o valor certo e onde você viu isso."
                      className={caixa}
                    />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={rotulo}>
                      Página <span className="font-normal text-slate-500">(opcional)</span>
                      <input
                        maxLength={300}
                        value={campos.pagina}
                        onChange={muda("pagina")}
                        placeholder="Ex.: perfil de um vereador"
                        className={caixa}
                      />
                    </label>
                    <label className={rotulo}>
                      Onde conferir <span className="font-normal text-slate-500">(opcional)</span>
                      <input maxLength={500} value={campos.fonte} onChange={muda("fonte")} placeholder="Endereço do site oficial" className={caixa} />
                    </label>
                  </div>
                  {/* Campo que pessoas não veem e robôs preenchem. */}
                  <input
                    type="text"
                    name="site"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden
                    className="absolute -left-[9999px] h-px w-px opacity-0"
                  />

                  {estado.tipo === "erro" && (
                    <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="alert">
                      {estado.mensagem} Se preferir,{" "}
                      <a href={linkGithub()} target="_blank" rel="noreferrer" className="font-semibold underline">
                        envie pela lista pública de pedidos
                      </a>{" "}
                      (pede um cadastro gratuito; o que você escreveu já vai junto).
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => janela.current?.close()}
                      className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={estado.tipo === "enviando"}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                    >
                      {estado.tipo === "enviando" ? "Enviando…" : "Enviar pedido"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </dialog>,
          document.body,
        )}
    </>
  );
}
