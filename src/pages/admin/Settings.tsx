import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useToast } from '../../components/Toast';
import { callFunction, errorMessage } from '../../lib/api';
import type { AppSettings, ModelOption, PreviewQuery, PreviewRow } from '../../lib/types';

interface SettingsInfo {
  settings: AppSettings;
  default_model: string;
  llm_configured: boolean;
  embedding_configured: boolean;
}

interface TestResult {
  ok: boolean;
  model: string;
  latency_ms: number;
  reply?: string;
  error?: string;
}

const COLS = 'minmax(0,1fr) 90px 90px 80px';

/** OpenRouter 가격(토큰당 USD 문자열)을 100만 토큰당 달러로 보여준다. */
function price(m: ModelOption | undefined): string {
  if (!m || m.prompt_price === null) return '';
  const p = Number(m.prompt_price) * 1e6;
  const c = Number(m.completion_price ?? 0) * 1e6;
  if (!p && !c) return '무료';
  return `입력 $${p.toFixed(2)} · 출력 $${c.toFixed(2)} / 100만 토큰`;
}

function Ratio({ id, label, hint, value, disabled, onChange }: {
  id: string; label: string; hint: string; value: number; disabled?: boolean; onChange: (v: number) => void;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label} <b style={{ marginLeft: 6 }}>{value.toFixed(2)}</b></label>
      <input id={id} type="range" min={0} max={1} step={0.05} value={value} disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))} />
      <span className="hint">{hint}</span>
    </div>
  );
}

export default function Settings() {
  const toast = useToast();
  const [info, setInfo] = useState<SettingsInfo | null>(null);
  const [draft, setDraft] = useState<AppSettings | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelsError, setModelsError] = useState('');
  const [test, setTest] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [question, setQuestion] = useState('반차는 어떻게 쓰나요? 몇 시간 단위예요?');
  const [preview, setPreview] = useState<{ terms: string[]; queries?: PreviewQuery[]; results: PreviewRow[] } | null>(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    callFunction<SettingsInfo>('admin-settings', { action: 'get' })
      .then((d) => {
        setInfo(d);
        setDraft(d.settings);
      })
      .catch((e) => setError(errorMessage(e)));
    callFunction<{ models: ModelOption[] }>('admin-settings', { action: 'models' })
      .then((d) => setModels(d.models))
      .catch((e) => setModelsError(errorMessage(e)));
  }, []);

  const modelId = draft?.llm_model?.trim() || '';
  const effectiveModel = modelId || info?.default_model || '';
  const selected = useMemo(() => models.find((m) => m.id === effectiveModel), [models, effectiveModel]);
  const changed = !!info && !!draft && JSON.stringify(info.settings) !== JSON.stringify({ ...draft, llm_model: modelId || null });

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const { settings } = await callFunction<{ settings: AppSettings }>('admin-settings', { action: 'save', settings: draft });
      setInfo((i) => (i ? { ...i, settings } : i));
      setDraft(settings);
      toast('설정을 저장했어요. 다음 질문부터 적용돼요.');
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTest(null);
    try {
      setTest(await callFunction<TestResult>('admin-settings', { action: 'test_model', model: effectiveModel }));
    } catch (e) {
      setTest({ ok: false, model: effectiveModel, latency_ms: 0, error: errorMessage(e) });
    } finally {
      setTesting(false);
    }
  };

  const runPreview = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft || !question.trim()) return;
    setPreviewing(true);
    try {
      setPreview(await callFunction('admin-settings', { action: 'preview', question, settings: draft }));
    } catch (err) {
      toast(errorMessage(err));
    } finally {
      setPreviewing(false);
    }
  };

  if (error) return <main className="admin-main"><div className="error-box">{error}</div></main>;
  if (!info || !draft) return <main className="admin-main"><div className="empty">불러오는 중…</div></main>;

  const passed = preview?.results.filter((r) => r.used ?? r.passed).length ?? 0;

  return (
    <main className="admin-main">
      <div className="page-head">
        <div>
          <h1>검색·모델 설정</h1>
          <p>답변에 쓰는 AI 모델과 문서 검색 기준을 바꿔요. 저장하면 다음 질문부터 적용돼요.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn" onClick={() => setDraft(info.settings)} disabled={!changed || saving}>되돌리기</button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={!changed || saving}>{saving ? '저장 중…' : '저장'}</button>
        </div>
      </div>

      <div className="split">
        <section className="card panel" style={{ flex: '1 1 420px', minWidth: 0 }}>
          <h2>답변 모델</h2>
          <p className="panel-sub">OpenRouter 모델 ID를 고르거나 직접 입력해요. 비워 두면 기본 모델(<b>{info.default_model}</b>)을 써요.</p>
          {!info.llm_configured && (
            <div className="status-warn" style={{ marginBottom: 14 }}>LLM_API_KEY 비밀값이 없어서 지금은 검색 전용으로 답해요.</div>
          )}
          <div className="field">
            <label htmlFor="llm-model">모델 ID</label>
            <input id="llm-model" className="input" list="model-options" placeholder={info.default_model}
              value={draft.llm_model ?? ''} onChange={(e) => setDraft({ ...draft, llm_model: e.target.value })} />
            <datalist id="model-options">
              {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </datalist>
            <span className="hint">
              {modelsError || (selected ? `${selected.name} · ${price(selected)}` : models.length ? '목록에 없는 ID예요. 철자를 확인해 주세요.' : '모델 목록을 불러오는 중…')}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-sm" onClick={runTest} disabled={testing || !info.llm_configured}>
              {testing ? '테스트 중…' : '이 모델로 테스트'}
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setDraft({ ...draft, llm_model: null })} disabled={!draft.llm_model}>
              기본 모델로
            </button>
          </div>
          {test && (
            <div className={test.ok ? 'status-ok' : 'status-warn'} style={{ marginTop: 12, overflowWrap: 'anywhere' }}>
              {test.ok ? `응답 성공 · ${(test.latency_ms / 1000).toFixed(1)}초 · ${test.model}` : `응답 실패: ${test.error}`}
              {test.ok && test.reply && <div className="hint" style={{ marginTop: 4 }}>{test.reply}</div>}
            </div>
          )}
        </section>

        <section className="card panel" style={{ flex: '1 1 420px', minWidth: 0, display: 'grid', gap: 18 }}>
          <div>
            <h2>검색 기준</h2>
            <p className="panel-sub" style={{ marginBottom: 0 }}>높이면 정확한 근거만 쓰고, 낮추면 더 많은 질문에 답하지만 엉뚱한 근거가 섞일 수 있어요.</p>
          </div>
          <Ratio id="keyword-min" label="키워드 최소 점수" value={draft.keyword_min}
            hint="질문의 검색어 중 문서에 들어 있는 비율이 이 값 이상이면 근거로 써요. 기본 0.35"
            onChange={(v) => setDraft({ ...draft, keyword_min: v })} />
          <Ratio id="vector-min" label="의미 검색 최소 점수" value={draft.vector_min} disabled={!info.embedding_configured}
            hint={info.embedding_configured ? '임베딩 유사도가 이 값 이상이면 근거로 써요. 기본 0.55' : 'EMBEDDING_MODEL 비밀값을 설정하면 쓸 수 있어요.'}
            onChange={(v) => setDraft({ ...draft, vector_min: v })} />
          <Ratio id="vector-weight" label="의미 검색 비중" value={draft.vector_weight} disabled={!info.embedding_configured}
            hint={`근거 순서를 정할 때 의미 검색 ${Math.round(draft.vector_weight * 100)}% · 키워드 ${Math.round((1 - draft.vector_weight) * 100)}%로 섞어요.`}
            onChange={(v) => setDraft({ ...draft, vector_weight: v })} />
        </section>
      </div>

      <section className="card" style={{ overflow: 'hidden' }}>
        <div className="panel" style={{ paddingBottom: 8 }}>
          <h2>검색 미리보기</h2>
          <p className="panel-sub">저장하기 전에 지금 설정으로 어떤 문서가 근거로 잡히는지 확인해요. 후보 8개 중 기준을 넘은 앞의 5개만 답변에 쓰여요. FAQ와 거의 같은 질문은 실제로는 FAQ 답변이 먼저 나가요.</p>
          <form onSubmit={runPreview} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input className="input" style={{ flex: '1 1 260px' }} aria-label="미리 볼 질문" value={question} onChange={(e) => setQuestion(e.target.value)} />
            <button type="submit" className="btn btn-primary" disabled={previewing || !question.trim()}>{previewing ? '검색 중…' : '미리보기'}</button>
          </form>
          {preview && (
            <div className="hint" style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {preview.queries?.length
                ? preview.queries.map((q) => (
                  <div key={q.label}><b>{q.label}</b>{q.label !== '원래 질문' && <> “{q.text}”</>} → {q.terms.length ? q.terms.join(', ') : '(검색어 없음)'}</div>
                ))
                : <div>검색어: {preview.terms.length ? preview.terms.join(', ') : '(없음)'}</div>}
              <div>
                근거로 쓰는 문서 {passed}개
                {passed === 0 && ' → 이 질문은 "근거를 찾지 못했어요"로 답해요.'}
              </div>
            </div>
          )}
        </div>
        {preview && (
          <div className="table-scroll">
            <div className="grid-table">
              <div className="grid-row grid-head" style={{ gridTemplateColumns: COLS }}>
                <div>문서 · 조항</div><div>키워드</div><div>의미</div><div>근거</div>
              </div>
              {preview.results.length === 0 && <div className="empty">검색어가 들어 있는 문서가 없어요.</div>}
              {preview.results.map((r, i) => (
                <div key={i} className="grid-row" style={{ gridTemplateColumns: COLS }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{r.document_title} · {r.section_title ?? `${r.page_start}쪽`}{r.via && r.via !== '원래 질문' && <span className="hint" style={{ fontWeight: 400 }}> · {r.via}로 찾음</span>}</div>
                    <div className="hint" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.snippet}</div>
                  </div>
                  <div>{r.keyword_score.toFixed(2)}</div>
                  <div>{r.vector_score === null ? '-' : r.vector_score.toFixed(2)}</div>
                  <div>
                    {(r.used ?? r.passed)
                      ? <span className="pill pill-done">사용</span>
                      : <span className="pill pill-hold" title={r.passed ? '기준은 넘었지만 앞의 5개에 들지 못했어요' : undefined}>{r.passed ? '순위 밖' : '제외'}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
