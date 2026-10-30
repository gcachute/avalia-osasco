import type { MetadataRoute } from "next";
import { dados } from "@/lib/dados";

// Lista de páginas para os buscadores (gerada junto com o site).
export const dynamic = "force-static";
const SITE = "https://deolhoemoz.com.br";

export default function sitemap(): MetadataRoute.Sitemap {
  const quando = dados.geradoEm.slice(0, 10);
  const paginas = ["/", "/vereadores/", "/prefeito/", "/verbas/", "/historico/", "/mapa/", "/metodologia/"];
  return [
    ...paginas.map((p) => ({ url: `${SITE}${p}`, lastModified: quando, priority: p === "/" ? 1 : 0.8 })),
    ...dados.vereadores.map((v) => ({ url: `${SITE}/vereadores/${v.id}/`, lastModified: quando, priority: v.emExercicio ? 0.6 : 0.4 })),
  ];
}
