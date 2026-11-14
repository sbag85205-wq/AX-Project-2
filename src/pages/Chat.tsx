import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type FormEvent, type KeyboardEvent } from 'react';
import { AnswerCard } from '../components/AnswerCard';
import { ClipIcon, CloseIcon, DocIcon, MenuIcon, PlusIcon, SendIcon, TrashIcon } from '../components/Icons';
import { Mascot } from '../components/Mascot';
import { SourceModal } from '../components/SourceModal';
import { useToast } from '../components/Toast';
import { ask, errorMessage, sendFeedback } from '../lib/api';
import { ATTACH_ACCEPT, ATTACH_MAX, prepareAttachment } from '../lib/attach';
import { ATTACH_TYPES_SHORT } from '../lib/fileTypes';
import { useAuth } from '../lib/auth';
import { CATEGORY_SUGGESTIONS, SUGGESTED_QUESTIONS } from '../lib/constants';
import { supabase } from '../lib/supabase';
import type { ChatAttachment, Citation, Conversation, Message } from '../lib/types';

const MAX_LEN = 2000;
const ATTACH_ONLY_QUESTION = '첨부한 자료와 관련된 사내 규정이나 절차를 알려 주세요.';
const TOPICS = Object.keys(CATEGORY_SUGGESTIONS);

/** 저장된 대화에는 첨부 파일이 없으므로, 뒤따르는 답변에 남은 이름·읽음 여부로 표시한다. */
function withAttachmentNotes(list: Message[]): Message[] {
  return list.map((m, i) => {
    const notes = m.role === 'user' ? list[i + 1]?.answer?.attachments : undefined;
    return notes?.length ? { ...m, attachments: notes.map((n, j) => ({ id: `${m.id}-${j}`, ...n })) } : m;
  });
}

function AttachmentChips({ items, onRemove }: { items: ChatAttachment[]; onRemove?: (id: string) => void }) {
  return (
    <ul className="attach-list">
      {items.map((a) => (
        <li key={a.id} className={`attach-chip${a.read === false ? ' unread' : ''}`} title={a.read === false ? '내용을 읽지 못했어요' : a.name}>
          {a.dataUrl ? <img src={a.dataUrl} alt="" /> : <span className="attach-icon" aria-hidden="true"><DocIcon /></span>}
          <span className="attach-name">{a.name}</span>
          {a.read === false && <span className="attach-flag">못 읽음</span>}
          {onRemove && (
            <button type="button" className="attach-remove" aria-label={`${a.name} 빼기`} onClick={() => onRemove(a.id)}><CloseIcon /></button>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function Chat() {
  const { profile } = useAuth();
  const toast = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<Citation | null>(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [preparing, setPreparing] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [topic, setTopic] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadConversations = useCallback(async () => {
    const { data } = await supabase.from('conversations').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(50);
    setConversations((data as Conversation[]) ?? []);
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const openConversation = async (id: string) => {
    setSideOpen(false);
    if (id === currentId) return;
    setCurrentId(id);
    setMessages([]);
    const { data } = await supabase.from('messages').select('id, role, content, answer, vote, created_at').eq('conversation_id', id).order('created_at');
    setMessages(withAttachmentNotes((data as Message[]) ?? []));
  };

  const addFiles = async (files: File[]) => {
    if (!files.length) return;
    const room = ATTACH_MAX - attachments.length - preparing;
    if (room <= 0) return toast(`첨부는 ${ATTACH_MAX}개까지 넣을 수 있어요.`);
    if (files.length > room) toast(`첨부는 ${ATTACH_MAX}개까지라 ${room}개만 넣었어요.`);
    await Promise.all(files.slice(0, room).map(async (file) => {
      setPreparing((n) => n + 1);
      try {
        const item = await prepareAttachment(file);
        setAttachments((list) => [...list, item]);
      } catch (e) {
        toast(errorMessage(e));
      } finally {
        setPreparing((n) => n - 1);
      }
    }));
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = [...e.clipboardData.files];
    if (!files.length) return;
    e.preventDefault();
    addFiles(files);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles([...e.dataTransfer.files]);
  };

  // 연관 검색어는 바로 보내지 않고 입력칸에 채워, 뒤에 궁금한 점을 이어 쓰게 한다.
  const fillInput = (keyword: string) => {
    setInput(`${keyword} `);
    inputRef.current?.focus();
  };

  const newConversation = () => {
    setCurrentId(null);
    setMessages([]);
    setSideOpen(false);
    inputRef.current?.focus();
  };

  const deleteConversation = async (id: string) => {
    if (!window.confirm('이 대화를 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return;
    const { error } = await supabase.from('conversations').delete().eq('id', id);
    if (error) return toast('삭제하지 못했어요.');
    if (id === currentId) newConversation();
    setConversations((list) => list.filter((c) => c.id !== id));
    toast('대화를 삭제했어요.');
  };

  const submit = async (text: string, files: ChatAttachment[] = attachments) => {
    const question = text.trim() || (files.length ? ATTACH_ONLY_QUESTION : '');
    if (!question || busy || preparing) return;
    const now = new Date().toISOString();
    const tempUser: Message = { id: `u-${now}`, role: 'user', content: question, answer: null, vote: null, created_at: now, attachments: files };
    const tempBot: Message = { id: `b-${now}`, role: 'assistant', content: '', answer: null, vote: null, created_at: now, pending: true };
    setMessages((m) => [...m, tempUser, tempBot]);
    setInput('');
    setAttachments([]);
    setBusy(true);
    try {
      const res = await ask(question, currentId, files);
      const notes = res.answer.attachments ?? [];
      setMessages((m) => m.map((x) => {
        if (x.id === tempBot.id) return { ...x, id: res.message_id, answer: res.answer, content: res.answer.summary.join('\n'), pending: false };
        if (x.id === tempUser.id && files.length) return { ...x, attachments: files.map((f, i) => ({ ...f, read: notes[i]?.read })) };
        return x;
      }));
      if (!currentId) setCurrentId(res.conversation_id);
      loadConversations();
    } catch (e) {
      setMessages((m) => m.map((x) => (x.id === tempBot.id ? { ...x, pending: false, error: errorMessage(e) } : x)));
    } finally {
      setBusy(false);
    }
  };

  const retry = (botId: string) => {
    const idx = messages.findIndex((m) => m.id === botId);
    const question = messages[idx - 1]?.content;
    const files = messages[idx - 1]?.attachments ?? [];
    setMessages((m) => m.filter((_, i) => i !== idx && i !== idx - 1));
    if (question) submit(question, files);
  };

  const vote = async (id: string, v: 'up' | 'down' | null) => {
    const prev = messages.find((m) => m.id === id)?.vote ?? null;
    setMessages((m) => m.map((x) => (x.id === id ? { ...x, vote: v } : x)));
    try {
      await sendFeedback(id, v);
    } catch (e) {
      setMessages((m) => m.map((x) => (x.id === id ? { ...x, vote: prev } : x)));
      toast(errorMessage(e));
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit(input);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(input);
  };

  const lastBot = [...messages].reverse().find((m) => m.role === 'assistant');
  const mood = busy ? 'thinking' : lastBot?.answer?.status === 'insufficient_evidence' ? 'sorry' : lastBot?.vote === 'up' ? 'happy' : 'idle';

  return (
    <div className="chat-layout">
      <aside className={`chat-side${sideOpen ? ' open' : ''}`} aria-label="대화 기록">
        <div className="chat-side-head">
          <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={newConversation}>
            <PlusIcon /> 새 대화
          </button>
        </div>
        <ul className="conv-list">
          {conversations.length === 0 && <li className="hint" style={{ padding: 12 }}>아직 대화가 없어요.</li>}
          {conversations.map((c) => (
            <li key={c.id} className="conv-item" aria-current={c.id === currentId}>
              <button type="button" className="open" onClick={() => openConversation(c.id)} title={c.title}>{c.title}</button>
              <button type="button" className="del" aria-label={`${c.title} 삭제`} onClick={() => deleteConversation(c.id)}><TrashIcon /></button>
            </li>
          ))}
        </ul>
        <div className="privacy-note">🔒 내 질문과 대화는 나만 볼 수 있어요. 관리자는 질문 원문 없이 익명 통계만 확인해요.</div>
      </aside>

      <section className="chat-main" aria-label="Knowly와의 대화">
        <div className="chat-scroll" ref={scrollRef}>
          <div className="chat-thread">
            <button type="button" className="btn btn-sm mobile-only" style={{ alignSelf: 'flex-start' }} onClick={() => setSideOpen(!sideOpen)}>
              <MenuIcon /> 대화 기록
            </button>
            {messages.length === 0 && (
              <div className="welcome">
                <div className="welcome-scene">
                  <span className="scene-shadow" aria-hidden="true" />
                  <Mascot size={176} bob pettable />
                </div>
                <h1>{profile?.display_name ?? ''}님, 무엇이 궁금하세요?</h1>
                <p>사내 규정과 매뉴얼에서 근거를 찾아 출처와 함께 알려드려요.</p>
                <div className="chips topic-chips" role="group" aria-label="카테고리별 추천 질문">
                  <button type="button" className="chip" aria-pressed={!topic} onClick={() => setTopic(null)}>전체</button>
                  {TOPICS.map((c) => (
                    <button type="button" key={c} className="chip" aria-pressed={topic === c} onClick={() => setTopic(c)}>{c}</button>
                  ))}
                </div>
                <div className="suggestions" aria-label="추천 질문">
                  {(topic ? CATEGORY_SUGGESTIONS[topic].questions : SUGGESTED_QUESTIONS).map((q) => (
                    <button type="button" key={q} className="suggestion" onClick={() => submit(q)}>{q}</button>
                  ))}
                </div>
                {topic && (
                  <div className="related" aria-label="연관 검색어">
                    <span className="hint">연관 검색어</span>
                    {CATEGORY_SUGGESTIONS[topic].keywords.map((k) => (
                      <button type="button" key={k} className="related-word" onClick={() => fillInput(k)}>#{k}</button>
                    ))}
                  </div>
                )}
                <details className="ask-guide">
                  <summary>처음이신가요? 이렇게 물어보세요</summary>
                  <ul>
                    <li><b>물어볼 수 있는 것</b>: 등록된 사내 규정·매뉴얼 내용이에요. ({TOPICS.join(' · ')})</li>
                    <li><b>구체적으로</b>: "휴가"보다 "연차는 며칠 전에 신청해야 하나요?"처럼 상황을 넣어 물어보세요.</li>
                    <li><b>한 번에 하나씩</b>: 질문 하나에 궁금한 것 하나를 담으면 더 정확하게 찾아요.</li>
                    <li><b>출처 확인</b>: 답변 아래 출처를 누르면 문서 원문을 바로 볼 수 있어요.</li>
                    <li><b>답이 없을 때</b>: 문서에 근거가 없으면 지어내지 않고 알려 드려요. 그 질문은 이름 없이 담당자에게 전달돼 FAQ로 보강돼요.</li>
                  </ul>
                </details>
              </div>
            )}
            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="user-row">
                  {!!m.attachments?.length && <AttachmentChips items={m.attachments} />}
                  <div className="bubble-user">{m.content}</div>
                </div>
              ) : (
                <div key={m.id} className="bot-row">
                  <Mascot size={48} avatar mood={m.pending ? 'thinking' : m.answer?.status === 'insufficient_evidence' ? 'sorry' : m.vote === 'up' ? 'happy' : 'idle'} />
                  {m.pending ? (
                    <div className="bot-card" aria-label="답변을 준비하고 있어요">
                      <div className="hint">문서를 찾아보고 있어요…</div>
                      <div className="typing"><span /><span /><span /></div>
                    </div>
                  ) : m.error ? (
                    <div className="bot-card">
                      <div className="error-box">{m.error}</div>
                      <button type="button" className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => retry(m.id)}>다시 시도</button>
                    </div>
                  ) : (
                    <AnswerCard message={m} onVote={(v) => vote(m.id, v)} onOpenSource={setSource} />
                  )}
                </div>
              )
            )}
          </div>
        </div>
        <div className="composer-wrap">
          {(attachments.length > 0 || preparing > 0) && (
            <div className="composer-attach">
              <AttachmentChips items={attachments} onRemove={(id) => setAttachments((list) => list.filter((a) => a.id !== id))} />
              {preparing > 0 && <span className="hint" role="status">첨부를 읽는 중…</span>}
              <span className="hint">첨부한 파일은 저장하지 않고 이번 답변에만 사용해요.</span>
            </div>
          )}
          <form
            className={`composer${dragging ? ' dragging' : ''}`}
            onSubmit={onSubmit}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <span className="mobile-hide" aria-hidden="true"><Mascot size={40} avatar mood={mood} /></span>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={ATTACH_ACCEPT}
              hidden
              onChange={(e) => {
                addFiles([...(e.target.files ?? [])]);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              className="attach-btn"
              aria-label="사진이나 파일 첨부"
              title={`${ATTACH_TYPES_SHORT} 첨부 (최대 ${ATTACH_MAX}개, 붙여넣기·끌어다 놓기 가능)`}
              disabled={busy || attachments.length + preparing >= ATTACH_MAX}
              onClick={() => fileRef.current?.click()}
            >
              <ClipIcon />
            </button>
            <label htmlFor="chat-in" className="sr">질문 입력</label>
            <textarea
              id="chat-in"
              ref={inputRef}
              rows={1}
              value={input}
              maxLength={MAX_LEN}
              placeholder="궁금한 점을 입력하세요 (Shift+Enter 줄바꿈)"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
            />
            <button type="submit" className="send" aria-label="질문 보내기" disabled={busy || preparing > 0 || (!input.trim() && !attachments.length)}><SendIcon /></button>
          </form>
        </div>
      </section>

      {source && <SourceModal citation={source} onClose={() => setSource(null)} />}
    </div>
  );
}
