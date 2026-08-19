// Conversation summarization service.
//
// summarizeMessages(messages) takes an array of message rows (already
// filtered to non-deleted, chronological order) and returns an array of
// short bullet-point strings. This is a local/rule-based heuristic today;
// swap the body of this function for a real LLM call later without
// changing any caller (REST controller / socket handler / UI).

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be',
  'to', 'of', 'in', 'on', 'for', 'with', 'at', 'by', 'this', 'that', 'it',
  'i', 'you', 'we', 'they', 'he', 'she', 'my', 'your', 'our', 'as', 'so',
  'have', 'has', 'had', 'will', 'would', 'can', 'could', 'do', 'does',
  'did', 'not', 'im', "i'm", 'just', 'if', 'about',
]);

function extractKeywords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

function summarizeMessages(messages, { userNames = {} } = {}) {
  if (!messages || messages.length === 0) {
    return ['No messages yet in this conversation.'];
  }

  // Word frequency across the conversation to find recurring topics.
  const freq = {};
  for (const m of messages) {
    for (const word of extractKeywords(m.content)) {
      freq[word] = (freq[word] || 0) + 1;
    }
  }
  const topWords = Object.entries(freq)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);

  const bullets = [];

  bullets.push(`${messages.length} message${messages.length === 1 ? '' : 's'} exchanged in this conversation.`);

  if (topWords.length) {
    bullets.push(`Frequently discussed topics: ${topWords.join(', ')}.`);
  }

  // Pick a handful of "important" messages: longer messages tend to carry
  // more content than short replies like "ok" or "lol".
  const substantial = messages
    .filter((m) => m.content.split(/\s+/).length >= 6)
    .slice(-4);

  for (const m of substantial) {
    const speaker = userNames[m.senderId] || 'A participant';
    const snippet = m.content.length > 90 ? m.content.slice(0, 90) + '…' : m.content;
    bullets.push(`${speaker} mentioned: "${snippet}"`);
  }

  const last = messages[messages.length - 1];
  const lastSpeaker = userNames[last.senderId] || 'Someone';
  bullets.push(`Most recent message was from ${lastSpeaker}.`);

  return bullets;
}

module.exports = { summarizeMessages };
