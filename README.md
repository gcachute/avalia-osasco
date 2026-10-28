# De Olho em OZ

Site que avalia os vereadores e o prefeito de Osasco com dados oficiais da Câmara Municipal. Foi inspirado em sites como o seuimposto.com.

## Como funciona

1. **Coleta** (`npm run coletar`): baixa as planilhas de [Registros de Presença e Votação](https://www.osasco.sp.leg.br/registros-de-presenca-e-votacao) para `data/raw/`. O script pula o que já foi baixado e espera 4 s entre os pedidos. O servidor da Câmara bloqueia quem faz pedidos rápido demais. Se ele bloquear, rode de novo mais tarde.
2. **Processamento** (`npm run dados`): lê as planilhas e gera `src/data/dados.json`, com presença, pontualidade, votos nominais, projetos, moções, leis sancionadas, vetos e itens adiados por ausência do autor. A nota é calculada nessa etapa.
3. **Dados fiscais do prefeito** (`npm run coletar:fiscal`): baixa da API do SICONFI (Tesouro Nacional) os relatórios fiscais de Osasco e das cidades comparadas para `data/siconfi/`. O processamento calcula os pilares A (gestão fiscal) e B (mínimos constitucionais), e as regras estão em `scripts/lib/fiscal.mjs`.
4. **IEG-M** (`npm run coletar:iegm`): baixa do painel público do TCE-SP as faixas do IEG-M de Osasco e das cidades comparadas para `data/iegm/`. Isso alimenta o pilar C, com regras em `scripts/lib/iegm.mjs`.
5. **Resultados e transparência** (`npm run coletar:resultados` e `npm run coletar:transparencia`): baixam o IDEB (INEP), a mortalidade infantil (DataSUS/TabNet), o índice de transparência do PNTP (Atricon) e as obras do Painel de Obras do TCE-SP. Isso alimenta os pilares D e E, com regras em `scripts/lib/resultados.mjs` e `scripts/lib/transparencia.mjs`. Os arquivos grandes (IDEB e PNTP, cerca de 350 MB) ficam em `data/cache/`, fora do git. `npm run coletar:prefeito` roda as quatro coletas do prefeito.
6. **Site** (`npm run dev` / `npm run build`): Next.js estático com o ranking, uma página por vereador, a página do prefeito e a metodologia.

## Nota dos vereadores

Cinco pilares, com regras em `scripts/lib/vereadores.mjs`:
- **A, assiduidade:** faltas justificadas não contam contra.
- **B, legislação:** projetos simbólicos valem 0,2.
- **C, comissões e Mesa Diretora.**
- **D, custo do mandato:** ainda sem fonte aberta.
- **E, itens adiados por falta do autor.**

Partidos, fotos, contatos, comissões e Mesa vêm de `npm run coletar:vereadores`.

## Arquivos que você edita

- `data/politicos.json`: partido, foto (URL), link do perfil oficial e apelidos de cada político. Os apelidos servem para nomes escritos de outro jeito nas planilhas. Quando o processamento avisa "Autores não reconhecidos", adicione o nome aqui.
- `data/pares.json`: cidades comparadas com Osasco e anos baixados do SICONFI.
- `data/metodologia.json`: pesos da nota, tipos de proposição que contam como projeto, mínimo de sessões e início da legislatura.

## Ver e publicar

O site é estático: `npm run build` gera a pasta `out/`.

- **Ver no computador:** rode `npm run dev` e abra http://localhost:3000.
- **Cloudflare Pages:** o projeto está ligado a este repositório e publica sozinho a cada push na `main` (inclusive os commits da atualização mensal de dados). Cada branch e PR ganha um endereço de prévia. Configuração do projeto: comando de build `npm run build`, pasta de saída `out`, sem `BASE_PATH` (o site fica na raiz do domínio). A versão do Node vem de `.node-version`.

## Pendências

- Vereadores: faltam fontes abertas para requerimentos ao Executivo (a busca da Câmara exige captcha) e para o custo dos gabinetes (pilar D).
- Prefeito: os cinco pilares estão implementados. A nota atual é provisória (75% do peso) porque o pilar C espera o IEG-M de ano-base 2025, ainda não publicado pelo TCE-SP. Rode `npm run coletar:iegm` de tempos em tempos.
- Pilar D: também dá para incluir o Indicador Criança Alfabetizada (INEP) quando a planilha municipal for localizada.
- Pilar E: falta o cumprimento das metas do PPA 2026–2029, porque não foi encontrado relatório de avaliação em formato aberto. Ver `docs/proposta-nota-prefeito.md`.
