const blacklist = ["ucoz.com", "aladel.net", "fantasticfilms.ru", "teamclouds.com"];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "showAlert") {
    console.log("Received showAlert message:", message.message);
    chrome.notifications.create({
      type: "basic",
      iconUrl: "secure.png",
      title: "PhishNet Alert",
      message: message.message,
      priority: 2
    }, (notificationId) => {
      if (chrome.runtime.lastError) {
        console.error("Error creating notification:", chrome.runtime.lastError);
      } else {
        console.log("Notification created with ID:", notificationId);
      }
    });
  }
  
  // New listener to close the tab
  if (message.type === "closeTab") {
    chrome.tabs.remove(sender.tab.id, () => {
      if (chrome.runtime.lastError) {
        console.error("Error closing tab:", chrome.runtime.lastError);
      } else {
        console.log("Tab closed successfully");
      }
    });
  }
  return true; // Allows asynchronous response
});

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = new URL(details.url);
    const hostname = url.hostname;
    if (blacklist.some(domain => hostname.includes(domain))) {
      console.log(`Phishing site detected: ${hostname}`);
      chrome.notifications.create({
        type: "basic",
        iconUrl: "secure.png",
        title: "PhishNet Warning",
        message: `Danger: ${hostname} is a known phishing site! Proceed with caution.`,
        priority: 2
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          console.error("Error creating notification:", chrome.runtime.lastError);
        }
      });
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);