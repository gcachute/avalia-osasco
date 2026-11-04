"""Lê os pareceres do TCE-SP sobre as contas anuais da Prefeitura de Osasco.

Rode com: npm run coletar:tce-contas   (depois: npm run dados)

A lista de processos (data/tce/contas-processos.json) vem da pesquisa pública da página Contas Anuais do TCE-SP, que só
responde dentro da própria página e por isso é lida à mão no navegador. Este script baixa os PDFs de parecer listados
nela, do site público de jurisprudência do tribunal, e guarda só o resultado escrito no parecer: favorável ou
desfavorável à aprovação das contas. Um pedido a cada 2 segundos; o PDF fica em data/cache/tce para não baixar de novo.
"""

import io
import json
import os
import re
import time
import unicodedata
import urllib.request

from pypdf import PdfReader

ORIGEM = "data/tce/contas-processos.json"
DESTINO = "data/tce/contas-pareceres.json"
CACHE = "data/cache/tce"


def baixa(url):
    nome = os.path.join(CACHE, url.rsplit("/", 1)[-1])
    if os.path.exists(nome):
        return open(nome, "rb").read()
    pedido = urllib.request.Request(url, headers={"User-Agent": "deolhoemoz (dados abertos)"})
    for tentativa in range(3):
        try:
            with urllib.request.urlopen(pedido, timeout=90) as r:
                dados = r.read()
            os.makedirs(CACHE, exist_ok=True)
            open(nome, "wb").write(dados)
            time.sleep(2)
            return dados
        except Exception as e:  # noqa: BLE001
            print(f"  tentativa {tentativa + 1} falhou ({e}): {url}")
            time.sleep(10 * (tentativa + 1))
    return None


def sem_acento(s):
    return unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().upper()


def texto(pdf):
    try:
        return " ".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(pdf)).pages)
    except Exception:  # noqa: BLE001
        return ""


# "EMITE PARECER PRÉVIO FAVORÁVEL À APROVAÇÃO" / "PARECER DESFAVORÁVEL" / "FAVORÁVEL ... COM RESSALVAS"
def resultado(t):
    t = re.sub(r"\s+", " ", sem_acento(t))
    m = re.search(r"PARECER(?: PREVIO)?\s*(DES)?FAVORAVEL", t) or re.search(r"\b(DES)?FAVORAVEL A APROVACAO", t)
    if not m:
        return None, None
    trecho = t[m.start(): m.start() + 260]
    return ("desfavorável" if m.group(1) else "favorável"), trecho


lista = json.load(open(ORIGEM, encoding="utf8"))
saida = []
for p in lista["processos"]:
    pareceres = [d for d in p["documentos"] if d["tipo"] in ("Parecer", "Acórdão")]
    item = {
        "exercicio": p["exercicio"],
        "processo": p["processo"],
        "decisoes": p["decisoes"],
        "publicado": p["publicado"],
        "transito": p["transito"],
        "pareceres": [],
    }
    for i, d in enumerate(pareceres):
        pdf = baixa(d["url"])
        t = texto(pdf) if pdf else ""
        r, trecho = resultado(t)
        # O pedido de reexame e os embargos vêm no mesmo lugar que o parecer; o texto diz qual é.
        cabeca = re.sub(r"\s+", " ", sem_acento(t))
        etapa = "embargos" if "EMBARGOS DE DECLARACAO" in cabeca else "reexame" if "PEDIDO DE REEXAME" in cabeca else "parecer"
        item["pareceres"].append({"tipo": d["tipo"], "etapa": etapa, "data": p["decisoes"][i] if i < len(p["decisoes"]) else None, "url": d["url"], "resultado": r, "trecho": trecho})
        print(p["exercicio"], d["tipo"], r or "sem resultado no texto")
    saida.append(item)

os.makedirs(os.path.dirname(DESTINO), exist_ok=True)
json.dump({"fonte": lista["fonte"], "url": lista["url"], "coletadoEm": time.strftime("%Y-%m-%d"), "processos": saida}, open(DESTINO, "w", encoding="utf8"), ensure_ascii=False, indent=1)
print(f"{sum(1 for s in saida for x in s['pareceres'] if x['resultado'])} pareceres com resultado lido")
