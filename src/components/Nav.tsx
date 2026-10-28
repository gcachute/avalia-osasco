"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav({ itens }: { itens: { href: string; nome: string }[] }) {
  const caminho = usePathname();
  const ativo = (href: string) => (href === "/" ? caminho === "/" : caminho.startsWith(href));
  return (
    <>
      {itens.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={ativo(n.href) ? "page" : undefined}
          className={`shrink-0 rounded-md px-3 py-1.5 transition ${ativo(n.href) ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
        >
          {n.nome}
        </Link>
      ))}
    </>
  );
}
