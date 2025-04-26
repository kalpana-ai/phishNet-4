console.log("Content script running...");

let hasNotified = false;

// Function to calculate page safety score
function calculatePageSafetyScore() {
  let score = 100;
  const warnings = [];

  const isHTTPS = window.location.protocol === "https:";
  if (!isHTTPS) {
    score -= 40;
    warnings.push("Page is not using HTTPS!");
  }

  const scripts = document.getElementsByTagName("script");
  let thirdPartyScripts = 0;
  for (let script of scripts) {
    const src = script.src || "";
    if (src && !src.includes(window.location.hostname)) {
      thirdPartyScripts++;
    }
  }
  if (thirdPartyScripts > 3) {
    score -= 20;
    warnings.push("Multiple third-party scripts detected!");
  }

  const domain = window.location.hostname;
  if (domain.includes("suspicious")) {
    score -= 30;
    warnings.push("Domain may be suspicious!");
  }

  if (score < 70 && !hasNotified) {
    warnings.push(`Warning: Page Score ${score} - This page may be unsafe!`);
    chrome.runtime.sendMessage({
      type: "showAlert",
      message: `Unsafe Page Detected!\nScore: ${score}\n${warnings.join("\n")}`
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending message:", chrome.runtime.lastError);
      } else {
        hasNotified = true;
        console.log("Alert message sent successfully");
      }
    });
  }

  // Playbook trigger if score < 60
  if (score < 60 && !hasNotified) {
    showPlaybookPopup(score);
    hasNotified = true; // Prevent repeated popups
  }

  return { score, warnings };
}

// Function to show playbook as a screen popup
function showPlaybookPopup(score) {
  // Create overlay div if not exists
  let overlay = document.getElementById("phishnet-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "phishnet-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    `;
    document.body.appendChild(overlay);
  }

  // Create popup div
  const popup = document.createElement("div");
  popup.id = "phishnet-popup";
  popup.style.cssText = `
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    width: 400px;
    max-height: 80vh;
    overflow-y: auto;
    color: #333;
    font-family: Arial, sans-serif;
  `;

  // Playbook content with centered buttons
  popup.innerHTML = `
    <h3 style="color: #e74c3c; margin-top: 0;">⚠️ PhishNet Playbook Alert (Score: ${score}) ⚠️</h3>
    <ul style="padding-left: 20px; line-height: 1.5;">
      <li>Leave the website immediately!</li>
      <li>Do not enter any personal information (like passwords or card details).</li>
      <li>Check the URL, and if it looks strange, report it.</li>
      <li>Run antivirus or security software.</li>
      <li>Keep your browser updated and enable safe browsing mode.</li>
    </ul>
    <div style="display: flex; justify-content: center; gap: 10px; margin-top: 15px;">
      <button id="closePopup" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">OK, Got It</button>
      <button id="emergencyExit" style="padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer;">Emergency Exit</button>
    </div>
  `;

  overlay.appendChild(popup);

  // Close popup on button click
  document.getElementById("closePopup").addEventListener("click", () => {
    overlay.remove();
    hasNotified = false; // Reset for next page
  });

  // Emergency Exit button to close the tab
  document.getElementById("emergencyExit").addEventListener("click", () => {
    chrome.runtime.sendMessage({
      type: "closeTab"
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending closeTab message:", chrome.runtime.lastError);
      }
    });
  });
}

// Check for forms on page load
window.addEventListener("load", () => {
  const forms = document.getElementsByTagName("form");
  console.log("Forms found:", forms.length);

  if (forms.length === 0) {
    const pageSafety = calculatePageSafetyScore();
    chrome.runtime.sendMessage({
      type: "formScore",
      score: pageSafety.score,
      warnings: pageSafety.warnings.length ? pageSafety.warnings : ["No forms found, but page safety checked."]
    });
  } else {
    for (let form of forms) {
      const action = form.action || "";
      const isHTTPS = action.startsWith("https://");
      const domain = action.split("/")[2] || window.location.hostname;

      let score = 100;
      if (!isHTTPS) score -= 50;
      if (!domain || domain.includes("suspicious")) score -= 30;
      if (form.method !== "post") score -= 20;

      const warnings = [];
      if (score < 70 && !hasNotified) {
        warnings.push(`Warning: Form Score ${score} - This form may be unsafe!`);
        chrome.runtime.sendMessage({
          type: "showAlert",
          message: `Unsafe Form Detected!\nScore: ${score}\n${warnings.join("\n")}`
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending message:", chrome.runtime.lastError);
          } else {
            hasNotified = true;
            console.log("Alert message sent successfully");
          }
        });
      }

      if (score < 60 && !hasNotified) {
        showPlaybookPopup(score);
        hasNotified = true;
      }

      chrome.runtime.sendMessage({
        type: "formScore",
        score: score,
        warnings: warnings.length ? warnings : []
      });
    }
  }
});

// Respond to popup requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getFormScore") {
    const forms = document.getElementsByTagName("form");
    if (forms.length === 0) {
      const pageSafety = calculatePageSafetyScore();
      sendResponse({
        score: pageSafety.score,
        warnings: pageSafety.warnings.length ? pageSafety.warnings : ["No forms found, but page safety checked."]
      });
    } else {
      const form = forms[0];
      const action = form.action || "";
      const isHTTPS = action.startsWith("https://");
      const domain = action.split("/")[2] || window.location.hostname;

      let score = 100;
      if (!isHTTPS) score -= 50;
      if (!domain || domain.includes("suspicious")) score -= 30;
      if (form.method !== "post") score -= 20;

      const warnings = [];
      if (score < 70 && !hasNotified) {
        warnings.push(`Warning: Form Score ${score} - This form may be unsafe!`);
        chrome.runtime.sendMessage({
          type: "showAlert",
          message: `Unsafe Form Detected!\nScore: ${score}\n${warnings.join("\n")}`
        });
        hasNotified = true;
      }

      if (score < 60 && !hasNotified) {
        showPlaybookPopup(score);
        hasNotified = true;
      }

      sendResponse({
        score: score,
        warnings: warnings.length ? warnings : []
      });
    }
    return true;
  }
  return true;
});

// Reset notification flag on page change
window.addEventListener("beforeunload", () => {
  hasNotified = false;
  const overlay = document.getElementById("phishnet-overlay");
  if (overlay) overlay.remove();
});