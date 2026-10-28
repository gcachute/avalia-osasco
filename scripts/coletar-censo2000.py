# Censo 2000 por bairro de Osasco, a partir das tabelas do universo que o IBGE publicou já por bairro
# ("Meso_Microregioes_Distritos_Subdistritos_Bairros", arquivo de São Paulo). Os bairros do IBGE em 2000 têm o
# mesmo código dos bairros de hoje (data/bairros.json), então a ligação é direta, sem malha de setores.
#
# Os dados de 2000 não mudam: rode uma vez. Precisa de Python 3 com xlrd (as tabelas são .xls antigos):
#   python -m pip install xlrd==2.0.1
#   python scripts/coletar-censo2000.py      (depois: npm run dados)
# Gera data/historico/censo-2000.json, com os mesmos campos do Censo 2010 (sem cor/raça nem entorno, que não
# estão nessas tabelas).
import io, json, os, re, sys, urllib.request, zipfile

import xlrd

URL = "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2000/Dados_do_Universo/Meso_Microregioes_Distritos_Subdistritos_Bairros/Sao_Paulo.zip"
CACHE = "data/cache/censo2000/Sao_Paulo.zip"
# IPCA número-índice (IBGE, tabela 1737): agosto de 2000 (data de referência do Censo 2000) e julho de 2022
# (data de referência do Censo 2022), para comparar a renda em reais de 2022.
IPCA = {"200008": 1662.11, "202207": 6411.95}
FATOR = round(IPCA["202207"] / IPCA["200008"], 3)

if not os.path.exists(CACHE):
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    urllib.request.urlretrieve(URL, CACHE)
zipado = zipfile.ZipFile(CACHE)


def tabela(numero):
    """Linhas dos bairros de Osasco (código de 10 dígitos 3534401...) da tabela 3.x.x.20: {código: [valores]}."""
    nome = next(n for n in zipado.namelist() if n.endswith(f"_{numero}.xls"))
    sh = xlrd.open_workbook(file_contents=zipado.read(nome)).sheet_by_index(0)
    linhas = {}
    for r in range(sh.nrows):
        cod = sh.cell(r, sh.ncols - 1).value
        if isinstance(cod, float) and str(int(cod)).startswith("3534401") and len(str(int(cod))) == 10:
            linhas[str(int(cod))] = [sh.cell(r, c).value for c in range(sh.ncols - 1)]
    return linhas


pct = lambda n, d: round(100 * n / d, 1) if d else None
pop = tabela("310300")  # 1: população residente
idade = tabela("310400")  # 1: total; 2: 0 a 4; 8: 5 a 9; 9: 10 a 14; 21–25: 60 anos ou mais
alfa = tabela("310600")  # trios (total, alfabetizada, não) por idade; 34 em diante: 15 anos ou mais
renda = tabela("320200")  # 1: responsáveis com rendimento; 3: rendimento nominal médio mensal
dom = tabela("330200")  # 1: domicílios particulares permanentes; 4: moradores
agua = tabela("330300")  # 1: total; 2: rede geral
esgoto = tabela("330400")  # 1: total; 3: rede geral de esgoto ou pluvial
lixo = tabela("330500")  # 1: total; 3: coletado por serviço de limpeza (como a V035 de 2010)

bairros = json.load(open("data/bairros.json", encoding="utf8"))["bairros"]
saida = []
for b in bairros:
    c = b["codigo"]
    if c not in pop:
        saida.append({"id": b["id"], "pessoas": None})
        continue
    i, a = idade[c], alfa[c]
    quinze = range(34, 64, 3)
    nominal = renda[c][3] if renda[c][1] else None
    saida.append(
        {
            "id": b["id"],
            "pessoas": int(pop[c][1]),
            "domicilios": int(dom[c][1]),
            "moradoresPorDomicilio": round(dom[c][4] / dom[c][1], 2) if dom[c][1] else None,
            "rendaMediaNominal": round(nominal) if nominal else None,
            "rendaMedia": round(nominal * FATOR) if nominal else None,
            "agua": pct(agua[c][2], agua[c][1]),
            "esgoto": pct(esgoto[c][3], esgoto[c][1]),
            "lixo": pct(lixo[c][3], lixo[c][1]),
            "alfabetizados": pct(sum(a[k + 1] for k in quinze), sum(a[k] for k in quinze)),
            "criancas": pct(i[2] + i[8] + i[9], i[1]),
            "idosos": pct(sum(i[21:26]), i[1]),
        }
    )

faltando = [b["nome"] for b in bairros if b["codigo"] not in pop]
total = sum(x["pessoas"] or 0 for x in saida)
print(f"{len(saida) - len(faltando)} bairros com dados, {total:,} moradores".replace(",", "."), f"· sem dados em 2000: {', '.join(faltando) or 'nenhum'}")
json.dump(
    {
        "fonte": "IBGE, Censo Demográfico 2000, resultados do universo por bairro (tabelas 3.1.3 a 3.3.5)",
        "url": URL,
        "notaRenda": f"Renda média do responsável com rendimento, corrigida pelo IPCA de agosto de 2000 para julho de 2022 (fator {str(FATOR).replace('.', ',')}).",
        "fatorIpca": FATOR,
        "bairros": saida,
    },
    open("data/historico/censo-2000.json", "w", encoding="utf8"),
    ensure_ascii=False,
    indent=1,
)
print("Gravado data/historico/censo-2000.json")
