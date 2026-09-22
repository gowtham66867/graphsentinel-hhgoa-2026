# Architecture

GraphSentinel separates evidence gathering, judgment, and authority.

1. **TigerGraph evidence plane.** `Customer → Card → Transaction` establishes ownership and chronology. Device, email, and region vertices expose shared origins. Closed cases provide case memory.
2. **GraphRAG investigator.** The agent retrieves the customer baseline, a bounded transaction window, device neighbors, and similar closed cases. It emits claims with exact graph query references and entity IDs.
3. **Calibration layer.** Evidence strength—not the incoming risk score—sets probability. Customer replies are simulated only where necessary and are explicitly recorded.
4. **Policy engine.** Pure Python implements case thresholds, SAR conditions, and exact approval routing. This layer is outside the LLM.
5. **Case memory.** `write_investigation_case` writes status, verdict, evidence summary, exposure, and action JSON back to TigerGraph for future retrieval.
6. **Analyst console.** A static, responsive UI shows the queue, calibrated probability, exposure, evidence provenance, prior cases, SAR decision, and final approval routes.

## Guardrails

- IDs come only from the challenge dataset.
- Legitimate cases cannot contain affected transactions or exposure.
- `SAR.file` must agree with the final `FILE_REPORT` action.
- Blocks and filings are recommendations routed to L1/L2, never silently executed.
- Investigation stops when verification settles the question or corroborated probability crosses the policy stopping threshold.

