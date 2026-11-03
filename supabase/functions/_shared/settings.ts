// 관리자 설정(app_settings) 기본값·검증. Deno·Node 양쪽에서 쓰도록 외부 의존성 없이 작성한다.

export interface AppSettings {
  llm_model: string | null;
  keyword_min: number;
  vector_min: number;
  vector_weight: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  llm_model: null,
  keyword_min: 0.35,
  vector_min: 0.55,
  vector_weight: 0.6
};

const MODEL_ID = /^[A-Za-z0-9._:/-]{1,120}$/;

/** 관리자가 보낸 값을 검사한다. 잘못된 값이 있으면 사용자에게 보여줄 메시지를 던진다. */
export function parseSettings(input: Record<string, unknown>): AppSettings {
  const model = typeof input.llm_model === 'string' ? input.llm_model.trim() : '';
  if (model && !MODEL_ID.test(model)) throw new Error('모델 ID 형식이 올바르지 않아요. 예: qwen/qwen3-14b');
  const ratio = (key: keyof AppSettings) => {
    const n = Number(input[key]);
    if (!Number.isFinite(n) || n < 0 || n > 1) throw new Error('검색 기준은 0에서 1 사이 값이어야 해요.');
    return Math.round(n * 100) / 100;
  };
  return {
    llm_model: model || null,
    keyword_min: ratio('keyword_min'),
    vector_min: ratio('vector_min'),
    vector_weight: ratio('vector_weight')
  };
}
