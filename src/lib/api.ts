import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Answer } from './types';

/** Edge Function을 호출하고, 실패하면 서버가 보낸 한국어 메시지로 예외를 던진다. */
export async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      throw new Error(payload?.error?.message ?? '요청을 처리하지 못했어요.');
    }
    throw new Error('서버에 연결하지 못했어요. 네트워크 상태를 확인해 주세요.');
  }
  return data as T;
}

export interface AskResult {
  conversation_id: string;
  message_id: string;
  created_at: string;
  answer: Answer;
}

export const ask = (question: string, conversationId: string | null) =>
  callFunction<AskResult>('chat', { question, conversation_id: conversationId });

export const sendFeedback = (messageId: string, vote: 'up' | 'down' | null) =>
  callFunction<{ ok: true }>('chat', { action: 'feedback', message_id: messageId, vote });

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : '알 수 없는 오류가 발생했어요.';
}
