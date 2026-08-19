// AI Assistant service.
//
// This module exposes a single function `getAssistantReply(message)`.
// It is intentionally decoupled from Socket.IO/REST layers so that the
// rule-based implementation below can later be swapped for a real LLM call
// (e.g. the Anthropic API) without touching any chat/UI code — the caller
// only needs a string message and only receives a string reply.

const RULES = [
  { pattern: /\b(hi|hello|hey)\b/i, reply: "Hey there! I'm your chat assistant. Ask me for productivity tips, or say 'help' to see what I can do." },
  { pattern: /\bhelp\b|\bwhat can you do\b/i, reply: 'I can answer simple questions, share productivity tips, tell you the time, and summarize this conversation using the "Summarize Chat" button.' },
  { pattern: /\bproductiv/i, reply: 'Try breaking your work into smaller tasks and taking short breaks between focused sessions (e.g. the Pomodoro technique: 25 minutes on, 5 minutes off).' },
  { pattern: /\btime\b/i, reply: () => `Right now it's ${new Date().toLocaleTimeString()}.` },
  { pattern: /\bdate\b|\btoday\b/i, reply: () => `Today's date is ${new Date().toLocaleDateString()}.` },
  { pattern: /\bthank/i, reply: "You're welcome! Let me know if there's anything else I can help with." },
  { pattern: /\bjoke\b/i, reply: 'Why do programmers prefer dark mode? Because light attracts bugs.' },
  { pattern: /\bsummar/i, reply: 'Use the "Summarize Chat" button above the message list to get a quick recap of this conversation.' },
  { pattern: /\bbye\b|\bgoodbye\b/i, reply: 'Goodbye! Have a productive day.' },
];

const FALLBACKS = [
  "I'm a simple rule-based assistant for now — I can help with productivity tips, basic questions, or summarizing chats. Try asking 'what can you do?'.",
  "I didn't quite catch that. Try asking me for a productivity tip, the time, or say 'help'.",
];

function getAssistantReply(message) {
  const text = (message || '').trim();
  for (const rule of RULES) {
    if (rule.pattern.test(text)) {
      return typeof rule.reply === 'function' ? rule.reply(text) : rule.reply;
    }
  }
  return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
}

module.exports = { getAssistantReply };
