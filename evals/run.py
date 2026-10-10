"""Repeatable grounding/safety evaluation across the 20 scored exports."""

from __future__ import annotations

import json
from pathlib import Path

from .grounding import ROOT, EvidenceIndex, validate_grounding


def run_suite(root: Path = ROOT) -> dict:
    index = EvidenceIndex.load(root / "data")
    files = sorted((root / "cases").glob("HHG-*.json"))
    outcomes = []
    for path in files:
        answer = json.loads(path.read_text())
        errors = validate_grounding(answer, index)
        outcomes.append(
            {"case_id": answer["case_id"], "grounded": not errors, "errors": errors}
        )
    return {
        "metric_scope": "identifier grounding, episode arithmetic, and policy safety; not hidden-key investigation accuracy",
        "case_count": len(outcomes),
        "grounded_count": sum(row["grounded"] for row in outcomes),
        "pass_rate": round(sum(row["grounded"] for row in outcomes) / len(outcomes), 3)
        if outcomes
        else 0,
        "outcomes": outcomes,
    }


if __name__ == "__main__":
    print(json.dumps(run_suite(), indent=2))
