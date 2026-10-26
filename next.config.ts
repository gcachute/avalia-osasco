import type { NextConfig } from "next";

// O site é todo estático: `npm run build` gera a pasta out/, que pode ir para o GitHub Pages
// ou qualquer hospedagem de arquivos. No GitHub Pages o site fica em /<nome-do-repositório>,
// então o workflow define BASE_PATH.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: process.env.BASE_PATH || "",
  images: { unoptimized: true },
};

export default nextConfig;
