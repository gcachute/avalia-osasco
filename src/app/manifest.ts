import type { MetadataRoute } from "next";

// Permite salvar o site na tela inicial do celular, com nome e ícone próprios.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "De Olho em OZ",
    short_name: "De Olho em OZ",
    description: "Os vereadores e o prefeito de Osasco em dados oficiais.",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0e1a3d",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
