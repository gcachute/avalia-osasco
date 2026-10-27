"use client";

import { useEffect, useRef, useState } from "react";
import { comBase, iniciais } from "@/lib/formato";

// Foto com reserva: se o endereço não existir ou a imagem não carregar (por exemplo, de quem já saiu da
// Câmara e não tem mais página no site), mostra as iniciais no lugar da imagem quebrada.
export function Foto({
  nome,
  foto,
  alt,
  className,
  classeIniciais,
  style,
}: {
  nome: string;
  foto: string | null;
  alt: string;
  className: string;
  classeIniciais: string;
  style?: React.CSSProperties;
}) {
  const [falhou, setFalhou] = useState(false);
  const img = useRef<HTMLImageElement>(null);

  // A imagem pode falhar antes de o React assumir a página; nesse caso o onError não dispara.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setFalhou(true);
  }, []);

  if (!foto || falhou)
    return (
      <span style={style} className={classeIniciais} aria-hidden>
        {iniciais(nome)}
      </span>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={img} src={comBase(foto)} alt={alt} loading="lazy" style={style} className={className} onError={() => setFalhou(true)} />;
}
