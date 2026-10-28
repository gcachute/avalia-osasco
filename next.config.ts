import type { NextConfig } from "next";

// O site é todo estático: `npm run build` gera a pasta out/, publicada pela Cloudflare Pages na raiz
// do domínio. BASE_PATH só é preciso para hospedar numa subpasta (como /<repositório> no GitHub Pages).
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: process.env.BASE_PATH || "",
  // O mesmo prefixo, visível no navegador, para montar o endereço das fotos salvas em public/.
  env: { NEXT_PUBLIC_BASE_PATH: process.env.BASE_PATH || "" },
  images: { unoptimized: true },
};

export default nextConfig;
