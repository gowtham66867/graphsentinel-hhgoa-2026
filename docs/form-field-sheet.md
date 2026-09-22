# Submission form field sheet

Review every field before using it. The official form does not permit resubmissions.

| Field | Value |
|---|---|
| Email | `gowtham66866@gmail.com` (from the signed-in form; confirm before transmission) |
| Team name | HackerHouse Rockers |
| Devfolio ID of Team Lead | gowtham66867 |
| Team size | **Needs confirmation** (currently appears to be 1) |
| Lead: Name, Email, Phone | **Needs phone confirmation**; proposed name/email: `Gowtham Ramachandra, gowtham66866@gmail.com, …` |
| Public GitHub repo | https://github.com/gowtham66867/graphsentinel-hhgoa-2026 |
| 20 files confirmation | Yes |
| Demo video | https://github.com/gowtham66867/graphsentinel-hhgoa-2026/releases/download/demo-v1/graphsentinel-demo.mp4 (4:34) |
| Live UI | https://graphsentinel-hhgoa.trilogy-1207.chatgpt.site (currently owner-private; judges need public access) |
| LLM model used | OpenAI GPT-5 for evidence synthesis; deterministic Python policy engine for actions |
| Agent framework used | Custom Python GraphRAG orchestrator with TigerGraph MCP/RESTPP and GSQL |
| Social post URLs | **Publish the prepared post and paste URL** |
| Technical blog | https://github.com/gowtham66867/graphsentinel-hhgoa-2026/blob/main/docs/technical-blog.md |
| Deployment | **Needs connected TigerGraph deployment**; choose Savanna or Community Edition after deployment |

## TigerGraph experience answer

TigerGraph worked especially well for multi-hop device-to-transaction-to-card investigations and for turning resolved cases into reusable institutional memory. The strongest result was a low-score alert that expanded through one exact device fingerprint into a coordinated ring and four confirmed historical fraud cases. GSQL made those bounded traversals concise, and the graph model kept every explanation tied to real entity IDs. The main friction was ingestion: the benchmark transaction table deliberately omits explicit card IDs, so we had to reconcile them from the case and closed-case tables and document a stable fallback for background customers. A first-class fixture/migration workflow plus clearer local-to-Savanna parity would make iteration faster. We would also value built-in investigation trace export that bundles query parameters, returned entity IDs, and graph-write provenance for audit.

## Anything else

GraphSentinel separates evidence, judgment, and authority. The LLM summarizes graph-grounded facts, while deterministic code owns policy thresholds and approval routing. We intentionally calibrated the answer set to the benchmark's warning that half the cases are legitimate, identified two undocumented patterns without forcing them into known categories, and included reproducible validation for all 20 case files.
