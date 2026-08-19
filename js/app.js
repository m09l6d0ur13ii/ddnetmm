/* Global UI and i18n scripts */

let currentLang = 'ru';

function initLang() {
  let lang = 'ru';
  try {
    if (localStorage.getItem('lang')) {
      // Пользователь уже выбирал язык вручную — уважаем его выбор
      lang = localStorage.getItem('lang');
    } else if (document.cookie.includes('lang=en')) {
      lang = 'en';
    } else {
      // Ничего не выбрано — определяем по языку браузера/системы
      const browserLang = (navigator.languages && navigator.languages[0]) || navigator.language || 'ru';
      lang = browserLang.toLowerCase().startsWith('en') ? 'en' : 'ru';
    }
  } catch (e) { }
  currentLang = lang === 'en' ? 'en' : 'ru';
  if (document.documentElement) {
    document.documentElement.lang = currentLang;
  }
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  window.location.reload();
}

/**
 * @param {string} unsafe
 * @returns {string}
 */
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * @returns {Object}
 */
function getDict() {
  return (typeof dictionaries !== 'undefined' && dictionaries[currentLang]) ? dictionaries[currentLang] : (typeof dictionaries !== 'undefined' ? dictionaries.ru : {});
}

/**
 * Safe translation lookup by dot-notation key (e.g. 'player.statBase')
 * @param {string} keyPath
 * @param {string} [fallback='']
 * @returns {any}
 */
function t(keyPath, fallback = '') {
  if (!keyPath) return fallback;
  const dict = getDict();
  const parts = String(keyPath).split('.');
  let curr = dict;
  for (const part of parts) {
    if (curr && typeof curr === 'object' && part in curr) {
      curr = curr[part];
    } else {
      if (typeof dictionaries !== 'undefined' && dictionaries.ru) {
        let fb = dictionaries.ru;
        for (const p of parts) {
          if (fb && typeof fb === 'object' && p in fb) {
            fb = fb[p];
          } else {
            fb = undefined;
            break;
          }
        }
        if (fb !== undefined) return fb;
      }
      return fallback;
    }
  }
  return curr !== undefined ? curr : fallback;
}
window.t = t;

/**
 * Automatically applies translations to all elements with data-i18n attributes in the given root element
 * @param {HTMLElement|Document} [root=document]
 */
function applyTranslations(root = document) {
  if (!root || !root.querySelectorAll) return;

  // textContent
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val !== undefined && typeof val === 'string') {
      el.textContent = val;
    }
  });

  // innerHTML
  root.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    const val = t(key);
    if (val !== undefined && typeof val === 'string') {
      el.innerHTML = val;
    }
  });

  // placeholder
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const val = t(key);
    if (val !== undefined && typeof val === 'string') {
      el.placeholder = val;
    }
  });

  // title
  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const val = t(key);
    if (val !== undefined && typeof val === 'string') {
      el.title = val;
    }
  });

  // aria-label
  root.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria-label');
    const val = t(key);
    if (val !== undefined && typeof val === 'string') {
      el.setAttribute('aria-label', val);
    }
  });

  // select options
  root.querySelectorAll('option[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val !== undefined && typeof val === 'string') {
      el.textContent = val;
    }
  });
}
window.applyTranslations = applyTranslations;
window.applyI18n = applyTranslations;

/**
 * Universal Footer renderer
 * @param {string} [activePage='']
 */
function renderFooter(activePage = '') {
  const dict = getDict();
  const f = dict.footer || {};

  const footerHtml = `
    <footer class="site-footer border-t border-white/[0.08] bg-slate-900/60 py-8 mt-12 text-slate-400 text-xs sm:text-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <p class="font-medium text-slate-300">${f.copyright || 'DDNet Map Mastery © 2026'}</p>
          <p class="text-slate-500 text-xs mt-1">${f.tagline || 'Альтернативный рейтинг и система очков для сообщества DDNet.'}</p>
        </div>
        <div class="flex flex-wrap items-center gap-6">
          <a href="/" class="hover:text-white transition-colors${activePage === 'home' ? ' text-amber-400 font-semibold' : ''}">${f.home || 'Главная'}</a>
          <a href="/maps" class="hover:text-white transition-colors${activePage === 'maps' ? ' text-amber-400 font-semibold' : ''}">${f.maps || 'База карт'}</a>
          <a href="/about" class="hover:text-white transition-colors${activePage === 'about' ? ' text-amber-400 font-semibold' : ''}">${f.about || 'О проекте'}</a>
          <a href="/compare" class="hover:text-white transition-colors${activePage === 'compare' ? ' text-amber-400 font-semibold' : ''}">${f.compare || 'Сравнение'}</a>
          <a href="/pvp" class="hover:text-white transition-colors${activePage === 'pvp' ? ' text-amber-400 font-semibold' : ''}">${f.pvp || 'PvP Дуэль'}</a>
          <a href="/tas" class="hover:text-white transition-colors${activePage === 'tas' ? ' text-amber-400 font-semibold' : ''}">${f.tas || 'TAS Ban List'}</a>
          <a href="/privacy" class="hover:text-white transition-colors${activePage === 'privacy' ? ' text-amber-400 font-semibold' : ''}">${f.privacy || 'Политика конфиденциальности'}</a>
          <a href="https://github.com/m09l6d0ur13ii/ddnetmm" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors">${f.github || 'GitHub'}</a>
        </div>
      </div>
    </footer>
  `;

  const container = document.getElementById('footer-container');
  if (container) {
    container.innerHTML = footerHtml;
  } else {
    const existingFooters = document.querySelectorAll('footer');
    if (existingFooters.length > 0) {
      const lastFooter = existingFooters[existingFooters.length - 1];
      lastFooter.outerHTML = footerHtml;
    }
  }
}
window.renderFooter = renderFooter;

function openSettingsModal() {
  window.location.href = '/settings';
}
window.openSettingsModal = openSettingsModal;

const keyboardLayouts = {
  en: "`qwertyuiop[]asdfghjkl;'zxcvbnm,./",
  ru: "ёйцукенгшщзхъфывапролджэячсмитьбю."
};

/**
 * @param {string} value
 * @returns {string}
 */
function swapKeyboardLayout(value) {
  return String(value || '').split('').map(char => {
    const lower = char.toLowerCase();
    let index = keyboardLayouts.en.indexOf(lower);
    if (index >= 0) return keyboardLayouts.ru[index] || char;
    index = keyboardLayouts.ru.indexOf(lower);
    if (index >= 0) return keyboardLayouts.en[index] || char;
    return char;
  }).join('');
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeSearchText(value) {
  return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim();
}

/**
 * @param {Array<string>} words
 * @returns {string}
 */
function getInitials(words) {
  return words.filter(Boolean).map(word => word[0]).join('');
}

/**
 * @param {string} needle
 * @param {string} haystack
 * @returns {boolean}
 */
function isSubsequence(needle, haystack) {
  let index = 0;
  for (const char of haystack) {
    if (char === needle[index]) index++;
    if (index === needle.length) return true;
  }
  return needle.length === 0;
}

/**
 * @param {Object} map
 * @param {string} rawQuery
 * @returns {number}
 */
function getMapSearchScore(map, rawQuery) {
  const variants = [...new Set([normalizeSearchText(rawQuery), normalizeSearchText(swapKeyboardLayout(rawQuery))])].filter(Boolean);
  const name = normalizeSearchText(map.map || map.name || '');
  const mapper = normalizeSearchText(map.mapper || '');
  const nameWords = name.split(' ').filter(Boolean);
  const nameInitials = getInitials(nameWords);
  let best = -1;

  variants.forEach(query => {
    const queryWords = query.split(' ').filter(Boolean);
    const compactQuery = queryWords.join('');
    const allWordsMatch = queryWords.length > 1 && queryWords.every(queryWord =>
      nameWords.some(nameWord => nameWord.startsWith(queryWord) || nameWord.includes(queryWord))
    );

    if (name === query) best = Math.max(best, 1000);
    else if (name.startsWith(query)) best = Math.max(best, 800 - (name.length - query.length));
    else if (name.includes(query)) best = Math.max(best, 650 - name.indexOf(query));
    else if (allWordsMatch) best = Math.max(best, 620 + queryWords.length * 8);
    else if (compactQuery.length >= 2 && nameInitials.startsWith(compactQuery)) best = Math.max(best, 610 - (nameInitials.length - compactQuery.length));
    else if (compactQuery.length >= 2 && isSubsequence(compactQuery, nameInitials)) best = Math.max(best, 570 - (nameInitials.length - compactQuery.length));
    else if (name.split(' ').some(word => word.startsWith(query))) best = Math.max(best, 550);
    else if (mapper.includes(query)) best = Math.max(best, 300 - mapper.indexOf(query));
  });

  return best;
}

/**
 * @param {string} rawQuery
 * @param {number} [limit=12]
 * @returns {Array<Object>}
 */
function findMapMatches(rawQuery, limit = 12) {
  const maps = window.mapsData || window.allMaps || window.mapStatsData || [];
  return maps
    .filter(Boolean)
    .map(map => ({ map, score: getMapSearchScore(map, rawQuery) }))
    .filter(item => item.score >= 0)
    .sort((a, b) => b.score - a.score || String(a.map.map || a.map.name || '').localeCompare(String(b.map.map || b.map.name || '')))
    .slice(0, limit)
    .map(item => item.map);
}

/**
 * @returns {{myNickname: string, lang: string, favorites: Array<string>}}
 */
function getSettings() {
  try {
    const raw = localStorage.getItem('ddnetmm_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        myNickname: parsed.myNickname || '',
        lang: parsed.lang || currentLang,
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : []
      };
    }
  } catch (e) { }
  return {
    myNickname: '',
    lang: currentLang,
    favorites: []
  };
}

/**
 * @param {Object} newSettings
 */
function saveSettings(newSettings) {
  try {
    const current = getSettings();
    const updated = { ...current, ...newSettings };
    localStorage.setItem('ddnetmm_settings', JSON.stringify(updated));
  } catch (e) { }
}

/**
 * @returns {Object|null}
 */
function getUserProfileCache() {
  try {
    const raw = localStorage.getItem('ddnetmm_user_cache');
    if (raw) return JSON.parse(raw);
  } catch (e) { }
  return null;
}

/**
 * @param {string|null} [overrideNick=null]
 * @returns {Promise<Object|null>}
 */
async function refreshUserProfileCache(overrideNick = null) {
  const settings = getSettings();
  const nick = overrideNick || settings.myNickname;
  if (!nick || !nick.trim()) return null;

  try {
    const data = await window.api.fetchPlayerPts(nick.trim());
    if (data) {
      const cacheObj = {
        name: data.name,
        newPtsBase: data.newPtsBase,
        newPtsSkill: data.newPtsSkill,
        newPtsTotal: data.newPtsTotal,
        finishes: data.finishDetails || [],
        updatedAt: Date.now()
      };
      localStorage.setItem('ddnetmm_user_cache', JSON.stringify(cacheObj));
      return cacheObj;
    }
  } catch (e) {
    console.error('Failed to refresh user profile cache:', e);
  }
  return null;
}

function openSettingsModal() {
  let modal = document.getElementById('settings-modal');
  if (!modal) {
    renderSettingsModal();
    modal = document.getElementById('settings-modal');
  }
  if (modal) {
    populateSettingsModal();
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function closeSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

function populateSettingsModal() {
  const s = getSettings();
  const cache = getUserProfileCache();
  const dict = getDict();
  const t = dict.settings || {};

  const inputNick = document.getElementById('modal-mynick-input');
  if (inputNick) inputNick.value = s.myNickname || '';

  const radios = document.querySelectorAll('input[name="modal-settings-lang"]');
  radios.forEach(r => {
    r.checked = (r.value === currentLang);
  });

  const cacheInfo = document.getElementById('modal-cache-info');
  if (cacheInfo) {
    if (cache && cache.updatedAt) {
      const dateStr = new Date(cache.updatedAt).toLocaleString(currentLang === 'en' ? 'en-US' : 'ru-RU');
      cacheInfo.textContent = `${currentLang === 'en' ? 'Last profile update:' : 'Последнее обновление:'} ${dateStr} (${cache.finishes ? cache.finishes.length : 0} ${currentLang === 'en' ? 'maps' : 'карт'})`;
    } else {
      cacheInfo.textContent = currentLang === 'en' ? 'Profile data not cached yet' : 'Данные профиля еще не закэшированы';
    }
  }

  // Render favorites chips in modal
  const favContainer = document.getElementById('modal-favs-chips');
  if (favContainer) {
    let favs = [...s.favorites];
    const renderModalFavs = () => {
      if (favs.length === 0) {
        favContainer.innerHTML = `<span class="text-xs text-slate-500 font-medium">${t.favoritesEmpty || 'No pinned players'}</span>`;
        return;
      }
      favContainer.innerHTML = favs.map((p, idx) => `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-slate-200">
          <a href="/player?name=${encodeURIComponent(p)}" class="hover:text-amber-400 transition-colors">${escapeHtml(p)}</a>
          <button type="button" data-modal-fav-idx="${idx}" class="modal-remove-fav text-slate-500 hover:text-red-400 font-bold px-1">&times;</button>
        </span>
      `).join('');

      favContainer.querySelectorAll('.modal-remove-fav').forEach(btn => {
        btn.onclick = (e) => {
          const idx = parseInt(e.currentTarget.getAttribute('data-modal-fav-idx'), 10);
          if (!isNaN(idx)) {
            favs.splice(idx, 1);
            saveSettings({ favorites: favs });
            renderModalFavs();
          }
        };
      });
    };
    renderModalFavs();
  }
}

function renderSettingsModal() {
  const dict = getDict();
  const t = dict.settings || {};

  const html = `
    <div id="settings-modal" class="hidden fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" role="dialog" aria-modal="true">
      <div class="relative w-full max-w-lg glass-panel p-6 sm:p-8 rounded-2xl border border-white/15 bg-slate-900/90 shadow-2xl space-y-6">

        <div class="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 class="text-2xl font-bold text-white flex items-center gap-2">
            <span>⚙️</span> <span>${t.title || 'Настройки'}</span>
          </h2>
          <button type="button" onclick="closeSettingsModal()" class="text-slate-400 hover:text-white text-2xl font-bold p-1 leading-none">&times;</button>
        </div>

        <form id="modal-settings-form" class="space-y-6">
          <!-- Nickname Field -->
          <div class="space-y-2">
            <label for="modal-mynick-input" class="block text-sm font-bold text-amber-400">${t.myNickLabel || 'Мой никнейм в DDNet'}</label>
            <input type="text" id="modal-mynick-input" placeholder="${t.myNickPlaceholder || 'Xardas'}" class="w-full bg-white/[0.04] border border-white/15 rounded-xl px-4 py-2.5 text-slate-100 placeholder:text-slate-500 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm" autocomplete="off">
            <p class="text-xs text-slate-400">${t.myNickHelp || 'Укажите ник для 1-click перехода в профиль и плашки рекорда на картах.'}</p>
          </div>

          <!-- Refresh Data Button -->
          <div class="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
            <div class="flex items-center justify-between">
              <span id="modal-cache-info" class="text-xs text-slate-400"></span>
              <button type="button" id="modal-refresh-data-btn" class="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5">
                <span>🔄</span> <span>${currentLang === 'en' ? 'Refresh Profile Data' : 'Обновить данные'}</span>
              </button>
            </div>
          </div>

          <!-- Language Selector -->
          <div class="space-y-2">
            <label class="block text-sm font-bold text-amber-400">${t.langLabel || 'Язык интерфейса'}</label>
            <div class="grid grid-cols-2 gap-3">
              <label class="flex items-center gap-2 cursor-pointer bg-white/[0.04] border border-white/10 p-3 rounded-xl hover:border-amber-500/50 transition-all">
                <input type="radio" name="modal-settings-lang" value="ru" class="accent-amber-500">
                <span class="font-bold text-xs">Русский (Russian)</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer bg-white/[0.04] border border-white/10 p-3 rounded-xl hover:border-amber-500/50 transition-all">
                <input type="radio" name="modal-settings-lang" value="en" class="accent-amber-500">
                <span class="font-bold text-xs">English (English)</span>
              </label>
            </div>
          </div>

          <!-- Favorites List -->
          <div class="space-y-2">
            <label class="block text-sm font-bold text-amber-400">${t.favoritesLabel || 'Избранные игроки'}</label>
            <div id="modal-favs-chips" class="flex flex-wrap gap-2 pt-1"></div>
          </div>

          <!-- Submit Buttons -->
          <div class="pt-4 border-t border-white/10 flex justify-end gap-3">
            <button type="button" onclick="closeSettingsModal()" class="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl text-sm transition-all">${currentLang === 'en' ? 'Cancel' : 'Отмена'}</button>
            <button type="submit" class="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)]">${t.saveBtn || 'Сохранить'}</button>
          </div>
        </form>

      </div>
    </div>
  `;

  let container = document.getElementById('settings-modal-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'settings-modal-container';
    document.body.appendChild(container);
  }
  container.innerHTML = html;

  // Setup Autocomplete for modal nickname input
  if (window.setupPlayerAutocomplete) {
    window.setupPlayerAutocomplete('modal-mynick-input', (val) => {
      const inp = document.getElementById('modal-mynick-input');
      if (inp) inp.value = val;
    });
  }

  // Refresh data button click
  const refreshBtn = document.getElementById('modal-refresh-data-btn');
  if (refreshBtn) {
    refreshBtn.onclick = async () => {
      const inputNick = document.getElementById('modal-mynick-input');
      const nick = inputNick ? inputNick.value.trim() : '';
      if (!nick) return;

      refreshBtn.disabled = true;
      refreshBtn.innerHTML = `<span>⏳</span> <span>${currentLang === 'en' ? 'Updating...' : 'Загрузка...'}</span>`;

      await refreshUserProfileCache(nick);

      refreshBtn.disabled = false;
      refreshBtn.innerHTML = `<span>✅</span> <span>${currentLang === 'en' ? 'Updated!' : 'Обновлено!'}</span>`;
      setTimeout(() => {
        refreshBtn.innerHTML = `<span>🔄</span> <span>${currentLang === 'en' ? 'Refresh Profile Data' : 'Обновить данные'}</span>`;
      }, 2000);
      populateSettingsModal();
    };
  }

  // Modal form submit
  const form = document.getElementById('modal-settings-form');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const inputNick = document.getElementById('modal-mynick-input');
      const nick = inputNick ? inputNick.value.trim() : '';
      const selectedLangEl = document.querySelector('input[name="modal-settings-lang"]:checked');
      const selectedLang = selectedLangEl ? selectedLangEl.value : currentLang;

      const prevNick = getSettings().myNickname;
      saveSettings({
        myNickname: nick,
        lang: selectedLang
      });

      if (nick && nick !== prevNick) {
        await refreshUserProfileCache(nick);
      }

      closeSettingsModal();
      renderHeader();

      if (selectedLang !== currentLang) {
        setLang(selectedLang);
      } else {
        window.location.reload();
      }
    };
  }
}

/* ── Autocomplete Components ─────────────────────────────────────────── */

window.setupMapAutocomplete = function (inputId, onSelect) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (onSelect) input._onSelect = onSelect;
  if (input.dataset.mapAcInit === 'true') return;
  input.dataset.mapAcInit = 'true';

  const wrap = input.parentElement;
  if (!wrap) return;
  wrap.style.position = 'relative';

  let dropdown = wrap.querySelector('.map-autocomplete-dropdown') || wrap.querySelector('#map-autocomplete');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.id = 'map-autocomplete';
    dropdown.className = 'map-autocomplete-dropdown player-autocomplete';
    dropdown.style.display = 'none';
    wrap.appendChild(dropdown);
  }

  let activeIdx = -1;
  let currentItems = [];
  let currentQuery = '';

  function highlightMatch(text, query) {
    if (!text || !query) return escapeHtml(text || '');
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escapeHtml(text);
    return escapeHtml(text.slice(0, idx))
      + '<strong class="ac-hl" style="color:var(--accent,#ffa500);font-weight:bold">' + escapeHtml(text.slice(idx, idx + query.length)) + '</strong>'
      + escapeHtml(text.slice(idx + query.length));
  }

  function renderDropdown() {
    if (currentItems.length === 0) {
      dropdown.style.display = 'none';
      return;
    }

    dropdown.innerHTML = currentItems.map((m, i) => {
      const mapName = m.map || m.name || '';
      const mapper = m.mapper || '';
      const server = m.server || m.type || 'DDNet';
      const points = (m.points !== undefined && m.points !== null) ? m.points : (m.pts || 0);

      return `
        <a class="ac-item ${i === activeIdx ? 'is-active' : ''}" data-idx="${i}" href="/map/?name=${encodeURIComponent(mapName)}">
          <div class="ac-map-info">
            <span class="ac-map-name">${highlightMatch(mapName, currentQuery)}</span>
            ${mapper ? `<span class="ac-map-mapper">by ${highlightMatch(mapper, currentQuery)}</span>` : ''}
          </div>
          <div class="ac-map-meta">
            <span class="ac-map-server">${escapeHtml(server)}</span>
            <span class="ac-map-points">+${points} PTS</span>
          </div>
        </a>
      `;
    }).join('');

    dropdown.style.display = 'block';

    dropdown.querySelectorAll('.ac-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const idx = Number(el.dataset.idx);
        selectItem(idx);
      });
      el.addEventListener('mouseenter', () => setActive(+el.dataset.idx));
    });
  }

  function setActive(idx) {
    activeIdx = idx;
    dropdown.querySelectorAll('.ac-item').forEach((el, i) => {
      const isAct = i === idx;
      el.classList.toggle('is-active', isAct);
    });

    if (idx >= 0) {
      const activeEl = dropdown.querySelectorAll('.ac-item')[idx];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  function selectItem(idx) {
    const m = currentItems[idx];
    if (!m) return;
    const mapName = m.map || m.name || '';
    input.value = mapName;
    dropdown.style.display = 'none';
    activeIdx = -1;

    const callback = input._onSelect || onSelect;
    if (typeof callback === 'function') {
      callback(mapName, m);
    } else {
      window.location.href = `/map/?name=${encodeURIComponent(mapName)}`;
    }
  }

  function triggerAutocomplete() {
    const q = input.value.trim();
    currentQuery = q;
    if (q.length < 1) {
      dropdown.style.display = 'none';
      activeIdx = -1;
      return;
    }

    if (typeof findMapMatches === 'function') {
      currentItems = findMapMatches(q, 10);
      renderDropdown();
    }
  }

  input.addEventListener('input', triggerAutocomplete);
  input.addEventListener('focus', triggerAutocomplete);

  input.addEventListener('keydown', (e) => {
    if (dropdown.style.display === 'none' || currentItems.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = activeIdx + 1 >= currentItems.length ? 0 : activeIdx + 1;
      setActive(nextIdx);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = activeIdx - 1 < 0 ? currentItems.length - 1 : activeIdx - 1;
      setActive(prevIdx);
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0) {
        e.preventDefault();
        selectItem(activeIdx);
      }
    } else if (e.key === 'Escape') {
      dropdown.style.display = 'none';
      activeIdx = -1;
    }
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) {
      dropdown.style.display = 'none';
      activeIdx = -1;
    }
  });
};

window.setupPlayerAutocomplete = function (inputId, onSelect) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (onSelect) input._onSelect = onSelect;
  if (input.dataset.playerAcInit === 'true') return;
  input.dataset.playerAcInit = 'true';

  const wrap = input.parentElement;
  if (!wrap) return;
  wrap.style.position = 'relative';

  // Ensure dropdown container with class 'player-autocomplete'
  let dropdown = wrap.querySelector('.player-autocomplete');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.className = 'player-autocomplete';
    dropdown.style.display = 'none';
    wrap.appendChild(dropdown);
  }

  let activeIdx = -1;
  let currentItems = [];
  let currentQuery = '';

  function highlightMatch(text, query) {
    if (!text || !query) return escapeHtml(text || '');
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escapeHtml(text);
    return escapeHtml(text.slice(0, idx))
      + '<strong class="ac-hl" style="color:var(--accent,#ffa500);font-weight:bold">' + escapeHtml(text.slice(idx, idx + query.length)) + '</strong>'
      + escapeHtml(text.slice(idx + query.length));
  }

  function renderDropdown() {
    if (currentItems.length === 0) {
      dropdown.style.display = 'none';
      return;
    }

    dropdown.innerHTML = currentItems.map((name, i) => `
      <a class="ac-player-item ${i === activeIdx ? 'is-active' : ''}" data-idx="${i}" href="/player/?name=${encodeURIComponent(name)}">
        <span class="ac-player-name">${highlightMatch(name, currentQuery)}</span>
      </a>
    `).join('');

    dropdown.style.display = 'block';

    dropdown.querySelectorAll('.ac-player-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const idx = Number(el.dataset.idx);
        selectItem(idx);
      });
      el.addEventListener('mouseenter', () => setActive(+el.dataset.idx));
    });
  }

  function setActive(idx) {
    activeIdx = idx;
    dropdown.querySelectorAll('.ac-player-item').forEach((el, i) => {
      const isAct = i === idx;
      el.classList.toggle('is-active', isAct);
    });

    if (idx >= 0) {
      const activeEl = dropdown.querySelectorAll('.ac-player-item')[idx];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  function selectItem(idx) {
    const pName = currentItems[idx];
    if (!pName) return;
    input.value = pName;
    dropdown.style.display = 'none';
    activeIdx = -1;
    const callback = input._onSelect || onSelect;
    if (typeof callback === 'function') {
      callback(pName);
    } else {
      window.location.href = `/player/?name=${encodeURIComponent(pName)}`;
    }
  }

  function triggerAutocomplete() {
    const sErr = document.getElementById('search-error');
    if (sErr) sErr.classList.add('hidden');

    const q = input.value.trim();
    currentQuery = q;
    if (q.length < 1) {
      currentItems = [];
      dropdown.style.display = 'none';
      activeIdx = -1;
      return;
    }

    const playersList = window.uniquePlayersData || window.uniquePlayers || (window.playersData ? window.playersData.map(p => p.name) : []);
    if (!playersList || !playersList.length) {
      currentItems = [];
      dropdown.style.display = 'none';
      return;
    }

    const lower = q.toLowerCase();
    const cleanQ = lower.replace(/^[^a-zA-Z0-9а-яА-Я0-9]+/, '');
    const starts = [];
    const contains = [];

    for (const pName of playersList) {
      if (!pName) continue;
      if (window.isBlacklisted && window.isBlacklisted(pName)) continue;

      const lowerName = String(pName).toLowerCase();
      const cleanName = lowerName.replace(/^[^a-zA-Z0-9а-яА-Я0-9]+/, '');

      if (lowerName.startsWith(lower) || (cleanQ && cleanName.startsWith(cleanQ))) {
        starts.push(pName);
      } else if (lowerName.includes(lower) || (cleanQ && cleanName.includes(cleanQ))) {
        contains.push(pName);
      }

      if (starts.length + contains.length >= 40) break;
    }

    const combined = [...starts, ...contains];
    const uniqueList = [];
    const seen = new Set();
    for (const p of combined) {
      const k = p.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        uniqueList.push(p);
      }
    }

    currentItems = uniqueList.slice(0, 10);
    activeIdx = -1;
    renderDropdown();
  }

  input.addEventListener('input', triggerAutocomplete);
  input.addEventListener('focus', triggerAutocomplete);

  input.addEventListener('keydown', (e) => {
    if (dropdown.style.display === 'none' || currentItems.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = activeIdx + 1 >= currentItems.length ? 0 : activeIdx + 1;
      setActive(nextIdx);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = activeIdx - 1 < 0 ? currentItems.length - 1 : activeIdx - 1;
      setActive(prevIdx);
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && currentItems[activeIdx]) {
        e.preventDefault();
        selectItem(activeIdx);
      }
    } else if (e.key === 'Escape') {
      dropdown.style.display = 'none';
      activeIdx = -1;
    }
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) {
      dropdown.style.display = 'none';
      activeIdx = -1;
    }
  });
};

/**
 * @param {string} [activePage='home']
 */
function renderHeader(activePage = 'home') {
  const isEn = currentLang === 'en';
  const dict = getDict();
  const h = dict.header || {};
  const playerPlaceholder = h.playerPlaceholder || (isEn ? 'Find player...' : 'Найти игрока...');
  const playerTitle = h.playerTitle || (isEn ? 'PLAYER SEARCH / Find player' : 'ПОИСК ИГРОКА / Найти игрока');
  const mapPlaceholder = h.mapPlaceholder || (isEn ? 'Find map...' : 'Найти карту...');
  const mapTitle = h.mapTitle || (isEn ? 'MAP SEARCH / Open records, times and map ranking' : 'ПОИСК КАРТЫ / Откройте рекорды, времена и рейтинг карты');

  const settings = getSettings();
  const myNick = settings.myNickname ? settings.myNickname.trim() : '';

  const myProfileHtml = myNick ? `
    <span class="site-nav-divider">/</span>
    <a href="/player?name=${encodeURIComponent(myNick)}" class="site-nav-link site-profile-link inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 font-bold transition-all text-xs" title="${h.myProfile || (isEn ? 'My Profile' : 'Мой профиль')}: ${escapeHtml(myNick)}">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-amber-400 shrink-0"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
      <span class="truncate max-w-[100px]">${escapeHtml(myNick)}</span>
    </a>
  ` : '';

  const headerHtml = `
    <header class="site-header">
      <div class="site-header-inner">

        <!-- Logo & Navigation -->
        <div class="site-nav flex items-center gap-2">
          <a href="/" class="site-nav-link${activePage === 'home' ? ' is-active' : ''}">
            <span>${h.home || (isEn ? 'Home' : 'Главная')}</span>
          </a>
          <span class="site-nav-divider">/</span>
          <a href="/maps" class="site-nav-link${activePage === 'maps' ? ' is-active' : ''}">
            <span>${h.mapsExplorer || (isEn ? 'Maps Explorer' : 'База карт')}</span>
          </a>
          ${myProfileHtml}
          <span class="site-nav-divider">/</span>
          <a href="https://discord.gg/BWmT3q96FP" class="site-discord-link" aria-label="teeproject Discord" target="_blank" rel="noopener noreferrer">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 127.14 96.36" fill="#5865F2"><path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.68 1.76 1.36 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.91-72.14zM42.45 65.69c-6.58 0-12-6.04-12-13.44s5.3-13.44 12-13.44c6.74 0 12.07 6.09 12 13.44 0 7.4-5.26 13.44-12 13.44zm42.24 0c-6.58 0-12-6.04-12-13.44s5.3-13.44 12-13.44c6.74 0 12.07 6.09 12 13.44 0 7.4-5.26 13.44-12 13.44z"/></svg>
            <span>${h.discord || 'teeproject discord'}</span>
          </a>
        </div>

        <!-- Header Searches: Player & Map Search -->
        <div class="site-header-searches">
          <!-- Player Search -->
          <form id="header-player-search-form" class="header-search-form">
            <div class="header-search-wrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <input type="text" id="header-player-search-input" placeholder="${playerPlaceholder}" title="${playerTitle}" autocomplete="off">
            </div>
          </form>

          <!-- Map Search -->
          <form id="header-map-search-form" class="header-search-form">
            <div class="header-search-wrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
              </svg>
              <input type="text" id="header-map-search-input" placeholder="${mapPlaceholder}" title="${mapTitle}" autocomplete="off">
            </div>
          </form>
        </div>

        <!-- Header Tools & Settings -->
        <div class="site-header-tools flex items-center gap-2">
          <a href="/settings" class="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-slate-300 hover:text-amber-400 transition-all flex items-center gap-1.5 text-xs font-bold ${activePage === 'settings' ? 'text-amber-400 border-amber-500/50 bg-amber-500/10' : ''}" title="${h.settings || (isEn ? 'Settings' : 'Настройки')}" aria-label="${h.settings || 'Settings'}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <span class="hidden md:inline">${h.settings || (isEn ? 'Settings' : 'Настройки')}</span>
          </a>
        </div>
      </div>
    </header>
  `;
  const headerContainer = document.getElementById('header-container');
  if (headerContainer) {
    headerContainer.innerHTML = headerHtml;
  }

  setTimeout(() => {
    // ── Player Search in Header ─────────────────────────────────────
    const playerSearchForm = document.getElementById('header-player-search-form');
    if (playerSearchForm) {
      playerSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('header-player-search-input');
        if (input && input.value.trim()) {
          window.location.href = `/player?name=${encodeURIComponent(input.value.trim())}`;
        }
      });
    }

    if (window.setupPlayerAutocomplete) {
      window.setupPlayerAutocomplete('header-player-search-input', (pName) => {
        window.location.href = `/player?name=${encodeURIComponent(pName)}`;
      });
    }

    // ── Map Search in Header ────────────────────────────────────────
    const mapSearchForm = document.getElementById('header-map-search-form');
    if (mapSearchForm) {
      mapSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('header-map-search-input');
        if (input && input.value.trim()) {
          const bestMatch = findMapMatches(input.value.trim(), 1)[0];
          const mapName = bestMatch ? (bestMatch.map || bestMatch.name) : input.value.trim();
          window.location.href = `/map?name=${encodeURIComponent(mapName)}`;
        }
      });
    }

    if (window.setupMapAutocomplete) {
      window.setupMapAutocomplete('header-map-search-input');
    }
  }, 50);
}





const icons = {
  search: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>',
  loader: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>',
  trophy: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffa500" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-12 h-12"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>',
  arrowRight: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>',
  arrowUpDown: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3"><path d="m21 16-4 4-4-4"></path><path d="M17 20V4"></path><path d="m3 8 4-4 4 4"></path><path d="M7 4v16"></path></svg>'
};

initLang();

function finishInitialLoading() {
  const loader = document.getElementById('site-loader');
  if (!loader || document.body.classList.contains('site-loaded')) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.add('site-loaded');
      document.body.classList.remove('site-loading');
      loader.setAttribute('aria-hidden', 'true');
      window.setTimeout(() => loader.remove(), 300);
    });
  });
}
window.finishInitialLoading = finishInitialLoading;

// Third-party ads and embeds must not keep the application behind the splash.
if (document.readyState !== 'loading') {
  finishInitialLoading();
} else {
  document.addEventListener('DOMContentLoaded', finishInitialLoading, { once: true });
  window.setTimeout(finishInitialLoading, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof applyTranslations === 'function') {
    applyTranslations();
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const panels = document.querySelectorAll('.glass-panel:not(.leaderboard-panel)');

  if (hasFinePointer && !reducedMotion) {
    panels.forEach(panel => {
      let frame = 0;
      panel.addEventListener('pointermove', event => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          const rect = panel.getBoundingClientRect();
          panel.style.setProperty('--pointer-x', `${event.clientX - rect.left}px`);
          panel.style.setProperty('--pointer-y', `${event.clientY - rect.top}px`);
          frame = 0;
        });
      }, { passive: true });
    });
  }

  if (reducedMotion) return;

  const targets = document.querySelectorAll('.inner-page-shell > *, .page-about .glass-panel, .compare-scenario');
  targets.forEach((target, index) => {
    target.classList.add('ui-reveal');
    target.style.setProperty('--reveal-delay', `${Math.min(index, 7) * 55}ms`);
  });

  requestAnimationFrame(() => document.body.classList.add('ui-ready'));
});



/**
 * Renders Breadcrumbs navigation bar with Schema.org JSON-LD microdata
 * @param {Array<{label: string, url?: string}>} items
 * @param {string} containerId
 */
function renderBreadcrumbs(items, containerId = 'breadcrumbs-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const itemListElement = items.map((item, index) => {
    const position = index + 1;
    return {
      "@type": "ListItem",
      "position": position,
      "name": item.label,
      "item": item.url ? (item.url.startsWith('http') ? item.url : `https://ddnetmm.ru${item.url.startsWith('/') ? item.url : '/' + item.url}`) : undefined
    };
  });

  const schemaJson = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": itemListElement
  };

  let html = `<nav aria-label="Breadcrumb" class="mb-4 text-xs sm:text-sm text-slate-400">`;
  html += `<ol class="flex items-center flex-wrap gap-1.5 list-none p-0 m-0 font-medium">`;

  items.forEach((item, index) => {
    const isLast = index === items.length - 1;
    html += `<li class="flex items-center gap-1.5">`;
    if (index > 0) {
      html += `<span class="text-slate-600 select-none">/</span>`;
    }
    if (isLast || !item.url) {
      html += `<span class="text-amber-400 font-semibold truncate max-w-[200px] sm:max-w-none" aria-current="page">${escapeHtml(item.label)}</span>`;
    } else {
      html += `<a href="${escapeHtml(item.url)}" class="hover:text-white transition-colors">${escapeHtml(item.label)}</a>`;
    }
    html += `</li>`;
  });

  html += `</ol></nav>`;
  html += `<script type="application/ld+json">${JSON.stringify(schemaJson)}</script>`;

  container.innerHTML = html;
}


