"""
Independent GST arithmetic fixtures.

The expected values are produced here with Python's `decimal` module and
ROUND_HALF_UP, which shares no code with the TypeScript engine's BigInt
integer arithmetic. The engine is tested against this file
(scripts/verify-gst-engine.ts), so a mistake would have to be made twice, in
two languages, the same way.

Rates in the fixtures are TEST data. Two are taken from entries read in
Notification 9/2025-Integrated Tax (Rate) so the cases look like real ones —
3% (Schedule IV, headings 7113/7116/7117) and 18% (Schedule II, heading
9102) — but a fixture is never a rate approved for any LavIndia product.

    python scripts/gst/generate_fixtures.py
"""
import json
import random
from decimal import Decimal, ROUND_HALF_UP, getcontext
from pathlib import Path

getcontext().prec = 60
HALF_UP = ROUND_HALF_UP


def rnd(x: Decimal) -> int:
    return int(x.quantize(Decimal(1), rounding=HALF_UP))


RATES = {
    "R0": dict(id="R0", code="0000", codeKind="HSN", rateBps=0, cgstBps=0, sgstBps=0, igstBps=0, cessBps=0),
    "R3": dict(id="R3", code="7113", codeKind="HSN", rateBps=300, cgstBps=150, sgstBps=150, igstBps=300, cessBps=0),
    "R5": dict(id="R5", code="0000", codeKind="HSN", rateBps=500, cgstBps=250, sgstBps=250, igstBps=500, cessBps=0),
    "R18": dict(id="R18", code="9102", codeKind="HSN", rateBps=1800, cgstBps=900, sgstBps=900, igstBps=1800, cessBps=0),
    "R3C": dict(id="R3C", code="TEST", codeKind="HSN", rateBps=300, cgstBps=150, sgstBps=150, igstBps=300, cessBps=100),
    "R28": dict(id="R28", code="TEST", codeKind="HSN", rateBps=2800, cgstBps=1400, sgstBps=1400, igstBps=2800, cessBps=0),
}


def tax_part(amount, rate, included, supply):
    g = rate["cgstBps"] + rate["sgstBps"] if supply == "INTRA_STATE" else rate["igstBps"]
    cess_bps = rate["cessBps"]
    A = Decimal(amount)
    if included:
        taxable = rnd(A * 10000 / Decimal(10000 + g + cess_bps))
        total_tax = amount - taxable
        cess = min(rnd(Decimal(taxable) * cess_bps / 10000), total_tax)
        gst = total_tax - cess
    else:
        taxable = amount
        gst = rnd(Decimal(taxable) * g / 10000)
        cess = rnd(Decimal(taxable) * cess_bps / 10000)
    cgst = sgst = igst = 0
    if supply == "INTER_STATE":
        igst = gst
    elif rate["cgstBps"] == rate["sgstBps"]:
        cgst = gst // 2
        sgst = gst - cgst
    else:
        cgst = 0 if gst == 0 else rnd(Decimal(gst) * rate["cgstBps"] / g)
        sgst = gst - cgst
    tax = cgst + sgst + igst + cess
    return dict(taxableCents=taxable, cgstCents=cgst, sgstCents=sgst, igstCents=igst, cessCents=cess,
                taxCents=tax, payableCents=amount if included else amount + tax)


def allocate(amount, weights):
    total = sum(weights)
    if total <= 0:
        return [amount] + [0] * (len(weights) - 1)
    exact = [Decimal(amount) * w / total for w in weights]
    floors = [int(e) for e in exact]
    left = amount - sum(floors)
    order = sorted(range(len(weights)), key=lambda i: (-(exact[i] - floors[i]), i))
    for i in order[:left]:
        floors[i] += 1
    return floors


def document(case):
    supply, included = case["supplyType"], case["pricesIncludeTax"]
    policy = case.get("mixedBasketPolicy", "PROPORTIONAL")
    lines = []
    for g in case["goods"]:
        r = RATES[g["rate"]]
        lines.append(dict(lineId=g["lineId"], kind="GOODS", inputCents=g["amountCents"], rateId=r["id"],
                          **tax_part(g["amountCents"], r, included, supply)))
    untaxed = 0
    for c in case.get("charges", []):
        amt = c["amountCents"]
        if amt == 0:
            continue
        if c["treatment"] == "NONE":
            untaxed += amt
            continue
        if c["treatment"] == "SEPARATE":
            parts = [(c["kind"], amt, RATES[c["rate"]])]
        else:
            distinct = {g["rate"] for g in case["goods"]}
            if len(distinct) == 1 or policy == "HIGHEST_RATE":
                best = case["goods"][0]
                for g in case["goods"]:
                    a, b = RATES[g["rate"]], RATES[best["rate"]]
                    if a["rateBps"] + a["cessBps"] > b["rateBps"] + b["cessBps"]:
                        best = g
                parts = [(c["kind"], amt, RATES[best["rate"]])]
            else:
                shares = allocate(amt, [g["amountCents"] for g in case["goods"]])
                parts = [(f'{c["kind"]}:{g["lineId"]}', s, RATES[g["rate"]]) for g, s in zip(case["goods"], shares) if s > 0]
        for lid, a, r in parts:
            lines.append(dict(lineId=lid, kind=c["kind"], inputCents=a, rateId=r["id"],
                              **tax_part(a, r, included, supply)))
    keys = ["taxableCents", "cgstCents", "sgstCents", "igstCents", "cessCents", "taxCents", "payableCents"]
    totals = {k: sum(l[k] for l in lines) for k in keys}
    totals["payableCents"] += untaxed
    totals["untaxedChargesCents"] = untaxed
    return dict(lines=lines, totals=totals)


cases = []
rng = random.Random(20261124)

# Hand-verified anchors (worked on paper, then confirmed here)
anchors = [
    ("999 incl 3% intra: taxable 969.90 tax 29.10 (CGST 14.55 SGST 14.55)", "INTRA_STATE", True, [("a", 99900, "R3")]),
    ("999 excl 3% intra: tax 29.97 on top (CGST 14.98 SGST 14.99), payable 1028.97", "INTRA_STATE", False, [("a", 99900, "R3")]),
    ("999 incl 3% inter: IGST 29.10", "INTER_STATE", True, [("a", 99900, "R3")]),
    ("1646 excl 3% intra: tax 49.38", "INTRA_STATE", False, [("a", 164600, "R3")]),
    ("100000 incl 18%: taxable 84745.76 tax 15254.24", "INTRA_STATE", True, [("a", 10000000, "R18")]),
    ("1 paisa excl 3%: tax 0", "INTRA_STATE", False, [("a", 1, "R3")]),
    ("50 paise excl 3%: 1.5 paise rounds half up to 2? no: 50*3%=1.5 -> 2", "INTRA_STATE", False, [("a", 50, "R3")]),
    ("nil rate: no tax at all", "INTRA_STATE", True, [("a", 12345, "R0")]),
]
for label, supply, incl, goods in anchors:
    cases.append(dict(label=label, supplyType=supply, pricesIncludeTax=incl,
                      goods=[dict(lineId=i, amountCents=a, rate=r) for i, a, r in goods]))

# Systematic grid
for amount in [1, 7, 99, 100, 101, 999, 1599, 4999, 99900, 164600, 249900, 12345678]:
    for r in ["R0", "R3", "R5", "R18", "R3C", "R28"]:
        for supply in ["INTRA_STATE", "INTER_STATE"]:
            for incl in [True, False]:
                cases.append(dict(label=f"grid {amount} {r} {supply} incl={incl}", supplyType=supply,
                                  pricesIncludeTax=incl, goods=[dict(lineId="g1", amountCents=amount, rate=r)]))

# Multi-rate baskets with charges, every policy and treatment
for n in range(150):
    k = rng.randint(2, 5)
    goods = [dict(lineId=f"g{i}", amountCents=rng.randint(100, 300000), rate=rng.choice(["R3", "R5", "R18", "R3C"])) for i in range(k)]
    charges = []
    if rng.random() < 0.8:
        charges.append(dict(kind="SHIPPING", amountCents=rng.choice([0, 9900, 19900, 4999]),
                            treatment=rng.choice(["NONE", "FOLLOWS_GOODS", "SEPARATE"]), rate="R18"))
    if rng.random() < 0.5:
        charges.append(dict(kind="COD_FEE", amountCents=rng.choice([0, 5000, 4900]),
                            treatment=rng.choice(["NONE", "FOLLOWS_GOODS", "SEPARATE"]), rate="R18"))
    cases.append(dict(label=f"basket {n}", supplyType=rng.choice(["INTRA_STATE", "INTER_STATE"]),
                      pricesIncludeTax=rng.choice([True, False]), goods=goods, charges=charges,
                      mixedBasketPolicy=rng.choice(["PROPORTIONAL", "HIGHEST_RATE"])))

out = []
for c in cases:
    case = dict(c)
    case["rates"] = RATES
    case["expected"] = document(c)
    out.append(case)

target = Path(__file__).with_name("arithmetic.fixtures.json")
target.write_text(json.dumps(out, separators=(",", ":")))
print(f"{len(out)} cases written to {target.name}")
