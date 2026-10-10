"""Read-only, bounded live-query probe with explicit exported-data fallback."""

from __future__ import annotations

import json
import os
import urllib.error
from collections.abc import Callable

from .tigergraph import TigerGraphClient


def probe_live_retrieval(
    client_factory: Callable[[], TigerGraphClient] = TigerGraphClient,
    attempts: int = 2,
) -> dict:
    """Verify one installed GSQL query; never infer live access from saved files."""
    if not os.environ.get("TIGERGRAPH_HOST") and client_factory is TigerGraphClient:
        return {
            "mode": "offline_export",
            "live_retrieval_verified": False,
            "attempts": 0,
            "reason": "TIGERGRAPH_HOST is not set",
        }
    attempts = max(1, min(attempts, 2))
    for number in range(1, attempts + 1):
        try:
            client = client_factory()
            result = client.query(
                "card_window",
                card_id="C13487-K1",
                center="2016-11-22 16:11:00",
                hours=72,
            )
            if isinstance(result.get("results"), list) and result["results"]:
                return {
                    "mode": "live_tigergraph",
                    "live_retrieval_verified": True,
                    "attempts": number,
                    "reason": "card_window returned a non-empty result",
                }
            return {
                "mode": "offline_export",
                "live_retrieval_verified": False,
                "attempts": number,
                "reason": "card_window returned no usable result",
            }
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            reason = f"transient connection failure: {type(exc).__name__}"
        except (RuntimeError, ValueError) as exc:
            return {
                "mode": "offline_export",
                "live_retrieval_verified": False,
                "attempts": number,
                "reason": f"query rejected: {type(exc).__name__}",
            }
    return {
        "mode": "offline_export",
        "live_retrieval_verified": False,
        "attempts": attempts,
        "reason": reason,
    }


if __name__ == "__main__":
    print(json.dumps(probe_live_retrieval(), indent=2))
