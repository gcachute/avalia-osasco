# Arquivos coletados à mão

Coloque aqui os arquivos baixados manualmente dos portais da Câmara. Esses portais têm captcha ou chamadas assinadas que impedem coleta automática. O `npm run dados` vai ler esta pasta quando o formato estiver definido.

## 1. Folha de pagamento por gabinete (pilar D, custo do mandato)

Portal: https://cmo.rdmsistemas.com.br/portalcidadao/ (é o link "Folha de Pagamento" do site da Câmara)

Caminho: **Transparência → Prestando Contas → Outras Informações → Quadro Geral de Pessoal → Folha de pagamento sintético**

Para cada mês, gere:

- Ano e mês · Folha: a `FN - FOLHA NORMAL` do mês
- Situação: **Ativo** · Vínculo: **em branco** (todos)
- Formato: **Html** → Visualizar (libere as janelas pop-up do navegador)

O portal devolve um `.zip` com as páginas do relatório. Salve em `data/cache/folha/AAAA-MM-todos.zip` (essa pasta não vai para o git, porque o arquivo tem nomes de servidores) e rode `npm run ler:folha` e depois `npm run dados`. Também são aceitos `AAAA-MM-agente-politico.zip` e `AAAA-MM-comissionado.zip`.

O que o relatório tem e o que não tem (conferido em 27/10/2026):

- tem, por pessoa: matrícula, nome, proventos, descontos, líquido, admissão e **cargo**;
- **não tem a lotação** (o gabinete de cada assessor). Por isso o site mostra os totais por cargo e uma média por gabinete, não o custo de cada gabinete.

Se der **"Erro de transporte HTTP: Connection timed out"** (resposta 409), a falha é do servidor da Câmara; tente de novo mais tarde.

### Recurso à Ouvidoria (pedido de 27/10/2026)

A resposta de 27/10/2026 indicou o Portal do Cidadão, mas o relatório de lá não informa o gabinete. Texto sugerido para responder ao mesmo protocolo (prazo de recurso: 10 dias, art. 15 da Lei 12.527/2011):

> Prezados, agradeço a resposta ao meu pedido de acesso à informação de 27/10/2026 (informe aqui o número do protocolo). O relatório "Folha de pagamento sintético" do Portal do Cidadão informa cargo e remuneração, mas não informa a lotação de cada servidor, e por isso não atende à parte do pedido que trata do gabinete de lotação. Com base no art. 15 da Lei nº 12.527/2011, apresento recurso e reitero o pedido, em formato aberto (CSV ou Excel), da relação mensal, de janeiro de 2025 até o mês mais recente, dos servidores comissionados lotados nos gabinetes dos vereadores, com cargo, gabinete (vereador) de lotação e remuneração bruta. Caso não seja possível informar nomes, peço a mesma relação apenas com matrícula ou sem identificação, agrupada por gabinete. Agradeço também a informação de que a Câmara não paga diárias, auxílios ou verbas de gabinete aos vereadores.

## 2. Requerimentos e indicações (pilar C e mapa por bairro)

Portal: https://transparenciacamaraosasco.ellosecm.com.br/pesquisar (tem captcha)

O sistema mudou em outubro de 2025, então são duas buscas:

| Período | "Escolha o serviço" |
|---|---|
| de nov/2025 em diante | **Proposituras** |
| jan a out/2025 | **Proposituras Antigas até 10/2025** |

Como preencher, em cada busca:

- **Tipo de Propositura:** se a lista aparecer vazia ("Nenhuma opção encontrada"), deixe em branco. Para separar os tipos, use o campo **Ementa**: digite `Requer` para os requerimentos e `Indica` para as indicações. Se nem isso filtrar, traga tudo, porque a lista de resultados deve mostrar o tipo de cada item.
- **Data de Registro de Protocolo:** De `01/01/2025` Até `31/12/2025` (depois repita com 2026). Se vier resultado demais, faça mês a mês.
- **Deixe em branco:** Autor, Nº do Processo, Nº da Propositura, Rua, Número, Bairro e Complemento. Assim vem tudo.
- Resolva o captcha e clique em **Pesquisar**.

Na lista de resultados, use o botão de exportar (Excel ou CSV) se existir. Se não existir, selecione a tabela inteira, copie e cole numa planilha. Salve como:

- `requerimentos-2025.xlsx`, `requerimentos-2026.xlsx`
- `indicacoes-2025.xlsx`, `indicacoes-2026.xlsx`

Campos que importam: tipo, número/ano, autor, data, ementa e, quando houver, **rua e bairro** (o formulário tem esses campos, então as indicações devem trazer o local).

## Modelo de pedido pela Lei de Acesso à Informação

Envie por um destes canais:

1. pela página https://www.osasco.sp.leg.br/ouvidoria-do-legislativo (o link "SIC" do Portal do Cidadão leva para lá);
2. se o site da Câmara estiver fora do ar, pelo e-mail **ouvidoria@osasco.sp.leg.br**, que é o publicado nos perfis oficiais. Guarde a cópia enviada: ela serve de comprovante da data do pedido;
3. presencialmente, no protocolo da Câmara (Av. dos Autonomistas, 2607, Centro), ou pelo telefone (11) 3699-9133 para saber o canal que está funcionando.

Texto do pedido:

> Com base na Lei nº 12.527/2011, solicito, em formato aberto (planilha CSV ou Excel), a relação mensal de janeiro de 2025 até o mês mais recente dos servidores comissionados lotados nos gabinetes dos vereadores. Peço que a relação traga cargo, gabinete de lotação e remuneração bruta, sem dados pessoais além do nome. Solicito também o valor das diárias e dos ressarcimentos pagos a cada vereador no mesmo período.

## Privacidade

Os relatórios de folha podem trazer nome e CPF de servidores. O site só publica totais por gabinete, sem nomes nem CPFs de assessores.

## Integridade (TCE-SP e CNJ)

O pilar de integridade usa só decisões definitivas de órgãos oficiais. Os registros ficam em `data/integridade.json`, **sem CPF**.

1. **TCE-SP, contas julgadas irregulares** (lista atualizada todo mês): rode `npm run conferir:integridade`. O script baixa a lista e mostra quem aparece pelo nome completo. Para cada caso "NOVO, conferir", compare os dígitos do CPF que a lista mostra (ex.: `068.XXX.XXX-80`) com o CPF da pessoa na Divulgação de Candidaturas do TSE (divulgacandcontas.tse.jus.br, eleições 2024). Só se baterem, acrescente o registro em `data/integridade.json`.
2. **CNJ, cadastro de improbidade e inelegibilidade**: a consulta é por CPF, uma de cada vez, em https://www.cnj.jus.br/improbidade_adm/consultar_requerido.php. O site tem limite por minuto e por dia: espere uns 20 segundos entre consultas. Acrescente qualquer condenação encontrada como `"fonte": "cnj"`.
3. Atualize as datas `consultadoEm` (e `posicao` do TCE-SP) em `data/integridade.json` e rode `npm run dados`.

Nunca grave CPF no repositório: ele é público, e o número só serve para conferir a identidade na hora.
