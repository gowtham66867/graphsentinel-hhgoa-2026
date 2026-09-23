# GraphSentinel

GraphSentinel is an evidence-first agentic fraud investigator built for the TigerGraph × HHGoa 2026 challenge. It traverses cards, transactions, device fingerprints, regions, and 5,565 closed cases; retrieves comparable investigations; then sends facts through a deterministic implementation of policy rules R1–R10. The LLM explains evidence—it never chooses an unapproved action or invents an approval route.

**Team:** HackerHouse Rockers · **Lead:** Gowtham Ramachandra · **Devfolio:** `gowtham66867`

## What is in the submission

- `cases/`: all 20 scored answer files, named `HHG-001.json` through `HHG-020.json`
- `gsql/`: TigerGraph schema, loading jobs, graph investigations, and case-memory writeback
- `src/fraud_agent/`: policy, schema validator, CLI, and RESTPP client
- `scripts/`: deterministic data preparation and answer generation
- `web/dist/`: responsive investigation console (no build step)
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
```

Start the analyst console:

```bash
python -m http.server 4173 --directory web/dist
# open http://localhost:4173
```

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
```

Generation is deterministic. The validator checks required fields, enums, legitimate-case exposure, approval routes, and SAR/action agreement. `cases/` is the submission source of truth.

## Privacy and security

Secrets are loaded from environment variables and excluded from Git. The UI contains challenge data only. L1/L2 actions remain recommendations: only `auto` actions can be executed by the agent.

See [architecture](docs/architecture.md), [demo script](docs/demo-script.md), and [technical blog draft](docs/technical-blog.md).
