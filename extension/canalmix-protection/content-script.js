(() => {
  const isCanalMixTab =
    window.location.protocol === "http:" &&
    window.location.port === "3000" &&
    ["127.0.0.1", "localhost"].includes(window.location.hostname);

  if (!isCanalMixTab) {
    return;
  }

  void chrome.runtime.sendMessage({ type: "canalmix-register" }).catch(() => {});
})();
