# GraphSentinel

GraphSentinel is an evidence-first, voice-led fraud investigation workbench. Its case exports connect cards, transactions, device profiles, regions, and 5,565 historical closed cases. A deterministic policy layer applies rules R1–R10; the voice workflow explains, challenges, and compares recorded findings without executing protected actions. This local dashboard currently reads exported cases, not live TigerGraph query results or a live LLM.

**Project team:** HackerHouse Rockers · **Lead:** Gowtham Ramachandra

## What is in this repository

- `cases/`: all 20 scored answer files, named `HHG-001.json` through `HHG-020.json`
- `gsql/`: TigerGraph schema, loading jobs, graph investigations, and case-memory writeback
- `src/fraud_agent/`: policy, schema validator, CLI, and RESTPP client
- `scripts/`: deterministic data preparation and answer generation
- `web/dist/`: responsive investigation console (no build step)
- `web/dist/voice-core.mjs`: bounded voice-command investigator with evidence citations, adversarial review, case comparison, and a structural case harness
- `docs/`: architecture, demo narration, technical blog, and submission checklist

The answer set is deliberately balanced: 10 fraud and 10 legitimate outcomes. Every transaction, card, device, and prior-case identifier used by an answer is grounded in the supplied benchmark. Simulated replies are always labeled in `evidence_requests`, per the challenge policy.

## Run end to end

Prerequisites: Python 3.10+, a TigerGraph Savanna workspace or Community Edition instance, and GSQL. The full benchmark CSVs are intentionally not committed. Download them from the [official challenge dataset folder](https://drive.google.com/drive/folders/1YDJUW1fiE7Jx8R9KqknC4IcsED9zll2A?usp=sharing) into `data/`.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'

python scripts/prepare_data.py
python scripts/generate_cases.py
graphsentinel validate --cases cases
pytest -q
node --test tests/voice-core.test.mjs
```

Start the analyst console:

```bash
python -m http.server 4173 --directory web/dist
# open http://localhost:4173
```

The **voice-ready investigation** panel accepts prompts dictated through Wispr Flow into its text field (or typed prompts). Try “Why was HHG-014 marked fraud?”, “Challenge the verdict for HHG-006”, “Compare this case with case six”, and “Run checks for HHG-014”. It recognizes common spoken ID forms such as “case fourteen,” “case 14,” “H H G oh one four,” and “H H G 0 1 4,” then resolves a bounded intent against loaded case records. It shows recorded evidence references and approval routes. Browser read-aloud is optional and off by default. The panel does not execute card blocks or SAR filings, and it does not call TigerGraph live; the displayed cases are scored-record exports. A typed or pasted prompt is not evidence that Wispr Flow was used.

The workflow now carries context across follow-up questions, shows recorded graph paths and a visible investigation trace, asks for clarification on unsupported commands, and refuses operational recommendations when evidence or approval routes fail browser-side validation. See the [voice-led walkthrough](docs/voice-demo.md).

## Install the graph

`prepare_data.py` creates `data/graph_transactions.csv`, resolving card IDs from the benchmark and closed-case history and hashing composite device profiles into stable graph IDs.

```bash
gsql gsql/01_schema.gsql
gsql gsql/02_load.gsql
gsql gsql/03_queries.gsql
gsql gsql/04_writeback.gsql

gsql -g FraudGraph 'RUN LOADING JOB load_transactions USING transactions_file="data/graph_transactions.csv"'
gsql -g FraudGraph 'RUN LOADING JOB load_closed_cases USING cases_file="data/closed_cases_history.csv"'
```

Install queries, then set connection details:

```bash
cp .env.example .env
export TIGERGRAPH_HOST='https://YOUR_HOST'
export TIGERGRAPH_TOKEN='YOUR_SECRET'
export TIGERGRAPH_GRAPH='FraudGraph'

PYTHONPATH=src python scripts/write_cases.py
```

The four core queries are `card_window`, `device_ring`, `customer_baseline`, and `similar_closed_cases`. `write_investigation_case` persists the final decision back into the graph so it becomes memory for later investigations. `scripts/write_cases.py` updates `written_to_graph` and `graph_case_id` only after each successful TigerGraph response.

## Decision flow

```text
case trigger
   └─ customer/card baseline traversal
      └─ time-window + device/region expansion
         └─ closed-case GraphRAG retrieval
            └─ calibrated verdict
               └─ deterministic policy gate
                  ├─ auto action
                  ├─ L1 recommendation
                  └─ L2 recommendation / SAR
```

Risk score is never treated as ground truth. A weak single signal triggers verification; customer confirmation closes an alert; denials create cases; shared or coordinated origins trigger connected-card protection and, when policy 3a applies, a SAR. The action layer in [`policy.py`](src/fraud_agent/policy.py) is deterministic and unit-tested.

## Notable findings

- `HHG-006` is not card testing: it is a rapid, near-equal high-value online burst totaling $1,906.07 and is labeled `undocumented` rather than forced into a known pattern.
- `HHG-014` is a low-risk shared-device ring. The exact mobile fingerprint traverses to four historical fraud cases; a score-only system would miss it.
- Ten alerts close as legitimate after simulated customer confirmation, demonstrating why high model scores do not authorize blocking.

## Evaluation and reproducibility

```bash
python scripts/generate_cases.py
PYTHONPATH=src python -m fraud_agent.cli validate
pytest -q
node --test tests/voice-core.test.mjs
PYTHONPATH=src python -m evals.run
PYTHONPATH=src python -m scripts.export_eval
PYTHONPATH=src python -m fraud_agent.graph_probe
```

Generation is deterministic. The validator checks required fields, enums, legitimate-case exposure, approval routes, and SAR/action agreement. `cases/` is the submission source of truth.

The browser harness checks four structural invariants on every loaded case. It does **not** measure the correctness of a fraud verdict or execute the test plan from the separate SpecForge Voice project. The voice-command layer brings its evidence-first, adversarial-review, and evaluation concepts into GraphSentinel while keeping the TigerGraph answer set unchanged.

`evals.run` independently checks 20 case exports against IDs and amounts in the supplied transaction graph export, closed-case IDs, customer-claim references, and policy routes. Its pass rate measures **grounding and safety only**, not agreement with the hidden scoring key. `graph_probe` attempts one read-only installed query when `TIGERGRAPH_HOST` is configured; it retries transient failures at most once and otherwise reports the offline fallback. In the current local session, no TigerGraph host or OpenAI API key is configured. The connected OpenAI documentation and Wispr meeting-note tools supported development, but neither is a live model or dictation-control integration in this app.

## Privacy and security

Secrets are loaded from environment variables and excluded from Git. The UI contains challenge data only. L1/L2 actions remain recommendations: only `auto` actions can be executed by the agent.

See [architecture](docs/architecture.md), [demo script](docs/demo-script.md), and [technical blog draft](docs/technical-blog.md).

For a local Cloud Run-compatible container and the required billing gate before
any Google Cloud deployment, see [Cloud Run deployment](docs/cloud-run-deployment.md).
