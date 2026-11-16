import { supabase } from './supabase';
import type { Answer, ChatAttachment } from './types';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? '';
/**
 * 서버 함수를 DB와 같은 지역에서 실행한다. 지정하지 않으면 사용자와 가까운 지역(서울)에서 실행돼,
 * DB(아일랜드 eu-west-1)에 질의할 때마다 대륙을 왕복해 매우 느려진다.
 * 헤더(x-region)는 CORS에 막히므로 주소 뒤 값(forceFunctionRegion)으로만 지정한다.
 */
export const FUNCTION_REGION = (import.meta.env.VITE_SUPABASE_FUNCTION_REGION as string | undefined) || 'eu-west-1';

/** 로그인이 끝났을 때(다른 곳에서 로그아웃·만료) 서버 함수가 보내는 상태 번호 */
export const SESSION_EXPIRED = 401;

/**
 * Edge Function을 호출하고, 실패하면 서버가 보낸 한국어 메시지와 상태 번호(status)를 가진 예외를 던진다.
 * 서버가 로그인을 받아들이지 않으면(401) 로그인 토큰을 한 번 새로 받아 다시 시도한다.
 */
export async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const first = await send(name, body, false);
  if (first.status !== SESSION_EXPIRED) return result<T>(first);
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session) throw Object.assign(new Error('로그인이 만료됐어요. 다시 로그인해 주세요.'), { status: SESSION_EXPIRED });
  const again = await send(name, body, true);
  if (again.status === SESSION_EXPIRED) throw Object.assign(new Error('로그인이 만료됐어요. 다시 로그인해 주세요.'), { status: SESSION_EXPIRED });
  return result<T>(again);
}

async function send(name: string, body: Record<string, unknown>, retry: boolean): Promise<{ status: number; payload: unknown }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session && retry) return { status: SESSION_EXPIRED, payload: null };
  const target = new URL(`${url}/functions/v1/${name}`);
  if (FUNCTION_REGION !== 'any') target.searchParams.set('forceFunctionRegion', FUNCTION_REGION);
  let res: Response;
  try {
    res = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${session?.access_token ?? key}` },
      body: JSON.stringify(body)
    });
  } catch {
    throw new Error('서버에 연결하지 못했어요. 네트워크 상태를 확인해 주세요.');
  }
  return { status: res.status, payload: await res.json().catch(() => null) };
}

function result<T>({ status, payload }: { status: number; payload: unknown }): T {
  if (status >= 200 && status < 300) return payload as T;
  const message = (payload as { error?: { message?: string } } | null)?.error?.message ?? '요청을 처리하지 못했어요.';
  throw Object.assign(new Error(message), { status });
}

export interface AskResult {
  conversation_id: string;
  message_id: string;
  created_at: string;
  answer: Answer;
}

export const ask = (question: string, conversationId: string | null, attachments: ChatAttachment[] = []) =>
  callFunction<AskResult>('chat', {
    question,
    conversation_id: conversationId,
    attachments: attachments.map((a) => (a.kind === 'image'
      ? { name: a.name, kind: 'image', data_url: a.dataUrl }
      : { name: a.name, kind: 'file', text: a.text }))
  });

export const sendFeedback = (messageId: string, vote: 'up' | 'down' | null) =>
  callFunction<{ ok: true }>('chat', { action: 'feedback', message_id: messageId, vote });

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : '알 수 없는 오류가 발생했어요.';
}
