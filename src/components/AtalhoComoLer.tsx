"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Atalho no topo de toda página para o bloco "Como ler esta página", que fica no fim dela.
export function AtalhoComoLer() {
  const caminho = usePathname();
  const [tem, setTem] = useState(false);
  useEffect(() => setTem(!!document.getElementById("como-ler")), [caminho]);
  if (!tem) return null;
  return (
    <p className="mb-2 text-right text-xs">
      <a href="#como-ler" className="font-medium text-blue-800 underline">
        Como ler esta página
      </a>
    </p>
  );
}
