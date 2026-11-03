// 모델 호출 어댑터. OpenAI 호환 API라면 주소와 모델 ID만 바꿔서
// OpenRouter → Ollama / vLLM 등 사내 추론 서버로 옮길 수 있다.

export interface ChatResult {
  text: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
}

const env = (k: string) => Deno.env.get(k) ?? '';

export function llmConfigured(): boolean {
  return !!env('LLM_API_KEY') || env('LLM_BASE_URL').startsWith('http://');
}

export function llmBaseUrl(): string {
  return (env('LLM_BASE_URL') || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
}

/** 관리자 설정에 모델이 없을 때 쓰는 기본 모델 (비밀값 LLM_MODEL) */
export function defaultModel(): string {
  return env('LLM_MODEL') || 'qwen/qwen3-14b';
}

export async function chatCompletion(system: string, user: string, modelOverride?: string | null, timeoutMs = 45000): Promise<ChatResult> {
  const base = llmBaseUrl();
  const model = modelOverride || defaultModel();
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(env('LLM_API_KEY') ? { Authorization: `Bearer ${env('LLM_API_KEY')}` } : {}),
      'X-Title': 'Knowly'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: Number(env('LLM_TEMPERATURE') || 0.2),
      max_tokens: Number(env('LLM_MAX_TOKENS') || 700),
      response_format: { type: 'json_object' }
    }),
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content ?? '',
    model: data.model ?? model,
    input_tokens: data.usage?.prompt_tokens ?? null,
    output_tokens: data.usage?.completion_tokens ?? null
  };
}

export function embeddingConfigured(): boolean {
  return !!env('EMBEDDING_MODEL');
}

export function embeddingModel(): string | null {
  return env('EMBEDDING_MODEL') || null;
}

/** EMBEDDING_MODEL이 없으면 null을 돌려주고, 검색은 키워드 방식만 쓴다. */
export async function embed(texts: string[]): Promise<number[][] | null> {
  if (!embeddingConfigured() || !texts.length) return null;
  const base = env('EMBEDDING_BASE_URL') || env('LLM_BASE_URL') || 'https://openrouter.ai/api/v1';
  const key = env('EMBEDDING_API_KEY') || env('LLM_API_KEY');
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 32) {
    const res = await fetch(`${base.replace(/\/$/, '')}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify({ model: env('EMBEDDING_MODEL'), input: texts.slice(i, i + 32) }),
      signal: AbortSignal.timeout(60000)
    });
    if (!res.ok) throw new Error(`Embedding ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    for (const row of data.data) out.push(row.embedding);
  }
  return out;
}
