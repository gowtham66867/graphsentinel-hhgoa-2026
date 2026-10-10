"""Export independently computed grounding metrics for the static dashboard."""

from __future__ import annotations

import json
from pathlib import Path

from evals.run import run_suite


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    report = run_suite(root)
    target = root / "web" / "dist" / "evaluation.json"
    target.write_text(json.dumps(report, indent=2) + "\n")
    print(
        f"Exported {report['grounded_count']}/{report['case_count']} grounded cases to {target}"
    )


if __name__ == "__main__":
    main()
