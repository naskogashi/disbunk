/* Progressive enhancements only. Public content and language links need no app bundle. */
(() => {
  const menus = [...document.querySelectorAll('[data-public-menu]')];
  const closeMenus = (focus=false) => menus.forEach(menu => { const wasOpen=menu.open; menu.open=false; if(focus&&wasOpen)menu.querySelector('summary').focus(); });
  for(const menu of menus) {
    menu.addEventListener('toggle',()=>{
      document.body.style.overflow=menus.some(item=>item.open)?'hidden':'';
      const summary=menu.querySelector('summary');
      summary.setAttribute('aria-label',menu.open?summary.dataset.closeLabel:summary.dataset.openLabel);
    });
    menu.querySelector('[data-menu-backdrop]')?.addEventListener('click',()=>closeMenus(true));
    menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>closeMenus()));
    menu.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();closeMenus(true);}
      if(event.key==='Tab'&&menu.open){
        const controls=[...menu.querySelectorAll('summary,a,button,select')].filter(item=>item.getClientRects().length);
        const first=controls[0],last=controls.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    });
  }
  window.matchMedia('(min-width: 1024px)').addEventListener('change',event=>{if(event.matches)closeMenus();});
  const updateThemeLabels=()=>document.querySelectorAll('[data-public-theme]').forEach(button=>button.setAttribute('aria-label',document.documentElement.classList.contains('dark')?button.dataset.lightLabel:button.dataset.darkLabel));
  updateThemeLabels();
  document.querySelectorAll('[data-public-theme]').forEach(button=>button.addEventListener('click',()=>{
    const dark=document.documentElement.classList.toggle('dark');
    try{localStorage.setItem('disbunk-theme',dark?'dark':'light');}catch{}
    document.querySelector('meta[name="theme-color"]').content=dark?'#10151b':'#f9f7f3';updateThemeLabels();
  }));
  // Remember the URL's language for the workspace; never redirect public visitors.
  try{localStorage.setItem('disbunk_language',document.documentElement.lang);}catch{}
  const updateLanguageHashes=()=>document.querySelectorAll('a[hreflang]').forEach(link=>{const url=new URL(link.href);url.hash=location.hash;link.href=url.pathname+url.hash;});
  updateLanguageHashes();window.addEventListener('hashchange',updateLanguageHashes);
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.find(entry=>entry.isIntersecting);if(!visible)return;
      document.querySelectorAll('[data-section-navigation] a').forEach(link=>{
        if(link.hash===`#${visible.target.id}`)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
      });
    },{rootMargin:'-15% 0px -65% 0px'});
    ['platform','how-it-works','technology'].forEach(id=>{const section=document.getElementById(id);if(section)observer.observe(section);});
  }
})();
