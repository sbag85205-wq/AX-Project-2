import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { AnswerCard } from '../components/AnswerCard';
import { MenuIcon, PlusIcon, SendIcon, TrashIcon } from '../components/Icons';
import { Mascot } from '../components/Mascot';
import { SourceModal } from '../components/SourceModal';
import { useToast } from '../components/Toast';
import { ask, errorMessage, sendFeedback } from '../lib/api';
import { useAuth } from '../lib/auth';
import { SUGGESTED_QUESTIONS } from '../lib/constants';
import { supabase } from '../lib/supabase';
import type { Citation, Conversation, Message } from '../lib/types';

const MAX_LEN = 2000;

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    setMessages((data as Message[]) ?? []);
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

  const submit = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    const now = new Date().toISOString();
    const tempUser: Message = { id: `u-${now}`, role: 'user', content: question, answer: null, vote: null, created_at: now };
    const tempBot: Message = { id: `b-${now}`, role: 'assistant', content: '', answer: null, vote: null, created_at: now, pending: true };
    setMessages((m) => [...m, tempUser, tempBot]);
    setInput('');
    setBusy(true);
    try {
      const res = await ask(question, currentId);
      setMessages((m) => m.map((x) => (x.id === tempBot.id ? { ...x, id: res.message_id, answer: res.answer, content: res.answer.summary.join('\n'), pending: false } : x)));
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
    setMessages((m) => m.filter((_, i) => i !== idx && i !== idx - 1));
    if (question) submit(question);
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
                  <Mascot size={176} bob />
                </div>
                <h1>{profile?.display_name ?? ''}님, 무엇이 궁금하세요?</h1>
                <p>사내 규정과 매뉴얼에서 근거를 찾아 출처와 함께 알려드려요.</p>
                <div className="suggestions" aria-label="추천 질문">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button type="button" key={q} className="suggestion" onClick={() => submit(q)}>{q}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="bubble-user">{m.content}</div>
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
          <form className="composer" onSubmit={onSubmit}>
            <span className="mobile-hide" aria-hidden="true"><Mascot size={40} avatar mood={mood} /></span>
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
            />
            <button type="submit" className="send" aria-label="질문 보내기" disabled={busy || !input.trim()}><SendIcon /></button>
          </form>
        </div>
      </section>

      {source && <SourceModal citation={source} onClose={() => setSource(null)} />}
    </div>
  );
}
