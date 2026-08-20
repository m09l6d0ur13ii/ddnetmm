/* page-pvp.js — Logic for pvp/index.html (Player vs Player Comparison) */

(function () {
  'use strict';

  const formatTime = (t) => {
    if (t === null || t === undefined || t <= 0) return '-';
    const m = Math.floor(t / 60);
    const s = (t % 60).toFixed(2);
    return `${m}:${s.padStart(5, '0')}`;
  };

  const getServerBadgeClass = (server) => {
    if (!server) return 'server-default';
    const s = server.toLowerCase();
    if (s.includes('novice'))    return 'server-novice';
    if (s.includes('moderate'))  return 'server-moderate';
    if (s.includes('brutal'))    return 'server-brutal';
    if (s.includes('insane'))    return 'server-insane';
    if (s.includes('solo'))      return 'server-solo';
    if (s.includes('dummy'))     return 'server-dummy';
    if (s.includes('oldschool')) return 'server-oldschool';
    return 'server-ddmax';
  };

  const skinCanvasCache = new Map();
  let activePvpRenderId = 0;

  async function resolveSkinUrl(skinName) {
    let clean = (skinName || 'default').replace(/\.png$/i, '');
    if (!clean || clean === 'null' || clean === 'undefined') clean = 'default';

    const localUrl = `../data/skins/${encodeURIComponent(clean)}.png`;
    const remoteUrl = `https://skins.ddstats.tw/${encodeURIComponent(clean)}.png`;
    const defaultUrl = `https://skins.ddstats.tw/default.png`;

    const checkImg = (url) => new Promise(res => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => res(true);
      img.onerror = () => res(false);
      img.src = url;
    });

    if (await checkImg(localUrl)) return localUrl;
    if (await checkImg(remoteUrl)) return remoteUrl;
    return defaultUrl;
  }

  const renderPvpTee = async (containerId, player, reqId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const skin = player.skinName || 'default';
    const body = player.skinColorBody !== null && player.skinColorBody !== undefined ? Number(player.skinColorBody) : null;
    const feet = player.skinColorFeet !== null && player.skinColorFeet !== undefined ? Number(player.skinColorFeet) : null;
    const cacheKey = `${skin}_${body}_${feet}`;

    if (skinCanvasCache.has(cacheKey)) {
      if (reqId !== undefined && reqId !== activePvpRenderId) return;
      const srcCanvas = skinCanvasCache.get(cacheKey);
      const c = document.createElement('canvas');
      c.width = srcCanvas.width;
      c.height = srcCanvas.height;
      c.className = 'w-24 h-24 mx-auto object-contain filter drop-shadow-[0_6px_16px_rgba(0,0,0,0.5)]';
      const ctx = c.getContext('2d');
      ctx.drawImage(srcCanvas, 0, 0);
      container.innerHTML = '';
      container.appendChild(c);
      return;
    }

    try {
      const skinUrl = await resolveSkinUrl(skin);
      if (reqId !== undefined && reqId !== activePvpRenderId) return;

      if (window.TeeSkinRenderer && window.TeeSkinRenderer.renderer && window.TeeSkinRenderer.renderer.TeeRenderer) {
        const dummy = document.createElement('div');
        const config = {
          skinUrl,
          followMouse: false,
          eyes: 'normal',
          direction: 'right',
        };
        if (body !== null) {
          config.colorBody = body;
          config.useCustomColor = true;
        }
        if (feet !== null) {
          config.colorFeet = feet;
          config.useCustomColor = true;
        }

        const teeRenderer = new window.TeeSkinRenderer.renderer.TeeRenderer(dummy, config);
        await teeRenderer.loadSkin(skinUrl, true);
        if (reqId !== undefined && reqId !== activePvpRenderId) return;

        const masterCanvas = document.createElement('canvas');
        masterCanvas.width = 96;
        masterCanvas.height = 96;
        teeRenderer.renderToCanvas(masterCanvas, { size: 96, direction: 'right', eyes: 'normal' });
        skinCanvasCache.set(cacheKey, masterCanvas);

        const c = document.createElement('canvas');
        c.width = 96;
        c.height = 96;
        c.className = 'w-24 h-24 mx-auto object-contain filter drop-shadow-[0_6px_16px_rgba(0,0,0,0.5)] animate-fade-in';
        const ctx = c.getContext('2d');
        ctx.drawImage(masterCanvas, 0, 0);
        container.innerHTML = '';
        container.appendChild(c);
      } else {
        const img = document.createElement('img');
        img.src = skinUrl;
        img.className = 'w-20 h-20 mx-auto object-contain';
        container.innerHTML = '';
        container.appendChild(img);
      }
    } catch (e) {
      console.warn('PVP skin render error:', e);
      if (reqId !== undefined && reqId !== activePvpRenderId) return;
      const img = document.createElement('img');
      img.src = 'https://skins.ddstats.tw/default.png';
      img.className = 'w-20 h-20 mx-auto object-contain';
      container.innerHTML = '';
      container.appendChild(img);
    }
  };

  const FEATURED_DUELS = [
    { p1: 'Mokou', p2: 'Cor', tag: 'Top 1 vs Top 2' },
    { p1: 'Cireme', p2: 'Raryx', tag: 'Top 3 vs Top 4' },
    { p1: 'Nocen', p2: 'Kintaro*', tag: 'Pro Duel' },
    { p1: 'stone', p2: 'namu', tag: 'Speedrun Rivalry' },
    { p1: 'Ama', p2: 'Welf', tag: 'Classic Matchup' },
    { p1: 'hiiragi', p2: 'jim', tag: 'Extreme Battle' }
  ];

  function renderFeaturedDuels() {
    const grid = document.getElementById('featured-duels-grid');
    if (!grid) return;
    grid.innerHTML = '';

    FEATURED_DUELS.forEach(duel => {
      const card = document.createElement('div');
      card.className = 'pvp-featured-card group';
      card.innerHTML = `
        <div class="flex items-center gap-2 font-bold text-sm">
          <span class="text-cyan-400 group-hover:text-cyan-300 transition-colors">${escapeHtml(duel.p1)}</span>
          <span class="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono font-black">VS</span>
          <span class="text-rose-400 group-hover:text-rose-300 transition-colors">${escapeHtml(duel.p2)}</span>
        </div>
        <span class="text-[0.65rem] font-mono text-slate-500 uppercase">${escapeHtml(duel.tag)}</span>
      `;
      card.onclick = () => {
        const i1 = document.getElementById('pvp-player1-input');
        const i2 = document.getElementById('pvp-player2-input');
        if (i1) i1.value = duel.p1;
        if (i2) i2.value = duel.p2;
        window.history.pushState({}, '', `/pvp?p1=${encodeURIComponent(duel.p1)}&p2=${encodeURIComponent(duel.p2)}`);
        runComparison(duel.p1, duel.p2);
      };
      grid.appendChild(card);
    });
  }

  function initPvpQuickControls() {
    const settings = typeof getSettings === 'function' ? getSettings() : {};
    const myNick = (settings.myNickname || '').trim();
    const favs = Array.isArray(settings.favorites) ? settings.favorites : [];

    const renderQuickPills = (containerId, targetInputId) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '';

      const items = [];
      if (myNick) {
        items.push({ name: myNick, isMe: true });
      }
      favs.forEach(f => {
        if (f && f !== myNick && !items.some(it => it.name === f)) {
          items.push({ name: f, isMe: false });
        }
      });

      if (items.length === 0) {
        if (!myNick) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'text-[0.7rem] font-bold text-slate-500 hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1';
          btn.innerHTML = '<span>⚡</span> <span>' + (getDict().pvp?.fillMe || 'Я') + '</span>';
          btn.onclick = () => {
            if (typeof openSettingsModal === 'function') openSettingsModal();
          };
          container.appendChild(btn);
        }
        return;
      }

      // Render up to 4 quick select pills
      items.slice(0, 4).forEach(item => {
        const btn = document.createElement('button');
        btn.type = 'button';
        if (item.isMe) {
          btn.className = 'text-[0.68rem] px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer truncate max-w-[110px] shadow-[0_0_8px_rgba(245,158,11,0.2)] flex items-center gap-1';
          btn.title = `Выбрать свой ник (${item.name})`;
          btn.innerHTML = `<span>⚡</span> <span>${escapeHtml(item.name)}</span>`;
        } else {
          btn.className = 'text-[0.68rem] px-2 py-0.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/10 hover:border-white/25 transition-all cursor-pointer truncate max-w-[95px] flex items-center gap-1';
          btn.title = `Выбрать ${item.name}`;
          btn.innerHTML = `<span>⭐</span> <span>${escapeHtml(item.name)}</span>`;
        }

        btn.onclick = () => {
          const input = document.getElementById(targetInputId);
          if (input) {
            input.value = item.name;
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        };

        container.appendChild(btn);
      });
    };

    renderQuickPills('pvp-p1-quick-select', 'pvp-player1-input');
    renderQuickPills('pvp-p2-quick-select', 'pvp-player2-input');
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof renderHeader === 'function') {
      renderHeader('pvp');
    }

    if (window.setupPlayerAutocomplete) {
      window.setupPlayerAutocomplete('pvp-player1-input', (val) => {
        const input1 = document.getElementById('pvp-player1-input');
        if (input1) input1.value = val;
      });
      window.setupPlayerAutocomplete('pvp-player2-input', (val) => {
        const input2 = document.getElementById('pvp-player2-input');
        if (input2) input2.value = val;
      });
    }

    applyPvpTranslations();
    renderFeaturedDuels();
    initPvpQuickControls();

    window.addEventListener('storage', initPvpQuickControls);
    window.addEventListener('focus', initPvpQuickControls);

    if (typeof renderBreadcrumbs === 'function') {
      const dict = getDict();
      const homeLabel = dict.breadcrumbs ? dict.breadcrumbs.home : 'Главная';
      const pvpLabel = dict.breadcrumbs ? dict.breadcrumbs.pvp : 'PvP Дуэль';
      renderBreadcrumbs([
        { label: homeLabel, url: '/' },
        { label: pvpLabel }
      ]);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const p1Url = urlParams.get('p1') || urlParams.get('player1');
    const p2Url = urlParams.get('p2') || urlParams.get('player2');

    if (p1Url && document.getElementById('pvp-player1-input')) {
      document.getElementById('pvp-player1-input').value = p1Url;
    }
    if (p2Url && document.getElementById('pvp-player2-input')) {
      document.getElementById('pvp-player2-input').value = p2Url;
    }

    if (p1Url && p2Url) {
      runComparison(p1Url, p2Url);
    }

    const pvpForm = document.getElementById('pvp-form');
    if (pvpForm) {
      pvpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const p1 = (document.getElementById('pvp-player1-input')?.value || '').trim();
        const p2 = (document.getElementById('pvp-player2-input')?.value || '').trim();

        if (!p1 || !p2) return;
        if (p1.toLowerCase() === p2.toLowerCase()) {
          showError(getDict().pvp ? getDict().pvp.errorDiff : (currentLang === 'en' ? 'Select two different players' : 'Выберите двух разных игроков'));
          return;
        }

        window.history.pushState({}, '', `/pvp?p1=${encodeURIComponent(p1)}&p2=${encodeURIComponent(p2)}`);
        runComparison(p1, p2);
      });
    }
  });

  function applyPvpTranslations() {
    const dict = getDict();
    const pvp = dict.pvp || {};

    const setTxt = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setTxt('pvp-back', pvp.back || (currentLang === 'en' ? 'Back' : 'На главную'));
    setTxt('pvp-title-text', (pvp.title || 'Player vs Player').replace(/\s*⚔️?\s*/g, ' ').trim());
    setTxt('pvp-subtitle', pvp.subtitle || (currentLang === 'en' ? 'Enter nicknames of two players to compare their times on common maps.' : 'Введите никнеймы двух игроков для сравнения результатов на общих картах.'));
    setTxt('lbl-pvp-p1', pvp.player1 || (currentLang === 'en' ? 'Player 1' : 'Игрок 1'));
    setTxt('lbl-pvp-p2', pvp.player2 || (currentLang === 'en' ? 'Player 2' : 'Игрок 2'));
    setTxt('pvp-submit-btn', pvp.compareBtn || (currentLang === 'en' ? 'Compare ⚔️' : 'Сравнить ⚔️'));
    setTxt('pvp-loading-text', pvp.loading || (currentLang === 'en' ? 'Loading duel data...' : 'Загрузка и расчёт данных дуэли...'));

    setTxt('p1-wins-label', pvp.wins || (currentLang === 'en' ? 'Map Wins' : 'Побед на картах'));
    setTxt('p2-wins-label', pvp.wins || (currentLang === 'en' ? 'Map Wins' : 'Побед на картах'));

    setTxt('h2h-score-label', pvp.h2hScore || (currentLang === 'en' ? 'DUEL SCORE' : 'СЧЁТ ДУЭЛИ'));
    setTxt('common-count-label', pvp.commonMaps || (currentLang === 'en' ? 'Common Maps' : 'Общих карт'));

    const searchInput = document.getElementById('pvp-map-search');
    if (searchInput) searchInput.placeholder = pvp.searchPlaceholder || (currentLang === 'en' ? 'Search map...' : 'Поиск карты...');

    setTxt('th-map', pvp.map || (currentLang === 'en' ? 'Map' : 'Карта'));
    setTxt('th-server', pvp.server || (currentLang === 'en' ? 'Server' : 'Сервер'));
    setTxt('th-diff', pvp.winner || (currentLang === 'en' ? 'Winner & Difference' : 'Победитель & Разница'));
  }

  function showError(msg) {
    const errBox = document.getElementById('pvp-error');
    if (errBox) {
      errBox.textContent = msg;
      errBox.classList.remove('hidden');
    }
    const loadingEl = document.getElementById('pvp-loading');
    if (loadingEl) loadingEl.classList.add('hidden');
    const resultsEl = document.getElementById('pvp-results');
    if (resultsEl) resultsEl.classList.add('hidden');
    const featuredEl = document.getElementById('pvp-featured-matchups');
    if (featuredEl) featuredEl.classList.remove('hidden');
  }

  async function runComparison(name1, name2) {
    const pvp = getDict().pvp || {};
    const errBox = document.getElementById('pvp-error');
    if (errBox) errBox.classList.add('hidden');
    const resultsEl = document.getElementById('pvp-results');
    if (resultsEl) resultsEl.classList.add('hidden');
    const loadingEl = document.getElementById('pvp-loading');
    if (loadingEl) loadingEl.classList.remove('hidden');
    const featuredEl = document.getElementById('pvp-featured-matchups');
    if (featuredEl) featuredEl.classList.add('hidden');

    activePvpRenderId++;
    const reqId = activePvpRenderId;

    try {
      const [data1, data2] = await Promise.all([
        window.api.fetchPlayerPts(name1),
        window.api.fetchPlayerPts(name2)
      ]);

      if (reqId !== activePvpRenderId) return;

      if (loadingEl) loadingEl.classList.add('hidden');
      renderPvpResults(data1, data2, reqId);
    } catch (err) {
      if (reqId !== activePvpRenderId) return;
      console.error(err);
      showError(err.isBlacklisted
        ? (pvp.errorBlacklist || (currentLang === 'en' ? 'One of the players is blacklisted (TAS / Cheating)' : 'Один из игроков находится в чёрном списке (TAS / Читы)'))
        : (pvp.errorFetch || (currentLang === 'en' ? 'Could not load player data from DDStats' : 'Не удалось загрузить данные игроков'))
      );
    }
  }

  function renderPvpResults(d1, d2, reqId) {
    const dict = getDict();
    const pvp = dict.pvp || {};

    const mapMap1 = new Map();
    (d1.finishDetails || []).forEach(m => mapMap1.set(m.mapName, m));

    const commonMaps = [];
    let p1Wins = 0;
    let p2Wins = 0;

    const categoryStats = {};

    (d2.finishDetails || []).forEach(m2 => {
      if (mapMap1.has(m2.mapName)) {
        const m1 = mapMap1.get(m2.mapName);
        const timeDiff = m1.time - m2.time;
        const winner = m1.time < m2.time ? 1 : (m2.time < m1.time ? 2 : 0);

        if (winner === 1) p1Wins++;
        if (winner === 2) p2Wins++;

        const srv = m1.server || 'Unknown';
        if (!categoryStats[srv]) {
          categoryStats[srv] = { total: 0, p1: 0, p2: 0, ties: 0 };
        }
        categoryStats[srv].total++;
        if (winner === 1) categoryStats[srv].p1++;
        else if (winner === 2) categoryStats[srv].p2++;
        else categoryStats[srv].ties++;

        commonMaps.push({
          mapName: m1.mapName,
          server: m1.server,
          t1: m1.time,
          t2: m2.time,
          pSkill1: m1.pSkill || 0,
          pSkill2: m2.pSkill || 0,
          timeDiff,
          winner
        });
      }
    });

    const totalCommon = commonMaps.length;
    const p1WinrateVal = totalCommon > 0 ? ((p1Wins / totalCommon) * 100).toFixed(1) : 0;
    const p2WinrateVal = totalCommon > 0 ? ((p2Wins / totalCommon) * 100).toFixed(1) : 0;

    // --- Win Probability Prediction ---
    const probContainer = document.getElementById('h2h-probability-container');
    if (probContainer && window.api && typeof window.api.calculateWinProbability === 'function') {
      const prob = window.api.calculateWinProbability(d1, d2);
      
      const probP1Name = document.getElementById('prob-p1-name');
      if (probP1Name) probP1Name.textContent = d1.name;
      const probP2Name = document.getElementById('prob-p2-name');
      if (probP2Name) probP2Name.textContent = d2.name;
      
      let prob1 = 50;
      let prob2 = 50;
      if (prob && typeof prob.p1Win === 'number' && typeof prob.p2Win === 'number') {
        prob1 = Math.round(prob.p1Win);
        prob2 = Math.round(prob.p2Win);
      } else if (Array.isArray(prob) && prob.length >= 2) {
        prob1 = Math.round(prob[0] * 100);
        prob2 = Math.round(prob[1] * 100);
      }
      
      const probP1Val = document.getElementById('prob-p1-val');
      if (probP1Val) probP1Val.textContent = prob1 + '%';
      const probP2Val = document.getElementById('prob-p2-val');
      if (probP2Val) probP2Val.textContent = prob2 + '%';
      
      const probBar1 = document.getElementById('prob-bar-p1');
      if (probBar1) probBar1.style.width = prob1 + '%';
      const probBar2 = document.getElementById('prob-bar-p2');
      if (probBar2) probBar2.style.width = prob2 + '%';

      const probStatus = document.getElementById('prob-status');
      if (probStatus) {
        if (prob1 > 55) {
          probStatus.textContent = currentLang === 'en' ? `${d1.name} has the theoretical edge` : `Фаворит по формуле: ${d1.name}`;
        } else if (prob2 > 55) {
          probStatus.textContent = currentLang === 'en' ? `${d2.name} has the theoretical edge` : `Фаворит по формуле: ${d2.name}`;
        } else {
          probStatus.textContent = currentLang === 'en' ? `Extremely close duel matchup` : `Равные шансы на победу`;
        }
      }
      
      probContainer.classList.remove('hidden');
      probContainer.classList.add('flex');
    }

    // --- Render Player 1 Card ---
    const p1CardLink = document.getElementById('p1-card-link');
    if (p1CardLink) {
      p1CardLink.textContent = d1.name;
      p1CardLink.href = `/player?name=${encodeURIComponent(d1.name)}`;
    }
    const p1CardTotal = document.getElementById('p1-card-total');
    if (p1CardTotal) p1CardTotal.textContent = (d1.newPtsTotal || 0).toLocaleString() + ' PTS';
    const p1CardBase = document.getElementById('p1-card-base');
    if (p1CardBase) p1CardBase.textContent = '+' + (d1.newPtsBase || 0).toLocaleString();
    const p1CardSkill = document.getElementById('p1-card-skill');
    if (p1CardSkill) p1CardSkill.textContent = '+' + (d1.newPtsSkill || 0).toLocaleString();
    const p1WinsEl = document.getElementById('p1-wins');
    if (p1WinsEl) p1WinsEl.textContent = p1Wins;
    const p1WinrateEl = document.getElementById('p1-winrate');
    if (p1WinrateEl) p1WinrateEl.textContent = p1WinrateVal + '%';

    const rankDict = dict.home?.skillLeague || dict.player?.skillLeague || {};

    // League & Level for Player 1
    const p1League = d1.skillLeague || (typeof getSkillLeague === 'function' ? getSkillLeague(d1.newPtsBase, d1.newPtsSkill) : { id: 'unranked' });
    const p1LeagueId = p1League?.id || 'unranked';
    const p1LeagueName = rankDict[p1LeagueId] || p1LeagueId.toUpperCase();
    const p1Level = d1.masteryLevel || (typeof getMasteryLevel === 'function' ? getMasteryLevel(d1.newPtsTotal) : { level: 1 });
    
    const p1LeagueBadge = document.getElementById('p1-league-badge');
    if (p1LeagueBadge) {
      p1LeagueBadge.className = `skill-league-badge skill-league-${p1LeagueId} text-xs font-black uppercase px-2.5 py-0.5 rounded-full border`;
      p1LeagueBadge.textContent = p1LeagueName;
    }
    const p1LevelPill = document.getElementById('p1-level-pill');
    if (p1LevelPill) {
      p1LevelPill.className = 'level-pill text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-emerald-500/30 text-emerald-400';
      p1LevelPill.textContent = `LVL ${p1Level.level}`;
    }

    // --- Render Player 2 Card ---
    const p2CardLink = document.getElementById('p2-card-link');
    if (p2CardLink) {
      p2CardLink.textContent = d2.name;
      p2CardLink.href = `/player?name=${encodeURIComponent(d2.name)}`;
    }
    const p2CardTotal = document.getElementById('p2-card-total');
    if (p2CardTotal) p2CardTotal.textContent = (d2.newPtsTotal || 0).toLocaleString() + ' PTS';
    const p2CardBase = document.getElementById('p2-card-base');
    if (p2CardBase) p2CardBase.textContent = '+' + (d2.newPtsBase || 0).toLocaleString();
    const p2CardSkill = document.getElementById('p2-card-skill');
    if (p2CardSkill) p2CardSkill.textContent = '+' + (d2.newPtsSkill || 0).toLocaleString();
    const p2WinsEl = document.getElementById('p2-wins');
    if (p2WinsEl) p2WinsEl.textContent = p2Wins;
    const p2WinrateEl = document.getElementById('p2-winrate');
    if (p2WinrateEl) p2WinrateEl.textContent = p2WinrateVal + '%';

    // League & Level for Player 2
    const p2League = d2.skillLeague || (typeof getSkillLeague === 'function' ? getSkillLeague(d2.newPtsBase, d2.newPtsSkill) : { id: 'unranked' });
    const p2LeagueId = p2League?.id || 'unranked';
    const p2LeagueName = rankDict[p2LeagueId] || p2LeagueId.toUpperCase();
    const p2Level = d2.masteryLevel || (typeof getMasteryLevel === 'function' ? getMasteryLevel(d2.newPtsTotal) : { level: 1 });

    const p2LeagueBadge = document.getElementById('p2-league-badge');
    if (p2LeagueBadge) {
      p2LeagueBadge.className = `skill-league-badge skill-league-${p2LeagueId} text-xs font-black uppercase px-2.5 py-0.5 rounded-full border`;
      p2LeagueBadge.textContent = p2LeagueName;
    }
    const p2LevelPill = document.getElementById('p2-level-pill');
    if (p2LevelPill) {
      p2LevelPill.className = 'level-pill text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-emerald-500/30 text-emerald-400';
      p2LevelPill.textContent = `LVL ${p2Level.level}`;
    }

    // Render Avatars (with reqId race condition protection)
    renderPvpTee('p1-tee-container', d1, reqId);
    renderPvpTee('p2-tee-container', d2, reqId);

    const thP1 = document.getElementById('th-p1-name');
    if (thP1) thP1.textContent = d1.name;
    const thP2 = document.getElementById('th-p2-name');
    if (thP2) thP2.textContent = d2.name;

    const score1El = document.getElementById('score-p1');
    if (score1El) score1El.textContent = p1Wins;
    const score2El = document.getElementById('score-p2');
    if (score2El) score2El.textContent = p2Wins;

    const commonCountEl = document.getElementById('common-count');
    if (commonCountEl) commonCountEl.textContent = totalCommon;

    const leadDeltaEl = document.getElementById('h2h-lead-delta');
    if (leadDeltaEl) {
      if (p1Wins > p2Wins) {
        leadDeltaEl.textContent = `${d1.name} +${p1Wins - p2Wins}`;
        leadDeltaEl.className = 'text-xs font-bold text-cyan-400 font-mono';
      } else if (p2Wins > p1Wins) {
        leadDeltaEl.textContent = `${d2.name} +${p2Wins - p1Wins}`;
        leadDeltaEl.className = 'text-xs font-bold text-rose-400 font-mono';
      } else {
        leadDeltaEl.textContent = currentLang === 'en' ? 'Tied' : 'Ничья';
        leadDeltaEl.className = 'text-xs font-bold text-amber-400 font-mono';
      }
    }

    const tableHeading = document.getElementById('pvp-table-heading');
    if (tableHeading) {
      tableHeading.innerHTML = `${pvp.duelTable || (currentLang === 'en' ? 'Duel on Common Maps' : 'Дуэль на общих картах')} (<span id="table-common-total">${totalCommon}</span>)`;
    }

    const card1 = document.getElementById('p1-card');
    const card2 = document.getElementById('p2-card');
    const badge1 = document.getElementById('p1-winner-badge-container');
    const badge2 = document.getElementById('p2-winner-badge-container');
    const box1 = document.getElementById('p1-wins-box');
    const box2 = document.getElementById('p2-wins-box');
    const winnerBanner = document.getElementById('h2h-winner-banner');

    if (badge1) badge1.innerHTML = '';
    if (badge2) badge2.innerHTML = '';

    if (p1Wins > p2Wins) {
      const diff = p1Wins - p2Wins;
      if (winnerBanner) {
        winnerBanner.className = 'block text-center p-5 rounded-2xl border border-cyan-500/50 bg-gradient-to-r from-cyan-950/40 via-sky-900/30 to-cyan-950/40 text-cyan-300 font-bold text-lg sm:text-2xl shadow-[0_0_35px_rgba(6,182,212,0.25)] backdrop-blur-md';
        winnerBanner.innerHTML = `🏆 <strong class="text-white">${escapeHtml(d1.name)}</strong> ${pvp.leadsBy || (currentLang === 'en' ? 'leads by' : 'лидирует с преимуществом в')} <strong class="text-cyan-400 font-black text-2xl sm:text-3xl px-1.5">+${diff}</strong> ${pvp.maps || (currentLang === 'en' ? 'maps' : 'карт')}!`;
      }
      if (card1) card1.className = 'glass-panel p-6 pvp-card-winner rounded-2xl flex flex-col justify-between text-center space-y-4 relative overflow-hidden';
      if (badge1) badge1.innerHTML = `<div class="pvp-winner-crown-badge">👑 ${pvp.winnerBadge || (currentLang === 'en' ? 'WINNER' : 'ПОБЕДИТЕЛЬ')}</div>`;
      if (box1) box1.className = 'bg-cyan-500/20 p-3 text-sm font-bold text-cyan-300 border border-cyan-500/50 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)]';
      if (score1El) score1El.className = 'text-cyan-400 font-black drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]';

      if (card2) card2.className = 'glass-panel p-6 pvp-card-defeated rounded-2xl flex flex-col justify-between text-center space-y-4';
      if (badge2) badge2.innerHTML = `<div class="pvp-runnerup-badge">${currentLang === 'en' ? '🥈 RUNNER-UP' : '🥈 2-Е МЕСТО'}</div>`;
      if (box2) box2.className = 'bg-slate-800/40 p-3 text-sm font-bold text-rose-400 border border-rose-500/30 rounded-xl';
      if (score2El) score2El.className = 'text-slate-400';
    } else if (p2Wins > p1Wins) {
      const diff = p2Wins - p1Wins;
      if (winnerBanner) {
        winnerBanner.className = 'block text-center p-5 rounded-2xl border border-rose-500/50 bg-gradient-to-r from-rose-950/40 via-pink-900/30 to-rose-950/40 text-rose-300 font-bold text-lg sm:text-2xl shadow-[0_0_35px_rgba(244,63,94,0.25)] backdrop-blur-md';
        winnerBanner.innerHTML = `🏆 <strong class="text-white">${escapeHtml(d2.name)}</strong> ${pvp.leadsBy || (currentLang === 'en' ? 'leads by' : 'лидирует с преимуществом в')} <strong class="text-rose-400 font-black text-2xl sm:text-3xl px-1.5">+${diff}</strong> ${pvp.maps || (currentLang === 'en' ? 'maps' : 'карт')}!`;
      }
      if (card2) card2.className = 'glass-panel p-6 pvp-card-winner rounded-2xl flex flex-col justify-between text-center space-y-4 relative overflow-hidden';
      if (badge2) badge2.innerHTML = `<div class="pvp-winner-crown-badge">👑 ${pvp.winnerBadge || (currentLang === 'en' ? 'WINNER' : 'ПОБЕДИТЕЛЬ')}</div>`;
      if (box2) box2.className = 'bg-rose-500/20 p-3 text-sm font-bold text-rose-300 border border-rose-500/50 rounded-xl shadow-[0_0_15px_rgba(244,63,94,0.3)]';
      if (score2El) score2El.className = 'text-rose-400 font-black drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]';

      if (card1) card1.className = 'glass-panel p-6 pvp-card-defeated rounded-2xl flex flex-col justify-between text-center space-y-4';
      if (badge1) badge1.innerHTML = `<div class="pvp-runnerup-badge">${currentLang === 'en' ? '🥈 RUNNER-UP' : '🥈 2-Е МЕСТО'}</div>`;
      if (box1) box1.className = 'bg-slate-800/40 p-3 text-sm font-bold text-cyan-400 border border-cyan-500/30 rounded-xl';
      if (score1El) score1El.className = 'text-slate-400';
    } else {
      if (winnerBanner) {
        winnerBanner.className = 'block text-center p-5 rounded-2xl border border-amber-500/50 bg-amber-500/10 text-amber-300 font-bold text-lg sm:text-xl rounded-2xl';
        winnerBanner.innerHTML = pvp.tie || (currentLang === 'en' ? '🤝 Equal score on common maps!' : '🤝 Ничья на общих картах!');
      }
      if (card1) card1.className = 'glass-panel p-6 border border-amber-500/40 rounded-2xl flex flex-col justify-between text-center space-y-4';
      if (card2) card2.className = 'glass-panel p-6 border border-amber-500/40 rounded-2xl flex flex-col justify-between text-center space-y-4';
      if (box1) box1.className = 'bg-amber-500/10 p-3 text-sm font-bold text-amber-300 border border-amber-500/30 rounded-xl';
      if (box2) box2.className = 'bg-amber-500/10 p-3 text-sm font-bold text-amber-300 border border-amber-500/30 rounded-xl';
      if (score1El) score1El.className = 'text-amber-400 font-bold';
      if (score2El) score2El.className = 'text-amber-400 font-bold';
    }

    // --- Render Category Breakdown Grid ---
    const specGrid = document.getElementById('pvp-spec-grid');
    if (specGrid) {
      specGrid.innerHTML = '';
      const categories = Object.keys(categoryStats).sort();
      categories.forEach(cat => {
        const stats = categoryStats[cat];
        const p1Pct = stats.total > 0 ? ((stats.p1 / stats.total) * 100).toFixed(1) : 0;
        const p2Pct = stats.total > 0 ? ((stats.p2 / stats.total) * 100).toFixed(1) : 0;
        const tieCount = stats.total - stats.p1 - stats.p2;
        const tiePct = stats.total > 0 ? ((tieCount / stats.total) * 100).toFixed(1) : 0;

        let badgeStyle = 'border-white/[0.08] bg-slate-900/60 hover:border-white/20';
        if (stats.p1 > stats.p2) {
          badgeStyle = 'border-cyan-500/40 bg-gradient-to-b from-cyan-950/30 to-slate-900/60 shadow-[0_0_15px_rgba(6,182,212,0.1)]';
        } else if (stats.p2 > stats.p1) {
          badgeStyle = 'border-rose-500/40 bg-gradient-to-b from-rose-950/30 to-slate-900/60 shadow-[0_0_15px_rgba(244,63,94,0.1)]';
        }

        const div = document.createElement('div');
        div.className = `p-4 rounded-xl border ${badgeStyle} flex flex-col justify-between space-y-3 transition-all backdrop-blur-sm`;
        div.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="server-badge ${getServerBadgeClass(cat)} font-black uppercase text-xs tracking-wider">${escapeHtml(cat)}</span>
            <span class="text-xs font-mono font-bold text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">${stats.total} ${currentLang === 'en' ? 'maps' : 'карт'}</span>
          </div>
          <div class="flex items-center justify-between text-xs font-mono font-bold">
            <span class="flex items-center gap-1.5 ${stats.p1 > stats.p2 ? 'text-cyan-300 font-black' : 'text-slate-400'}">
              <span class="w-2 h-2 rounded-full bg-cyan-400 inline-block shadow-[0_0_6px_#22d3ee]"></span>
              <span>${escapeHtml(d1.name)}: <strong class="text-cyan-400">${stats.p1}</strong></span>
            </span>
            <span class="flex items-center gap-1.5 ${stats.p2 > stats.p1 ? 'text-rose-300 font-black' : 'text-slate-400'}">
              <span>${escapeHtml(d2.name)}: <strong class="text-rose-400">${stats.p2}</strong></span>
              <span class="w-2 h-2 rounded-full bg-rose-400 inline-block shadow-[0_0_6px_#fb7185]"></span>
            </span>
          </div>
          <div class="pvp-cat-track">
            <div class="pvp-cat-bar-p1" style="width: ${p1Pct}%" title="${escapeHtml(d1.name)}: ${stats.p1} (${p1Pct}%)"></div>
            ${tieCount > 0 ? `<div class="pvp-cat-bar-tie" style="width: ${tiePct}%" title="Ничьи: ${tieCount}"></div>` : ''}
            <div class="pvp-cat-bar-p2" style="width: ${p2Pct}%" title="${escapeHtml(d2.name)}: ${stats.p2} (${p2Pct}%)"></div>
          </div>
        `;
        specGrid.appendChild(div);
      });
    }

    // --- Table Filtering & Sorting ---
    let currentFilter = 'all';
    let sortKey = 'diff';
    let sortDir = 'desc'; // desc = biggest difference first

    const ties = totalCommon - p1Wins - p2Wins;

    // Filter Buttons Labels & Setup
    const btnAll = document.getElementById('btn-pvp-filter-all');
    const btnP1  = document.getElementById('btn-pvp-filter-p1');
    const btnP2  = document.getElementById('btn-pvp-filter-p2');
    const btnTie = document.getElementById('btn-pvp-filter-tie');

    if (btnAll) btnAll.textContent = `${pvp.filterAll || (currentLang === 'en' ? 'All maps' : 'Все карты')} (${totalCommon})`;
    if (btnP1)  btnP1.textContent  = `🏆 ${d1.name} (${p1Wins})`;
    if (btnP2)  btnP2.textContent  = `🏆 ${d2.name} (${p2Wins})`;
    if (btnTie) btnTie.textContent = `🤝 ${pvp.filterTie || (currentLang === 'en' ? 'Ties' : 'Ничьи')} (${ties})`;

    const filterBtns = document.querySelectorAll('[data-pvp-filter]');
    const updateFilterUI = () => {
      filterBtns.forEach(btn => {
        const type = btn.getAttribute('data-pvp-filter');
        btn.className = 'pvp-filter-btn';
        if (type === currentFilter) {
          btn.classList.add('active', `active-${type}`);
        }
      });
    };
    updateFilterUI();

    filterBtns.forEach(btn => {
      btn.onclick = () => {
        currentFilter = btn.getAttribute('data-pvp-filter');
        updateFilterUI();
        renderTable();
      };
    });

    // Table Header Click Sorting
    const sortHeaders = document.querySelectorAll('th[data-sort]');
    sortHeaders.forEach(th => {
      th.onclick = () => {
        const key = th.getAttribute('data-sort');
        if (sortKey === key) {
          sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          sortKey = key;
          sortDir = (key === 'mapName' || key === 'server') ? 'asc' : 'desc';
        }
        updateSortHeaders();
        renderTable();
      };
    });

    const updateSortHeaders = () => {
      sortHeaders.forEach(th => {
        const key = th.getAttribute('data-sort');
        const indicator = th.querySelector('.sort-indicator');
        if (key === sortKey) {
          th.classList.add('text-amber-400');
          if (indicator) {
            indicator.textContent = sortDir === 'asc' ? '↑' : '↓';
            indicator.className = 'sort-indicator text-xs text-amber-400 font-bold';
          }
        } else {
          th.classList.remove('text-amber-400');
          if (indicator) {
            indicator.textContent = '↕';
            indicator.className = 'sort-indicator text-xs opacity-40 group-hover:opacity-100 transition-opacity';
          }
        }
      });
    };
    updateSortHeaders();

    const renderTable = () => {
      const searchQuery = (document.getElementById('pvp-map-search')?.value || '').toLowerCase().trim();
      const tbody = document.getElementById('pvp-table-body');
      if (!tbody) return;
      tbody.innerHTML = '';

      let filtered = commonMaps.filter(m => {
        if (currentFilter === 'p1' && m.winner !== 1) return false;
        if (currentFilter === 'p2' && m.winner !== 2) return false;
        if (currentFilter === 'tie' && m.winner !== 0) return false;

        if (searchQuery && !m.mapName.toLowerCase().includes(searchQuery)) {
          return false;
        }
        return true;
      });

      // Apply sorting
      filtered.sort((a, b) => {
        let valA, valB;
        if (sortKey === 'mapName') {
          valA = a.mapName.toLowerCase();
          valB = b.mapName.toLowerCase();
          return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else if (sortKey === 'server') {
          valA = a.server.toLowerCase();
          valB = b.server.toLowerCase();
          return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else if (sortKey === 't1') {
          valA = a.t1; valB = b.t1;
        } else if (sortKey === 't2') {
          valA = a.t2; valB = b.t2;
        } else {
          // 'diff'
          valA = Math.abs(a.timeDiff);
          valB = Math.abs(b.timeDiff);
        }
        return sortDir === 'asc' ? valA - valB : valB - valA;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500">${pvp.noCommonMaps || (currentLang === 'en' ? 'No maps match your filter' : 'Нет карт для отображения')}</td></tr>`;
        return;
      }

      const fragment = document.createDocumentFragment();
      filtered.forEach(m => {
        const tr = document.createElement('tr');
        tr.className = 'premium-table-row transition-colors border-b border-white/[0.03] hover:bg-white/[0.03]';

        let winnerBadgeHtml = '';
        const diffStr = formatTime(Math.abs(m.timeDiff));
        if (m.winner === 1) {
          winnerBadgeHtml = `<span class="px-2.5 py-1 rounded-md bg-cyan-500/20 text-cyan-400 text-xs font-bold border border-cyan-500/30">🏆 ${escapeHtml(d1.name)} (+${diffStr})</span>`;
        } else if (m.winner === 2) {
          winnerBadgeHtml = `<span class="px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30">🏆 ${escapeHtml(d2.name)} (+${diffStr})</span>`;
        } else {
          winnerBadgeHtml = `<span class="px-2.5 py-1 rounded-md bg-slate-500/20 text-slate-300 text-xs font-bold">${pvp.equal || (currentLang === 'en' ? 'Equal' : 'Ничья')}</span>`;
        }

        const t1Class = m.winner === 1 ? 'text-cyan-400 font-bold' : 'text-slate-300';
        const t2Class = m.winner === 2 ? 'text-rose-400 font-bold' : 'text-slate-300';

        tr.innerHTML = `
          <td class="p-4 font-bold">
            <a href="/map?name=${encodeURIComponent(m.mapName)}" class="text-white hover:text-amber-400 transition-colors">
              ${escapeHtml(m.mapName)}
            </a>
          </td>
          <td class="p-4"><span class="server-badge ${getServerBadgeClass(m.server)}">${escapeHtml(m.server)}</span></td>
          <td class="p-4 font-mono text-right ${t1Class}">${formatTime(m.t1)} <span class="text-xs text-purple-400/80 pl-1">(+${m.pSkill1})</span></td>
          <td class="p-4 font-mono text-right ${t2Class}">${formatTime(m.t2)} <span class="text-xs text-purple-400/80 pl-1">(+${m.pSkill2})</span></td>
          <td class="p-4 text-center">${winnerBadgeHtml}</td>
        `;
        fragment.appendChild(tr);
      });
      tbody.appendChild(fragment);
    };

    const mapSearch = document.getElementById('pvp-map-search');
    if (mapSearch) {
      let searchTimer;
      mapSearch.oninput = () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(renderTable, 100);
      };
    }
    renderTable();

    const pvpResults = document.getElementById('pvp-results');
    if (pvpResults) pvpResults.classList.remove('hidden');
    const featuredEl = document.getElementById('pvp-featured-matchups');
    if (featuredEl) featuredEl.classList.add('hidden');
  }
})();
