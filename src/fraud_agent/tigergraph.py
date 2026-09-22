"""Small dependency-free client for installed GraphSentinel GSQL queries."""

from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request


class TigerGraphClient:
    def __init__(self, host: str | None = None, token: str | None = None, graph: str = "FraudGraph"):
        self.host = (host or os.environ.get("TIGERGRAPH_HOST", "")).rstrip("/")
        self.token = token or os.environ.get("TIGERGRAPH_TOKEN", "")
        self.graph = os.environ.get("TIGERGRAPH_GRAPH", graph)
        if not self.host:
            raise ValueError("Set TIGERGRAPH_HOST to a Savanna or Community Edition endpoint")

    def _request(self, path: str, *, method: str = "GET", body: dict | None = None) -> dict:
        data = json.dumps(body).encode() if body is not None else None
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        req = urllib.request.Request(f"{self.host}{path}", data=data, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=30) as response:
            payload = json.load(response)
        if payload.get("error"):
            raise RuntimeError(payload.get("message", "TigerGraph request failed"))
        return payload

    def query(self, name: str, **params) -> dict:
        query = urllib.parse.urlencode(params)
        return self._request(f"/restpp/query/{self.graph}/{name}?{query}")

    def health(self) -> dict:
        return self._request("/restpp/echo")

    def write_case(self, answer: dict, card_id: str) -> str:
        case = answer["case"]
        result = self.query(
            "write_investigation_case", case_id=answer["case_id"], card_id=card_id,
            status=case["status"], verdict=case["verdict"],
            fraud_probability=case["fraud_probability"], pattern=case["pattern"],
            exposure_usd=case["exposure_usd"], summary=case["summary"],
            action_json=json.dumps(answer["next_best_actions"]["final"]),
            updated_at="2016-12-31 23:59:59",
        )
        return answer["case_id"] if result.get("results") is not None else ""
