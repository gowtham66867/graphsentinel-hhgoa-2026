// Bounded, deterministic investigator. Case records are data, never instructions.
const ID_PATTERN = /\bHHG[-\s]?(\d{1,3})\b/gi;
const SPOKEN_NUMBER = {zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20};
const SPOKEN_PATTERN = /\b(?:h\s*h\s*g|hhg|case)\s+(?:(?:number|no)\s+)?((?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)(?:[\s-]+(?:zero|one|two|three|four|five|six|seven|eight|nine))?(?:[\s-]+(?:zero|one|two|three|four|five|six|seven|eight|nine))?)\b/gi;
const routeLabel = route => route === "auto" ? "automatic" : `${route} approval required`;
const citation = evidence => `${evidence.source} · ${evidence.ref}`;
const label = value => String(value || "undocumented").replaceAll("_", " ");
const money = amount => new Intl.NumberFormat("en-US", {style: "currency", currency: "USD"}).format(amount || 0);

function requestedIds(text) {
  const matches = [...text.matchAll(ID_PATTERN)].map(match => ({index: match.index, value: Number(match[1])}));
  for (const match of text.matchAll(SPOKEN_PATTERN)) {
    const words = match[1].toLowerCase().split(/[\s-]+/);
    const value = words.length === 1 ? SPOKEN_NUMBER[words[0]] : Number(words.map(word => SPOKEN_NUMBER[word]).join(""));
    if (Number.isInteger(value)) matches.push({index: match.index, value});
  }
  return [...new Set(matches.sort((a, b) => a.index - b.index).map(match => `HHG-${String(match.value).padStart(3, "0")}`))];
}

export function parseRequest(input, selectedId, records, contextIds = []) {
  const text = String(input || "").trim();
  if (!text) return {intent: "help", ids: [], error: "Enter a case question first."};
  if (text.length > 1000) return {intent: "help", ids: [], error: "Keep the request under 1,000 characters."};
  const ids = requestedIds(text);
  const known = new Set(records.map(record => record.case_id));
  const unknown = ids.find(id => !known.has(id));
  if (unknown) return {intent: "help", ids, error: `${unknown} is not in the loaded case pack.`};
  const lower = text.toLowerCase();
  if (!ids.length && contextIds.length > 1 && /\b(second|other|latter)\b/.test(lower)) ids.push(contextIds[1]);
  else if (!ids.length && contextIds.length && /\b(first|former|that|it|this)\b/.test(lower)) ids.push(contextIds[0]);
  if (!ids.length && selectedId && known.has(selectedId)) ids.push(selectedId);
  if (!ids.length) return {intent: "help", ids, error: "Select a case or mention an HHG case ID."};
  let intent = "help";
  if (/\b(compare|versus|vs\.?|difference|contrast)\b/.test(lower)) intent = "compare";
  else if (/\b(tests?|checks?|evals?|validate|harness)\b/.test(lower)) intent = "checks";
  else if (/\b(challenge|counter|alternative|skeptic|wrong|dispute)\b/.test(lower)) intent = "challenge";
  else if (/\b(actions?|approval|block|sar|report|next steps?)\b/.test(lower)) intent = "actions";
  else if (/\b(path|link|connected|traversal|relationship|how.*related)\b/.test(lower)) intent = "path";
  else if (/\b(evidence|source|citation|graph|provenance)\b/.test(lower)) intent = "evidence";
  else if (/\b(why|explain|investigate|summari[sz]e|decision|verdict|what happened)\b/.test(lower)) intent = "explain";
  if (intent === "help") return {intent, ids, error: "I can explain, challenge, compare, show evidence or graph paths, review actions, and run checks. Which would you like?"};
  if (intent === "compare" && ids.length < 2) return {intent, ids, error: "Mention two HHG case IDs to compare."};
  return {intent, ids: intent === "compare" ? ids.slice(0, 2) : ids.slice(0, 1)};
}

export function validateRecord(record) {
  const errors = [];
  const evidence = record?.case?.evidence;
  const actions = record?.next_best_actions?.final;
  if (!/^HHG-\d{3}$/.test(record?.case_id || "")) errors.push("Case ID is missing or malformed.");
  if (!Array.isArray(evidence) || !evidence.length) errors.push("No evidence claims are recorded.");
  else for (const [index, row] of evidence.entries()) {
    if (!row.claim || !row.ref || !["graph", "customer", "document", "external"].includes(row.source)) errors.push(`Evidence ${index + 1} lacks a supported claim, source, or reference.`);
    if (row.source === "graph" && !String(row.ref).startsWith("query:")) errors.push(`Evidence ${index + 1} lacks a graph query reference.`);
    if (row.source === "customer" && String(row.ref).startsWith("evidence_request:") && !record.evidence_requests?.length) errors.push(`Evidence ${index + 1} cites a missing simulated reply.`);
  }
  if (!Array.isArray(actions) || !actions.length) errors.push("No final policy actions are recorded.");
  else for (const row of actions) {
    const expected = row.action === "BLOCK_CARD" ? (record.case.exposure_usd > 2500 ? "L2" : "L1") : row.action === "DECLINE_TRANSACTION" ? "L1" : ["BLOCK_ALL_CARDS", "FILE_REPORT"].includes(row.action) ? "L2" : "auto";
    if (row.route !== expected) errors.push(`${row.action} has an invalid approval route.`);
  }
  if (Boolean(record?.sar?.file) !== Boolean(actions?.some(row => row.action === "FILE_REPORT"))) errors.push("SAR decision conflicts with final policy actions.");
  if (record?.case?.verdict === "legitimate" && (record.case.exposure_usd || record.case.affected_txn_ids?.length)) errors.push("Legitimate verdict conflicts with affected transactions or exposure.");
  if (record?.case?.written_to_graph && record.case.graph_case_id !== record.case_id) errors.push("Graph writeback provenance is inconsistent.");
  return errors;
}

export function graphPath(record) {
  const path = [
    {type: "Customer", id: record.trigger.customer_id, via: "case pack"},
    {type: "Card", id: record.trigger.card_id, via: "owns"},
    {type: "Flagged transaction", id: record.trigger.flagged_txn_id, via: "made"},
  ];
  const deviceClaim = record.case.evidence.find(row => row.source === "graph" && row.ref.includes("device_neighbors"));
  if (deviceClaim && record.case.connected_device_profiles.length) {
    path.push({type: "Device profile", id: record.case.connected_device_profiles[0], via: "recorded on"});
    const linkedCard = record.case.connected_card_ids.find(id => deviceClaim.entity_ids.includes(id));
    if (linkedCard) path.push({type: "Connected card", id: linkedCard, via: "shared profile"});
    const linkedCase = record.case.similar_prior_cases.find(id => deviceClaim.entity_ids.includes(id));
    if (linkedCase) path.push({type: "Closed case", id: linkedCase, via: "retrieved fraud memory"});
  }
  return path;
}

function followups(record, intent) {
  const id = record.case_id;
  if (intent === "compare") return ["Why the first one?", "Why the second one?", "Challenge the second case"];
  if (intent === "path") return [`Show evidence for ${id}`, `Challenge ${id}`, `What actions for ${id}?`];
  if (intent === "challenge") return [`Show graph path for ${id}`, `Show evidence for ${id}`, `Run checks for ${id}`];
  if (intent === "actions") return [`Why ${id}?`, `Challenge ${id}`, `Run checks for ${id}`];
  return [`Show graph path for ${id}`, `Challenge ${id}`, `What actions for ${id}?`];
}

function caseChecks(record) {
  const item = record.case;
  const evidence = item.evidence || [];
  const actions = record.next_best_actions?.final || [];
  return [
    {name: "Evidence has source and reference", pass: evidence.length > 0 && evidence.every(row => row.claim && row.source && row.ref)},
    {name: "Each action has a policy route", pass: actions.length > 0 && actions.every(row => row.action && ["auto", "L1", "L2"].includes(row.route))},
    {name: "SAR decision matches report action", pass: Boolean(record.sar?.file) === actions.some(row => row.action === "FILE_REPORT")},
    {name: "Graph writeback has case provenance", pass: item.written_to_graph === true && item.graph_case_id === record.case_id},
  ];
}

function evidenceResponse(record) {
  const rows = record.case.evidence || [];
  const simulated = rows.filter(row => String(row.ref).startsWith("evidence_request:")).length;
  return {
    title: `Evidence trail · ${record.case_id}`,
    body: rows.length ? `${rows.length} recorded evidence claims. Each is linked to its recorded source and reference.` : "No evidence claims are recorded. Escalate for human review.",
    facts: rows.map(row => ({text: row.claim, source: citation(row)})),
    note: `These are exported case claims, not a live graph query. ${simulated} customer claim${simulated === 1 ? " is" : "s are"} from an explicitly simulated reply.`,
  };
}

function actionResponse(record) {
  const actions = record.next_best_actions?.final || [];
  return {
    title: `Policy gate · ${record.case_id}`,
    body: `${actions.length} proposed final actions. L1 and L2 routes remain recommendations; this console executes none of them.`,
    facts: actions.map(row => ({text: `${label(row.action)} — ${row.reason}`, source: routeLabel(row.route)})),
    note: `SAR decision: ${record.sar?.file ? "file, subject to L2 route" : "do not file"}.`,
  };
}

function challengeResponse(record) {
  const item = record.case;
  const customer = (item.evidence || []).some(row => row.source === "customer");
  const linked = (item.connected_device_profiles || []).length > 0;
  const questions = [
    {text: `Could ${label(item.pattern)} be explained by ordinary customer behavior? Recheck the raw transaction sequence before changing the ${item.verdict} verdict.`, source: "review question · not a new fact"},
    {text: customer ? "A customer statement is recorded; confirm its scope and timestamp." : "No customer statement is cited in this record; request one if policy requires it.", source: customer ? "recorded customer evidence" : "evidence gap"},
    {text: linked ? "The device link is recorded; verify whether the fingerprint is truly unique or a common device profile." : "No connected-device profile is recorded; do not infer a ring from this case alone.", source: linked ? "graph link review" : "evidence gap"},
  ];
  return {title: `Adversarial review · ${record.case_id}`, body: "These are challenges to test the decision, not findings that reverse it.", facts: questions, note: `Current policy-routed verdict remains ${item.verdict}; a human must review any change.`};
}

function explainResponse(record) {
  const item = record.case;
  return {
    title: `Investigation · ${record.case_id}`,
    body: `${record.case_id} is recorded as ${item.verdict} (${Math.round(item.fraud_probability * 100)}% assessed fraud probability), with ${money(item.exposure_usd)} exposure across ${item.affected_txn_ids.length} transactions. The incoming risk score is not itself the verdict.`,
    facts: (item.evidence || []).map(row => ({text: row.claim, source: citation(row)})),
    note: `${item.similar_prior_cases.length} comparable closed cases; ${record.next_best_actions?.final?.length || 0} policy-routed final actions.`,
  };
}

function pathResponse(record) {
  const path = graphPath(record);
  return {
    title: `Graph path · ${record.case_id}`,
    body: path.length > 3 ? "The exported evidence connects the flagged transaction through a device profile to another card and/or prior case." : "The exported record supports the customer–card–transaction path. It does not establish a shared-device ring for this case.",
    facts: path.map((node, index) => ({text: `${index + 1}. ${node.type}: ${node.id}`, source: node.via})),
    note: "Only relationships recorded in the case export are shown. This is not a live graph traversal.",
  };
}

function compareResponse(left, right) {
  const summary = record => `${record.case_id}: ${record.case.verdict}, ${money(record.case.exposure_usd)} exposure, ${record.case.evidence.length} evidence claims, ${record.case.similar_prior_cases.length} prior cases`;
  return {
    title: `Case comparison · ${left.case_id} / ${right.case_id}`,
    body: "A side-by-side comparison of recorded outcomes. No new verdict is inferred.",
    facts: [
      {text: summary(left), source: `case:${left.case_id}`},
      {text: summary(right), source: `case:${right.case_id}`},
      {text: `${left.case_id} routes: ${left.next_best_actions.final.map(row => `${row.action} (${row.route})`).join(", ")}`, source: `policy:${left.case_id}`},
      {text: `${right.case_id} routes: ${right.next_best_actions.final.map(row => `${row.action} (${row.route})`).join(", ")}`, source: `policy:${right.case_id}`},
    ],
    note: "Open each case to inspect its evidence before making an operational decision.",
  };
}

export function investigate(input, selectedId, records, contextIds = []) {
  const parsed = parseRequest(input, selectedId, records, contextIds);
  if (parsed.error) return {intent: parsed.intent, ids: parsed.ids, title: "Request needs a little more detail", body: parsed.error, facts: [], path: [], followups: [], trace: [], note: "Try asking why HHG-014 was marked fraud."};
  const [first, second] = parsed.ids.map(id => records.find(record => record.case_id === id));
  const errors = parsed.ids.flatMap(id => validateRecord(records.find(record => record.case_id === id)).map(error => `${id}: ${error}`));
  if (errors.length) return {intent: "review", ids: parsed.ids, title: "Grounding review required", body: "The case record failed validation, so no operational recommendation will be shown.", facts: errors.map(error => ({text: error, source: "grounding auditor"})), path: [], followups: [], trace: [], note: "Inspect the exported record and rerun validation."};
  let response;
  if (parsed.intent === "compare") response = compareResponse(first, second);
  else if (parsed.intent === "checks") {
    const checks = caseChecks(first);
    response = {title: `Case harness · ${first.case_id}`, body: `${checks.filter(check => check.pass).length}/${checks.length} structural checks passed. This does not validate whether the underlying verdict is correct.`, facts: checks.map(check => ({text: check.name, source: check.pass ? "PASS" : "REVIEW"})), note: "Run the repository's full Python tests for policy and answer-schema validation."};
  } else if (parsed.intent === "challenge") response = challengeResponse(first);
  else if (parsed.intent === "actions") response = actionResponse(first);
  else if (parsed.intent === "path") response = pathResponse(first);
  else if (parsed.intent === "evidence") response = evidenceResponse(first);
  else response = explainResponse(first);
  const trace = [
    {role: "Request interpreter", result: `${parsed.intent} · ${parsed.ids.join(" / ")}`},
    {role: "Evidence scout", result: `${parsed.ids.reduce((n, id) => n + records.find(record => record.case_id === id).case.evidence.length, 0)} exported claims inspected`},
    {role: "Skeptic", result: parsed.intent === "challenge" ? "alternative explanations and evidence gaps surfaced" : "no new facts inferred"},
    {role: "Policy reviewer", result: "approval routes read from recorded actions; none executed"},
    {role: "Grounding auditor", result: "record structure and policy routes validated"},
  ];
  return {intent: parsed.intent, ids: parsed.ids, ...response, path: parsed.intent === "compare" ? [] : graphPath(first), followups: followups(first, parsed.intent), trace};
}
