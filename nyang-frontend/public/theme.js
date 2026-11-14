// Run in the head before styles are painted to avoid a light flash on return.
// 다크/라이트 결정 규칙은 여기 한 곳에 있다. app.js는 window.nyangTheme(preferred·apply·media)를 쓴다.
(()=>{
 const media=matchMedia('(prefers-color-scheme: dark)');
 const preferred=()=>{
  let saved=null;
  try{saved=JSON.parse(localStorage.getItem('nyang-color-theme'));}catch{}
  return saved==='dark'||saved==='light'?saved:media.matches?'dark':'light';
 };
 const apply=theme=>{
  const dark=theme==='dark';
  document.documentElement.dataset.theme=dark?'dark':'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#111214':'#ffffff');
  return dark;
 };
 window.nyangTheme={media,preferred,apply};
 apply(preferred());
})();
