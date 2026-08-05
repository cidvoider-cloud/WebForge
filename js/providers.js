/**
 * WebForge — AI Provider System
 * Handles OpenRouter, LM Studio, Ollama, and custom OpenAI-compatible APIs.
 * One class, four providers, streaming everywhere.
 */

const PROVIDER_PRESETS = {
  openrouter: {
    name: 'OpenRouter',
    icon: '🌐',
    baseUrl: 'https://openrouter.ai/api/v1',
    requiresKey: true,
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
    placeholder: 'sk-or-v1-...',
  },
  lmstudio: {
    name: 'LM Studio',
    icon: '💻',
    baseUrl: 'http://localhost:1234/v1',
    requiresKey: false,
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
    placeholder: '',
  },
  ollama: {
    name: 'Ollama',
    icon: '🦙',
    baseUrl: 'http://localhost:11434',
    requiresKey: false,
    modelsEndpoint: '/api/tags',
    chatEndpoint: '/v1/chat/completions',
    placeholder: '',
  },
  custom: {
    name: 'Custom API',
    icon: '🔗',
    baseUrl: '',
    requiresKey: false,
    modelsEndpoint: '/v1/models',
    chatEndpoint: '/v1/chat/completions',
    placeholder: 'sk-...',
  },
};

class AIProvider {
  constructor() {
    this.type = 'openrouter';
    this.apiKey = '';
    this.baseUrl = '';
    this.model = '';
    this.models = [];
    this.temperature = 0.7;
    this.maxTokens = 16384;
    this.topP = 0.95;
    this.connected = false;
    this.abortController = null;
    this.load();
  }

  /** Get preset config for current type */
  get preset() {
    return PROVIDER_PRESETS[this.type];
  }

  /** Get effective base URL */
  get effectiveBaseUrl() {
    return (this.baseUrl || this.preset.baseUrl).replace(/\/+$/, '');
  }

  /** Build headers for API requests */
  get headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.apiKey) h['Authorization'] = `Bearer ${this.apiKey}`;
    if (this.type === 'openrouter') {
      h['HTTP-Referer'] = location.href;
      h['X-Title'] = 'WebForge';
    }
    return h;
  }

  /** Configure provider */
  configure({ type, apiKey, baseUrl, model, temperature, maxTokens, topP }) {
    if (type !== undefined) this.type = type;
    if (apiKey !== undefined) this.apiKey = apiKey;
    if (baseUrl !== undefined) this.baseUrl = baseUrl;
    if (model !== undefined) this.model = model;
    if (temperature !== undefined) this.temperature = temperature;
    if (maxTokens !== undefined) this.maxTokens = maxTokens;
    if (topP !== undefined) this.topP = topP;
    this.save();
  }

  /** Fetch available models from the provider */
  async fetchModels() {
    const url = this.type === 'ollama'
      ? `${this.effectiveBaseUrl}/api/tags`
      : `${this.effectiveBaseUrl}${this.preset.modelsEndpoint}`;

    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);

    const data = await res.json();

    if (this.type === 'ollama') {
      this.models = (data.models || []).map(m => ({ id: m.name, name: m.name, free: false }));
    } else if (this.type === 'openrouter') {
      this.models = (data.data || [])
        .filter(m => !!m.id)
        .map(m => {
          const promptPrice = m.pricing?.prompt;
          const completionPrice = m.pricing?.completion;
          const freeByPrice =
            (promptPrice === '0' || promptPrice === 0) &&
            (completionPrice === '0' || completionPrice === 0);
          const free = m.id.includes(':free') || freeByPrice;
          return { id: m.id, name: m.name || m.id, free };
        })
        .sort((a, b) => {
          if (a.free !== b.free) return a.free ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
    } else {
      this.models = (data.data || []).map(m => ({ id: m.id, name: m.id, free: false }));
    }

    if (this.models.length && !this.model) {
      this.model = this.models[0].id;
    }
    this.connected = true;
    this.save();
    return this.models;
  }

  /** Test connection to the provider */
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

  /**
   * Generate a response from the AI with streaming.
   * @param {string} systemPrompt - System prompt with skills & rules
   * @param {string} userPrompt - User's website prompt
   * @param {function} onChunk - Called with each text chunk as it arrives
   * @param {Array} history - Optional conversation history [{role, content}]
   * @returns {Promise<string>} Full response text
   */
  async generate(systemPrompt, userPrompt, onChunk, history = []) {
    if (!this.model) throw new Error('No model selected');

    this.abortController = new AbortController();

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userPrompt },
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

    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
      signal: this.abortController.signal,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`API error ${res.status}: ${err.substring(0, 200)}`);
    }

    return this._readStream(res.body, onChunk);
  }

  /** Parse SSE stream and call onChunk for each text delta */
  async _readStream(body, onChunk) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let full = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        processStreamLine(line);
      }
    }

    if (buffer.trim()) processStreamLine(buffer);
    return full;

    function processStreamLine(line) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') return;
      if (!trimmed.startsWith('data: ')) return;

      try {
        const json = JSON.parse(trimmed.slice(6));
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          onChunk(delta, full);
        }
      } catch {
        // Skip malformed JSON chunks
      }
    }
  }

  /** Stop ongoing generation */
  stop() {
    this.abortController?.abort();
    this.abortController = null;
  }

  /** Save config to localStorage */
  save() {
    localStorage.setItem('wf_provider', JSON.stringify({
      type: this.type, apiKey: this.apiKey, baseUrl: this.baseUrl,
      model: this.model, temperature: this.temperature,
      maxTokens: this.maxTokens, topP: this.topP,
    }));
  }

  /** Load config from localStorage */
  load() {
    try {
      const d = JSON.parse(localStorage.getItem('wf_provider'));
      if (d) Object.assign(this, d);
    } catch { /* fresh start */ }
  }
}
