import {investigate} from "./voice-core.mjs";

const prompt = document.querySelector("#voicePrompt");
const result = document.querySelector("#voiceResult");
const history = document.querySelector("#voiceHistory");
const runButton = document.querySelector("#voiceRun");
let records = [];
let contextIds = [];
let turns = [];
runButton.disabled = true;

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = content;
  return node;
}

function render(answer) {
  result.replaceChildren();
  const header = element("div", "voice-result-head", "");
  header.append(element("span", "voice-intent", answer.intent.toUpperCase()), element("span", "voice-cases", answer.ids.join(" · ") || "NO CASE"));
  result.append(header, element("h3", "", answer.title), element("p", "voice-answer", answer.body));
  if (answer.facts.length) {
    const list = element("ol", "voice-facts", "");
    for (const fact of answer.facts) {
      const item = element("li", "", "");
      item.append(element("span", "", fact.text), element("code", "", fact.source));
      list.append(item);
    }
    result.append(list);
  }
  if (answer.note) result.append(element("p", "voice-note", answer.note));
  if (answer.path?.length) {
    const section = element("section", "voice-path", "");
    section.append(element("h4", "", "Recorded graph path"));
    const rail = element("div", "voice-path-rail", "");
    for (const node of answer.path) {
      const tile = element("div", "voice-path-node", "");
      tile.append(element("small", "", `${node.via} → ${node.type}`), element("strong", "", node.id));
      rail.append(tile);
    }
    section.append(rail);
    result.append(section);
  }
  if (answer.trace?.length) {
    const details = element("details", "voice-trace", "");
    details.append(element("summary", "", "Inspect investigator trace"));
    const list = element("ol", "", "");
    for (const step of answer.trace) {
      const item = element("li", "", "");
      item.append(element("b", "", step.role), element("span", "", step.result));
      list.append(item);
    }
    details.append(list);
    result.append(details);
  }
  if (answer.followups?.length) {
    const suggestions = element("div", "voice-followups", "");
    suggestions.append(element("span", "", "ASK NEXT"));
    for (const text of answer.followups) {
      const button = element("button", "", text);
      button.type = "button";
      button.addEventListener("click", () => {prompt.value = text; run();});
      suggestions.append(button);
    }
    result.append(suggestions);
  }
  if ("speechSynthesis" in window && answer.facts.length) {
    const speak = element("button", "speak-button", "▶ Read answer aloud");
    speak.type = "button";
    speak.addEventListener("click", () => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(`${answer.title}. ${answer.body} ${answer.facts.map(fact => fact.text).join(" ")}`);
      utterance.rate = 1.04;
      window.speechSynthesis.speak(utterance);
    });
    result.append(speak);
  }
}

function run() {
  if (!records.length) return;
  const selected = document.querySelector(".case-row.active")?.dataset.id || new URLSearchParams(location.search).get("case") || "HHG-014";
  const answer = investigate(prompt.value, selected, records, contextIds);
  render(answer);
  if (answer.trace?.length) {
    contextIds = answer.ids;
    turns = [...turns, {question: prompt.value.trim(), result: answer.title}].slice(-4);
    history.replaceChildren(element("h4", "", "Session questions"));
    for (const turn of turns) {
      const item = element("div", "voice-history-row", "");
      item.append(element("span", "", turn.question), element("small", "", turn.result));
      history.append(item);
    }
  }
  if (answer.ids[0] && answer.intent !== "compare") {
    const row = document.querySelector(`.case-row[data-id="${answer.ids[0]}"]`);
    if (row) row.click();
  }
}

runButton.addEventListener("click", run);
prompt.addEventListener("keydown", event => {
  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) run();
});
document.querySelectorAll(".voice-examples button").forEach(button => button.addEventListener("click", () => {
  prompt.value = button.dataset.prompt;
  run();
}));

fetch("cases.json").then(response => {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}).then(data => {records = data; runButton.disabled = false;}).catch(() => {
  result.replaceChildren(element("p", "", "Case data could not load. Refresh the page and try again."));
  runButton.disabled = true;
});

fetch("evaluation.json").then(response => {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}).then(report => {
  document.querySelector("#evalSummary strong").textContent = `${report.grounded_count}/${report.case_count} cases grounded`;
  document.querySelector("#evalSummary small").textContent = report.metric_scope;
}).catch(() => {
  document.querySelector("#evalSummary strong").textContent = "Evaluation unavailable";
});
