/**
 * WebForge Studio — Multi-Provider & Multi-Protocol AI Engine
 * Full Cherry Studio + Local Coding Developer provider parity:
 *  - Local Runtimes pinned first (Strata, LM Studio, Ollama, Unsloth Studio, LiteLLM, oMLX, Rapid-MLX, GPUStack, ComfyUI)
 *  - Global Cloud & Coding Agents (OpenRouter, Anthropic, OpenAI, Gemini, DeepSeek, Grok, Mistral, Perplexity, Claude Code, OpenAI Codex, Grok CLI, OpenCode Go, GitHub Copilot, Azure OpenAI, Vertex AI, AWS Bedrock, NVIDIA, Cerebras, Hugging Face, Vercel AI Gateway, AMD GPU Cloud, Voyage AI, Jina, Poe)
 *  - Gateways & Regional Cloud (SiliconFlow, AiHubMix, BigModel, Moonshot CN, Qwen Cloud, Qianwen AI, Doubao, MiniMax CN, StepFun, Baichuan, Baidu Cloud, ModelScope, DMXAPI, 302.AI, New API, CherryIN, ocoolAI, Alaya NeW, AiOnly, BurnCloud, LANYUN, PH8, SophNet, PPIO, Qiniu AI, TokenDance, TokenHub, State Cloud Xirang, LongCat AI, Xiaomi MiMo)
 *  - Unlimited custom providers via `+ Add Provider`
 *
 * Wire Protocols:
 *  - `openai-chat`         -> POST /chat/completions  (OpenAI, OpenRouter, Strata, LM Studio, etc.)
 *  - `anthropic-messages`  -> POST /messages          (Strata Anthropic mode, Anthropic API, Claude Code)
 *  - `openai-responses`    -> POST /responses         (Strata Responses mode, OpenAI Responses / Codex)
 *  - `ollama`              -> GET /api/tags + POST /v1/chat/completions
 *
 * Includes automatic local `/api/provider-proxy` fallback when browser CORS blocks direct requests.
 * Storage key `wf_provider` is preserved for full backwards compatibility.
 */

import { safeStorageJsonGet, safeStorageSet, STORAGE_KEYS } from './storage.mjs';

export const PROVIDER_PROTOCOLS = Object.freeze({
  'openai-chat': {
    id: 'openai-chat',
    label: 'OpenAI /v1',
    shortLabel: 'OpenAI Chat',
    chatPath: '/chat/completions',
    modelsPath: '/models',
    description: 'Standard OpenAI Chat Completions API (/v1/chat/completions).',
  },
  'anthropic-messages': {
    id: 'anthropic-messages',
    label: 'Anthropic /messages',
    shortLabel: 'Anthropic',
    chatPath: '/messages',
    modelsPath: '/models',
    description: 'Anthropic Messages API (/v1/messages) with x-api-key & thinking blocks.',
  },
  'openai-responses': {
    id: 'openai-responses',
    label: 'Responses /responses',
    shortLabel: 'Responses API',
    chatPath: '/responses',
    modelsPath: '/models',
    description: 'OpenAI Responses API (/v1/responses) used by Codex CLI & Strata.',
  },
  ollama: {
    id: 'ollama',
    label: 'Ollama Native',
    shortLabel: 'Ollama',
    chatPath: '/v1/chat/completions',
    modelsPath: '/api/tags',
    description: 'Ollama /api/tags discovery with OpenAI-compatible streaming chat.',
  },
});

export const PROVIDER_GROUPS = Object.freeze([
  { id: 'local', label: 'Local Runtimes' },
  { id: 'cloud', label: 'Global Cloud & Coding' },
  { id: 'gateway', label: 'Gateways & Regional' },
]);

function defPreset(id, cfg) {
  const protocol = cfg.protocol || 'openai-chat';
  const protoMeta = PROVIDER_PROTOCOLS[protocol] || PROVIDER_PROTOCOLS['openai-chat'];
  return {
    id,
    name: cfg.name,
    group: cfg.group || 'cloud',
    baseUrl: cfg.baseUrl ?? '',
    requiresKey: cfg.requiresKey !== undefined ? cfg.requiresKey : cfg.group !== 'local',
    isLocal: cfg.group === 'local',
    protocol,
    supportedProtocols: cfg.supportedProtocols || [protocol],
    modelsEndpoint: cfg.modelsEndpoint || protoMeta.modelsPath,
    chatEndpoint: cfg.chatEndpoint || protoMeta.chatPath,
    placeholder: cfg.placeholder ?? (cfg.group === 'local' ? 'Optional local token' : 'sk-...'),
    apiKeyUrl: cfg.apiKeyUrl || '',
    docsUrl: cfg.docsUrl || '',
    logoCode: cfg.logoCode || cfg.name.slice(0, 2).toUpperCase(),
    brandTone: cfg.brandTone || (cfg.group === 'local' ? 'emerald' : cfg.group === 'cloud' ? 'sky' : 'violet'),
    endpointPresets: cfg.endpointPresets || [],
    defaultProxyMode: cfg.defaultProxyMode || 'auto', // auto | always | direct
    hint: cfg.hint || '',
  };
}

export const PROVIDER_PRESETS = {
  // ═══════════════════════════════════════════════════════════════
  // 1. LOCAL RUNTIMES (PINNED FIRST)
  // ═══════════════════════════════════════════════════════════════
  strata: defPreset('strata', {
    name: 'Strata',
    group: 'local',
    baseUrl: 'http://127.0.0.1:8080/v1',
    requiresKey: false,
    protocol: 'openai-chat',
    supportedProtocols: ['openai-chat', 'anthropic-messages', 'openai-responses'],
    placeholder: 'Optional local key',
    docsUrl: 'https://stratallm.org',
    logoCode: 'ST',
    brandTone: 'amber',
    endpointPresets: [
      { label: '127.0.0.1:8080/v1', url: 'http://127.0.0.1:8080/v1' },
      { label: 'localhost:8080/v1', url: 'http://localhost:8080/v1' },
    ],
    hint: 'Local MoE engine on port 8080 with OpenAI Chat, Anthropic, and Responses APIs.',
  }),
  lmstudio: defPreset('lmstudio', {
    name: 'LM Studio',
    group: 'local',
    baseUrl: 'http://localhost:1234/v1',
    requiresKey: false,
    protocol: 'openai-chat',
    supportedProtocols: ['openai-chat', 'openai-responses'],
    placeholder: '',
    logoCode: 'LM',
    brandTone: 'violet',
    endpointPresets: [
      { label: 'localhost:1234/v1', url: 'http://localhost:1234/v1' },
      { label: '127.0.0.1:1234/v1', url: 'http://127.0.0.1:1234/v1' },
    ],
    hint: 'Start Local Server in LM Studio on port 1234.',
  }),
  ollama: defPreset('ollama', {
    name: 'Ollama',
    group: 'local',
    baseUrl: 'http://localhost:11434',
    requiresKey: false,
    protocol: 'ollama',
    supportedProtocols: ['ollama', 'openai-chat'],
    modelsEndpoint: '/api/tags',
    chatEndpoint: '/v1/chat/completions',
    placeholder: '',
    logoCode: 'OL',
    brandTone: 'slate',
    endpointPresets: [
      { label: 'localhost:11434', url: 'http://localhost:11434' },
      { label: '127.0.0.1:11434', url: 'http://127.0.0.1:11434' },
    ],
    hint: 'Local Ollama daemon on port 11434 (auto-relays via local proxy if CORS is unset).',
  }),
  'unsloth-studio': defPreset('unsloth-studio', {
    name: 'Unsloth Studio',
    group: 'local',
    baseUrl: 'http://127.0.0.1:8888/v1',
    requiresKey: false,
    protocol: 'openai-chat',
    supportedProtocols: ['openai-chat'],
    logoCode: 'US',
    brandTone: 'emerald',
    endpointPresets: [
      { label: '127.0.0.1:8888/v1', url: 'http://127.0.0.1:8888/v1' },
      { label: '127.0.0.1:8000/v1', url: 'http://127.0.0.1:8000/v1' },
    ],
    hint: 'Unsloth Studio local OpenAI-compatible serving endpoint.',
  }),
  litellm: defPreset('litellm', {
    name: 'LiteLLM',
    group: 'local',
    baseUrl: 'http://localhost:4000/v1',
    requiresKey: false,
    protocol: 'openai-chat',
    supportedProtocols: ['openai-chat', 'anthropic-messages', 'openai-responses'],
    logoCode: 'LL',
    brandTone: 'sky',
    endpointPresets: [{ label: 'localhost:4000/v1', url: 'http://localhost:4000/v1' }],
    hint: 'LiteLLM unified gateway proxy.',
  }),
  omlx: defPreset('omlx', {
    name: 'oMLX',
    group: 'local',
    baseUrl: 'http://127.0.0.1:8000/v1',
    requiresKey: false,
    protocol: 'openai-chat',
    logoCode: 'MX',
    brandTone: 'teal',
    endpointPresets: [{ label: '127.0.0.1:8000/v1', url: 'http://127.0.0.1:8000/v1' }],
  }),
  'rapid-mlx': defPreset('rapid-mlx', {
    name: 'Rapid-MLX',
    group: 'local',
    baseUrl: 'http://127.0.0.1:8080/v1',
    requiresKey: false,
    protocol: 'openai-chat',
    logoCode: 'RM',
    brandTone: 'amber',
    endpointPresets: [{ label: '127.0.0.1:8080/v1', url: 'http://127.0.0.1:8080/v1' }],
  }),
  gpustack: defPreset('gpustack', {
    name: 'GPUStack',
    group: 'local',
    baseUrl: 'http://localhost:80/v1',
    requiresKey: false,
    protocol: 'openai-chat',
    logoCode: 'GS',
    brandTone: 'indigo',
  }),
  comfyui: defPreset('comfyui', {
    name: 'ComfyUI',
    group: 'local',
    baseUrl: 'http://127.0.0.1:8188/v1',
    requiresKey: false,
    protocol: 'openai-chat',
    logoCode: 'CF',
    brandTone: 'emerald',
  }),

  // ═══════════════════════════════════════════════════════════════
  // 2. GLOBAL CLOUD & CODING DEVELOPER PROVIDERS
  // ═══════════════════════════════════════════════════════════════
  openrouter: defPreset('openrouter', {
    name: 'OpenRouter',
    group: 'cloud',
    baseUrl: 'https://openrouter.ai/api/v1',
    requiresKey: true,
    protocol: 'openai-chat',
    supportedProtocols: ['openai-chat', 'openai-responses'],
    placeholder: 'sk-or-v1-...',
    apiKeyUrl: 'https://openrouter.ai/keys',
    logoCode: 'OR',
    brandTone: 'emerald',
  }),
  anthropic: defPreset('anthropic', {
    name: 'Anthropic',
    group: 'cloud',
    baseUrl: 'https://api.anthropic.com/v1',
    requiresKey: true,
    protocol: 'anthropic-messages',
    supportedProtocols: ['anthropic-messages', 'openai-chat'],
    placeholder: 'sk-ant-...',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    logoCode: 'AN',
    brandTone: 'orange',
    defaultProxyMode: 'auto',
    hint: 'Uses Anthropic Messages API (/v1/messages) with automatic local proxy relay for browser CORS.',
  }),
  openai: defPreset('openai', {
    name: 'OpenAI',
    group: 'cloud',
    baseUrl: 'https://api.openai.com/v1',
    requiresKey: true,
    protocol: 'openai-chat',
    supportedProtocols: ['openai-chat', 'openai-responses'],
    placeholder: 'sk-proj-...',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    logoCode: 'OA',
    brandTone: 'teal',
  }),
  gemini: defPreset('gemini', {
    name: 'Gemini',
    group: 'cloud',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    requiresKey: true,
    protocol: 'openai-chat',
    placeholder: 'AIza...',
    apiKeyUrl: 'https://aistudio.google.com/apikey',
    logoCode: 'GM',
    brandTone: 'sky',
  }),
  deepseek: defPreset('deepseek', {
    name: 'DeepSeek',
    group: 'cloud',
    baseUrl: 'https://api.deepseek.com/v1',
    requiresKey: true,
    protocol: 'openai-chat',
    placeholder: 'sk-...',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    logoCode: 'DS',
    brandTone: 'indigo',
  }),
  grok: defPreset('grok', {
    name: 'Grok',
    group: 'cloud',
    baseUrl: 'https://api.x.ai/v1',
    requiresKey: true,
    protocol: 'openai-chat',
    supportedProtocols: ['openai-chat', 'openai-responses'],
    placeholder: 'xai-...',
    apiKeyUrl: 'https://console.x.ai/',
    logoCode: 'X',
    brandTone: 'slate',
  }),
  mistral: defPreset('mistral', {
    name: 'Mistral',
    group: 'cloud',
    baseUrl: 'https://api.mistral.ai/v1',
    requiresKey: true,
    protocol: 'openai-chat',
    apiKeyUrl: 'https://console.mistral.ai/api-keys/',
    logoCode: 'MI',
    brandTone: 'orange',
  }),
  perplexity: defPreset('perplexity', {
    name: 'Perplexity',
    group: 'cloud',
    baseUrl: 'https://api.perplexity.ai',
    requiresKey: true,
    protocol: 'openai-chat',
    placeholder: 'pplx-...',
    apiKeyUrl: 'https://www.perplexity.ai/settings/api',
    logoCode: 'PX',
    brandTone: 'cyan',
  }),
  'claude-code': defPreset('claude-code', {
    name: 'Claude Code',
    group: 'cloud',
    baseUrl: 'https://api.anthropic.com/v1',
    requiresKey: true,
    protocol: 'anthropic-messages',
    supportedProtocols: ['anthropic-messages', 'openai-chat'],
    placeholder: 'sk-ant-...',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    logoCode: 'CC',
    brandTone: 'orange',
    hint: 'Anthropic Messages compatible endpoint (also works with local Claude Code proxies or Strata).',
  }),
  'openai-codex': defPreset('openai-codex', {
    name: 'OpenAI Codex',
    group: 'cloud',
    baseUrl: 'https://api.openai.com/v1',
    requiresKey: true,
    protocol: 'openai-responses',
    supportedProtocols: ['openai-responses', 'openai-chat'],
    placeholder: 'sk-proj-...',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    logoCode: 'CX',
    brandTone: 'teal',
    hint: 'OpenAI Responses API (/v1/responses) for Codex & reasoning models.',
  }),
  'grok-cli': defPreset('grok-cli', {
    name: 'Grok CLI',
    group: 'cloud',
    baseUrl: 'https://api.x.ai/v1',
    requiresKey: true,
    protocol: 'openai-chat',
    placeholder: 'xai-...',
    apiKeyUrl: 'https://console.x.ai/',
    logoCode: 'GC',
    brandTone: 'slate',
  }),
  'opencode-go': defPreset('opencode-go', {
    name: 'OpenCode Go',
    group: 'cloud',
    baseUrl: 'https://opencode.ai/zen/v1',
    requiresKey: true,
    protocol: 'openai-chat',
    supportedProtocols: ['openai-chat', 'anthropic-messages'],
    logoCode: 'OC',
    brandTone: 'indigo',
  }),
  'github-copilot': defPreset('github-copilot', {
    name: 'GitHub Copilot',
    group: 'cloud',
    baseUrl: 'https://api.githubcopilot.com',
    requiresKey: true,
    protocol: 'openai-chat',
    placeholder: 'ghu_... or Copilot token',
    apiKeyUrl: 'https://github.com/settings/tokens',
    logoCode: 'GH',
    brandTone: 'slate',
  }),
  'azure-openai': defPreset('azure-openai', {
    name: 'Azure OpenAI',
    group: 'cloud',
    baseUrl: 'https://YOUR_RESOURCE.openai.azure.com/openai/v1',
    requiresKey: true,
    protocol: 'openai-chat',
    supportedProtocols: ['openai-chat', 'openai-responses'],
    apiKeyUrl: 'https://portal.azure.com/',
    logoCode: 'AZ',
    brandTone: 'sky',
  }),
  vertexai: defPreset('vertexai', {
    name: 'Vertex AI',
    group: 'cloud',
    baseUrl: 'https://us-central1-aiplatform.googleapis.com/v1beta1/projects/PROJECT_ID/locations/us-central1/endpoints/openapi',
    requiresKey: true,
    protocol: 'openai-chat',
    apiKeyUrl: 'https://console.cloud.google.com/vertex-ai',
    logoCode: 'VX',
    brandTone: 'sky',
  }),
  bedrock: defPreset('bedrock', {
    name: 'AWS Bedrock',
    group: 'cloud',
    baseUrl: 'https://bedrock-runtime.us-east-1.amazonaws.com/openai/v1',
    requiresKey: true,
    protocol: 'openai-chat',
    apiKeyUrl: 'https://console.aws.amazon.com/bedrock',
    logoCode: 'AW',
    brandTone: 'teal',
  }),
  nvidia: defPreset('nvidia', {
    name: 'Nvidia',
    group: 'cloud',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    requiresKey: true,
    protocol: 'openai-chat',
    placeholder: 'nvapi-...',
    apiKeyUrl: 'https://build.nvidia.com/',
    logoCode: 'NV',
    brandTone: 'emerald',
  }),
  cerebras: defPreset('cerebras', {
    name: 'Cerebras AI',
    group: 'cloud',
    baseUrl: 'https://api.cerebras.ai/v1',
    requiresKey: true,
    protocol: 'openai-chat',
    placeholder: 'csk-...',
    apiKeyUrl: 'https://cloud.cerebras.ai/',
    logoCode: 'CB',
    brandTone: 'orange',
  }),
  huggingface: defPreset('huggingface', {
    name: 'Hugging Face',
    group: 'cloud',
    baseUrl: 'https://router.huggingface.co/v1',
    requiresKey: true,
    protocol: 'openai-chat',
    placeholder: 'hf_...',
    apiKeyUrl: 'https://huggingface.co/settings/tokens',
    logoCode: 'HF',
    brandTone: 'amber',
  }),
  'vercel-ai-gateway': defPreset('vercel-ai-gateway', {
    name: 'Vercel AI Gateway',
    group: 'cloud',
    baseUrl: 'https://ai-gateway.vercel.sh/v1',
    requiresKey: true,
    protocol: 'openai-chat',
    apiKeyUrl: 'https://vercel.com/dashboard',
    logoCode: 'VC',
    brandTone: 'slate',
  }),
  'amd-gpu-cloud': defPreset('amd-gpu-cloud', {
    name: 'AMD GPU Cloud',
    group: 'cloud',
    baseUrl: 'https://api.amd.com/v1',
    requiresKey: true,
    protocol: 'openai-chat',
    logoCode: 'AM',
    brandTone: 'rose',
  }),
  voyageai: defPreset('voyageai', {
    name: 'Voyage AI',
    group: 'cloud',
    baseUrl: 'https://api.voyageai.com/v1',
    requiresKey: true,
    protocol: 'openai-chat',
    apiKeyUrl: 'https://dash.voyageai.com/',
    logoCode: 'VY',
    brandTone: 'slate',
  }),
  jina: defPreset('jina', {
    name: 'Jina',
    group: 'cloud',
    baseUrl: 'https://deepsearch.jina.ai/v1',
    requiresKey: true,
    protocol: 'openai-chat',
    apiKeyUrl: 'https://jina.ai/',
    logoCode: 'JN',
    brandTone: 'teal',
  }),
  poe: defPreset('poe', {
    name: 'Poe',
    group: 'cloud',
    baseUrl: 'https://api.poe.com/v1',
    requiresKey: true,
    protocol: 'openai-chat',
    apiKeyUrl: 'https://poe.com/api_key',
    logoCode: 'PO',
    brandTone: 'violet',
  }),

  // ═══════════════════════════════════════════════════════════════
  // 3. GATEWAYS & REGIONAL CLOUD (CHERRY STUDIO CATALOG)
  // ═══════════════════════════════════════════════════════════════
  siliconflow: defPreset('siliconflow', {
    name: 'SiliconFlow',
    group: 'gateway',
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKeyUrl: 'https://cloud.siliconflow.cn/account/ak',
    logoCode: 'SF',
    brandTone: 'violet',
  }),
  aihubmix: defPreset('aihubmix', {
    name: 'AiHubMix',
    group: 'gateway',
    baseUrl: 'https://aihubmix.com/v1',
    apiKeyUrl: 'https://aihubmix.com/token',
    logoCode: 'AH',
    brandTone: 'sky',
  }),
  bigmodel: defPreset('bigmodel', {
    name: 'BigModel',
    group: 'gateway',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    logoCode: 'BM',
    brandTone: 'indigo',
  }),
  moonshot: defPreset('moonshot', {
    name: 'Moonshot CN',
    group: 'gateway',
    baseUrl: 'https://api.moonshot.cn/v1',
    apiKeyUrl: 'https://platform.moonshot.cn/console/api-keys',
    logoCode: 'MS',
    brandTone: 'slate',
  }),
  'qwen-cloud': defPreset('qwen-cloud', {
    name: 'Qwen Cloud',
    group: 'gateway',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    apiKeyUrl: 'https://dashscope.console.aliyun.com/apiKey',
    logoCode: 'QW',
    brandTone: 'violet',
  }),
  qianwen: defPreset('qianwen', {
    name: 'Qianwen AI Platform',
    group: 'gateway',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyUrl: 'https://dashscope.console.aliyun.com/apiKey',
    logoCode: 'QA',
    brandTone: 'indigo',
  }),
  doubao: defPreset('doubao', {
    name: 'Doubao (Volcengine)',
    group: 'gateway',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    apiKeyUrl: 'https://console.volcengine.com/ark',
    logoCode: 'DB',
    brandTone: 'sky',
  }),
  minimax: defPreset('minimax', {
    name: 'MiniMax CN',
    group: 'gateway',
    baseUrl: 'https://api.minimax.chat/v1',
    apiKeyUrl: 'https://platform.minimaxi.com/',
    logoCode: 'MM',
    brandTone: 'rose',
  }),
  stepfun: defPreset('stepfun', {
    name: 'StepFun',
    group: 'gateway',
    baseUrl: 'https://api.stepfun.com/v1',
    apiKeyUrl: 'https://platform.stepfun.com/',
    logoCode: 'STF',
    brandTone: 'sky',
  }),
  baichuan: defPreset('baichuan', {
    name: 'Baichuan',
    group: 'gateway',
    baseUrl: 'https://api.baichuan-ai.com/v1',
    apiKeyUrl: 'https://platform.baichuan-ai.com/console/apikey',
    logoCode: 'BC',
    brandTone: 'orange',
  }),
  'baidu-cloud': defPreset('baidu-cloud', {
    name: 'Baidu Cloud',
    group: 'gateway',
    baseUrl: 'https://qianfan.baidubce.com/v2',
    apiKeyUrl: 'https://console.bce.baidu.com/qianfan',
    logoCode: 'BD',
    brandTone: 'sky',
  }),
  modelscope: defPreset('modelscope', {
    name: 'ModelScope',
    group: 'gateway',
    baseUrl: 'https://api-inference.modelscope.cn/v1',
    apiKeyUrl: 'https://modelscope.cn/my/myaccesstoken',
    logoCode: 'MO',
    brandTone: 'violet',
  }),
  dmxapi: defPreset('dmxapi', {
    name: 'DMXAPI',
    group: 'gateway',
    baseUrl: 'https://www.dmxapi.cn/v1',
    logoCode: 'DX',
    brandTone: 'rose',
  }),
  '302ai': defPreset('302ai', {
    name: '302.AI',
    group: 'gateway',
    baseUrl: 'https://api.302.ai/v1',
    apiKeyUrl: 'https://302.ai/',
    logoCode: '302',
    brandTone: 'violet',
  }),
  newapi: defPreset('newapi', {
    name: 'New API',
    group: 'gateway',
    baseUrl: 'https://api.newapi.pro/v1',
    logoCode: 'NA',
    brandTone: 'cyan',
  }),
  cherryin: defPreset('cherryin', {
    name: 'CherryIN',
    group: 'gateway',
    baseUrl: 'https://open.cherryin.ai/v1',
    logoCode: 'IN',
    brandTone: 'rose',
  }),
  ocoolai: defPreset('ocoolai', {
    name: 'ocoolAI',
    group: 'gateway',
    baseUrl: 'https://api.ocoolai.com/v1',
    logoCode: 'OCL',
    brandTone: 'slate',
  }),
  'alaya-new': defPreset('alaya-new', {
    name: 'Alaya NeW',
    group: 'gateway',
    baseUrl: 'https://deepseek.alayanew.com/v1',
    logoCode: 'AL',
    brandTone: 'amber',
  }),
  aionly: defPreset('aionly', {
    name: 'AiOnly',
    group: 'gateway',
    baseUrl: 'https://api.aiionly.com/v1',
    logoCode: 'AO',
    brandTone: 'sky',
  }),
  burncloud: defPreset('burncloud', {
    name: 'BurnCloud',
    group: 'gateway',
    baseUrl: 'https://ai.burncloud.com/v1',
    logoCode: 'BR',
    brandTone: 'orange',
  }),
  lanyun: defPreset('lanyun', {
    name: 'LANYUN',
    group: 'gateway',
    baseUrl: 'https://maas-api.lanyun.net/v1',
    logoCode: 'LY',
    brandTone: 'sky',
  }),
  ph8: defPreset('ph8', {
    name: 'PH8',
    group: 'gateway',
    baseUrl: 'https://ph8.co/openai/v1',
    logoCode: 'PH8',
    brandTone: 'emerald',
  }),
  sophnet: defPreset('sophnet', {
    name: 'SophNet',
    group: 'gateway',
    baseUrl: 'https://www.sophnet.com/api/open-apis/v1',
    logoCode: 'SN',
    brandTone: 'violet',
  }),
  ppio: defPreset('ppio', {
    name: 'PPIO',
    group: 'gateway',
    baseUrl: 'https://api.ppinfra.com/v3/openai',
    logoCode: 'PP',
    brandTone: 'indigo',
  }),
  'qiniu-ai': defPreset('qiniu-ai', {
    name: 'Qiniu AI',
    group: 'gateway',
    baseUrl: 'https://api.qnaigc.com/v1',
    logoCode: 'QN',
    brandTone: 'cyan',
  }),
  tokendance: defPreset('tokendance', {
    name: 'TokenDance',
    group: 'gateway',
    baseUrl: 'https://api.tokendance.ai/v1',
    logoCode: 'TD',
    brandTone: 'slate',
  }),
  tokenhub: defPreset('tokenhub', {
    name: 'TokenHub',
    group: 'gateway',
    baseUrl: 'https://api.tokenhub.ai/v1',
    logoCode: 'TH',
    brandTone: 'sky',
  }),
  'state-cloud-xirang': defPreset('state-cloud-xirang', {
    name: 'State Cloud Xirang',
    group: 'gateway',
    baseUrl: 'https://wishub-x1.ctyun.cn/v1',
    logoCode: 'XR',
    brandTone: 'rose',
  }),
  'longcat-ai': defPreset('longcat-ai', {
    name: 'LongCat AI',
    group: 'gateway',
    baseUrl: 'https://api.longcat.chat/openai/v1',
    logoCode: 'LC',
    brandTone: 'emerald',
  }),
  'xiaomi-mimo': defPreset('xiaomi-mimo', {
    name: 'Xiaomi MiMo',
    group: 'gateway',
    baseUrl: 'https://api.xiaomimimo.com/v1',
    logoCode: 'XM',
    brandTone: 'slate',
  }),
  custom: defPreset('custom', {
    name: 'Custom API',
    group: 'gateway',
    baseUrl: '',
    requiresKey: false,
    protocol: 'openai-chat',
    supportedProtocols: ['openai-chat', 'anthropic-messages', 'openai-responses'],
    modelsEndpoint: '/v1/models',
    chatEndpoint: '/v1/chat/completions',
    placeholder: 'sk-...',
    logoCode: 'API',
    brandTone: 'slate',
  }),
};

export function inferModelCapabilities(model = {}) {
  const id = String(model.id || model.name || '').toLowerCase();
  const explicit = model.capabilities || {};
  const vision = typeof explicit.vision === 'boolean'
    ? explicit.vision
    : /vision|vl\b|4o|gpt-4\.1|gpt-5|claude-3|claude-4|sonnet|opus|gemini|pixtral|llava|qwen.*vl|minicpm-v|internvl|grok-2-vision/.test(id);
  const reasoning = typeof explicit.reasoning === 'boolean'
    ? explicit.reasoning
    : /\bo1\b|\bo3\b|\bo4\b|deepseek-r1|qwq|thinking|reason|r1\b|claude-3\.7|claude-4|gemini-2\.5|gemini-3|grok-3-mini/.test(id);
  const tools = typeof explicit.tools === 'boolean'
    ? explicit.tools
    : !/embed|whisper|tts|dall-e|moderation|rerank/.test(id);
  return { vision, reasoning, tools };
}

/**
 * Resolves the exact endpoint URL for a given baseUrl, protocol, and operation ('models' | 'chat').
 * Handles trailing `/v1` cleanly so Strata users can enter either `http://127.0.0.1:8080/v1` or `http://127.0.0.1:8080`.
 */
export function resolveProviderEndpoint(baseUrl, protocol = 'openai-chat', kind = 'chat', customEndpoint = '') {
  const cleanBase = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!cleanBase) return '';

  if (protocol === 'ollama') {
    const rootBase = cleanBase.replace(/\/v1$/i, '');
    return kind === 'models' ? `${rootBase}/api/tags` : `${rootBase}/v1/chat/completions`;
  }

  if (protocol === 'anthropic-messages') {
    const withV1 = /\/v\d+(?:beta\d*)?$/i.test(cleanBase) ? cleanBase : `${cleanBase}/v1`;
    return kind === 'models' ? `${withV1}/models` : `${withV1}/messages`;
  }

  if (protocol === 'openai-responses') {
    const withV1 = /\/v\d+(?:beta\d*)?$/i.test(cleanBase) ? cleanBase : `${cleanBase}/v1`;
    return kind === 'models' ? `${withV1}/models` : `${withV1}/responses`;
  }

  // Default: openai-chat
  if (customEndpoint) {
    // Avoid doubling `/v1/v1/...` if baseUrl already ends with `/v1`
    if (/\/v\d+$/i.test(cleanBase) && /^\/v\d+\//i.test(customEndpoint)) {
      return `${cleanBase}${customEndpoint.replace(/^\/v\d+/i, '')}`;
    }
    return `${cleanBase}${customEndpoint}`;
  }
  return kind === 'models' ? `${cleanBase}/models` : `${cleanBase}/chat/completions`;
}

function defaultProviderConfig(id, preset) {
  return {
    id,
    name: preset.name,
    group: preset.group || (preset.isLocal ? 'local' : 'cloud'),
    enabled: id === 'openrouter' || id === 'strata',
    apiKey: '',
    baseUrl: '',
    models: [],
    custom: false,
    isLocal: Boolean(preset.isLocal),
    requiresKey: Boolean(preset.requiresKey),
    protocol: preset.protocol || 'openai-chat',
    supportedProtocols: preset.supportedProtocols || [preset.protocol || 'openai-chat'],
    useProxy: preset.defaultProxyMode || 'auto', // auto | always | direct
    customHeaders: {},
    modelsEndpoint: preset.modelsEndpoint,
    chatEndpoint: preset.chatEndpoint,
    placeholder: preset.placeholder || '',
    apiKeyUrl: preset.apiKeyUrl || '',
    docsUrl: preset.docsUrl || '',
    logoCode: preset.logoCode || id.slice(0, 2).toUpperCase(),
    brandTone: preset.brandTone || 'slate',
    endpointPresets: preset.endpointPresets || [],
    hint: preset.hint || '',
    lastCheck: null,
  };
}

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

    // Extended multi-provider & role-model state (persisted inside wf_provider)
    this.providerConfigs = {};
    for (const [id, preset] of Object.entries(PROVIDER_PRESETS)) {
      this.providerConfigs[id] = defaultProviderConfig(id, preset);
    }
    this.roleModels = {
      build: '',
      quick: '',
      planning: '',
      vision: '',
    };

    this.load();
  }

  get preset() {
    const cfg = this.providerConfigs[this.type];
    if (PROVIDER_PRESETS[this.type]) return PROVIDER_PRESETS[this.type];
    if (cfg) {
      return {
        name: cfg.name || 'Custom API',
        group: cfg.group || (cfg.isLocal ? 'local' : 'gateway'),
        baseUrl: cfg.baseUrl || '',
        requiresKey: false,
        isLocal: Boolean(cfg.isLocal),
        protocol: cfg.protocol || 'openai-chat',
        supportedProtocols: cfg.supportedProtocols || ['openai-chat', 'anthropic-messages', 'openai-responses'],
        modelsEndpoint: cfg.modelsEndpoint || '/models',
        chatEndpoint: cfg.chatEndpoint || '/chat/completions',
        placeholder: cfg.placeholder || 'sk-...',
        apiKeyUrl: cfg.apiKeyUrl || '',
        logoCode: cfg.logoCode || 'API',
        brandTone: cfg.brandTone || 'slate',
      };
    }
    return PROVIDER_PRESETS.openrouter;
  }

  get effectiveBaseUrl() {
    return (this.baseUrl || this.preset.baseUrl).replace(/\/+$/, '');
  }

  get effectiveProtocol() {
    const cfg = this.providerConfigs[this.type];
    return cfg?.protocol || this.preset.protocol || 'openai-chat';
  }

  get headers() {
    return this._buildHeadersFor(this.type, this.apiKey, this.effectiveProtocol);
  }

  _buildHeadersFor(providerId, apiKey, protocolOverride = null) {
    const cfg = this.providerConfigs[providerId];
    const preset = PROVIDER_PRESETS[providerId];
    const protocol = protocolOverride || cfg?.protocol || preset?.protocol || 'openai-chat';
    const h = { 'Content-Type': 'application/json' };

    if (protocol === 'anthropic-messages') {
      if (apiKey) h['x-api-key'] = apiKey;
      h['anthropic-version'] = '2023-06-01';
      h['anthropic-dangerous-direct-browser-access'] = 'true';
    } else if (apiKey) {
      h['Authorization'] = `Bearer ${apiKey}`;
    }

    if (providerId === 'openrouter') {
      h['HTTP-Referer'] = typeof location !== 'undefined' ? location.href : 'http://localhost:3000/';
      h['X-Title'] = 'WebForge Studio';
    }

    if (cfg?.customHeaders && typeof cfg.customHeaders === 'object') {
      for (const [k, v] of Object.entries(cfg.customHeaders)) {
        if (k && typeof v === 'string' && v.trim()) h[k.trim()] = v.trim();
      }
    }
    return h;
  }

  _effectiveUrlFor(providerId) {
    const cfg = this.providerConfigs[providerId];
    const preset = PROVIDER_PRESETS[providerId];
    const raw = (cfg?.baseUrl || preset?.baseUrl || '').trim();
    return raw.replace(/\/+$/, '');
  }

  _canUseLocalProxy() {
    if (typeof location === 'undefined') return false;
    return location.protocol === 'http:' || location.protocol === 'https:';
  }

  async _fetchWithProxyFallback(url, options = {}, { providerId = this.type, fetchImpl = globalThis.fetch } = {}) {
    const cfg = this.providerConfigs[providerId];
    const proxyMode = cfg?.useProxy || 'auto';
    const canProxy = this._canUseLocalProxy();

    const runProxy = async () => {
      const proxyRes = await fetchImpl('/api/provider-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: url,
          method: options.method || 'GET',
          headers: options.headers || {},
          body: options.body,
        }),
        signal: options.signal,
      });
      return proxyRes;
    };

    if (proxyMode === 'always' && canProxy) {
      return await runProxy();
    }

    try {
      return await fetchImpl(url, options);
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      const isNetwork = err?.name === 'TypeError' || /failed to fetch|networkerror|load failed|cors/i.test(String(err?.message || ''));
      if (isNetwork && proxyMode === 'auto' && canProxy) {
        return await runProxy();
      }
      throw err;
    }
  }

  getAllProviders() {
    return Object.values(this.providerConfigs).map((cfg) => {
      const preset = PROVIDER_PRESETS[cfg.id];
      const hasUrl = Boolean((cfg.baseUrl || preset?.baseUrl || '').trim());
      const hasKeyOrOptional = !cfg.requiresKey || Boolean((cfg.apiKey || '').trim());
      const configured = hasUrl && hasKeyOrOptional && (cfg.models?.length > 0 || cfg.lastCheck?.ok || Boolean(cfg.apiKey));
      return {
        ...cfg,
        group: cfg.group || preset?.group || (cfg.isLocal ? 'local' : 'gateway'),
        protocol: cfg.protocol || preset?.protocol || 'openai-chat',
        supportedProtocols: cfg.supportedProtocols || preset?.supportedProtocols || [cfg.protocol || 'openai-chat'],
        defaultBaseUrl: preset?.baseUrl || '',
        effectiveBaseUrl: this._effectiveUrlFor(cfg.id),
        endpointPresets: cfg.endpointPresets || preset?.endpointPresets || [],
        hint: cfg.hint || preset?.hint || '',
        brandTone: cfg.brandTone || preset?.brandTone || 'slate',
        configured: Boolean(cfg.enabled && configured),
      };
    });
  }

  getProviderConfig(providerId) {
    return this.providerConfigs[providerId] || null;
  }

  updateProvider(providerId, patch = {}) {
    const cfg = this.providerConfigs[providerId];
    if (!cfg) return null;
    if (typeof patch.enabled === 'boolean') cfg.enabled = patch.enabled;
    if (typeof patch.apiKey === 'string') cfg.apiKey = patch.apiKey;
    if (typeof patch.baseUrl === 'string') cfg.baseUrl = patch.baseUrl;
    if (typeof patch.name === 'string' && patch.name.trim()) cfg.name = patch.name.trim();
    if (typeof patch.protocol === 'string' && PROVIDER_PROTOCOLS[patch.protocol]) {
      cfg.protocol = patch.protocol;
      cfg.modelsEndpoint = PROVIDER_PROTOCOLS[patch.protocol].modelsPath;
      cfg.chatEndpoint = PROVIDER_PROTOCOLS[patch.protocol].chatPath;
    }
    if (typeof patch.useProxy === 'string' && ['auto', 'always', 'direct'].includes(patch.useProxy)) {
      cfg.useProxy = patch.useProxy;
    }
    if (patch.customHeaders && typeof patch.customHeaders === 'object') {
      cfg.customHeaders = { ...patch.customHeaders };
    }
    if (Array.isArray(patch.models)) cfg.models = patch.models;
    if (patch.lastCheck !== undefined) cfg.lastCheck = patch.lastCheck;

    // Keep active provider properties in sync when editing active provider
    if (providerId === this.type) {
      this.apiKey = cfg.apiKey;
      this.baseUrl = cfg.baseUrl;
      this.models = cfg.models;
      if (cfg.lastCheck?.ok) this.connected = true;
    } else if (patch.enabled === true && !this.providerConfigs[this.type]?.enabled) {
      this.activateProvider(providerId);
      return cfg;
    }
    this.save();
    return cfg;
  }

  activateProvider(providerId) {
    const cfg = this.providerConfigs[providerId];
    if (!cfg) return;
    this.type = providerId;
    this.apiKey = cfg.apiKey || '';
    this.baseUrl = cfg.baseUrl || '';
    this.models = Array.isArray(cfg.models) ? cfg.models : [];
    this.connected = Boolean(cfg.lastCheck?.ok);
    if (this.models.length && !this.models.some((m) => m.id === this.model)) {
      this.model = this.models[0].id;
      this.roleModels.build = this.model;
    }
    this.save();
  }

  addCustomProvider({ name = '', baseUrl = '', apiKey = '', isLocal = false, protocol = 'openai-chat' } = {}) {
    const cleanName = String(name || '').trim() || 'Custom Provider';
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'provider';
    const id = `custom-${slug}-${Date.now().toString(36).slice(-4)}`;
    const logoCode = cleanName
      .split(/\s+/)
      .map((w) => w[0] || '')
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'AI';
    const safeProto = PROVIDER_PROTOCOLS[protocol] ? protocol : 'openai-chat';
    const detectedLocal = Boolean(isLocal) || /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.)/i.test(baseUrl);
    const cfg = {
      id,
      name: cleanName,
      group: detectedLocal ? 'local' : 'gateway',
      enabled: true,
      apiKey: String(apiKey || '').trim(),
      baseUrl: String(baseUrl || '').trim(),
      models: [],
      custom: true,
      isLocal: detectedLocal,
      requiresKey: false,
      protocol: safeProto,
      supportedProtocols: ['openai-chat', 'anthropic-messages', 'openai-responses'],
      useProxy: 'auto',
      customHeaders: {},
      modelsEndpoint: PROVIDER_PROTOCOLS[safeProto].modelsPath,
      chatEndpoint: PROVIDER_PROTOCOLS[safeProto].chatPath,
      placeholder: 'sk-...',
      apiKeyUrl: '',
      docsUrl: '',
      logoCode,
      brandTone: detectedLocal ? 'emerald' : 'violet',
      endpointPresets: [],
      hint: '',
      lastCheck: null,
    };
    this.providerConfigs[id] = cfg;
    this.save();
    return cfg;
  }

  deleteCustomProvider(providerId) {
    const cfg = this.providerConfigs[providerId];
    if (!cfg || !cfg.custom) return false;
    delete this.providerConfigs[providerId];
    if (this.type === providerId) {
      this.activateProvider('openrouter');
    } else {
      this.save();
    }
    return true;
  }

  addManualModel(providerId, { id, name, contextLength = 32768, capabilities } = {}) {
    const cfg = this.providerConfigs[providerId];
    const cleanId = String(id || '').trim();
    if (!cfg || !cleanId) return null;
    if (cfg.models.some((m) => m.id === cleanId)) return cfg.models.find((m) => m.id === cleanId);
    const entry = {
      id: cleanId,
      name: String(name || cleanId).trim(),
      free: cleanId.includes(':free'),
      contextLength: Number.isFinite(Number(contextLength)) && Number(contextLength) >= 2048 ? Math.round(Number(contextLength)) : 32768,
      capabilities: capabilities || inferModelCapabilities({ id: cleanId, name }),
      manual: true,
    };
    cfg.models = [...cfg.models, entry];
    if (providerId === this.type) {
      this.models = cfg.models;
      if (!this.model) {
        this.model = entry.id;
        this.roleModels.build = entry.id;
      }
    }
    this.save();
    return entry;
  }

  updateModelSettings(providerId, modelId, patch = {}) {
    const cfg = this.providerConfigs[providerId];
    if (!cfg) return null;
    const item = cfg.models.find((m) => m.id === modelId);
    if (!item) return null;
    if (typeof patch.name === 'string' && patch.name.trim()) item.name = patch.name.trim();
    if (Number.isFinite(Number(patch.contextLength)) && Number(patch.contextLength) >= 2048) {
      item.contextLength = Math.round(Number(patch.contextLength));
    }
    if (patch.capabilities && typeof patch.capabilities === 'object') {
      item.capabilities = { ...inferModelCapabilities(item), ...patch.capabilities };
    }
    if (providerId === this.type && this.model === modelId && item.contextLength) {
      this.contextWindow = item.contextLength;
    }
    this.save();
    return item;
  }

  removeModel(providerId, modelId) {
    const cfg = this.providerConfigs[providerId];
    if (!cfg) return false;
    const before = cfg.models.length;
    cfg.models = cfg.models.filter((m) => m.id !== modelId);
    if (cfg.models.length === before) return false;
    if (providerId === this.type) {
      this.models = cfg.models;
      if (this.model === modelId) {
        this.model = cfg.models[0]?.id || '';
        this.roleModels.build = this.model;
      }
    }
    this.save();
    return true;
  }

  getAllAvailableModels() {
    const out = [];
    const seen = new Set();
    for (const cfg of Object.values(this.providerConfigs)) {
      if (!cfg.enabled && cfg.id !== this.type) continue;
      for (const m of cfg.models || []) {
        const key = `${cfg.id}::${m.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          ...m,
          providerId: cfg.id,
          providerName: cfg.name,
          capabilities: m.capabilities || inferModelCapabilities(m),
        });
      }
    }
    return out;
  }

  setRoleModel(role, modelId, providerId = null) {
    if (!['build', 'quick', 'planning', 'vision'].includes(role)) return;
    this.roleModels[role] = String(modelId || '');
    if (role === 'build') {
      if (providerId && this.providerConfigs[providerId] && providerId !== this.type) {
        const cfg = this.providerConfigs[providerId];
        cfg.enabled = true;
        this.type = providerId;
        this.apiKey = cfg.apiKey || '';
        this.baseUrl = cfg.baseUrl || '';
        this.models = Array.isArray(cfg.models) ? cfg.models : [];
        this.connected = Boolean(cfg.lastCheck?.ok);
      }
      this.model = String(modelId || '');
      const meta = this.models.find((m) => m.id === this.model);
      if (meta?.contextLength) this.contextWindow = meta.contextLength;
    }
    this.save();
  }

  configure({ type, apiKey, baseUrl, model, temperature, maxTokens, topP, contextWindow, roleModels } = {}) {
    if (type !== undefined && (PROVIDER_PRESETS[type] || this.providerConfigs[type])) {
      if (type !== this.type) {
        this.type = type;
        const cfg = this.providerConfigs[type];
        if (cfg) {
          cfg.enabled = true;
          this.apiKey = apiKey !== undefined ? apiKey : (cfg.apiKey || '');
          this.baseUrl = baseUrl !== undefined ? baseUrl : (cfg.baseUrl || '');
          this.models = Array.isArray(cfg.models) ? cfg.models : [];
          this.connected = Boolean(cfg.lastCheck?.ok);
          this.model = model !== undefined ? model : (this.models[0]?.id || '');
        } else {
          this.models = [];
          this.model = '';
          this.connected = false;
        }
      }
    }
    if (apiKey !== undefined) {
      this.apiKey = apiKey;
      if (this.providerConfigs[this.type]) this.providerConfigs[this.type].apiKey = apiKey;
    }
    if (baseUrl !== undefined) {
      this.baseUrl = baseUrl;
      if (this.providerConfigs[this.type]) this.providerConfigs[this.type].baseUrl = baseUrl;
    }
    if (model !== undefined) {
      this.model = model;
      this.roleModels.build = model;
    }
    if (roleModels && typeof roleModels === 'object') {
      for (const k of ['build', 'quick', 'planning', 'vision']) {
        if (typeof roleModels[k] === 'string') this.roleModels[k] = roleModels[k];
      }
      if (this.roleModels.build) this.model = this.roleModels.build;
    }
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

  _formatConnectionError(err, providerId = this.type) {
    const msg = String(err?.message || err || 'Unknown error');
    const url = this._effectiveUrlFor(providerId) || this.effectiveBaseUrl;
    const isNetwork = err?.name === 'TypeError' || /failed to fetch|networkerror|load failed/i.test(msg);
    if (!isNetwork) return msg;
    if (providerId === 'strata') {
      return `Cannot reach Strata at ${url}. Start Strata server (default port 8080) and try Check again.`;
    }
    if (providerId === 'ollama') {
      return `Cannot reach Ollama at ${url}. Ensure Ollama is running (WebForge auto-relays via local proxy when served locally, or set OLLAMA_ORIGINS="*").`;
    }
    if (providerId === 'lmstudio') {
      return `Cannot reach LM Studio at ${url}. Start the local server in LM Studio on port 1234.`;
    }
    if (providerId === 'custom' || String(providerId).startsWith('custom-')) {
      return `Cannot reach endpoint at ${url || 'configured host'}. Check the URL, server status, and proxy settings.`;
    }
    return `Network error reaching ${url}: ${msg}`;
  }

  async fetchModelsForProvider(providerId = this.type, { fetchImpl = globalThis.fetch } = {}) {
    const cfg = this.providerConfigs[providerId];
    const preset = PROVIDER_PRESETS[providerId] || cfg;
    if (!cfg || !preset) throw new Error(`Unknown provider: ${providerId}`);

    const base = this._effectiveUrlFor(providerId);
    if (!base) throw new Error('Enter an API host URL first.');

    const protocol = cfg.protocol || preset.protocol || 'openai-chat';
    const url = resolveProviderEndpoint(base, protocol, 'models', preset.modelsEndpoint);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const t0 = Date.now();
    let res;
    try {
      res = await this._fetchWithProxyFallback(
        url,
        {
          method: 'GET',
          headers: this._buildHeadersFor(providerId, cfg.apiKey, protocol),
          signal: ctrl.signal,
        },
        { providerId, fetchImpl }
      );
    } catch (err) {
      if (err?.name === 'AbortError') {
        throw new Error(`Timed out reaching ${base}. Verify the server is running and reachable.`);
      }
      throw new Error(this._formatConnectionError(err, providerId));
    } finally {
      clearTimeout(timer);
    }

    const latencyMs = Math.max(1, Date.now() - t0);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}${errText ? `: ${errText.slice(0, 140)}` : ''}`);
    }

    const data = await res.json();
    let parsed = [];

    if (protocol === 'ollama') {
      parsed = (data.models || []).map((m) => ({
        id: m.name,
        name: m.name,
        free: false,
        contextLength: 32768,
        capabilities: inferModelCapabilities({ id: m.name, name: m.name }),
      }));
    } else if (providerId === 'openrouter') {
      parsed = (data.data || [])
        .filter((m) => !!m.id)
        .map((m) => {
          const promptPrice = m.pricing?.prompt;
          const completionPrice = m.pricing?.completion;
          const freeByPrice =
            (promptPrice === '0' || promptPrice === 0) &&
            (completionPrice === '0' || completionPrice === 0);
          const free = m.id.includes(':free') || freeByPrice;
          const modality = String(m.architecture?.modality || '').toLowerCase();
          const caps = inferModelCapabilities({
            id: m.id,
            name: m.name || m.id,
            capabilities: modality.includes('image') ? { vision: true } : undefined,
          });
          return {
            id: m.id,
            name: m.name || m.id,
            free,
            contextLength: m.context_length || 32768,
            capabilities: caps,
          };
        })
        .sort((a, b) => {
          if (a.free !== b.free) return a.free ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
    } else {
      const rawList = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : [];
      parsed = rawList
        .filter((m) => Boolean(m?.id || m?.name))
        .map((m) => {
          const id = m.id || m.name;
          const displayName = m.display_name || m.name || id;
          return {
            id,
            name: displayName,
            free: false,
            contextLength: m.context_length || m.max_context_length || 32768,
            capabilities: inferModelCapabilities({ id, name: displayName }),
          };
        });
    }

    // Preserve any user-added manual models
    const manualModels = (cfg.models || []).filter((m) => m.manual && !parsed.some((p) => p.id === m.id));
    cfg.models = [...manualModels, ...parsed];
    cfg.lastCheck = { ok: true, count: cfg.models.length, latencyMs, ts: Date.now() };
    cfg.enabled = true;

    if (providerId === this.type) {
      this.models = cfg.models;
      if (this.models.length && (!this.model || !this.models.some((m) => m.id === this.model))) {
        this.model = this.models[0].id;
        this.roleModels.build = this.model;
      }
      const activeMeta = this.models.find((m) => m.id === this.model);
      if (activeMeta?.contextLength) {
        this.contextWindow = activeMeta.contextLength;
      }
      this.connected = true;
    }

    this.save();
    return cfg.models;
  }

  async fetchModels() {
    return this.fetchModelsForProvider(this.type);
  }

  async testConnectionForProvider(providerId = this.type, { fetchImpl = globalThis.fetch } = {}) {
    try {
      const models = await this.fetchModelsForProvider(providerId, { fetchImpl });
      const cfg = this.providerConfigs[providerId];
      return { ok: true, models: models.length, latencyMs: cfg?.lastCheck?.latencyMs || 0 };
    } catch (e) {
      const cfg = this.providerConfigs[providerId];
      if (cfg) {
        cfg.lastCheck = { ok: false, error: e.message || 'Connection failed', ts: Date.now() };
      }
      if (providerId === this.type) this.connected = false;
      this.save();
      return { ok: false, error: e.message || 'Connection failed' };
    }
  }

  async testConnection() {
    return this.testConnectionForProvider(this.type);
  }

  /**
   * Builds protocol-specific request { url, headers, body, protocol } for generation.
   * Pure helper exported via method so unit tests can assert exact wire shapes for Strata & all clouds.
   */
  buildChatRequest(systemPrompt, userPromptContent, history = [], opts = {}) {
    const protocol = opts.protocol || this.effectiveProtocol;
    const model = opts.model || this.model;
    const base = this.effectiveBaseUrl;
    const url = resolveProviderEndpoint(base, protocol, 'chat', this.preset.chatEndpoint);
    const headers = this._buildHeadersFor(this.type, this.apiKey, protocol);

    if (protocol === 'anthropic-messages') {
      const anthropicMsgs = [...history, { role: 'user', content: userPromptContent }].map((m) => {
        if (Array.isArray(m.content)) {
          const blocks = m.content.map((part) => {
            if (part?.type === 'image_url' && part.image_url?.url) {
              const dataMatch = String(part.image_url.url).match(/^data:([^;]+);base64,(.+)$/);
              if (dataMatch) {
                return {
                  type: 'image',
                  source: { type: 'base64', media_type: dataMatch[1], data: dataMatch[2] },
                };
              }
            }
            return { type: 'text', text: String(part?.text || '') };
          });
          return { role: m.role === 'assistant' ? 'assistant' : 'user', content: blocks };
        }
        return { role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') };
      });

      return {
        protocol,
        url,
        headers,
        body: {
          model,
          system: systemPrompt,
          messages: anthropicMsgs,
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          stream: true,
        },
      };
    }

    if (protocol === 'openai-responses') {
      const input = [...history, { role: 'user', content: userPromptContent }].map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: Array.isArray(m.content)
          ? m.content.map((p) => (p.type === 'image_url' ? { type: 'input_image', image_url: p.image_url?.url } : { type: 'input_text', text: p.text || '' }))
          : String(m.content || ''),
      }));
      return {
        protocol,
        url,
        headers,
        body: {
          model,
          instructions: systemPrompt,
          input,
          temperature: this.temperature,
          max_output_tokens: this.maxTokens,
          stream: true,
        },
      };
    }

    // Default: openai-chat & ollama
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userPromptContent },
    ];
    return {
      protocol,
      url,
      headers,
      body: {
        model,
        messages,
        stream: true,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        top_p: this.topP,
      },
    };
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
    const reqSpec = this.buildChatRequest(systemPrompt, userPromptContent, history, opts);

    try {
      let res;
      try {
        res = await this._fetchWithProxyFallback(
          reqSpec.url,
          {
            method: 'POST',
            headers: reqSpec.headers,
            body: JSON.stringify(reqSpec.body),
            signal: controller.signal,
          },
          { providerId: this.type, fetchImpl: opts.fetchImpl || globalThis.fetch }
        );
      } catch (err) {
        if (err?.name === 'AbortError') throw err;
        throw new Error(this._formatConnectionError(err));
      }

      if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error(`API error ${res.status}: ${err.substring(0, 220)}`);
      }

      const contentType = res.headers?.get('content-type') || '';
      if (!res.body || (contentType.includes('application/json') && !contentType.includes('event-stream'))) {
        const json = await res.json().catch(() => null);
        const extracted = this._extractNonStreamingResponse(json, reqSpec.protocol);
        if (extracted.reasoning) this.lastReasoning = extracted.reasoning;
        if (extracted.content || extracted.reasoning) {
          onChunk?.(extracted.content, extracted.content, extracted.reasoning, extracted.reasoning);
        }
        return extracted.content;
      }

      return await this._readStream(res.body, onChunk, reqSpec.protocol);
    } finally {
      this._activeControllers.delete(controller);
      if (opts.signal) opts.signal.removeEventListener('abort', onExternalAbort);
      if (this.abortController === controller) this.abortController = null;
    }
  }

  _extractNonStreamingResponse(json, protocol = 'openai-chat') {
    if (!json || typeof json !== 'object') return { content: '', reasoning: '' };
    if (protocol === 'anthropic-messages' && Array.isArray(json.content)) {
      const content = json.content.filter((b) => b.type === 'text').map((b) => b.text || '').join('');
      const reasoning = json.content.filter((b) => b.type === 'thinking').map((b) => b.thinking || '').join('');
      return { content, reasoning };
    }
    if (protocol === 'openai-responses') {
      const content = typeof json.output_text === 'string'
        ? json.output_text
        : (json.output || [])
            .flatMap((o) => o.content || [])
            .filter((c) => c.type === 'output_text' || c.type === 'text')
            .map((c) => c.text || '')
            .join('');
      return { content, reasoning: '' };
    }
    const content = String(json?.choices?.[0]?.message?.content || '');
    const reasoning = String(json?.choices?.[0]?.message?.reasoning_content || json?.choices?.[0]?.message?.reasoning || '');
    return { content, reasoning };
  }

  parseSseLine(line, protocol = 'openai-chat') {
    const trimmed = String(line || '').trim();
    if (!trimmed || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) return null;
    try {
      const json = JSON.parse(trimmed.slice(6));

      // Anthropic Messages SSE format
      if (protocol === 'anthropic-messages' || json.type === 'content_block_delta') {
        if (json.type === 'content_block_delta' && json.delta) {
          if (json.delta.type === 'text_delta') {
            return { contentDelta: String(json.delta.text || ''), reasoningDelta: '' };
          }
          if (json.delta.type === 'thinking_delta') {
            return { contentDelta: '', reasoningDelta: String(json.delta.thinking || '') };
          }
        }
        return null;
      }

      // OpenAI Responses API SSE format
      if (protocol === 'openai-responses' || String(json.type || '').startsWith('response.')) {
        if (json.type === 'response.output_text.delta' && typeof json.delta === 'string') {
          return { contentDelta: json.delta, reasoningDelta: '' };
        }
        if (
          (json.type === 'response.reasoning_summary_text.delta' || json.type === 'response.reasoning_text.delta') &&
          typeof json.delta === 'string'
        ) {
          return { contentDelta: '', reasoningDelta: json.delta };
        }
        return null;
      }

      // OpenAI Chat Completions SSE format (default)
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

  async _readStream(body, onChunk, protocol = 'openai-chat') {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let fullReasoning = '';
    let buffer = '';

    const handleLine = (line) => {
      const parsed = this.parseSseLine(line, protocol);
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
    // Persist compact per-provider configs (only save modified/enabled/custom providers to protect localStorage quota)
    const serializedProviders = {};
    for (const [id, cfg] of Object.entries(this.providerConfigs)) {
      const preset = PROVIDER_PRESETS[id];
      const isDefaultUnmodified =
        preset &&
        !cfg.custom &&
        cfg.enabled === (id === 'openrouter' || id === 'strata') &&
        !cfg.apiKey &&
        !cfg.baseUrl &&
        cfg.protocol === (preset.protocol || 'openai-chat') &&
        cfg.useProxy === (preset.defaultProxyMode || 'auto') &&
        (!cfg.models || cfg.models.length === 0);
      if (isDefaultUnmodified) continue;

      serializedProviders[id] = {
        id: cfg.id,
        name: cfg.name,
        group: cfg.group || 'gateway',
        enabled: Boolean(cfg.enabled),
        apiKey: cfg.apiKey || '',
        baseUrl: cfg.baseUrl || '',
        protocol: cfg.protocol || 'openai-chat',
        useProxy: cfg.useProxy || 'auto',
        custom: Boolean(cfg.custom),
        isLocal: Boolean(cfg.isLocal),
        logoCode: cfg.logoCode || '',
        brandTone: cfg.brandTone || 'slate',
        models: Array.isArray(cfg.models) ? cfg.models.slice(0, 120) : [],
      };
    }

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
        roleModels: this.roleModels,
        providerConfigs: serializedProviders,
      })
    );
  }

  load() {
    const d = safeStorageJsonGet(STORAGE_KEYS.PROVIDER, null);
    if (!d || typeof d !== 'object') return;

    if (d.providerConfigs && typeof d.providerConfigs === 'object') {
      for (const [id, saved] of Object.entries(d.providerConfigs)) {
        if (this.providerConfigs[id]) {
          const proto = saved.protocol && PROVIDER_PROTOCOLS[saved.protocol]
            ? saved.protocol
            : this.providerConfigs[id].protocol;
          this.providerConfigs[id] = {
            ...this.providerConfigs[id],
            enabled: typeof saved.enabled === 'boolean' ? saved.enabled : this.providerConfigs[id].enabled,
            apiKey: typeof saved.apiKey === 'string' ? saved.apiKey : '',
            baseUrl: typeof saved.baseUrl === 'string' ? saved.baseUrl : '',
            protocol: proto,
            useProxy: ['auto', 'always', 'direct'].includes(saved.useProxy)
              ? saved.useProxy
              : this.providerConfigs[id].useProxy,
            models: Array.isArray(saved.models) ? saved.models : [],
          };
        } else if (saved && saved.custom) {
          const proto = saved.protocol && PROVIDER_PROTOCOLS[saved.protocol] ? saved.protocol : 'openai-chat';
          this.providerConfigs[id] = {
            id,
            name: saved.name || 'Custom Provider',
            group: saved.group || (saved.isLocal ? 'local' : 'gateway'),
            enabled: Boolean(saved.enabled),
            apiKey: typeof saved.apiKey === 'string' ? saved.apiKey : '',
            baseUrl: typeof saved.baseUrl === 'string' ? saved.baseUrl : '',
            models: Array.isArray(saved.models) ? saved.models : [],
            custom: true,
            isLocal: Boolean(saved.isLocal),
            requiresKey: false,
            protocol: proto,
            supportedProtocols: ['openai-chat', 'anthropic-messages', 'openai-responses'],
            useProxy: ['auto', 'always', 'direct'].includes(saved.useProxy) ? saved.useProxy : 'auto',
            customHeaders: {},
            modelsEndpoint: PROVIDER_PROTOCOLS[proto].modelsPath,
            chatEndpoint: PROVIDER_PROTOCOLS[proto].chatPath,
            placeholder: 'sk-...',
            apiKeyUrl: '',
            docsUrl: '',
            logoCode: saved.logoCode || 'AI',
            brandTone: saved.brandTone || (saved.isLocal ? 'emerald' : 'violet'),
            endpointPresets: [],
            hint: '',
            lastCheck: null,
          };
        }
      }
    }

    if (d.type && (PROVIDER_PRESETS[d.type] || this.providerConfigs[d.type])) this.type = d.type;
    if (typeof d.apiKey === 'string') this.apiKey = d.apiKey;
    if (typeof d.baseUrl === 'string') this.baseUrl = d.baseUrl;
    if (typeof d.model === 'string') this.model = d.model;
    if (Number.isFinite(Number(d.temperature))) this.temperature = Math.max(0, Math.min(2, Number(d.temperature)));
    if (Number.isFinite(Number(d.maxTokens)) && Number(d.maxTokens) > 0) this.maxTokens = Math.round(Number(d.maxTokens));
    if (Number.isFinite(Number(d.topP))) this.topP = Math.max(0, Math.min(1, Number(d.topP)));
    if (Number.isFinite(Number(d.contextWindow)) && Number(d.contextWindow) >= 2048) this.contextWindow = Math.round(Number(d.contextWindow));

    if (d.roleModels && typeof d.roleModels === 'object') {
      for (const k of ['build', 'quick', 'planning', 'vision']) {
        if (typeof d.roleModels[k] === 'string') this.roleModels[k] = d.roleModels[k];
      }
    }
    if (!this.roleModels.build && this.model) this.roleModels.build = this.model;

    // Backwards-compatibility sync into active providerConfig
    const activeCfg = this.providerConfigs[this.type];
    if (activeCfg) {
      if (!activeCfg.apiKey && this.apiKey) activeCfg.apiKey = this.apiKey;
      if (!activeCfg.baseUrl && this.baseUrl) activeCfg.baseUrl = this.baseUrl;
      activeCfg.enabled = true;
      this.models = Array.isArray(activeCfg.models) ? activeCfg.models : [];
    }
  }
}
