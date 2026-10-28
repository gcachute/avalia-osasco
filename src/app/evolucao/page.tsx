import type { Metadata } from "next";
import Link from "next/link";
import { Redirecionar } from "@/components/Redirecionar";

// Endereço antigo da página Histórico. O public/_redirects resolve isso na Cloudflare; esta página cobre o resto.
export const metadata: Metadata = { title: "Histórico", robots: { index: false } };

export default function Evolucao() {
  return (
    <p className="text-slate-600">
      <Redirecionar para="/historico/" />
      Esta página agora se chama{" "}
      <Link href="/historico" className="underline">
        Histórico
      </Link>
      .
    </p>
  );
}
