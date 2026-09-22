# Social post draft

We built **GraphSentinel** for the TigerGraph × HHGoa 2026 Agentic Fraud Investigation challenge.

Instead of treating a risk score as a verdict, GraphSentinel traverses customers, cards, transactions, devices, regions, and 5,565 closed cases in TigerGraph. GraphRAG supplies prior-case memory; a deterministic R1–R10 policy layer controls case creation, customer verification, blocks, approval routing, and SAR decisions.

My favorite finding: an alert scored just **0.05** expanded into a shared-device ring linked to four confirmed fraud cases. The opposite mattered too—we closed ten convincing alerts as legitimate rather than blocking customers on one weak signal.

The result: 20 evidence-grounded case files, exact source IDs, policy-routed actions, standalone SAR narratives, a reproducible validation suite, and an interactive analyst console.

Repo: https://github.com/gowtham66867/graphsentinel-hhgoa-2026

Built by HackerHouse Rockers. Thank you @TigerGraphDB and @247pmstudio for a challenge that rewarded both graph thinking and calibrated restraint.

#TigerGraph #GraphRAG #AgenticAI #FraudDetection #HHGoa

