/**
 * WebForge Studio — AI Provider System
 * Handles OpenRouter, LM Studio, Ollama, and custom OpenAI-compatible APIs
 * with streaming reasoning traces and multimodal vision message parts.
 */

import { safeStorageJsonGet, safeStorageSet, STORAGE_KEYS } from './storage.mjs';

export const PROVIDER_PRESETS = {
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    requiresKey: true,
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
    placeholder: 'sk-or-v1-...',
  },
  lmstudio: {
    name: 'LM Studio',
    baseUrl: 'http://localhost:1234/v1',
    requiresKey: false,
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
    placeholder: '',
  },
  ollama: {
    name: 'Ollama',
    baseUrl: 'http://localhost:11434',
    requiresKey: false,
    modelsEndpoint: '/api/tags',
    chatEndpoint: '/v1/chat/completions',
    placeholder: '',
  },
  custom: {
    name: 'Custom API',
    baseUrl: '',
    requiresKey: false,
    modelsEndpoint: '/v1/models',
    chatEndpoint: '/v1/chat/completions',
    placeholder: 'sk-...',
  },
};

export class AIProvider {
  constructor() {
    this.type = 'openrouter';
    this.apiKey = '';
    this.baseUrl = '';
    this.model = '';
    this.models = [];
    this.temperature = 0.7;
    this.maxTokens = 16384;
    this.topP = 0.95;
    this.contextWindow = 32768;
    this.connected = false;
    this.abortController = null;
    this._activeControllers = new Set();
    this.lastReasoning = '';
    this.load();
  }

  get preset() {
    return PROVIDER_PRESETS[this.type] || PROVIDER_PRESETS.openrouter;
  }

  get effectiveBaseUrl() {
    return (this.baseUrl || this.preset.baseUrl).replace(/\/+$/, '');
  }

  get headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.apiKey) h['Authorization'] = `Bearer ${this.apiKey}`;
    if (this.type === 'openrouter') {
      h['HTTP-Referer'] = typeof location !== 'undefined' ? location.href : 'http://localhost:3000/';
      h['X-Title'] = 'WebForge Studio';
    }
    return h;
  }

  configure({ type, apiKey, baseUrl, model, temperature, maxTokens, topP, contextWindow } = {}) {
    if (type !== undefined && PROVIDER_PRESETS[type]) {
      if (type !== this.type) {
        this.type = type;
        this.models = [];
        this.model = '';
        this.connected = false;
      }
    }
    if (apiKey !== undefined) this.apiKey = apiKey;
    if (baseUrl !== undefined) this.baseUrl = baseUrl;
    if (model !== undefined) this.model = model;
    if (temperature !== undefined && Number.isFinite(Number(temperature))) {
      this.temperature = Math.max(0, Math.min(2, Number(temperature)));
    }
    if (maxTokens !== undefined && Number.isFinite(Number(maxTokens)) && Number(maxTokens) > 0) {
      this.maxTokens = Math.round(Number(maxTokens));
    }
    if (topP !== undefined && Number.isFinite(Number(topP))) {
      this.topP = Math.max(0, Math.min(1, Number(topP)));
    }
    if (contextWindow !== undefined && Number.isFinite(Number(contextWindow)) && Number(contextWindow) >= 2048) {
      this.contextWindow = Math.round(Number(contextWindow));
    }
    this.save();
  }

  _formatConnectionError(err) {
    const msg = String(err?.message || err || 'Unknown error');
    const isNetwork = err?.name === 'TypeError' || /failed to fetch|networkerror|load failed/i.test(msg);
    if (!isNetwork) return msg;
    if (this.type === 'ollama') {
      return `Cannot reach Ollama at ${this.effectiveBaseUrl}. Ensure Ollama is running with CORS enabled (OLLAMA_ORIGINS="*").`;
    }
    if (this.type === 'lmstudio') {
      return `Cannot reach LM Studio at ${this.effectiveBaseUrl}. Start the local server and enable CORS in LM Studio settings.`;
    }
    if (this.type === 'custom') {
      return `Cannot reach custom endpoint at ${this.effectiveBaseUrl}. Check the URL, server status, and CORS headers.`;
    }
    return `Network error reaching ${this.effectiveBaseUrl}: ${msg}`;
  }

  async fetchModels() {
    const url = this.type === 'ollama'
      ? `${this.effectiveBaseUrl}/api/tags`
      : `${this.effectiveBaseUrl}${this.preset.modelsEndpoint}`;

    let res;
    try {
      res = await fetch(url, { headers: this.headers });
    } catch (err) {
      throw new Error(this._formatConnectionError(err));
    }
    if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);

    const data = await res.json();

    if (this.type === 'ollama') {
      this.models = (data.models || []).map((m) => ({
        id: m.name,
        name: m.name,
        free: false,
        contextLength: 32768,
      }));
    } else if (this.type === 'openrouter') {
      this.models = (data.data || [])
        .filter((m) => !!m.id)
        .map((m) => {
          const promptPrice = m.pricing?.prompt;
          const completionPrice = m.pricing?.completion;
          const freeByPrice =
            (promptPrice === '0' || promptPrice === 0) &&
            (completionPrice === '0' || completionPrice === 0);
          const free = m.id.includes(':free') || freeByPrice;
          return {
            id: m.id,
            name: m.name || m.id,
            free,
            contextLength: m.context_length || 32768,
          };
        })
        .sort((a, b) => {
          if (a.free !== b.free) return a.free ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
    } else {
      this.models = (data.data || []).map((m) => ({
        id: m.id,
        name: m.id,
        free: false,
        contextLength: m.context_length || 32768,
      }));
    }

    if (this.models.length && (!this.model || !this.models.some((m) => m.id === this.model))) {
      this.model = this.models[0].id;
    }
    const activeMeta = this.models.find((m) => m.id === this.model);
    if (activeMeta?.contextLength) {
      this.contextWindow = activeMeta.contextLength;
    }

    this.connected = true;
    this.save();
    return this.models;
  }

  async testConnection() {
    try {
      await this.fetchModels();
      this.connected = true;
      return { ok: true, models: this.models.length };
    } catch (e) {
      this.connected = false;
      return { ok: false, error: e.message };
    }
  }

  async generate(systemPrompt, userPromptContent, onChunk, history = [], opts = {}) {
    if (!this.model) throw new Error('No model selected. Open Settings to load and select a model.');

    const controller = new AbortController();
    this.abortController = controller;
    this._activeControllers.add(controller);

    const onExternalAbort = () => controller.abort();
    if (opts.signal) {
      if (opts.signal.aborted) controller.abort();
      else opts.signal.addEventListener('abort', onExternalAbort, { once: true });
    }

    this.lastReasoning = '';

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userPromptContent },
    ];

    const url = this.type === 'ollama'
      ? `${this.effectiveBaseUrl}/v1/chat/completions`
      : `${this.effectiveBaseUrl}${this.preset.chatEndpoint}`;

    const body = {
      model: this.model,
      messages,
      stream: true,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      top_p: this.topP,
    };

    try {
      let res;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (err) {
        if (err?.name === 'AbortError') throw err;
        throw new Error(this._formatConnectionError(err));
      }

      if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error(`API error ${res.status}: ${err.substring(0, 220)}`);
      }

      return await this._readStream(res.body, onChunk);
    } finally {
      this._activeControllers.delete(controller);
      if (opts.signal) opts.signal.removeEventListener('abort', onExternalAbort);
      if (this.abortController === controller) this.abortController = null;
    }
  }

  parseSseLine(line) {
    const trimmed = String(line || '').trim();
    if (!trimmed || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) return null;
    try {
      const json = JSON.parse(trimmed.slice(6));
      const delta = json.choices?.[0]?.delta || {};
      const contentDelta = typeof delta.content === 'string' ? delta.content : '';
      const reasoningDelta =
        typeof delta.reasoning_content === 'string'
          ? delta.reasoning_content
          : typeof delta.reasoning === 'string'
            ? delta.reasoning
            : typeof delta.thinking === 'string'
              ? delta.thinking
              : '';
      return { contentDelta, reasoningDelta };
    } catch {
      return null;
    }
  }

  async _readStream(body, onChunk) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let fullReasoning = '';
    let buffer = '';

    const handleLine = (line) => {
      const parsed = this.parseSseLine(line);
      if (!parsed) return;
      const { contentDelta, reasoningDelta } = parsed;
      if (reasoningDelta) {
        fullReasoning += reasoningDelta;
        this.lastReasoning = fullReasoning;
      }
      if (contentDelta) {
        fullContent += contentDelta;
      }
      if (contentDelta || reasoningDelta) {
        onChunk?.(contentDelta, fullContent, fullReasoning, reasoningDelta);
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        handleLine(line);
      }
    }

    if (buffer.trim()) handleLine(buffer);
    return fullContent;
  }

  stop() {
    for (const ctrl of this._activeControllers) {
      try { ctrl.abort(); } catch {}
    }
    this._activeControllers.clear();
    this.abortController = null;
  }

  save() {
    safeStorageSet(
      STORAGE_KEYS.PROVIDER,
      JSON.stringify({
        type: this.type,
        apiKey: this.apiKey,
        baseUrl: this.baseUrl,
        model: this.model,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        topP: this.topP,
        contextWindow: this.contextWindow,
      })
    );
  }

  load() {
    const d = safeStorageJsonGet(STORAGE_KEYS.PROVIDER, null);
    if (d && typeof d === 'object') Object.assign(this, d);
  }
}
