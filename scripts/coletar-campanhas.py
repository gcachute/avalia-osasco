# Campanhas de 2024 em Osasco (prefeito e vereadores), pelos arquivos abertos do TSE.
# Rode com: npm run coletar:campanhas   (depois: npm run dados)
#
# Guarda só totais por candidato. Nunca lê CPF, e-mail, título, data de nascimento nem o nome de quem doou: doador pessoa física
# entra na soma. Dos bens declarados fica o total, porque a descrição de cada bem pode trazer endereço. Fornecedor de campanha
# aparece só quando é empresa (CNPJ). Os planos de governo dos candidatos a prefeito vão para public/planos.
# Usa Python porque os arquivos do TSE são zip64, que o leitor em JavaScript não abre.
import collections
import csv
import io
import json
import os
import urllib.request
import zipfile
from datetime import date

csv.field_size_limit(10_000_000)
PASTA = "data/cache/tse"
BASE = "https://cdn.tse.jus.br/estatistica/sead/odsele"
ARQUIVOS = {
    "consulta_cand_2024.zip": "consulta_cand",
    "prestacao_de_contas_eleitorais_candidatos_2024.zip": "prestacao_contas",
    "bem_candidato_2024.zip": "bem_candidato",
    "proposta_governo_2024_SP.zip": "proposta_governo",
}
os.makedirs(PASTA, exist_ok=True)
for nome, pasta in ARQUIVOS.items():
    if not os.path.exists(f"{PASTA}/{nome}"):
        print("Baixando", nome)
        urllib.request.urlretrieve(f"{BASE}/{pasta}/{nome}", f"{PASTA}/{nome}")


def linhas(zip_nome, arquivo):
    with zipfile.ZipFile(f"{PASTA}/{zip_nome}") as z:
        with z.open(arquivo) as f:
            yield from csv.DictReader(io.TextIOWrapper(f, encoding="latin1"), delimiter=";")


def valor(s):
    return float(s.replace(".", "").replace(",", ".") or 0)


def limpo(s):
    return None if not s or s.startswith("#") else s.strip()


candidatos = {}
consulta = "consulta_cand_2024.zip"
with zipfile.ZipFile(f"{PASTA}/{consulta}") as z:
    arquivo = next(n for n in z.namelist() if n.endswith("_SP.csv"))
for l in linhas(consulta, arquivo):
    if l["NM_UE"] != "OSASCO" or l["DS_CARGO"].upper() not in ("PREFEITO", "VEREADOR"):
        continue
    candidatos[l["SQ_CANDIDATO"]] = {
        "sq": l["SQ_CANDIDATO"],
        "numero": l["NR_CANDIDATO"],
        "urna": l["NM_URNA_CANDIDATO"].strip(),
        "nome": l["NM_CANDIDATO"].strip(),
        "cargo": l["DS_CARGO"].capitalize(),
        "partido": l["SG_PARTIDO"],
        "situacao": l["DS_SIT_TOT_TURNO"].strip(),
        "receitas": {"total": 0, "porOrigem": collections.Counter(), "porFonte": collections.Counter(), "pessoasFisicas": set()},
        "despesas": {"contratado": 0, "pago": 0, "porTipo": collections.Counter()},
        "empresas": collections.Counter(),
        "bens": {"total": 0, "quantidade": 0},
        "plano": None,
    }
print(len(candidatos), "candidaturas em Osasco")

prestacao = "prestacao_de_contas_eleitorais_candidatos_2024.zip"
prestadores = {}
for l in linhas(prestacao, "receitas_candidatos_2024_SP.csv"):
    c = candidatos.get(l["SQ_CANDIDATO"])
    if not c:
        continue
    prestadores[l["SQ_PRESTADOR_CONTAS"]] = c
    v = valor(l["VR_RECEITA"])
    r = c["receitas"]
    r["total"] += v
    r["porOrigem"][limpo(l["DS_ORIGEM_RECEITA"]) or "Não informada"] += v
    r["porFonte"][limpo(l["DS_FONTE_RECEITA"]) or "NÃO INFORMADA"] += v

for l in linhas(prestacao, "despesas_contratadas_candidatos_2024_SP.csv"):
    c = candidatos.get(l["SQ_CANDIDATO"])
    if not c:
        continue
    prestadores[l["SQ_PRESTADOR_CONTAS"]] = c
    v = valor(l["VR_DESPESA_CONTRATADA"])
    c["despesas"]["contratado"] += v
    c["despesas"]["porTipo"][limpo(l["DS_ORIGEM_DESPESA"]) or "Não informado"] += v
    if len(l["NR_CPF_CNPJ_FORNECEDOR"]) == 14 and limpo(l["NM_FORNECEDOR_RFB"] or l["NM_FORNECEDOR"]):
        c["empresas"][limpo(l["NM_FORNECEDOR_RFB"] or l["NM_FORNECEDOR"])] += v

for l in linhas(prestacao, "despesas_pagas_candidatos_2024_SP.csv"):
    c = prestadores.get(l["SQ_PRESTADOR_CONTAS"])
    if c:
        c["despesas"]["pago"] += valor(l["VR_PAGTO_DESPESA"])

for l in linhas("bem_candidato_2024.zip", "bem_candidato_2024_SP.csv"):
    c = candidatos.get(l["SQ_CANDIDATO"])
    if c:
        c["bens"]["total"] += valor(l["VR_BEM_CANDIDATO"])
        c["bens"]["quantidade"] += 1

os.makedirs("public/planos", exist_ok=True)
with zipfile.ZipFile(f"{PASTA}/proposta_governo_2024_SP.zip") as z:
    for info in z.infolist():
        sq = os.path.basename(info.filename).replace("2024SP", "").split("_")[0]
        c = candidatos.get(sq)
        if c and c["cargo"] == "Prefeito" and info.file_size < 15_000_000:
            with open(f"public/planos/{sq}.pdf", "wb") as f:
                f.write(z.read(info))
            c["plano"] = f"/planos/{sq}.pdf"


def r2(n):
    return round(n, 2)


def contas(c):
    return {k: r2(v) for k, v in c.most_common()}


saida = []
for c in candidatos.values():
    r, d = c["receitas"], c["despesas"]
    saida.append(
        {
            **{k: c[k] for k in ("sq", "numero", "urna", "nome", "cargo", "partido", "situacao", "plano")},
            "receitas": {"total": r2(r["total"]), "porOrigem": contas(r["porOrigem"]), "porFonte": contas(r["porFonte"])},
            "despesas": {"contratado": r2(d["contratado"]), "pago": r2(d["pago"]), "porTipo": contas(d["porTipo"])},
            "empresas": [{"nome": k, "valor": r2(v)} for k, v in c["empresas"].most_common(10)],
            "bens": {"total": r2(c["bens"]["total"]), "quantidade": c["bens"]["quantidade"]},
        }
    )
saida.sort(key=lambda c: -c["receitas"]["total"])
with open("data/campanhas.json", "w", encoding="utf8", newline="\n") as f:
    json.dump({"fonte": "Tribunal Superior Eleitoral, dados abertos", "url": "https://dadosabertos.tse.jus.br/", "coletadoEm": date.today().isoformat(), "candidatos": saida}, f, ensure_ascii=False, indent=1)
    f.write("\n")
com = [c for c in saida if c["receitas"]["total"] > 0]
print(len(com), "com receita; soma R$", round(sum(c["receitas"]["total"] for c in saida) / 1e6, 2), "mi; planos:", sum(1 for c in saida if c["plano"]))
for c in saida[:5]:
    print(c["urna"], c["cargo"], c["situacao"], c["receitas"]["total"], c["despesas"]["contratado"], c["bens"]["total"])
