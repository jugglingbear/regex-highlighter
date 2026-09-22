import { matchTexts, matchRules } from './matcher.js';
self.onmessage = ({ data }) => {
  try { self.postMessage(data.rules ? matchRules(data.texts, data.rules) : matchTexts(data.texts, data.pattern, data.flags)); }
  catch (error) { self.postMessage({ error: error.message }); }
};
