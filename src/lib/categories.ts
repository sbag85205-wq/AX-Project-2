import { CATEGORIES } from './constants';
import { supabase } from './supabase';

/** 분야 이름 길이와 개수 한도 (DB 제약: 1~30개) */
export const CATEGORY_MAX_LENGTH = 30;
export const CATEGORY_MAX_COUNT = 30;

/**
 * 관리자가 '분야 관리'에서 정한 분야 목록을 읽는다.
 * 아직 저장된 목록이 없거나 읽지 못하면 기본 분야(CATEGORIES)를 쓴다.
 */
export async function loadCategories(): Promise<{ categories: string[]; error: string }> {
  const { data, error } = await supabase.from('app_settings').select('categories').eq('id', 1).maybeSingle();
  const list = (data as { categories?: unknown } | null)?.categories;
  if (error || !Array.isArray(list) || !list.length) {
    return { categories: [...CATEGORIES], error: error ? '분야 목록을 불러오지 못해 기본 분야를 보여 드려요.' : '' };
  }
  return { categories: list.filter((c): c is string => typeof c === 'string' && !!c.trim()), error: '' };
}

/** 분야 목록 전체를 저장한다 (관리자만 가능: app_settings 수정 권한). */
export async function saveCategories(categories: string[]): Promise<void> {
  const { error } = await supabase.from('app_settings')
    .update({ categories, updated_at: new Date().toISOString() }).eq('id', 1);
  if (error) throw new Error('분야를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
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
