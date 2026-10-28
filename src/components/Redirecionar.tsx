"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Leva para outro endereço do site assim que a página abre (endereços antigos que mudaram de nome).
export function Redirecionar({ para }: { para: string }) {
  const router = useRouter();
  useEffect(() => router.replace(para), [router, para]);
  return null;
}
