from functools import lru_cache

import requests


@lru_cache(maxsize=128)
def get_exchange_rate(from_currency: str, to_currency: str) -> float:
    from_currency = from_currency.upper()
    to_currency = to_currency.upper()

    if from_currency == to_currency:
        return 1.0

    resp = requests.get(
        "https://api.frankfurter.dev/v1/latest",
        params={"from": from_currency, "to": to_currency},
        timeout=10,
    )
    resp.raise_for_status()

    data = resp.json()
    return float(data["rates"][to_currency])
