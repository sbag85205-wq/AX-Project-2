// Run in the head before styles are painted to avoid a light flash on return.
(()=>{
 let saved=null;
 try{saved=JSON.parse(localStorage.getItem('nyang-color-theme'));}catch{}
 const theme=saved==='dark'||saved==='light'?saved:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
 document.documentElement.dataset.theme=theme;
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#111214':'#ffffff');
})();
