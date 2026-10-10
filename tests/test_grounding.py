import json
from pathlib import Path

import pytest

from evals.grounding import EvidenceIndex, validate_grounding
from evals.run import run_suite

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="module")
def index():
    return EvidenceIndex.load()


@pytest.fixture
def case014():
    return json.loads((ROOT / "cases" / "HHG-014.json").read_text())


def test_all_20_grounded_but_metric_is_not_accuracy(index):
    report = run_suite()
    assert report["case_count"] == 20
    assert report["grounded_count"] == 20
    assert "not hidden-key investigation accuracy" in report["metric_scope"]


def test_unknown_entity_rejected(index, case014):
    case014["case"]["evidence"][0]["entity_ids"].append("TXN-INVENTED")
    assert any(
        "unknown evidence entity" in error
        for error in validate_grounding(case014, index)
    )


def test_exposure_arithmetic_and_foreign_card_rejected(index, case014):
    case014["case"]["exposure_usd"] += 10
    case014["case"]["affected_txn_ids"].append("3476602")
    errors = validate_grounding(case014, index)
    assert any("exposure mismatch" in error for error in errors)
    assert any("belongs to another card" in error for error in errors)


def test_policy_route_and_sar_contradictions_rejected(index, case014):
    case014["next_best_actions"]["final"][0]["route"] = "auto"
    case014["sar"]["file"] = False
    errors = validate_grounding(case014, index)
    assert any("wrong route" in error for error in errors)
    assert any("SAR decision" in error for error in errors)


def test_missing_simulated_reply_is_detected(index):
    answer = json.loads((ROOT / "cases" / "HHG-001.json").read_text())
    answer["evidence_requests"] = []
    assert any(
        "lacks its evidence request" in error
        for error in validate_grounding(answer, index)
    )


def test_denial_cannot_be_silently_closed_as_legitimate(index):
    answer = json.loads((ROOT / "cases" / "HHG-003.json").read_text())
    answer["case"]["verdict"] = "legitimate"
    answer["case"]["affected_txn_ids"] = []
    answer["case"]["exposure_usd"] = 0
    answer["next_best_actions"]["final"] = [
        {"action": "CLOSE_NO_FRAUD", "route": "auto", "reason": "test"}
    ]
    answer["sar"]["file"] = False
    assert any(
        "denied customer report" in error for error in validate_grounding(answer, index)
    )


def test_benign_export_has_no_block_or_filing(index):
    answer = json.loads((ROOT / "cases" / "HHG-001.json").read_text())
    assert validate_grounding(answer, index) == []
    assert answer["case"]["verdict"] == "legitimate"
    assert not {"BLOCK_CARD", "FILE_REPORT"} & {
        a["action"] for a in answer["next_best_actions"]["final"]
    }
