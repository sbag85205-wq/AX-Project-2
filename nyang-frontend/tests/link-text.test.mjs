import test from 'node:test';
import assert from 'node:assert/strict';
import { linkifyText } from '../public/link-text.js';

test('근거 글의 웹 주소만 새 탭 링크로 바꾸고 나머지는 이스케이프한다', () => {
  assert.equal(linkifyText('출장 규정 3쪽'), '출장 규정 3쪽');
  assert.equal(linkifyText('<b>x</b>'), '&lt;b&gt;x&lt;/b&gt;');
  assert.equal(
    linkifyText('참고: https://intra.example.com/docs?id=1&p=3 확인'),
    '참고: <a href="https://intra.example.com/docs?id=1&amp;p=3" target="_blank" rel="noopener noreferrer">https://intra.example.com/docs?id=1&amp;p=3</a> 확인'
  );
});

test('www. 주소는 https로 열고, 끝 문장부호는 주소에서 뺀다', () => {
  assert.equal(linkifyText('(www.example.com).'), '(<a href="https://www.example.com/" target="_blank" rel="noopener noreferrer">www.example.com</a>).');
  assert.equal(linkifyText('https://a.com/b, https://c.com'), '<a href="https://a.com/b" target="_blank" rel="noopener noreferrer">https://a.com/b</a>, <a href="https://c.com/" target="_blank" rel="noopener noreferrer">https://c.com</a>');
});

test('괄호가 들어간 주소는 닫는 괄호를 남긴다', () => {
  assert.match(linkifyText('https://ko.wikipedia.org/wiki/A_(B)'), /href="https:\/\/ko\.wikipedia\.org\/wiki\/A_\(B\)"/);
});

test('http·https가 아니면 링크로 만들지 않는다', () => {
  assert.equal(linkifyText('javascript:alert(1)'), 'javascript:alert(1)');
  assert.equal(linkifyText('주소 "https://x.com" 끝'), '주소 &quot;<a href="https://x.com/" target="_blank" rel="noopener noreferrer">https://x.com</a>&quot; 끝');
});
