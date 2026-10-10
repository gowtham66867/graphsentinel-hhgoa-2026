"""Verify exported investigation claims against supplied challenge identifiers.

This checks grounding and policy invariants, not hidden-key verdict accuracy.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path

from fraud_agent.policy import approval_route

ROOT = Path(__file__).resolve().parents[1]


def rows(path: Path):
    with path.open(newline="", encoding="utf-8") as handle:
        yield from csv.DictReader(handle)


@dataclass
class EvidenceIndex:
    transactions: dict[str, tuple[str, float]]
    cards: set[str]
    customers: set[str]
    devices: set[str]
    closed_cases: set[str]
    pack: dict[str, dict]

    @classmethod
    def load(cls, data_dir: Path = ROOT / "data") -> EvidenceIndex:
        transactions = {}
        cards, customers, devices = set(), set(), set()
        for row in rows(data_dir / "graph_transactions.csv"):
            transactions[row["TransactionID"]] = (
                row["card_id"],
                float(row["TransactionAmt"]),
            )
            cards.add(row["card_id"])
            customers.add(row["customer_id"])
            if row["device_profile"]:
                devices.add(row["device_profile"])
        closed_cases = {
            row["case_id"] for row in rows(data_dir / "closed_cases_history.csv")
        }
        pack = {row["case_id"]: row for row in rows(data_dir / "case_pack.csv")}
        return cls(transactions, cards, customers, devices, closed_cases, pack)

    def known_id(self, value: str) -> bool:
        return (
            value in self.transactions
            or value in self.cards
            or value in self.customers
            or value in self.closed_cases
            or value in self.devices
        )


def validate_grounding(answer: dict, index: EvidenceIndex) -> list[str]:
    """Return independent grounding/policy defects for one answer."""
    errors = []
    case_id = answer.get("case_id", "")
    trigger = index.pack.get(case_id)
    if not trigger:
        return [f"{case_id}: case is not in case_pack.csv"]
    case = answer.get("case", {})
    affected = case.get("affected_txn_ids", [])
    for txn_id in affected:
        row = index.transactions.get(txn_id)
        if row is None:
            errors.append(f"unknown affected transaction {txn_id}")
        elif row[0] != trigger["card_id"]:
            errors.append(f"affected transaction {txn_id} belongs to another card")
    if affected:
        expected = round(
            sum(
                abs(index.transactions[txn][1])
                for txn in affected
                if txn in index.transactions
            ),
            2,
        )
        if abs(expected - case.get("exposure_usd", 0)) > 0.01:
            errors.append(f"exposure mismatch: expected ${expected:.2f}")
    elif case.get("exposure_usd", 0) != 0:
        errors.append("exposure without affected transactions")
    if affected and case.get("first_suspicious_txn_id") not in affected:
        errors.append("first suspicious transaction is outside the episode")
    for card in case.get("connected_card_ids", []):
        if card not in index.cards:
            errors.append(f"unknown connected card {card}")
    for device in case.get("connected_device_profiles", []):
        if device not in index.devices:
            errors.append(f"unknown device profile {device}")
    for prior in case.get("similar_prior_cases", []):
        if prior not in index.closed_cases:
            errors.append(f"unknown closed case {prior}")
    requests = answer.get("evidence_requests", [])
    for item in case.get("evidence", []):
        ref = str(item.get("ref", ""))
        source = item.get("source")
        if source == "graph" and not ref.startswith("query:"):
            errors.append("graph evidence lacks a query reference")
        if source == "customer":
            if ref.startswith("case_pack:"):
                if (
                    ref != f"case_pack:{case_id}"
                    or trigger["trigger_type"] != "customer_report"
                ):
                    errors.append(
                        "customer claim does not match a customer-report trigger"
                    )
            elif ref.startswith("evidence_request:"):
                try:
                    request_number = int(ref.split(":", 1)[1])
                except ValueError:
                    request_number = 0
                if not 1 <= request_number <= len(requests):
                    errors.append("simulated customer claim lacks its evidence request")
            else:
                errors.append("customer evidence lacks a supported source reference")
        for entity_id in item.get("entity_ids", []):
            if not index.known_id(str(entity_id)):
                errors.append(f"unknown evidence entity {entity_id}")
    actions = answer.get("next_best_actions", {})
    for stage in ("initial", "final"):
        for item in actions.get(stage, []):
            try:
                expected_route = approval_route(
                    item["action"], case.get("exposure_usd", 0)
                )
            except (KeyError, ValueError):
                errors.append(f"unknown {stage} action")
                continue
            if item.get("route") != expected_route:
                errors.append(f"{stage} action {item['action']} has wrong route")
    final_names = {item.get("action") for item in actions.get("final", [])}
    if answer.get("sar", {}).get("file") != ("FILE_REPORT" in final_names):
        errors.append("SAR decision and final FILE_REPORT action conflict")
    if case.get("verdict") == "legitimate":
        if "BLOCK_CARD" in final_names or "FILE_REPORT" in final_names:
            errors.append("legitimate case recommends block or filing")
        if trigger["trigger_type"] == "customer_report" and not requests:
            errors.append(
                "denied customer report closed legitimate without recorded verification"
            )
    if case.get("written_to_graph") and case.get("graph_case_id") != case_id:
        errors.append("graph writeback ID does not match the case")
    return errors
