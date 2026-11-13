const STATE_KEY = "enabledCanalMixTabs";

// These exact endpoints were requested by the Globo DF embed during the
// comparison run. Stream/player hosts are deliberately absent from this list.
const OBSERVED_AD_REQUESTS = [
  {
    id: 101,
    urlFilter: "||llvpn.com/tag.min.js",
    requestDomain: "llvpn.com",
    resourceType: "script",
  },
  {
    id: 102,
    urlFilter: "||my.rtmark.net/gid.js",
    requestDomain: "my.rtmark.net",
    resourceType: "xmlhttprequest",
  },
  {
    id: 103,
    urlFilter: "||luugy.com/5/11789690/",
    requestDomain: "luugy.com",
    resourceType: "xmlhttprequest",
  },
];

const RULE_IDS = OBSERVED_AD_REQUESTS.map(({ id }) => id);

function isCanalMixUrl(value) {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" &&
      url.port === "3000" &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost")
    );
  } catch {
    return false;
  }
}

async function readEnabledTabs() {
  const stored = await chrome.storage.session.get(STATE_KEY);
  return stored[STATE_KEY] ?? {};
}

async function writeEnabledTabs(enabledTabs) {
  await chrome.storage.session.set({ [STATE_KEY]: enabledTabs });
}

async function syncRules(enabledTabs) {
  const tabIds = Object.entries(enabledTabs)
    .filter(([, enabled]) => enabled)
    .map(([tabId]) => Number(tabId))
    .filter(Number.isInteger);

  const addRules = tabIds.length
    ? OBSERVED_AD_REQUESTS.map((request) => ({
      id: request.id,
      priority: 1,
      action: { type: "block" },
      condition: {
        urlFilter: request.urlFilter,
        requestDomains: [request.requestDomain],
        initiatorDomains: ["ww0.embedtv.cc"],
        resourceTypes: [request.resourceType],
        tabIds,
      },
    }))
    : [];

  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: RULE_IDS,
    addRules,
  });
}

async function setTabState(tabId, enabled) {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab || !isCanalMixUrl(tab.url)) {
    return { available: false, enabled: false };
  }

  const enabledTabs = await readEnabledTabs();
  enabledTabs[String(tabId)] = enabled;
  await writeEnabledTabs(enabledTabs);
  await syncRules(enabledTabs);

  return { available: true, enabled };
}

async function getTabState(tabId) {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab || !isCanalMixUrl(tab.url)) {
    return { available: false, enabled: false };
  }

  const enabledTabs = await readEnabledTabs();
  const key = String(tabId);
  if (!Object.hasOwn(enabledTabs, key)) {
    enabledTabs[key] = true;
    await writeEnabledTabs(enabledTabs);
    await syncRules(enabledTabs);
  }

  return { available: true, enabled: enabledTabs[key] };
}

async function registerCanalMixTab(tabId) {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab || !isCanalMixUrl(tab.url)) {
    return { available: false, enabled: false };
  }

  const enabledTabs = await readEnabledTabs();
  const key = String(tabId);
  if (!Object.hasOwn(enabledTabs, key)) {
    enabledTabs[key] = true;
    await writeEnabledTabs(enabledTabs);
  }
  await syncRules(enabledTabs);

  return { available: true, enabled: enabledTabs[key] };
}

async function removeTab(tabId) {
  const enabledTabs = await readEnabledTabs();
  if (!Object.hasOwn(enabledTabs, String(tabId))) {
    return;
  }

  delete enabledTabs[String(tabId)];
  await writeEnabledTabs(enabledTabs);
  await syncRules(enabledTabs);
}

async function restoreRulesForOpenCanalMixTabs() {
  const tabs = await chrome.tabs.query({
    url: ["http://127.0.0.1:3000/*", "http://localhost:3000/*"],
  });
  const openTabIds = new Set(tabs.map((tab) => String(tab.id)));
  const enabledTabs = await readEnabledTabs();

  for (const tabId of Object.keys(enabledTabs)) {
    if (!openTabIds.has(tabId)) {
      delete enabledTabs[tabId];
    }
  }

  await writeEnabledTabs(enabledTabs);
  await syncRules(enabledTabs);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = Number(message?.tabId ?? sender.tab?.id);

  let operation;
  if (
    message?.type === "canalmix-register" &&
    sender.tab?.id != null &&
    isCanalMixUrl(sender.url)
  ) {
    operation = registerCanalMixTab(tabId);
  } else if (message?.type === "get-tab-state") {
    operation = getTabState(tabId);
  } else if (
    message?.type === "set-tab-state" &&
    typeof message.enabled === "boolean"
  ) {
    operation = setTabState(tabId, message.enabled);
  }

  if (!operation) {
    return false;
  }

  operation
    .then(sendResponse)
    .catch(() => sendResponse({ available: false, enabled: false }));
  return true;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (typeof changeInfo.url === "string" && !isCanalMixUrl(changeInfo.url)) {
    void removeTab(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void removeTab(tabId);
});

chrome.runtime.onInstalled.addListener(() => {
  void restoreRulesForOpenCanalMixTabs();
});

chrome.runtime.onStartup.addListener(() => {
  void restoreRulesForOpenCanalMixTabs();
});
