# Voice-led GraphSentinel walkthrough

This guide demonstrates voice **in the product**, not proof that the source code was created by voice. Use an actual Wispr Flow dictation session and retain an unedited screen recording if a contest requires voice-build provenance. Never label pasted text as a voice transcript.

1. Open the local GraphSentinel console and scroll to **Voice-ready investigation**. The header labels its data source as offline case exports.
2. Activate Wispr Flow in the prompt field and say: “Why was H H G zero one four marked fraud?” Confirm that the field contains `HHG-014`; correct recognition errors before running. Show the evidence claims and recorded query references.
3. Ask: “Show the graph path for case fourteen.” Walk through customer → card → flagged transaction → shared device profile → connected card → prior closed case. This makes the graph's value visible beyond a risk score.
4. Use the suggested follow-up, “Challenge HHG-014.” Show the adversarial questions and the explicit warning that the verdict is not reversed. Open the investigator trace to show bounded responsibilities and grounding validation.
5. Ask: “Compare HHG-014 and HHG-001.” Show how a fraud ring and a legitimate alert receive different outcomes; the latter's customer reply is explicitly simulated in the exported case record.
6. Ask: “Run checks for HHG-014.” Explain that these are structural checks only. Run `PYTHONPATH=src python3.11 -m evals.run`, `node --test tests/voice-core.test.mjs`, and `python3.11 -m pytest -q` to show identifier grounding, policy safety, and negative/adversarial tests.
7. Ask for policy actions. L1/L2 routes are recommendations, and the console executes no blocks or filings.

Voice changes the workflow by making investigation questions and follow-ups usable hands-free; it does not change the approval boundary. This guide is a local product walkthrough, not a contest submission or a claim that any pasted prompt was spoken.
