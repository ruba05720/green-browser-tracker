let activeTabId = null;
let activeTabStartTime = null;

// Track the first active tab on startup safely
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs && tabs.length > 0) {
        activeTabId = tabs[0].id;
        activeTabStartTime = Date.now();
    } else {
        console.log("No active tab yet — waiting for tab activation...");
    }
});


// Tab switch
chrome.tabs.onActivated.addListener((activeInfo) => {
  saveTime();
  activeTabId = activeInfo.tabId;
  activeTabStartTime = Date.now();
});

// Page load
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.status === "complete") {
    saveTime();
    activeTabStartTime = Date.now();
  }
});

// Receive page size from content.js
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.pageSize) {
    chrome.storage.local.get({ browsingData: [] }, (result) => {
      const data = result.browsingData;
      if (data.length > 0) {
        const lastEntry = data[data.length - 1];
        if (lastEntry && !lastEntry.pageSize) {
          lastEntry.pageSize = msg.pageSize;
          lastEntry.energyKWh = (msg.pageSize / (1024 * 1024)) * 0.00015;
          lastEntry.carbonKg = lastEntry.energyKWh * 0.475;
          chrome.storage.local.set({ browsingData: data });
        }
      }
    });
  }
});

// Save time spent on previous tab
function saveTime() {
  if (activeTabId && activeTabStartTime) {
    chrome.tabs.get(activeTabId, (tab) => {
      if (chrome.runtime.lastError || !tab) return;
      const timeSpent = Date.now() - activeTabStartTime;
      const url = tab.url;

      chrome.storage.local.get({ browsingData: [] }, (result) => {
        const data = result.browsingData;
        data.push({ url, time: timeSpent, timestamp: Date.now() });
        if (data.length > 1000) data.splice(0, data.length - 1000);
        chrome.storage.local.set({ browsingData: data });
      });
    });
  }
}
