// Send the page size (in bytes) to background.js
window.addEventListener("load", () => {
    let totalSize = 0;
    performance.getEntriesByType("resource").forEach(res => {
        totalSize += res.transferSize || 0;
    });
    totalSize += document.documentElement.outerHTML.length;

    chrome.runtime.sendMessage({pageSize: totalSize});
});
