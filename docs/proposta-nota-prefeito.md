# Proposta: nota do prefeito

Status: **os cinco pilares estão implementados** (`scripts/lib/{fiscal,iegm,resultados,transparencia}.mjs`, página /prefeito). A nota é provisória enquanto o IEG-M de ano-base 2025 (pilar C) não for publicado. Ficaram de fora o Indicador Criança Alfabetizada (D) e as metas do PPA (E).

## Princípios

1. **Só dados oficiais e auditáveis.** Cada número precisa ter um link para a fonte: Tesouro, TCE-SP, INEP, DataSUS ou a própria Prefeitura.
2. **Só o mandato atual.** Conta a partir de 2025. O ano de 2024 (gestão anterior) serve de linha de base para medir a evolução.
3. **Comparação com cidades parecidas.** Cidades paulistas grandes: Guarulhos, Campinas, São Bernardo, Santo André, São José dos Campos, Sorocaba e Ribeirão Preto. Isso evita punir o prefeito por algo que afetou todo mundo, como uma crise ou uma mudança federal.
4. **Defasagem explícita.** Cada indicador mostra o ano-base. O IEG-M divulgado em 2026, por exemplo, mede 2025.
5. **Nota provisória enquanto faltar dado.** A nota só aparece quando houver dados para pelo menos 70% do peso. No primeiro ano, ela aparece marcada como "provisória".
6. **Validação automática.** Valores impossíveis são descartados e sinalizados, não usados. Exemplo real: o SICONFI mostra Ribeirão Preto com 0,2% em saúde.

## Pilares e pesos

| Pilar | Peso | Fonte | Como pontua |
|---|---|---|---|
| **A. Gestão fiscal** | 25% | Tesouro/SICONFI (RREO e RGF), API aberta; CAPAG do Tesouro | Gasto com pessoal/RCL contra os limites da LRF (alerta 48,6%, prudencial 51,3%, máximo 54%), resultado primário contra a meta da LDO, investimento como % da despesa, restos a pagar não processados como % da despesa, nota CAPAG |
| **B. Mínimos constitucionais** | 10% | SICONFI (RREO, Anexo 14) | Saúde ≥ 15%, educação ≥ 25%, FUNDEB ≥ 70% na remuneração. Descumprir zera o pilar e gera um alerta. Acima do mínimo, a pontuação é relativa aos pares |
| **C. Qualidade da gestão (IEG-M)** | 25% | TCE-SP, Índice de Efetividade da Gestão Municipal (painel público, anual) | O painel só publica faixas (A a C), não a nota numérica. A nota usa o valor padrão que o TCE-SP dá a cada faixa do índice geral (A = 95%, B+ = 82,5%, B = 67,5%, C+ = 55%, C = 25%) |
| **D. Resultados para o cidadão** | 25% | INEP (IDEB/SAEB rede municipal, Criança Alfabetizada), DataSUS (mortalidade infantil SIM/SINASC, cobertura vacinal SI-PNI, cobertura da atenção primária) | Evolução contra a linha de base de 2024 e posição entre os pares |
| **E. Transparência e entregas** | 15% | Radar da Transparência Pública (PNTP/Atricon, avaliado pelo TCE-SP), painel de obras paralisadas e atrasadas do TCE-SP, relatório de avaliação do PPA 2026–2029 | Índice de transparência do portal, obras paralisadas ou atrasadas (quantidade e valor), percentual de metas físicas do PPA cumpridas |

### Mostrado, mas fora da nota

- **Promessas de campanha.** O plano de governo registrado no TSE (DivulgaCandContas) vira uma lista de promessas com status "cumprida", "em andamento" ou "não iniciada". Cada status precisa de uma evidência com link. Fica fora da nota porque classificar promessas envolve julgamento.
- **Relação com a Câmara.** Projetos enviados, vetos e decretos de crédito adicional, que o site já mostra. Vetar não é bom nem ruim em si.
- **Parecer do TCE-SP sobre as contas.** Sai com cerca de dois anos de atraso. Um parecer desfavorável aparece como alerta em destaque.

## Primeiros números (2025, SICONFI, dados entregues pelos municípios)

> Nesta prévia, "investimento" era a despesa de capital líquida, que inclui amortização de dívida. A versão implementada usa só os investimentos empenhados (Anexo 1 do RREO). Por isso Osasco cai de 10,0% para 5,4%.

| Cidade | Saúde (mín. 15%) | Educação (mín. 25%) | Pessoal/RCL | Investimento/despesa | Resultado primário × meta LDO |
|---|---|---|---|---|---|
| **Osasco** | **17,3%** | **30,5%** | **41,6%** | **10,0%** | **−R$ 1 mi × meta R$ 195 mi** |
| S. Bernardo | 20,7% | 28,4% | 31,4% | 11,7% | R$ 369 mi × R$ 463 mi |
| Santo André | 24,2% | 25,1% | 28,0% | 12,6% | R$ 151 mi × R$ 240 mi |
| S. José dos Campos | 22,8% | 25,3% | 27,0% | 7,2% | R$ 89 mi × R$ 90 mi |
| Sorocaba | 23,8% | 28,2% | 37,5% | 4,4% | −R$ 41 mi × −R$ 75 mi |
| Guarulhos | n/d | n/d | 41,0% | 9,5% | R$ 234 mi × −R$ 234 mi |
| Campinas | n/d | n/d | 33,5% | 6,9% | R$ 412 mi × −R$ 365 mi |

Primeira leitura de Osasco em 2025:
- Gasta acima do mínimo em educação, mais que todas as cidades comparadas.
- Gasta pouco acima do mínimo em saúde, menos que todas as cidades comparadas.
- O gasto com pessoal é o mais alto entre as cidades comparadas que reportaram o dado, mas ainda está abaixo do limite de alerta.
- Investe bem.
- Ficou longe da meta de resultado primário da LDO.

Esses números são preliminares e precisam ser conferidos com o RREO publicado pela própria Prefeitura.

## Ordem de implementação sugerida

1. **Pilares A e B**: automatizar com a API do SICONFI. Já foi testada e funciona sem cadastro: `apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo` e `/rgf`, código IBGE de Osasco 3534401.
2. **Pilar C**: IEG-M. Baixar do painel do TCE-SP ou digitar uma vez por ano, já que é um número por área.
3. **Pilar E**: obras do TCE-SP (exportação em planilha) e índice PNTP.
4. **Pilar D**: INEP e DataSUS. É o que dá mais trabalho, porque são bases grandes e com atraso de 1 a 2 anos.
5. **Promessas**: montar a lista a partir do plano de governo no TSE.

## A verificar

- Se a Lei Orgânica de Osasco obriga um **Programa de Metas**, como em São Paulo. Se obrigar, ele vira a melhor régua para o pilar E.
- O texto final da lei do **PPA 2026–2029** e se a Prefeitura publica um relatório anual de avaliação das metas. As audiências públicas aconteceram em maio e junho de 2025.
- O endereço atual do **Portal da Transparência** da Prefeitura. O endereço `osasco.sp.gov.br/transparencia/` deu erro 404.
- As notas de Osasco no **IEG-M** (ano-base 2025, divulgadas em outubro de 2026) e no **PNTP**.
