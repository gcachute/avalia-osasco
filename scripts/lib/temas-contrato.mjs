// Tema de cada contrato, lido das palavras do objeto (o que foi contratado). Cada contrato fica num tema só: vale a
// primeira regra que casa, por isso a ordem importa. O que se compra vem antes de para quem se compra: "tecnologia da
// informação para a Secretaria de Educação" é tecnologia; "transporte escolar" é transporte; "vigilância sanitária" é saúde.
const dobra = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

export const TEMAS_CONTRATO = [
  ["Pessoal e benefícios", /vale[- ]?(alimentacao|refeicao|transporte)|beneficios? (para|aos|dos) servidores|servidores ativos|folha de pagamento|plano de saude (para|aos|dos) servidores|estagi/],
  ["Tecnologia e comunicação", /software|sistemas? (de|integrad|informatiz)|informatica|tecnologia da informacao|datacenter|licenc(a|iamento) de uso|computador|notebook|internet|rede de dados|cabeamento|telefon|impressora|comunicacao visual|banners?|grafic|diagramacao|publicidade/],
  ["Transporte e veículos", /transporte|onibus|veicul|frota|combustiv|pneu|automove|envelopament|motorista|\bvans?\b|caminh/],
  ["Segurança", /seguranca|vigilancia(?! (sanitaria|epidem|em saude))|monitoramento|guarda (civil|externa)|cameras?\b|alarme|antibalist|coletes?\b|bombeiro/],
  ["Obras e manutenção urbana", /\bobras?\b|paviment|recape|asfalt|drenag|constru|reforma|engenharia|calcad|canaliza|\bpontes?\b|viaduto|contencao|manutencao predial|iluminacao publica|saneamento|malha viaria|sinaliza|pintura|material eletrico|hidraulic|ferramenta|tintas?\b|metalic|concreto|madeira|sarrafo|artefato/],
  ["Limpeza e áreas verdes", /limpeza|coleta|residuo|lixo|varri|areas? verdes?|\bpodas?\b|rocad|jardinag|manejo arboreo|dedetiza|desinsetiza|descartave|higienic|higiene/],
  ["Alimentação", /aliment|refeic|merenda|lanche|\bcafe\b|coffe|bolos?\b|hortifrut|frutas|verduras|carnes?\b|\bpao\b|\bleite\b|agua mineral|pereciveis/],
  ["Saúde", /saude|hospita|medic|\bubs\b|\bupa\b|farmac|enferm|odonto|clinic|exames?\b|laborat|vacina|cirurg|ambulanc|\bsamu\b|pacient|vigilancia (sanitaria|epidem|em saude)|ortese|protese|reagente|hemo|insumos hospitalares|suplementos|formulas/],
  ["Educação", /escol|educa|ensino|alunos?\b|creche|pedagog|didatic|professor|livros|\bemef\b|\bemei\b/],
  ["Assistência social", /assistencia social|acolhimento|vulnerab|\bcras\b|\bcreas\b|idos|situacao de rua|cestas? basicas?|operacao inverno|abrigo|socioassist|urnas? mortuar|funer|brinquedos|natal/],
  ["Cultura, esporte e lazer", /cultur|esport|eventos?\b|shows?\b|festiv|lazer|artistic|musica|montagem e desmontagem|tendas?\b|palco/],
  ["Materiais e equipamentos", /eletrodomest|eletroeletron|mobiliario|moveis|material de (escritorio|expediente)|\bpapel\b|gas liquefeito|equipamentos? de protecao|uniforme|roupa|vestuario|enxoval|colch|beliche|ventilador|utensilio|sacolas/],
  ["Administração e serviços gerais", /consultoria|assessoria|locacao de imove|aluguel|acervo|passagens aereas|correios|seguros?\b|auditoria|leilao|cartorio/],
];

export const temaDoContrato = (objeto) => {
  const t = dobra(objeto);
  return TEMAS_CONTRATO.find(([, re]) => re.test(t))?.[0] ?? "Outros";
};
