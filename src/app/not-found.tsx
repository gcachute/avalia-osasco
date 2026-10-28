import Link from "next/link";
import type { Metadata } from "next";
import { MarcaOZ } from "@/components/Logo";

export const metadata: Metadata = { title: "Página não encontrada" };

export default function NaoEncontrada() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <MarcaOZ className="mx-auto h-16 w-16" />
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">Página não encontrada</h1>
      <p className="mt-2 text-slate-600">O endereço pode ter mudado ou estar digitado errado.</p>
      <div className="mt-6 flex justify-center gap-3 text-sm">
        <Link href="/" className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700">
          Ir para o painel
        </Link>
        <Link href="/metodologia" className="rounded-xl px-4 py-2 font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
          Metodologia
        </Link>
      </div>
    </div>
  );
}
