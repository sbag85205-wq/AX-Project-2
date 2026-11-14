// 질문 첨부: 브라우저에서 파일의 글자를 뽑거나 사진을 줄여서 보낸다. 서버는 첨부를 저장하지 않는다.
import { extractPages } from './extract';
import { ATTACH_TYPES_LABEL, fileKind, isImageFile } from './fileTypes';
import { openPdf } from './pdf';
import type { ChatAttachment } from './types';
import { ATTACH_LIMITS } from '../../supabase/functions/_shared/answer';

/** 개수·글자 수 한도는 서버(chat 함수)가 검사하는 값과 같은 것을 쓴다 */
export const ATTACH_MAX = ATTACH_LIMITS.count;
export const ATTACH_MAX_MB = 10;
const MAX_TEXT = ATTACH_LIMITS.textChars;
const MAX_SIDE = 1600;

export { ATTACH_ACCEPT } from './fileTypes';

const id = () => Math.random().toString(36).slice(2, 10);

/** 긴 변이 MAX_SIDE를 넘지 않게 줄여 JPEG로 만든다 (휴대폰 사진 수 MB → 수백 KB) */
function toJpeg(source: CanvasImageSource, width: number, height: number): string {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('사진을 처리하지 못했어요.');
  ctx.fillStyle = '#fff'; // 투명 PNG가 검게 나오지 않게
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

/** 글자가 없는 스캔 PDF는 첫 페이지를 사진처럼 보내 판독 모델이 읽게 한다. */
async function pdfFirstPageImage(file: File): Promise<string> {
  const pdf = await openPdf(new Uint8Array(await file.arrayBuffer()));
  try {
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: MAX_SIDE / Math.max(base.width, base.height) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvas, viewport }).promise;
    return toJpeg(canvas, canvas.width, canvas.height);
  } finally {
    pdf.loadingTask.destroy();
  }
}

export async function prepareAttachment(file: File): Promise<ChatAttachment> {
  if (file.size > ATTACH_MAX_MB * 1024 * 1024) throw new Error(`${file.name}: ${ATTACH_MAX_MB}MB 이하만 첨부할 수 있어요.`);
  const name = file.name || '붙여넣은 사진.png';

  if (isImageFile(file)) {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw new Error(`${name}: 이 사진은 열 수 없어요. JPG나 PNG로 다시 올려 주세요.`);
    }
    const dataUrl = toJpeg(bitmap, bitmap.width, bitmap.height);
    bitmap.close();
    return { id: id(), name, kind: 'image', dataUrl };
  }

  const kind = fileKind(name);
  if (!kind) throw new Error(`${name}: ${ATTACH_TYPES_LABEL} 파일만 첨부할 수 있어요.`);
  const pages = await extractPages(file);
  const text = pages.map((p) => p.text).join('\n\n').trim();
  if (!text) {
    if (kind === 'pdf') return { id: id(), name, kind: 'image', dataUrl: await pdfFirstPageImage(file) };
    throw new Error(`${name}: 파일에서 글자를 찾지 못했어요.`);
  }
  return { id: id(), name, kind: 'file', text: text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) : text };
}
