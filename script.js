// ⚠️ Replace this with YOUR Apps Script Web App URL (must end in /exec)
const API_URL = "https://script.google.com/macros/s/AKfycbxOT8R4fziNOAMgp_11yjGCcMVqpsDdvOxhH1QLR1F1EesyHqayMxM8a0Z6iX70kEoiow/exec";
 
// Keeps track of the conversation so the backend can understand follow-up
// questions like "is this too expensive?" that refer back to something
// said earlier. Stored only in memory for this browser tab — resets on
// page reload, which is fine for a support chat session.
let conversationHistory = [];
const MAX_HISTORY_MESSAGES = 8; // last 8 messages (4 exchanges) is plenty of context
 
async function sendMessage() {
  const input = document.getElementById("userInput");
  const chatBox = document.getElementById("chatBox");
  const question = input.value.trim();
 
  if (!question) return;
 
  // 1. Show the user's own message immediately
  appendMessage(question, "user");
  input.value = "";
 
  // 2. Show a temporary "thinking" bubble so it's obvious something is happening
  const thinkingBubble = appendMessage("Thinking...", "bot");
 
  try {
    // 3. Call the live Apps Script backend — this is the real network request.
    //    It is sent fresh every single time, so the sheet/RxNorm data behind
    //    it is always read at the moment of the question, not cached here.
    //    We also send recent conversation history so the backend can
    //    resolve references like "this" or "it" to what was just discussed.
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
        // NOTE: Apps Script Web Apps do not handle CORS preflight well with
        // "application/json" headers from a different origin (GitHub Pages).
        // Sending as text/plain avoids a CORS preflight request, and
        // e.postData.contents on the backend still parses fine with JSON.parse().
      },
      body: JSON.stringify({
        message: question,
        history: conversationHistory
      })
    });
 
    if (!response.ok) {
      throw new Error("Server responded with status " + response.status);
    }
 
    const data = await response.json();
 
    // 4. Replace the "Thinking..." bubble with the real reply
    // TEMP DEBUG: show the real backend error if present, so we can diagnose.
    // Remove the data.error part once everything is working.
    const replyText = data.error
      ? (data.reply + " [DEBUG: " + data.error + "]")
      : (data.reply || "Sorry, I didn't get a response.");
 
    thinkingBubble.textContent = replyText;
 
    // 5. Record this exchange in history for future follow-up questions
    conversationHistory.push({ role: "user", text: question });
    conversationHistory.push({ role: "bot", text: replyText });
 
    // Keep only the most recent messages so the payload doesn't grow forever
    if (conversationHistory.length > MAX_HISTORY_MESSAGES) {
      conversationHistory = conversationHistory.slice(-MAX_HISTORY_MESSAGES);
    }
 
  } catch (err) {
    thinkingBubble.textContent = "Sorry, I couldn't reach the assistant right now. Please try again.";
    console.error("Chatbot error:", err);
  }
}
 
function appendMessage(text, sender) {
  const chatBox = document.getElementById("chatBox");
  const bubble = document.createElement("div");
  bubble.className = "message " + sender;
  bubble.textContent = text;
  chatBox.appendChild(bubble);
  chatBox.scrollTop = chatBox.scrollHeight;
  return bubble;
}
 
// Allow pressing Enter to send, not just clicking the button
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("userInput");
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        sendMessage();
      }
    });
  }
});
 
