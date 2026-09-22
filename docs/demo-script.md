# 3–5 minute demo script

**0:00–0:25 — Problem.** “Fraud alerts are not verdicts. GraphSentinel investigates relationships and follows policy before it recommends customer-impacting action.” Show the queue and the 10/10 outcome split.

**0:25–1:05 — Architecture.** Scroll to the four-stage pipeline. Explain TigerGraph traversal, closed-case retrieval, calibrated verdict, deterministic R1–R10 gate, and graph writeback.

**1:05–2:10 — Hidden ring.** Open `HHG-014`. Point out its 0.05 model risk, exact device fingerprint, four confirmed prior fraud cases, connected cards, L1 block, automatic case creation and monitoring, and L2 SAR route. Emphasize that device traversal—not the score—finds the ring.

**2:10–2:55 — Undocumented pattern.** Open `HHG-006`. Show the four near-equal online purchases and $1,906.07 exposure. Explain why the agent labels the high-value burst `undocumented` instead of calling it card testing, then show the SAR threshold.

**2:55–3:35 — False positive.** Open `HHG-010`. Show the high 0.90 trigger score but legitimate verdict after an explicitly simulated confirmation. Explain R1 and R3 and why no exposure or SAR remains.

**3:35–4:10 — Reproducibility.** In a terminal run `python scripts/generate_cases.py`, `graphsentinel validate --cases cases`, and `pytest -q`. Briefly show `cases/` contains exactly 20 files.

**4:10–4:30 — Close.** “GraphSentinel makes every claim traceable, every action policy-routed, and every resolved case reusable as graph memory.”

