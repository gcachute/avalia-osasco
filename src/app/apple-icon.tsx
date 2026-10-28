import { ImageResponse } from "next/og";

// Ícone de quem salva o site na tela inicial do celular (iPhone e Android): a marca OZ.
export const dynamic = "force-static";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const MARCA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="#0e1a3d"/><circle cx="16.4" cy="24" r="8.3" fill="none" stroke="#fff" stroke-width="4.8"/><circle cx="17.9" cy="23" r="4.3" fill="#f26419"/><circle cx="18.6" cy="22.5" r="1.9" fill="#0e1a3d"/><circle cx="19.6" cy="21.2" r=".9" fill="#fff"/><path d="M28.2 16.1H39.6L28.4 31.9H39.8" fill="none" stroke="#fff" stroke-width="4.8" stroke-linejoin="round" stroke-linecap="round"/></svg>`;

export default function Icone() {
  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`data:image/svg+xml;utf8,${encodeURIComponent(MARCA)}`} width={180} height={180} alt="" />
    ),
    size,
  );
}
