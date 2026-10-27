# Arquivos coletados à mão

Coloque aqui os arquivos baixados manualmente dos portais da Câmara. Esses portais têm captcha ou chamadas assinadas que impedem coleta automática. O `npm run dados` vai ler esta pasta quando o formato estiver definido.

## 1. Folha de pagamento por gabinete (pilar D, custo do mandato)

Portal: https://cmo.rdmsistemas.com.br/portalcidadao/ (é o link "Folha de Pagamento" do site da Câmara)

Caminho: **Transparência → Prestando Contas → Outras Informações → Quadro Geral de Pessoal → Folha de pagamento sintético**

Primeiro, gere **um arquivo de teste**, para conferir se o relatório separa os servidores por gabinete:

- Ano: 2026 · Mês: Setembro · Folha: `FN - FOLHA NORMAL SET26`
- Situação: Ativo · Vínculo: Comissionado
- Formato: **Excel** → Visualizar → salve aqui como `folha-2026-09-comissionado.xls`

Se o relatório mostrar lotação ou gabinete, gere o mesmo relatório para cada mês de 2025 e 2026, com o nome `folha-AAAA-MM-comissionado.xls`. Também vale gerar o vínculo **Agente Político** (os próprios vereadores) com o nome `folha-AAAA-MM-agente-politico.xls`.

Se der **"Erro de transporte HTTP: Connection timed out"** (resposta 409), a falha é do servidor da Câmara, que não alcançou o gerador de relatórios. Dá para tentar:

1. o formato **Html** ou **PDF** em vez de Excel;
2. de novo em outro horário (cedo de manhã costuma ser melhor);
3. como plano B, na mesma pasta: **"Cargos e Salários 2026"** (arquivo pronto, não passa pelo gerador);
4. se continuar falhando, um pedido pela Lei de Acesso à Informação (veja o modelo no fim).

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
