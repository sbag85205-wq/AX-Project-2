import { categories as nyangCategories, faq as nyangFaq } from '../../nyang-frontend/public/core.js';
import { useEffect, useState } from 'react';
import { callFunction } from './api';
import { CATEGORIES } from './constants';
import { supabase } from './supabase';

/** 분야 이름 길이와 개수 한도 (DB 제약: 1~30개) */
export const CATEGORY_MAX_LENGTH = 30;
export const CATEGORY_MAX_COUNT = 30;
/** 분야마다 예시 질문 개수와 길이 한도 */
export const EXAMPLE_MAX_COUNT = 20;
export const EXAMPLE_MAX_LENGTH = 200;

/** 분야 이름 → 예시 질문. 키가 없는 분야는 냥대리 기본 예시를 쓴다. */
export type CategoryExamples = Record<string, string[]>;

const textList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((c): c is string => typeof c === 'string' && !!c.trim()) : [];

function examplesFrom(value: unknown): CategoryExamples {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, textList(v)]));
}

/**
 * 관리자가 '분야 관리'에서 정한 분야 목록(순서 포함)과 분야별 예시 질문을 읽는다.
 * 아직 저장된 목록이 없거나 읽지 못하면 기본 분야(CATEGORIES)를 쓴다.
 */
export async function loadCategories(): Promise<{ categories: string[]; examples: CategoryExamples; error: string }> {
  let { data, error } = await supabase.from('app_settings').select('categories, category_examples').eq('id', 1).maybeSingle();
  // 예시 질문 칸이 아직 DB에 없으면 분야 목록만이라도 읽는다
  if (error) ({ data, error } = await supabase.from('app_settings').select('categories').eq('id', 1).maybeSingle());
  const row = data as { categories?: unknown; category_examples?: unknown } | null;
  const list = textList(row?.categories);
  if (error || !list.length) {
    return { categories: [...CATEGORIES], examples: {}, error: error ? '분야 목록을 불러오지 못해 기본 분야를 보여 드려요.' : '' };
  }
  return { categories: list, examples: examplesFrom(row?.category_examples), error: '' };
}

/**
 * 직원 화면용 분야 목록(분야 관리의 순서대로). 설정 표는 관리자만 읽을 수 있어 chat 서버 함수가 대신 읽어 준다.
 * 받지 못하면 기본 분야(CATEGORIES)를 쓴다.
 */
export async function loadCategoryNames(): Promise<string[]> {
  try {
    const list = textList((await callFunction<{ categories?: unknown }>('chat', { action: 'categories' }))?.categories);
    if (list.length) return list;
  } catch {
    // 연결이 안 되면 기본 분야로 보여 준다
  }
  return [...CATEGORIES];
}

/** 관리자 화면용: 분야 관리에서 정한 분야(순서 포함). 불러오기 전·실패 시에는 기본 분야. */
export function useManagedCategories(): string[] {
  const [list, setList] = useState<string[]>([...CATEGORIES]);
  useEffect(() => {
    let alive = true;
    loadCategories().then(({ categories }) => { if (alive) setList(categories); });
    return () => { alive = false; };
  }, []);
  return list;
}

/** 분야 목록 뒤에, 목록에는 없지만 문서가 쓰고 있는 분야(지워진 분야 등)를 붙인다. */
export function withDocumentCategories(names: string[], used: string[]): string[] {
  const extra = [...new Set(used.filter((c) => c && !names.includes(c)))].sort((a, b) => a.localeCompare(b, 'ko'));
  return [...names, ...extra];
}

/** 목록에 있는 분야의 예시만 남긴다 (지워진 분야의 예시는 버린다). */
export function examplesFor(categories: string[], examples: CategoryExamples): CategoryExamples {
  return Object.fromEntries(categories.filter((c) => Array.isArray(examples[c])).map((c) => [c, examples[c]]));
}

/** 분야 목록(순서 포함)과 예시 질문을 한 번에 저장한다 (관리자만 가능: app_settings 수정 권한). */
export async function saveCategories(categories: string[], examples: CategoryExamples = {}): Promise<void> {
  const { error } = await supabase.from('app_settings')
    .update({ categories, category_examples: examplesFor(categories, examples), updated_at: new Date().toISOString() }).eq('id', 1);
  if (error) throw new Error('분야를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
}

/** 냥대리 채팅에 원래 있던 분야면 그 기본 예시 질문을 돌려준다. */
export function defaultExamples(name: string): string[] {
  const id = nyangCategories.find((c) => c.label === name)?.id;
  return id ? [...(nyangFaq[id] ?? [])] : [];
}

/** 분야의 현재 예시 질문: 저장된 것이 있으면 그것, 없으면 기본 예시. */
export function examplesOf(name: string, examples: CategoryExamples): string[] {
  return Array.isArray(examples[name]) ? examples[name] : defaultExamples(name);
}

/** 목록에서 분야 이름 하나를 같은 자리에서 바꾼다. */
export function renamedList(list: string[], from: string, to: string): string[] {
  return list.map((c) => (c === from ? to.trim() : c));
}

/** 분야 하나를 위(-1)나 아래(+1)로 한 칸 옮긴다. 끝을 넘으면 그대로 둔다. */
export function movedList(list: string[], index: number, delta: -1 | 1): string[] {
  const to = index + delta;
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

/**
 * 분야 설정 저장: 이름이 바뀌었으면 같은 자리에서 바꾸고, 예시 질문도 새 이름으로 저장한다.
 * 이름이 바뀌면 그 분야를 쓰던 문서의 분야도 새 이름으로 바꾸고, 바뀐 문서 수를 돌려준다.
 */
export async function saveCategorySettings(
  list: string[], examples: CategoryExamples, from: string, to: string, nextExamples: string[]
): Promise<{ categories: string[]; examples: CategoryExamples; moved: number }> {
  const name = to.trim();
  const categories = renamedList(list, from, name);
  const rest = { ...examples };
  delete rest[from];
  const merged = { ...rest, [name]: nextExamples };
  await saveCategories(categories, merged);
  if (name === from) return { categories, examples: examplesFor(categories, merged), moved: 0 };
  const { data, error } = await supabase.from('documents')
    .update({ category: name, updated_at: new Date().toISOString() }).eq('category', from).select('id');
  if (error) throw new Error('분야 이름은 바꿨지만 문서의 분야를 바꾸지 못했어요. 문서 관리에서 직접 바꿔 주세요.');
  return { categories, examples: examplesFor(categories, merged), moved: data?.length ?? 0 };
}

/** 새 분야 이름을 검사한다. 문제가 없으면 빈 문자열을 돌려준다. */
export function categoryNameProblem(name: string, current: string[]): string {
  const value = name.trim();
  if (!value) return '분야 이름을 입력해 주세요.';
  if (value.length > CATEGORY_MAX_LENGTH) return `분야 이름은 ${CATEGORY_MAX_LENGTH}자 이내로 적어 주세요.`;
  if (current.includes(value)) return '이미 있는 분야예요.';
  if (current.length >= CATEGORY_MAX_COUNT) return `분야는 최대 ${CATEGORY_MAX_COUNT}개까지 만들 수 있어요.`;
  return '';
}

/** 새 예시 질문을 검사한다. 문제가 없으면 빈 문자열을 돌려준다. */
export function exampleProblem(question: string, current: string[]): string {
  const value = question.trim();
  if (!value) return '예시 질문을 입력해 주세요.';
  if (value.length > EXAMPLE_MAX_LENGTH) return `예시 질문은 ${EXAMPLE_MAX_LENGTH}자 이내로 적어 주세요.`;
  if (current.includes(value)) return '이미 있는 예시 질문이에요.';
  if (current.length >= EXAMPLE_MAX_COUNT) return `예시 질문은 분야마다 최대 ${EXAMPLE_MAX_COUNT}개까지 넣을 수 있어요.`;
  return '';
}

/** 저장 전에 예시 질문을 다듬는다: 앞뒤 공백 제거, 빈 줄·중복 제거, 개수·길이 한도. */
export function cleanExamples(list: string[]): string[] {
  const seen = new Set<string>();
  return list.map((q) => q.trim()).filter((q) => q && q.length <= EXAMPLE_MAX_LENGTH && !seen.has(q) && seen.add(q)).slice(0, EXAMPLE_MAX_COUNT);
}
