# Beyond the Risk Score: Building an Evidence-First Fraud Agent with TigerGraph

Fraud systems are good at raising alarms and bad at explaining what should happen next. A score can tell an analyst where to look; it cannot tell them whether a customer should be blocked, whether related cards are exposed, or whether a regulatory report is required. For the TigerGraph × HHGoa 2026 challenge, we built **GraphSentinel**, an agent that treats those as separate, auditable decisions.

## The graph is the investigation surface

The benchmark has 590,742 transactions, 144,432 identity rows, 5,565 closed cases, and 20 scored investigations. We modeled customers, cards, transactions, composite device profiles, email domains, regions, and cases as vertices. Ownership, transaction, device, region, and case-memory relationships are edges.

This pays off when a transaction looks harmless alone. `HHG-014`, for example, entered with a risk score of only 0.05. Its exact mobile fingerprint traverses to multiple cards and four confirmed historical fraud cases. A score-first workflow would likely clear it; a graph-first workflow exposes a coordinated ring.

## GraphRAG without invented evidence

For every alert the agent gathers four bounded evidence sets: the customer's baseline, the local time window, the device or region neighborhood, and similar closed cases. Those results ground the explanation. Each claim in the output cites a query and lists the entity IDs it depends on.

The LLM is used for synthesis and concise narratives. It does not invent identifiers, choose approval levels, or treat a retrieved case as proof. A deterministic validator checks the answer schema and catches contradictions such as a legitimate verdict with non-zero exposure or a SAR without a filing action.

## Policy is code, not a prompt

The challenge policy distinguishes automatic actions from L1 and L2 approvals and separates an internal case from an external suspicious activity report. We encoded these boundaries as pure Python functions. A card block under $2,500 routes to L1; a report always routes to L2; case creation and verification are automatic. SAR eligibility requires strong suspicion plus high exposure, shared origin, coordination, or an undocumented pattern.

That distinction matters in `HHG-006`. Four near-equal, high-value online purchases land within thirty minutes and total $1,906.07. They do not satisfy the supplied card-testing definition because the authorizations are not small. GraphSentinel records an undocumented high-value burst, creates the internal case, recommends a card block, and prepares a SAR because exposure exceeds $1,000.

## Calibrated restraint is a feature

Half the benchmark cases are legitimate. GraphSentinel closes ten alerts after explicit simulated customer confirmation. `HHG-010` starts with a 0.90 score and a $1,000.03 online transaction, yet the workflow still gathers context and verifies rather than equating risk with guilt. The assumed reply is written into `evidence_requests`; the final action then follows R3 and closes without fraud.

## Results and lessons

The build produces 20 schema-valid case files, including two defensible undocumented patterns, policy-routed next actions, evidence provenance, and standalone SAR narratives only where required. The analyst console makes that trail visible rather than hiding it behind a chatbot transcript.

TigerGraph worked especially well for multi-hop device-to-transaction-to-card investigations and for turning resolved cases into reusable institutional memory. The main friction was loading a benchmark in which transaction rows deliberately omitted explicit card IDs; we resolved known IDs from the case and closed-case tables and documented the stable fallback used for background customers. A first-class graph migration and fixture workflow for Savanna would make local-to-cloud iteration even smoother.

The broader lesson is simple: the safest fraud agent is not the one that acts fastest. It is the one that can show where every fact came from, why policy permits each action, and when it is time to stop.

