const statusElement = document.querySelector("#status");
const toggleButton = document.querySelector("#toggle");
let activeTabId = null;
let currentState = null;

function showUnavailable() {
  currentState = null;
  statusElement.textContent = "Abra uma aba local do CanalMix para usar a proteção.";
  toggleButton.textContent = "Disponível no CanalMix";
  toggleButton.disabled = true;
  toggleButton.setAttribute("aria-pressed", "false");
}

function renderState(state) {
  if (!state?.available) {
    showUnavailable();
    return;
  }

  currentState = state;
  statusElement.textContent = state.enabled
    ? "Proteção ativa nesta aba."
    : "Proteção pausada nesta aba.";
  toggleButton.textContent = state.enabled
    ? "Desativar proteção"
    : "Ativar proteção";
  toggleButton.disabled = false;
  toggleButton.setAttribute("aria-pressed", String(state.enabled));
}

async function loadState() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (typeof tab?.id !== "number") {
      showUnavailable();
      return;
    }

    activeTabId = tab.id;
    const state = await chrome.runtime.sendMessage({
      type: "get-tab-state",
      tabId: activeTabId,
    });
    renderState(state);
  } catch {
    showUnavailable();
  }
}

toggleButton.addEventListener("click", async () => {
  if (activeTabId == null || !currentState) {
    return;
  }

  toggleButton.disabled = true;
  try {
    const state = await chrome.runtime.sendMessage({
      type: "set-tab-state",
      tabId: activeTabId,
      enabled: !currentState.enabled,
    });
    renderState(state);
  } catch {
    showUnavailable();
  }
});

void loadState();
