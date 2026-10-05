import { config } from '../../config/env.js';
import { AiError } from './AiError.js';

const UNAVAILABLE = 'AI analysis is temporarily unavailable.';

function mapHttpError(status) {
  if (status === 401 || status === 403) return new AiError('AI_AUTH', 'The AI provider rejected the configured credentials.', false);
  if (status === 404 || status === 400) return new AiError('AI_BAD_REQUEST', 'The AI provider rejected the request. Check AI_MODEL and AI_BASE_URL.', false);
  if (status === 429) return new AiError('AI_RATE_LIMITED', 'The AI provider rate limit was reached. Try again shortly.', true);
  return new AiError('AI_UNAVAILABLE', UNAVAILABLE, true);
}

async function post(url, headers, body, signal) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal });
  if (!res.ok) {
    console.error(`[ai] provider responded with HTTP ${res.status}`);
    throw mapHttpError(res.status);
  }
  return res.json();
}

async function callAnthropic({ system, user }, signal) {
  const base = config.ai.baseUrl || 'https://api.anthropic.com';
  const data = await post(
    `${base}/v1/messages`,
    { 'x-api-key': config.ai.apiKey, 'anthropic-version': '2023-06-01' },
    { model: config.ai.model, max_tokens: config.ai.maxTokens || 8000, system, messages: [{ role: 'user', content: user }] },
    signal
  );
  return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}

async function callOpenAiCompatible({ system, user }, signal) {
  const base = config.ai.baseUrl || 'https://api.openai.com/v1';
  const body = {
    model: config.ai.model,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    response_format: { type: 'json_object' },
  };
  if (config.ai.maxTokens) body.max_tokens = config.ai.maxTokens;
  const data = await post(`${base}/chat/completions`, { Authorization: `Bearer ${config.ai.apiKey}` }, body, signal);
  return data.choices?.[0]?.message?.content || '';
}

/** Sends one prompt to the configured provider and returns raw text. The key never leaves the server. */
export async function callModel(prompt) {
  if (!config.ai.apiKey || !config.ai.model) {
    throw new AiError('AI_NOT_CONFIGURED', 'AI is not configured on the server. Set AI_API_KEY and AI_MODEL.', false);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.ai.timeoutMs);
  try {
    const text = config.ai.provider === 'anthropic' ? await callAnthropic(prompt, controller.signal) : await callOpenAiCompatible(prompt, controller.signal);
    if (!text.trim()) throw new AiError('AI_BAD_RESPONSE', 'The AI provider returned an empty response.', true);
    return text;
  } catch (err) {
    if (err instanceof AiError) throw err;
    if (err.name === 'AbortError') throw new AiError('AI_TIMEOUT', 'The AI provider took too long to respond.', true);
    console.error('[ai] request failed:', err.message);
    throw new AiError('AI_UNAVAILABLE', UNAVAILABLE, true);
  } finally {
    clearTimeout(timer);
  }
}

export const aiInfo = () => ({
  configured: Boolean(config.ai.apiKey && config.ai.model),
  provider: config.ai.provider,
  model: config.ai.model || null,
  baseUrl: config.ai.baseUrl || null,
});
