/* page-settings.js — Logic for settings/index.html */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    renderHeader('settings');

    const dict = getDict();
    document.documentElement.lang = currentLang;

    if (typeof renderBreadcrumbs === 'function') {
      const homeLabel = dict.breadcrumbs ? dict.breadcrumbs.home : 'Home';
      const settingsLabel = dict.breadcrumbs ? dict.breadcrumbs.settings : 'Settings';
      renderBreadcrumbs([
        { label: homeLabel, url: '/' },
        { label: settingsLabel }
      ]);
    }

    const t = dict.settings || {};

    const setTxt = (id, text) => {
      const el = document.getElementById(id);
      if (el && text) el.textContent = text;
    };

    setTxt('settings-title', t.title);
    setTxt('settings-subtitle', t.subtitle);
    setTxt('lbl-settings-mynick', t.myNickLabel);
    setTxt('desc-settings-mynick', t.myNickHelp);
    setTxt('lbl-settings-lang', t.langLabel);
    setTxt('lbl-settings-favs', t.favoritesLabel);
    setTxt('settings-submit-btn', t.saveBtn);

    const inputMyNick = document.getElementById('settings-mynick-input');
    if (inputMyNick && t.myNickPlaceholder) {
      inputMyNick.placeholder = t.myNickPlaceholder;
    }

    const inputFav = document.getElementById('settings-fav-input');
    if (inputFav && t.favoritesPlaceholder) {
      inputFav.placeholder = t.favoritesPlaceholder;
    }

    // Autocomplete for My Nickname & Fav Input
    if (window.setupPlayerAutocomplete) {
      window.setupPlayerAutocomplete('settings-mynick-input', (val) => {
        if (inputMyNick) inputMyNick.value = val;
      });
      window.setupPlayerAutocomplete('settings-fav-input', (val) => {
        if (inputFav) inputFav.value = val;
      });
    }

    // Load current settings
    const currentSettings = getSettings();
    if (inputMyNick) inputMyNick.value = currentSettings.myNickname || '';

    // Language radios
    const radios = document.querySelectorAll('input[name="settings-lang"]');
    radios.forEach(radio => {
      if (radio.value === currentLang) {
        radio.checked = true;
      }
    });

    // Favorites list manager
    let favoritesList = [...currentSettings.favorites];

    const renderFavoritesChips = () => {
      const container = document.getElementById('favorites-chips-container');
      if (!container) return;

      if (favoritesList.length === 0) {
        container.innerHTML = `<span class="text-xs text-slate-500 font-medium">${t.favoritesEmpty || 'No favorites yet'}</span>`;
        return;
      }

      container.innerHTML = favoritesList.map((pName, idx) => `
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-slate-200 hover:border-amber-500/50 transition-all">
          <a href="/player?name=${encodeURIComponent(pName)}" class="hover:text-amber-400 transition-colors">${escapeHtml(pName)}</a>
          <button type="button" data-fav-idx="${idx}" class="remove-fav-btn text-slate-500 hover:text-red-400 transition-colors font-bold px-1">&times;</button>
        </span>
      `).join('');

      container.querySelectorAll('.remove-fav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.getAttribute('data-fav-idx'), 10);
          if (!isNaN(idx)) {
            favoritesList.splice(idx, 1);
            renderFavoritesChips();
          }
        });
      });
    };

    renderFavoritesChips();

    // Add Fav button
    const addFavBtn = document.getElementById('settings-fav-add-btn');
    const addFav = () => {
      if (!inputFav) return;
      const val = inputFav.value.trim();
      if (val && !favoritesList.includes(val)) {
        favoritesList.push(val);
        inputFav.value = '';
        renderFavoritesChips();
      }
    };

    if (addFavBtn) addFavBtn.addEventListener('click', addFav);
    if (inputFav) {
      inputFav.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addFav();
        }
      });
    }

    // Submit settings form
    const form = document.getElementById('settings-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const myNick = inputMyNick ? inputMyNick.value.trim() : '';
        const selectedLangEl = document.querySelector('input[name="settings-lang"]:checked');
        const selectedLang = selectedLangEl ? selectedLangEl.value : currentLang;

        saveSettings({
          myNickname: myNick,
          lang: selectedLang,
          favorites: favoritesList
        });

        const toast = document.getElementById('settings-toast');
        if (toast) {
          toast.textContent = t.savedNotice || 'Settings saved successfully!';
          toast.classList.remove('hidden');
          setTimeout(() => {
            toast.classList.add('hidden');
          }, 3000);
        }

        renderHeader('settings');

        if (selectedLang !== currentLang) {
          setLang(selectedLang);
        }
      });
    }
  });
})();
