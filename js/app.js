/* Global UI and i18n scripts */

let currentLang = 'ru';

function initLang() {
  let lang = 'ru';
  try {
    if (localStorage.getItem('lang')) {
      lang = localStorage.getItem('lang');
    } else if (document.cookie.includes('lang=en')) {
      lang = 'en';
    }
  } catch(e) {}
  currentLang = lang === 'en' ? 'en' : 'ru';
}

function setLang(lang) {
  try {
    localStorage.setItem('lang', lang);
  } catch(e) {}
  document.cookie = `lang=${lang}; path=/; max-age=31536000`;
  window.location.reload();
}

function getDict() {
  return dictionaries[currentLang];
}

function renderHeader(activePage = 'home') {
  const dict = getDict().header;
  const headerHtml = `
    <header class="sticky top-0 left-0 right-0 z-50 bg-[#0A0E17]/80 backdrop-blur-md border-b border-white/[0.05] transition-all duration-300">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        
        <!-- Logo -->
        <a href="index.html" class="flex items-center gap-3 group">
          <div class="relative w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-400 p-[1px] shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300">
            <div class="w-full h-full bg-[#0A0E17] rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
            </div>
          </div>
          <span class="font-bold text-xl tracking-tight text-white flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span class="text-primary">MM</span>
            <span class="hidden sm:inline">Map Mastery</span>
          </span>
        </a>

        <!-- Map Search -->
        <div class="flex-1 max-w-md relative hidden sm:block">
          <form id="header-map-search-form" class="relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
            <input 
              type="text" 
              id="header-map-search-input"
              placeholder="${currentLang === 'ru' ? 'Поиск карты (например: Kintaro)' : 'Search map (e.g. Kintaro)'}" 
              class="w-full bg-[#121A2F] border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </form>
        </div>

        <!-- Language Toggles -->
        <div class="flex items-center gap-1 bg-white/[0.03] p-1 rounded-lg border border-white/10">
          <button onclick="setLang('ru')" class="px-3 py-1 text-xs font-semibold rounded-md transition-all duration-300 ${currentLang === 'ru' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}">RU</button>
          <button onclick="setLang('en')" class="px-3 py-1 text-xs font-semibold rounded-md transition-all duration-300 ${currentLang === 'en' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}">EN</button>
        </div>
        
      </div>
    </header>
  `;
  document.getElementById('header-container').innerHTML = headerHtml;

  setTimeout(() => {
    const mapSearchForm = document.getElementById('header-map-search-form');
    if (mapSearchForm) {
      mapSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('header-map-search-input');
        if (input && input.value.trim()) {
          window.location.href = `map.html?name=${encodeURIComponent(input.value.trim())}`;
        }
      });
    }
  }, 100);
}

const icons = {
  search: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>',
  loader: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>',
  trophy: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-12 h-12 text-blue-500"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>',
  arrowRight: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>',
  arrowUpDown: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3"><path d="m21 16-4 4-4-4"></path><path d="M17 20V4"></path><path d="m3 8 4-4 4 4"></path><path d="M7 4v16"></path></svg>'
};

initLang();
