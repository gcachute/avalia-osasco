import { ImageResponse } from "next/og";

// Imagem que aparece quando alguém compartilha o site (WhatsApp, redes sociais): a marca OZ e o nome.
export const dynamic = "force-static";
export const alt = "De Olho em OZ: os políticos de Osasco em dados oficiais";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MARCA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 0C42.5 0 48 5.5 48 24S42.5 48 24 48 0 42.5 0 24 5.5 0 24 0Z" fill="#1b2c66"/><circle cx="16.4" cy="24" r="8.3" fill="none" stroke="#fff" stroke-width="4.8"/><circle cx="17.9" cy="23" r="4.3" fill="#f26419"/><circle cx="18.6" cy="22.5" r="1.9" fill="#0e1a3d"/><circle cx="19.6" cy="21.2" r=".9" fill="#fff"/><path d="M28.2 16.1H39.6L28.4 31.9H39.8" fill="none" stroke="#fff" stroke-width="4.8" stroke-linejoin="round" stroke-linecap="round"/></svg>`;

export default function Imagem() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "#0e1a3d", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <span style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2 }}>De Olho em</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/svg+xml;utf8,${encodeURIComponent(MARCA)}`} width={120} height={120} alt="" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span style={{ fontSize: 46, fontWeight: 600, lineHeight: 1.2 }}>Os vereadores e o prefeito de Osasco em dados oficiais</span>
          <span style={{ fontSize: 30, color: "#cbd5e1" }}>Presença, projetos, contas públicas e o retrato de cada bairro · deolhoemoz.com.br</span>
        </div>
      </div>
    ),
    size,
  );
}
