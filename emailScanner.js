console.log("Phishing Email Scanner running...");

// Set to keep track of processed email content hashes
const processedEmails = new Set();

// Function to generate a simple hash of the email content
function generateHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

// Function to check email content for phishing keywords
function isSuspiciousContent(text) {
  const keywords = ["login", "verify account", "urgent", "bank details", "password", "click here"];
  return keywords.some(keyword => text.toLowerCase().includes(keyword));
}

// Function to scan email content
function scanEmailContent() {
  setTimeout(() => { // Delay to ensure content is loaded
    const emailBodies = document.querySelectorAll('div[class*="a3s"], div[class*="ii gt"]'); // Gmail email body selector
    emailBodies.forEach(body => {
      // Skip if this element has already been processed and notified
      if (body.hasAttribute('data-phishnet-notified')) {
        return;
      }

      const text = body.innerText || body.textContent;
      if (text) {
        // Generate a hash of the email content
        const emailHash = generateHash(text);
        
        // Only process if this email content hasn't been processed before
        if (!processedEmails.has(emailHash)) {
          processedEmails.add(emailHash); // Mark this email as processed
          
          if (isSuspiciousContent(text)) {
            // Highlight the email
            body.style.backgroundColor = "yellow";
            body.style.padding = "2px";
            body.title = "Warning: Suspicious content detected!";
            
            // Add warning icon
            const warningIcon = document.createElement("span");
            warningIcon.innerText = "⚠️";
            warningIcon.style.marginLeft = "5px";
            warningIcon.title = "This email may contain phishing content!";
            body.insertAdjacentElement('afterbegin', warningIcon);

            // Send notification
            chrome.runtime.sendMessage({
              type: "showAlert",
              message: "PhishNet Warning: Suspicious content detected in email!"
            });

            // Mark the element as notified to prevent future notifications
            body.setAttribute('data-phishnet-notified', 'true');
          }
        }
      }
    });
  }, 1000); // 1-second delay
}

// Run scanner when the page loads and on dynamic content changes
window.addEventListener("load", scanEmailContent);

// Use MutationObserver to detect dynamically loaded emails
const observer = new MutationObserver((mutations) => {
  mutations.forEach(() => {
    scanEmailContent();
  });
});
observer.observe(document.body, { childList: true, subtree: true });