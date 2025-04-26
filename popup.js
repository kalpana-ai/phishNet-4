document.addEventListener('DOMContentLoaded', () => {
  console.log("Popup script running...");
  const scoreDiv = document.getElementById("score");
  const warningsDiv = document.getElementById("warnings");
  const reportDiv = document.getElementById("report");

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received:", message);
    if (message.type === "formScore") {
      const scoreText = message.score === -1 ? "No forms found" : `Score: ${message.score}`;
      scoreDiv.innerText = scoreText;
      warningsDiv.innerHTML = message.warnings.length
        ? message.warnings.map(w => `<p style="color: red; font-weight: bold;">${w}</p>`).join("")
        : "<p>Page looks safe!</p>";

      // Playbook trigger if score < 60
      if (message.score !== -1 && message.score < 60) {
        showPlaybook(message.score);
      }
    }
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { type: "getFormScore" }, (response) => {
      console.log("Response from content script:", response);
      if (response) {
        const scoreText = response.score === -1 ? "No forms found" : `Score: ${response.score}`;
        scoreDiv.innerText = scoreText;
        warningsDiv.innerHTML = response.warnings.length
          ? response.warnings.map(w => `<p style="color: red; font-weight: bold;">${w}</p>`).join("")
          : "<p>Page looks safe!</p>";

        // Playbook trigger if score < 60
        if (response.score !== -1 && response.score < 60) {
          showPlaybook(response.score);
        }
      }
    });
  });

  function generateReport() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: "getFormScore" }, (response) => {
        let report = "PhishNet Security Report\n\n";
        report += `URL: ${tabs[0].url}\n`;
        report += response ? `Safety Score: ${response.score}\n` : "Safety Score: N/A\n";
        report += "Warnings:\n";
        report += response && response.warnings.length
          ? response.warnings.map(w => `- ${w}`).join("\n")
          : "- No warnings found";
        report += "\n\nNote: This report is based on current page analysis.";

        reportDiv.innerText = report;
      });
    });
  }

  document.getElementById("generateReport").addEventListener("click", generateReport);

  // Playbook function
  function showPlaybook(score) {
    const playbook = `
      <h4 style="color: #e74c3c; margin-top: 15px;">Playbook: Unsafe Website Alert (Score: ${score})</h4>
      <ul style="color: #34495e; padding-left: 20px;">
        <li>Aur website se turant nikal jao!</li>
        <li>Koi bhi personal info (jaise password ya card details) mat daalo.</li>
        <li>URL ko check karo, agar strange lage to report karo.</li>
        <li>Anti-virus ya security software chalao.</li>
        <li>Browser ko update rakho aur safe browsing mode on karo.</li>
      </ul>
    `;
    reportDiv.innerHTML = playbook; // Replace report with playbook
  }
});