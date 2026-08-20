/* page-player.js — Logic for player.html */

(function () {
  'use strict';

  const formatTime = (t) => {
    if (t <= 0) return '-';
    const m = Math.floor(t / 60);
    const s = (t % 60).toFixed(2);
    return `${m}:${s.padStart(5, '0')}`;
  };

  const getServerBadgeClass = (server) => {
    if (!server) return 'server-default';
    const s = server.toLowerCase();
    if (s.includes('novice')) return 'server-novice';
    if (s.includes('moderate')) return 'server-moderate';
    if (s.includes('brutal')) return 'server-brutal';
    if (s.includes('insane')) return 'server-insane';
    if (s.includes('solo')) return 'server-solo';
    if (s.includes('dummy')) return 'server-dummy';
    if (s.includes('oldschool')) return 'server-oldschool';
  };

  const renderPlayerTee = async (data) => {
    const container = document.getElementById('player-tee-container');
    if (!container) return;

    container.innerHTML = '';

    let skinName = data.skinName || 'default';
    if (!skinName || skinName === 'null') skinName = 'default';

    const localSkinUrl = `../data/skins/${encodeURIComponent(skinName)}.png`;
    const remoteSkinUrl = `https://skins.ddstats.tw/${encodeURIComponent(skinName)}.png`;
    const defaultSkinUrl = `https://skins.ddstats.tw/default.png`;

    const checkImage = (url) => new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });

    let finalSkinUrl = localSkinUrl;
    if (!(await checkImage(localSkinUrl))) {
      if (await checkImage(remoteSkinUrl)) {
        finalSkinUrl = remoteSkinUrl;
      } else {
        finalSkinUrl = defaultSkinUrl;
      }
    }

    const config = {
      skinUrl: finalSkinUrl,
      followMouse: true,
      eyes: 'normal',
      direction: 'right',
    };

    if (data.skinColorBody !== null && data.skinColorBody !== undefined) {
      config.colorBody = Number(data.skinColorBody);
      config.useCustomColor = true;
    }
    if (data.skinColorFeet !== null && data.skinColorFeet !== undefined) {
      config.colorFeet = Number(data.skinColorFeet);
      config.useCustomColor = true;
    }

    try {
      if (window.TeeSkinRenderer && typeof window.TeeSkinRenderer.createAsync === 'function') {
        const teeElement = await window.TeeSkinRenderer.createAsync(config);
        teeElement.style.fontSize = '1.3px';
        container.appendChild(teeElement);
      }
    } catch (err) {
      console.warn('Failed to render player Tee skin:', err);
    }
  };

  document.addEventListener('DOMContentLoaded', async () => {
    renderHeader('player');
    const dict = getDict();

    const urlParams = new URLSearchParams(window.location.search);
    const playerName = urlParams.get('name');

    if (!playerName) {
      window.location.href = './';
      return;
    }

    const setTxt = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };
    const setHtml = (id, html) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    };

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.content = `${playerName} — Base PTS, Skill PTS and Total Mastery on DDNet Map Mastery.`;
    }

    // Static UI text from i18n
    setHtml('loader-icon', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-12 h-12 animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>');

    setTxt('player-back', dict.player.back);
    setTxt('player-loading', dict.player.loading);
    setTxt('player-error', dict.player.error);
    setTxt('stat-base', dict.player.statBase);
    setTxt('stat-skill', dict.player.statSkill);
    setTxt('stat-total', dict.player.statTotal);
    setTxt('stat-base-sub', dict.player.statBaseSub || '');
    setTxt('stat-skill-sub', dict.player.statSkillSub || '');
    setTxt('stat-total-sub', dict.player.statTotalSub || '');
    setTxt('rank-header-tag', dict.player.rankSublabel || 'Ранг');
    setTxt('rank-header-label', dict.player.rankLabel || 'Ранг скилла');
    setTxt('level-header-tag', dict.player.levelSublabel || 'Уровень');
    setTxt('level-header-label', dict.player.levelLabel || 'Уровень мастерства');
    setTxt('table-map', dict.player.mapName || dict.player.map || 'Карта');
    setTxt('table-server', dict.player.mapServer || dict.player.category || 'Сервер');
    setTxt('table-time', dict.player.mapTime || dict.player.time || 'Время');
    setTxt('table-base-col', dict.player.tableBase || 'Base');
    setTxt('table-skill-col', dict.player.tableSkill || 'Skill Bonus');
    setTxt('table-top-col', dict.player.tableTopDDNet || 'Top DDNet');

    const shareTextEl = document.getElementById('share-profile-text');
    if (shareTextEl) shareTextEl.textContent = dict.player.shareBtn || 'Share Profile';

    // Blacklist check
    if (window.isBlacklisted && window.isBlacklisted(playerName)) {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('player-error').innerHTML = `
        <div style="background:rgba(239,68,68,0.15);border:2px solid #ef4444;padding:1.5rem;text-align:center;margin:1.5rem 0;">
          <h2 style="font-size:1.5rem;font-weight:bold;color:#f87171;margin-bottom:0.5rem;">
            ${currentLang === 'en' ? 'Player Banned' : 'Игрок заблокирован'}
          </h2>
          <p style="color:#fca5a5;font-weight:500;">
            ${currentLang === 'en'
          ? 'This player is blacklisted in Map Mastery system (TAS / Cheating).'
          : 'Этот никнейм находится в чёрном списке системы Map Mastery (TAS / Читы).'}
          </p>
        </div>
      `;
      document.getElementById('error').classList.remove('hidden');
      return;
    }

    try {
      // Single API call — finishDetails already computed inside fetchPlayerPts
      const data = await window.api.fetchPlayerPts(playerName);

      const nameEl = document.getElementById('player-name');
      if (nameEl) {
        nameEl.textContent = data.name;
        nameEl.title = data.name;
        if (data.name.length > 18) {
          nameEl.style.fontSize = 'clamp(1.25rem, 1.8vw, 1.55rem)';
        } else if (data.name.length > 12) {
          nameEl.style.fontSize = 'clamp(1.4rem, 2.2vw, 1.75rem)';
        } else {
          nameEl.style.fontSize = 'clamp(1.6rem, 2.5vw, 2.1rem)';
        }
      }

      // Global Rank
      const globalRankEl = document.getElementById('player-global-rank');
      if (globalRankEl && window.api.getPlayerGlobalRank) {
        const r = window.api.getPlayerGlobalRank(data.name);
        globalRankEl.textContent = typeof r === 'number' ? `#${r}` : r;
        globalRankEl.classList.remove('hidden');
      }

      if (typeof renderBreadcrumbs === 'function') {
        const homeLabel = dict.breadcrumbs ? dict.breadcrumbs.home : 'Home';
        renderBreadcrumbs([
          { label: homeLabel, url: '/' },
          { label: data.name }
        ]);
      }
      renderPlayerTee(data);

      const renderPlayerBadgesUI = (playerData) => {
        const container = document.getElementById('player-badges-container');
        const wrapper = document.getElementById('player-badges');
        const countEl = document.getElementById('player-badges-count');
        if (!container || !wrapper || !window.api.getPlayerBadges) return;

        const allBadges = window.api.getPlayerBadges(playerData);
        const unlockedBadges = allBadges.filter(b => b.unlocked);

        if (countEl) {
          countEl.textContent = `${unlockedBadges.length} / ${allBadges.length}`;
        }

        if (unlockedBadges.length === 0) return;

        // Sort by tier priority
        const tierOrder = { 'legendary': 5, 'diamond': 4, 'gold': 3, 'silver': 2, 'bronze': 1 };
        unlockedBadges.sort((a, b) => (tierOrder[b.tier] || 0) - (tierOrder[a.tier] || 0));

        container.classList.remove('hidden');
        wrapper.innerHTML = unlockedBadges.map(b => {
          const desc = currentLang === 'ru' ? (b.descRu || b.desc) : b.desc;
          return `
            <a href="#player-achievements-container" class="tier-badge tier-badge-${b.tier} px-3 py-1.5 rounded-lg border text-xs font-bold whitespace-nowrap flex items-center gap-2 shadow-sm transition-all hover:scale-105 hover:brightness-125 cursor-pointer no-underline ${b.bg} ${b.border}" title="${escapeHtml(desc)}">
              <span class="text-sm leading-none">${b.icon}</span>
              <span class="badge-title text-slate-100">${escapeHtml(b.name)}</span>
              <span class="text-[0.62rem] px-1.5 py-0.5 rounded font-black tracking-wider uppercase opacity-90 tier-tag-${b.tier}">${b.tier}</span>
            </a>
          `;
        }).join('');
      };
      renderPlayerBadgesUI(data);

      document.getElementById('val-base').textContent = data.newPtsBase.toLocaleString();
      document.getElementById('val-skill').textContent = data.newPtsSkill.toLocaleString();
      document.getElementById('val-total').textContent = data.newPtsTotal.toLocaleString();

      if (window.api.getPlayerCompletionProgress) {
        const progress = window.api.getPlayerCompletionProgress(data);
        if (progress && progress.total > 0) {
          document.getElementById('val-completion').textContent = `${progress.percentage.toFixed(1)}%`;

          const mapsLabel = dict.player.mapsCount || (currentLang === 'en' ? 'Maps' : 'Карт');
          const wrCount = (data.finishDetails || []).filter(m => m.rank === 1).length;
          const mapEl = document.getElementById('val-completion-maps');
          if (mapEl) {
            if (wrCount > 0) {
              mapEl.innerHTML = `${progress.completed.toLocaleString()} ${mapsLabel} <span class="text-amber-400 font-bold ml-1" title="World Records">(${wrCount} 👑)</span>`;
            } else {
              mapEl.textContent = `${progress.completed.toLocaleString()} ${mapsLabel}`;
            }
          }
          setTimeout(() => {
            const bar = document.getElementById('val-completion-bar');
            if (bar) bar.style.width = `${progress.percentage}%`;
          }, 100);
        }

        const playtimeVal = document.getElementById('val-playtime');
        if (playtimeVal && window.api.estimatePlaytime) {
          const hours = window.api.estimatePlaytime(data);
          if (hours > 1000) {
            playtimeVal.textContent = (hours / 1000).toFixed(1) + 'k h';
          } else {
            playtimeVal.textContent = Math.round(hours) + 'h';
          }
        }

        if (window.api.getHardestMapCompleted) {
          const hardest = window.api.getHardestMapCompleted(data);
          const mapLinkEl = document.getElementById('val-hardest-map-link');
          const serverEl = document.getElementById('val-hardest-server');
          const ptsEl = document.getElementById('val-hardest-pts');
          if (mapLinkEl && hardest) {
            mapLinkEl.textContent = hardest.mapName;
            mapLinkEl.title = `${hardest.mapName} (${hardest.pBase} PTS — ${hardest.server || 'Server'})`;
            mapLinkEl.href = `../map?name=${encodeURIComponent(hardest.mapName)}`;

            if (serverEl) {
              serverEl.textContent = hardest.server || 'UNK';
              serverEl.className = `px-1.5 py-[1px] rounded uppercase font-bold text-[0.65rem] border ${getServerBadgeClass(hardest.server)}`;
            }
            if (ptsEl) {
              ptsEl.textContent = `${hardest.pBase} PTS`;
            }
          }
        }
      }

      const league = data.skillLeague || window.api.getSkillLeague(data.newPtsBase, data.newPtsSkill);
      const leagueEl = document.getElementById('player-skill-league');
      if (leagueEl) {
        const rankDict = dict.player.skillLeague || {};
        const leagueName = rankDict[league.id] || league.id;
        const ratioText = league.ratio === null ? '—' : `${league.ratio.toFixed(2)}×`;
        const detailText = league.isProvisional
          ? (rankDict.provisionalHint || `Full league unlocks at ${league.minBasePts.toLocaleString()} Base PTS`)
          : `${rankDict.ratioLabel || 'Skill / Base'}: ${ratioText}`;

        leagueEl.innerHTML = '';
        const badge = document.createElement('span');
        badge.className = `skill-league-badge skill-league-${league.id}`;
        badge.textContent = leagueName;
        const detail = document.createElement('span');
        detail.className = 'skill-league-detail';
        detail.textContent = detailText;
        leagueEl.append(badge, detail);
      }

      const mastery = data.masteryLevel || window.api.getMasteryLevel(data.newPtsTotal);
      const masteryDict = dict.player.masteryLevel || {};
      const masteryLabel = document.getElementById('mastery-level-label');
      const masteryProgressText = document.getElementById('mastery-level-progress-text');
      const masteryProgress = document.getElementById('mastery-level-progress');
      const masteryTrack = masteryProgress?.parentElement;
      const masteryNext = document.getElementById('mastery-level-next');
      if (masteryLabel) masteryLabel.textContent = `${masteryDict.level || 'Level'} ${mastery.level}`;
      if (masteryProgressText) masteryProgressText.textContent = `${Math.floor(mastery.progressPercent)}%`;
      if (masteryProgress) masteryProgress.style.width = `${mastery.progressPercent}%`;
      if (masteryTrack) masteryTrack.setAttribute('aria-valuenow', String(Math.round(mastery.progressPercent)));
      if (masteryNext) {
        const nextLevelNum = mastery.level + 1;
        const ptsRemaining = mastery.pointsToNext.toLocaleString();
        masteryNext.textContent = currentLang === 'en'
          ? `${ptsRemaining} PTS to Level ${nextLevelNum}`
          : `${ptsRemaining} PTS до ${nextLevelNum} уровня`;
      }

      const shareBtn = document.getElementById('share-profile-btn');
      if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
          if (shareTextEl) shareTextEl.textContent = currentLang === 'en' ? 'Generating...' : 'Генерация...';

          try {
            if (window.api.generateProfileCard) {
              const dataUrl = await window.api.generateProfileCard(data);
              if (dataUrl) {
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = `${data.name}_DDNetMM.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            }
          } catch (e) {
            console.error('Failed to generate card', e);
          }

          const cardText = `${data.name} | base: ${data.newPtsBase} | skill: ${data.newPtsSkill} | total: ${data.newPtsTotal} | https://ddnetmm.ru/player?name=${encodeURIComponent(data.name)}`;
          navigator.clipboard.writeText(cardText).then(() => {
            if (shareTextEl) {
              const origText = dict.player.shareBtn || 'Share Profile';
              shareTextEl.textContent = dict.player.copied || 'Скопировано!';
              setTimeout(() => { shareTextEl.textContent = origText; }, 2000);
            }
          }).catch(err => {
            console.error('Copy failed:', err);
          });
        });
      }

      const favBtn = document.getElementById('favorite-player-btn');
      const favTextEl = document.getElementById('favorite-player-text');
      const favIconEl = document.getElementById('fav-btn-icon');
      if (favBtn) {
        const updateFavBtnState = () => {
          const settings = typeof getSettings === 'function' ? getSettings() : { favorites: [] };
          const isFav = (settings.favorites || []).some(f => f.toLowerCase() === playerName.toLowerCase());
          if (isFav) {
            favBtn.style.background = 'rgba(245,158,11,0.2)';
            favBtn.style.color = '#fbbf24';
            favBtn.style.borderColor = 'rgba(245,158,11,0.5)';
            if (favTextEl) favTextEl.textContent = currentLang === 'en' ? 'In Favorites' : 'В избранном';
            if (favIconEl) favIconEl.textContent = '★';
          } else {
            favBtn.style.background = 'rgba(255,255,255,0.06)';
            favBtn.style.color = '#cbd5e1';
            favBtn.style.borderColor = 'rgba(255,255,255,0.12)';
            if (favTextEl) favTextEl.textContent = currentLang === 'en' ? 'Favorite' : 'В избранное';
            if (favIconEl) favIconEl.textContent = '☆';
          }
        };

        updateFavBtnState();

        favBtn.addEventListener('click', () => {
          const settings = typeof getSettings === 'function' ? getSettings() : { favorites: [] };
          let favs = [...(settings.favorites || [])];
          const exists = favs.some(f => f.toLowerCase() === playerName.toLowerCase());
          if (exists) {
            favs = favs.filter(f => f.toLowerCase() !== playerName.toLowerCase());
          } else {
            favs.push(playerName);
            if (window.api && typeof window.api.fetchPlayerPts === 'function') {
              window.api.fetchPlayerPts(playerName).catch(() => {});
            }
          }
          if (typeof saveSettings === 'function') {
            saveSettings({ ...settings, favorites: favs });
          }
          updateFavBtnState();
        });
      }

      const renderPlayerRadar = (playerData) => {
        const container = document.getElementById('player-radar-container');
        const svgWrapper = document.getElementById('player-radar-svg');
        if (!container || !svgWrapper || !window.api.getPlayerRadarStats) return;

        const radarStats = window.api.getPlayerRadarStats(playerData);
        const [speed, skill, endurance, grind] = radarStats;

        // Consistency Score & Grade
        const consistencyGrade = document.getElementById('val-consistency-grade');

        if (window.api.getPlayerConsistencyScore) {
          const score = window.api.getPlayerConsistencyScore(playerData);
          const scorePct = Math.round(score * 100);

          if (consistencyGrade) {
            if (score >= 0.85) {
              consistencyGrade.textContent = `Grade S • ${scorePct}%`;
              consistencyGrade.className = 'px-2.5 py-1 rounded-lg text-[0.68rem] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
            } else if (score >= 0.70) {
              consistencyGrade.textContent = `Grade A • ${scorePct}%`;
              consistencyGrade.className = 'px-2.5 py-1 rounded-lg text-[0.68rem] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30';
            } else if (score >= 0.55) {
              consistencyGrade.textContent = `Grade B • ${scorePct}%`;
              consistencyGrade.className = 'px-2.5 py-1 rounded-lg text-[0.68rem] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30';
            } else {
              consistencyGrade.textContent = `Grade C • ${scorePct}%`;
              consistencyGrade.className = 'px-2.5 py-1 rounded-lg text-[0.68rem] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30';
            }
          }
        }

        // 4 Core Pillars
        const setPillar = (prefix, val) => {
          const valEl = document.getElementById(`pillar-${prefix}-val`);
          const barEl = document.getElementById(`pillar-${prefix}-bar`);
          const pct = Math.round(val * 100);
          if (valEl) valEl.textContent = `${pct}%`;
          if (barEl) {
            setTimeout(() => { barEl.style.width = `${pct}%`; }, 100);
          }
        };

        setPillar('speed', speed);
        setPillar('skill', skill);
        setPillar('endurance', endurance);
        setPillar('grind', grind);

        // Archetype Pill
        if (window.api.getPlayerArchetype) {
          const archetype = window.api.getPlayerArchetype(radarStats);
          const archPill = document.getElementById('player-archetype-pill');
          if (archPill) {
            archPill.textContent = archetype.label;
            archPill.className = `font-bold uppercase tracking-wider text-[0.68rem] px-2.5 py-1 bg-black/40 border border-white/10 rounded-lg ${archetype.color}`;
          }
        }

        container.classList.remove('hidden');

        const labels = ['Speed', 'Skill', 'Endurance', 'Grind'];
        const w = 250, h = 250;
        const cx = w / 2, cy = h / 2;
        const r = Math.min(cx, cy) - 32;

        const getPoints = (dataArr) => dataArr.map((val, i) => {
          const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
          return {
            x: cx + r * Math.max(0.08, Math.min(1, val)) * Math.cos(angle),
            y: cy + r * Math.max(0.08, Math.min(1, val)) * Math.sin(angle)
          };
        });

        const pts = getPoints(radarStats);
        const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + ` ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';

        let grids = '';
        for (let level = 1; level <= 4; level++) {
          const radius = r * (level / 4);
          let gridPath = '';
          for (let i = 0; i < labels.length; i++) {
            const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
            gridPath += (i === 0 ? 'M' : 'L') + ` ${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`;
          }
          gridPath += ' Z';
          grids += `<path d="${gridPath}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1" />`;
        }

        let axes = '', textLabels = '', dataDots = '';
        for (let i = 0; i < labels.length; i++) {
          const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
          axes += `<line x1="${cx}" y1="${cy}" x2="${(cx + r * Math.cos(angle)).toFixed(1)}" y2="${(cy + r * Math.sin(angle)).toFixed(1)}" stroke="rgba(255,255,255,0.12)" stroke-width="1" />`;
          const tx = cx + (r + 20) * Math.cos(angle);
          const ty = cy + (r + 14) * Math.sin(angle);
          textLabels += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" fill="#cbd5e1" font-size="11" font-weight="800" text-anchor="middle" dominant-baseline="middle">${labels[i]}</text>`;
        }

        pts.forEach(p => {
          dataDots += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#ffa500" stroke="#111" stroke-width="1.5" />`;
        });

        svgWrapper.innerHTML = `
          <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}">
            <defs>
              <linearGradient id="radar-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ffa500" stop-opacity="0.45"/>
                <stop offset="100%" stop-color="#f43f5e" stop-opacity="0.25"/>
              </linearGradient>
            </defs>
            ${grids}
            ${axes}
            <path d="${path}" fill="url(#radar-grad)" stroke="#ffa500" stroke-width="2" stroke-linejoin="round" />
            ${dataDots}
            ${textLabels}
          </svg>
        `;
      };
      renderPlayerRadar(data);

      const renderPlayerAchievementsShowcase = (playerData) => {
        const container = document.getElementById('player-achievements-container');
        const grid = document.getElementById('player-achievements-grid');
        const summaryBadge = document.getElementById('achievements-summary-badge');
        const tabsWrapper = document.getElementById('achievements-tabs');
        if (!container || !grid || !window.api.getPlayerBadges) return;

        const allBadges = window.api.getPlayerBadges(playerData);
        if (allBadges.length === 0) return;

        const unlockedCount = allBadges.filter(b => b.unlocked).length;
        const totalCount = allBadges.length;
        const unlockPct = Math.round((unlockedCount / totalCount) * 100);

        if (summaryBadge) {
          summaryBadge.innerHTML = `
            <div class="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono font-bold text-xs flex items-center gap-2 shadow-sm">
              <span>🏆 ${unlockedCount} / ${totalCount}</span>
              <span class="text-slate-400 text-[0.68rem] font-sans font-semibold">(${unlockPct}%)</span>
            </div>
          `;
        }

        let activeCategory = 'all';

        const renderGrid = () => {
          const filtered = activeCategory === 'all'
            ? allBadges
            : allBadges.filter(b => b.category === activeCategory);

          grid.innerHTML = filtered.map(b => {
            const desc = currentLang === 'ru' ? (b.descRu || b.desc) : b.desc;
            const progressPct = Math.min(100, Math.round((b.current / Math.max(1, b.target)) * 100));
            const isUnlocked = b.unlocked;

            const unit = b.unit || '';
            const curFormatted = typeof b.current === 'number' ? b.current.toLocaleString() : b.current;
            const tarFormatted = typeof b.target === 'number' ? b.target.toLocaleString() : b.target;

            return `
              <div class="achievement-card glass-panel p-4 rounded-2xl border transition-all duration-200 ${isUnlocked ? `unlocked ${b.border} ${b.bg}` : 'locked border-white/5 bg-slate-900/30 opacity-70'} flex flex-col justify-between">
                <div>
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <div class="flex items-center gap-2.5">
                      <span class="text-2xl leading-none filter drop-shadow">${b.icon}</span>
                      <div>
                        <h4 class="font-bold text-sm text-white leading-snug">${escapeHtml(b.name)}</h4>
                        <span class="text-[0.62rem] font-black uppercase tracking-wider tier-tag-${b.tier}">${b.tier}</span>
                      </div>
                    </div>
                    ${isUnlocked ? `
                      <span class="px-2 py-0.5 rounded-full text-[0.62rem] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 shadow-[0_0_8px_rgba(52,211,153,0.3)] shrink-0">
                        <span>✓</span> ${dict.player.achievementsUnlocked || 'Unlocked'}
                      </span>
                    ` : `
                      <span class="px-2 py-0.5 rounded-full text-[0.62rem] font-bold bg-slate-800 text-slate-400 border border-white/10 shrink-0">
                        ${progressPct}%
                      </span>
                    `}
                  </div>
                  <p class="text-xs text-slate-300/80 leading-relaxed mb-3">${escapeHtml(desc)}</p>
                </div>

                <div class="pt-2 border-t border-white/5">
                  <div class="flex items-center justify-between text-[0.7rem] font-mono mb-1.5">
                    <span class="text-slate-400 font-sans text-[0.68rem] font-semibold">${isUnlocked ? 'Completed' : 'Progress'}</span>
                    <span class="${isUnlocked ? 'text-emerald-400 font-bold' : 'text-slate-300 font-medium'}">${curFormatted}${unit} / ${tarFormatted}${unit}</span>
                  </div>
                  <div class="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden border border-white/5">
                    <div class="h-full ${isUnlocked ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-amber-400/70'} transition-all duration-700" style="width: ${progressPct}%;"></div>
                  </div>
                </div>
              </div>
            `;
          }).join('');
        };

        if (tabsWrapper) {
          const categories = ['all', 'speed', 'category', 'mastery', 'grind'];
          categories.forEach(cat => {
            const countEl = document.getElementById(`tab-count-${cat}`);
            if (countEl) {
              const catBadges = cat === 'all' ? allBadges : allBadges.filter(b => b.category === cat);
              const unlocked = catBadges.filter(b => b.unlocked).length;
              countEl.textContent = `${unlocked}/${catBadges.length}`;
            }
          });

          const tabBtns = tabsWrapper.querySelectorAll('.achievement-tab-btn');
          tabBtns.forEach(btn => {
            btn.onclick = () => {
              tabBtns.forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              activeCategory = btn.getAttribute('data-category') || 'all';
              renderGrid();
            };
          });
        }

        renderGrid();
        container.classList.remove('hidden');
      };
      renderPlayerAchievementsShowcase(data);

      const renderModSpecialization = (playerData) => {
        const container = document.getElementById('player-mod-spec-container');
        const grid = document.getElementById('mod-spec-grid');
        if (!container || !grid || !window.api.getPlayerServerSpecialization) return;

        const specs = window.api.getPlayerServerSpecialization(playerData);
        if (specs.length === 0) return;

        container.classList.remove('hidden');

        const serverTheme = {
          'Novice': { border: 'border-emerald-500/30', bg: 'bg-emerald-950/15', text: 'text-emerald-400', bar: 'bg-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
          'Moderate': { border: 'border-cyan-500/30', bg: 'bg-cyan-950/15', text: 'text-cyan-400', bar: 'bg-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300' },
          'Brutal': { border: 'border-rose-500/30', bg: 'bg-rose-950/15', text: 'text-rose-400', bar: 'bg-rose-400', badge: 'bg-rose-500/20 text-rose-300' },
          'Insane': { border: 'border-fuchsia-500/30', bg: 'bg-fuchsia-950/15', text: 'text-fuchsia-400', bar: 'bg-fuchsia-400', badge: 'bg-fuchsia-500/20 text-fuchsia-300' },
          'Dummy': { border: 'border-purple-500/30', bg: 'bg-purple-950/15', text: 'text-purple-400', bar: 'bg-purple-400', badge: 'bg-purple-500/20 text-purple-300' },
          'Race': { border: 'border-sky-500/30', bg: 'bg-sky-950/15', text: 'text-sky-400', bar: 'bg-sky-400', badge: 'bg-sky-500/20 text-sky-300' },
          'Solo': { border: 'border-slate-400/30', bg: 'bg-slate-900/40', text: 'text-slate-200', bar: 'bg-slate-300', badge: 'bg-slate-700/40 text-slate-200' },
          'Oldschool': { border: 'border-amber-500/30', bg: 'bg-amber-950/15', text: 'text-amber-400', bar: 'bg-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
          'DDmaX': { border: 'border-violet-500/30', bg: 'bg-violet-950/15', text: 'text-violet-400', bar: 'bg-violet-400', badge: 'bg-violet-500/20 text-violet-300' },
          'Event': { border: 'border-orange-500/30', bg: 'bg-orange-950/15', text: 'text-orange-400', bar: 'bg-orange-400', badge: 'bg-orange-500/20 text-orange-300' }
        };

        grid.innerHTML = specs.map(s => {
          const theme = serverTheme[s.server] || { border: 'border-white/10', bg: 'bg-white/5', text: 'text-white', bar: 'bg-white', badge: 'bg-white/10 text-white' };
          return `
            <div class="glass-panel ${theme.bg} border ${theme.border} rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] hover:brightness-110 shadow-sm">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-black uppercase tracking-widest ${theme.text}">${escapeHtml(s.server)}</span>
                  <span class="text-[0.68rem] font-bold px-2 py-0.5 rounded-full ${theme.badge}">${s.count} / ${s.totalMaps || s.count} Maps</span>
                </div>
                <div class="text-2xl font-black font-mono ${theme.text} mb-1">
                  ${s.pTotal.toLocaleString()} <span class="text-[0.65rem] text-slate-400 uppercase font-sans font-bold">PTS</span>
                </div>
                <div class="flex items-center justify-between text-[0.68rem] text-slate-400 font-mono mb-2.5">
                  <span>Base: ${s.pBase.toLocaleString()}</span>
                  <span>Skill: +${s.pSkill.toLocaleString()}</span>
                </div>
              </div>
              <div class="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden border border-white/5">
                <div class="h-full ${theme.bar}" style="width: ${s.pct || 0}%;"></div>
              </div>
            </div>
          `;
        }).join('');
      };
      renderModSpecialization(data);

      const renderPointsHistoryChart = (finishes) => {
        const container = document.getElementById('player-chart-container');
        const svgWrapper = document.getElementById('player-chart-svg');
        if (!container || !svgWrapper || !finishes || finishes.length === 0) return;

        const validFinishes = finishes.filter(f => f.timestamp > 0).sort((a, b) => a.timestamp - b.timestamp);
        if (validFinishes.length < 2) return;

        container.classList.remove('hidden');

        // Build cumulative PTS timeline, sample max 300 points to keep SVG lean
        let currentPts = 0;
        let rawPoints = [];
        validFinishes.forEach(f => {
          currentPts += f.pBase + f.pSkill;
          rawPoints.push({ x: f.timestamp, y: currentPts, map: f.mapName });
        });
        const step = Math.max(1, Math.floor(rawPoints.length / 300));
        const dataPoints = rawPoints.filter((_, i) => i % step === 0 || i === rawPoints.length - 1);

        const draw = () => {
          const w = Math.max(svgWrapper.getBoundingClientRect().width || svgWrapper.clientWidth || 800, 320);
          const h = 280;
          const padL = 60, padR = 24, padT = 20, padB = 38;
          const chartW = w - padL - padR;
          const chartH = h - padT - padB;

          const minX = dataPoints[0].x;
          const maxX = dataPoints[dataPoints.length - 1].x;
          const maxY = dataPoints[dataPoints.length - 1].y;

          const sx = (x) => padL + ((x - minX) / Math.max(1, maxX - minX)) * chartW;
          const sy = (y) => padT + chartH - (y / Math.max(1, maxY)) * chartH;

          // ---- Smooth bezier path ----
          const pts = dataPoints.map(pt => [sx(pt.x), sy(pt.y)]);
          let pathD = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
          for (let i = 1; i < pts.length; i++) {
            const [x0, y0] = pts[i - 1];
            const [x1, y1] = pts[i];
            const cpx = (x0 + x1) / 2;
            pathD += ` C ${cpx.toFixed(1)} ${y0.toFixed(1)}, ${cpx.toFixed(1)} ${y1.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
          }
          const fillD = `${pathD} L ${pts[pts.length - 1][0].toFixed(1)} ${(padT + chartH).toFixed(1)} L ${padL} ${(padT + chartH).toFixed(1)} Z`;

          // ---- Y-axis grid + labels ----
          const yTicks = 4;
          let gridLines = '', yLabels = '';
          for (let i = 0; i <= yTicks; i++) {
            const yVal = (maxY * i) / yTicks;
            const yPx = sy(yVal).toFixed(1);
            const label = yVal >= 1e6 ? (yVal / 1e6).toFixed(1) + 'M' : yVal >= 1000 ? (yVal / 1000).toFixed(0) + 'k' : Math.round(yVal);
            gridLines += `<line x1="${padL}" y1="${yPx}" x2="${w - padR}" y2="${yPx}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;
            yLabels += `<text x="${(padL - 8).toFixed(1)}" y="${yPx}" fill="#64748b" font-size="11" font-weight="600" text-anchor="end" dominant-baseline="middle" font-family="monospace">${label}</text>`;
          }

          // ---- X-axis month ticks ----
          let xTicks = '';
          const tickCount = Math.min(8, Math.max(3, Math.floor(chartW / 90)));
          const dateLocale = currentLang === 'en' ? 'en-US' : 'ru-RU';
          for (let i = 0; i <= tickCount; i++) {
            const ts = minX + (maxX - minX) * i / tickCount;
            const xPx = sx(ts).toFixed(1);
            const dateStr = new Date(ts * 1000).toLocaleDateString(dateLocale, { month: 'short', year: '2-digit' });
            xTicks += `<line x1="${xPx}" y1="${padT}" x2="${xPx}" y2="${padT + chartH}" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>`;
            xTicks += `<text x="${xPx}" y="${(padT + chartH + 18).toFixed(1)}" fill="#64748b" font-size="10" font-weight="600" text-anchor="middle" font-family="monospace">${dateStr}</text>`;
          }

          // ---- Hover tooltip via SVG overlay ----
          const hoverRects = dataPoints.map((pt, i) => {
            const x = sx(pt.x);
            const nextX = i < dataPoints.length - 1 ? sx(dataPoints[i + 1].x) : w - padR;
            const rectW = Math.max(4, nextX - x);
            const label = `${new Date(pt.x * 1000).toLocaleDateString(dateLocale)} — ${pt.y.toLocaleString()} PTS (${escapeHtml(pt.map)})`;
            return `<rect x="${x.toFixed(1)}" y="${padT}" width="${rectW.toFixed(1)}" height="${chartH}" fill="transparent" class="chart-hover-rect cursor-crosshair"><title>${label}</title></rect>`;
          }).join('');

          const svg = `
            <svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible; display:block;">
              <defs>
                <linearGradient id="chart-grad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#ffa500" stop-opacity="0.3"/>
                  <stop offset="70%" stop-color="#ffa500" stop-opacity="0.06"/>
                  <stop offset="100%" stop-color="#ffa500" stop-opacity="0"/>
                </linearGradient>
              </defs>
              ${gridLines}
              ${xTicks}
              ${yLabels}
              <path d="${fillD}" fill="url(#chart-grad2)"/>
              <path d="${pathD}" fill="none" stroke="#ffa500" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="${pts[pts.length - 1][0].toFixed(1)}" cy="${pts[pts.length - 1][1].toFixed(1)}" r="5" fill="#ffa500" stroke="#1e293b" stroke-width="2"/>
              ${hoverRects}
            </svg>
          `;
          svgWrapper.innerHTML = svg;
          svgWrapper.style.height = h + 'px';
        };

        draw();

        if (window.ResizeObserver) {
          const ro = new ResizeObserver(() => {
            draw();
          });
          ro.observe(svgWrapper);
        } else {
          window.addEventListener('resize', draw);
        }

        const titleEl = document.getElementById('player-chart-title');
        if (titleEl) titleEl.textContent = dict.player.pointsHistory || (currentLang === 'en' ? 'Points History' : 'История очков');
      };

      renderPointsHistoryChart(data.finishDetails);

      const renderActivityHeatmap = (finishes) => {
        const wrapper = document.getElementById('player-heatmap-svg');
        const badgeEl = document.getElementById('heatmap-total-badge');
        if (!wrapper || !finishes || finishes.length === 0) return;

        // Build daily counts (last 365 days)
        const dailyCounts = {};
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const msPerDay = 24 * 60 * 60 * 1000;
        let totalCompletions = 0;

        finishes.forEach(f => {
          if (!f.timestamp) return;
          const d = new Date(f.timestamp * 1000);
          d.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((now - d) / msPerDay);
          if (diffDays >= 0 && diffDays < 365) {
            const dateStr = d.toISOString().split('T')[0];
            dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
            totalCompletions++;
          }
        });

        const weeks = 53;
        const daysInWeek = 7;
        const cellSize = 13.5;
        const gap = 3;
        const padTop = 22;   // room for month labels
        const padLeft = 28;  // room for day labels
        const step = cellSize + gap;

        let maxCount = 1;
        Object.values(dailyCounts).forEach(c => { if (c > maxCount) maxCount = c; });

        const getColor = (count) => {
          if (!count) return 'rgba(255,255,255,0.06)';
          const intensity = count / maxCount;
          if (intensity > 0.75) return '#06b6d4';
          if (intensity > 0.50) return '#0891b2';
          if (intensity > 0.25) return '#0e7490';
          return '#164e63';
        };

        const svgW = padLeft + weeks * step;
        const svgH = padTop + daysInWeek * step + 4;

        let rects = '', monthLabels = '';
        const todayDow = now.getDay(); // 0=Sun
        let lastMonth = -1;
        const heatLocale = currentLang === 'en' ? 'en-US' : 'ru-RU';

        for (let w = 0; w < weeks; w++) {
          for (let d = 0; d < daysInWeek; d++) {
            const daysAgo = (weeks - 1 - w) * daysInWeek + ((daysInWeek - 1 + todayDow - d) % daysInWeek);
            const targetDate = new Date(now.getTime() - daysAgo * msPerDay);
            const dateStr = targetDate.toISOString().split('T')[0];
            const count = dailyCounts[dateStr] || 0;
            const x = padLeft + w * step;
            const y = padTop + d * step;

            // Month label at start of new month in row 0
            if (d === 0) {
              const month = targetDate.getMonth();
              if (month !== lastMonth) {
                lastMonth = month;
                const mLabel = targetDate.toLocaleDateString(heatLocale, { month: 'short' }).replace('.', '');
                monthLabels += `<text x="${x}" y="${padTop - 7}" fill="#94a3b8" font-size="9.5" font-weight="600" font-family="sans-serif">${mLabel}</text>`;
              }
            }

            const label = `${targetDate.toLocaleDateString(heatLocale)}: ${count} ${dict.player.mapsCount || (currentLang === 'en' ? 'maps' : 'карт')}`;
            rects += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2.5" fill="${getColor(count)}"><title>${label}</title></rect>`;
          }
        }

        // Day-of-week labels (Mon, Wed, Fri)
        const dayLabels = [1, 3, 5].map(d => {
          const names = currentLang === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
          return `<text x="${padLeft - 6}" y="${padTop + d * step + cellSize * 0.75}" fill="#64748b" font-size="9" text-anchor="end" font-family="sans-serif">${names[d]}</text>`;
        }).join('');

        // Legend
        const legendColors = ['rgba(255,255,255,0.06)', '#164e63', '#0e7490', '#0891b2', '#06b6d4'];
        let legend = `<text x="${padLeft}" y="${svgH + 14}" fill="#64748b" font-size="9" font-family="sans-serif">${dict.player.less || (currentLang === 'en' ? 'Less' : 'Меньше')}</text>`;
        legendColors.forEach((c, i) => {
          legend += `<rect x="${padLeft + 42 + i * (cellSize + 2.5)}" y="${svgH + 4}" width="${cellSize}" height="${cellSize}" rx="2" fill="${c}"/>`;
        });
        legend += `<text x="${padLeft + 42 + legendColors.length * (cellSize + 2.5) + 6}" y="${svgH + 14}" fill="#64748b" font-size="9" font-family="sans-serif">${dict.player.more || (currentLang === 'en' ? 'More' : 'Больше')}</text>`;

        const svgHtml = `<svg viewBox="0 0 ${svgW} ${svgH + 20}" width="100%" class="w-full h-auto block" style="width:100%;height:auto;display:block;" preserveAspectRatio="xMidYMid meet">
          ${monthLabels}${dayLabels}${rects}${legend}
        </svg>`;

        if (badgeEl) {
          badgeEl.textContent = `${totalCompletions.toLocaleString()} ${dict.player.mapsInLastYear || (currentLang === 'en' ? 'maps in the last year' : 'карт за последний год')}`;
        }
        wrapper.innerHTML = svgHtml;
      };
      renderActivityHeatmap(data.finishDetails);

      const renderUnderfarmedMaps = (playerData) => {
        const container = document.getElementById('player-recommend-container');
        const grid = document.getElementById('player-recommend-grid');
        if (!container || !grid || !window.api.getUnderfarmedMaps) return;

        const underfarmed = window.api.getUnderfarmedMaps(playerData.finishDetails, 6);
        if (underfarmed.length === 0) return;

        container.classList.remove('hidden');

        grid.innerHTML = underfarmed.map(map => `
          <div class="glass-panel bg-emerald-950/15 border border-emerald-500/25 rounded-2xl p-4 flex flex-col justify-between hover:bg-emerald-950/30 hover:border-emerald-500/50 transition-all duration-200 shadow-sm">
            <div class="flex justify-between items-start mb-2 gap-2">
              <div class="text-sm font-bold text-white truncate flex-1" title="${escapeHtml(map.mapName)}">
                <a href="../map/?name=${encodeURIComponent(map.mapName)}" class="hover:text-emerald-400 transition-colors">${escapeHtml(map.mapName)}</a>
              </div>
              <span class="text-[0.65rem] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md border ${getServerBadgeClass(map.server)} shrink-0">
                ${escapeHtml(map.server)}
              </span>
            </div>
            <div class="flex justify-between items-end mt-3 pt-2 border-t border-white/5">
              <div>
                <div class="text-[0.65rem] text-slate-400 uppercase font-bold tracking-wider">Base PTS</div>
                <div class="text-xl font-black font-mono text-emerald-400">${map.pBase}</div>
              </div>
              <div class="text-right">
                <div class="text-[0.65rem] text-purple-300 uppercase font-bold tracking-wider">Max Skill Bonus</div>
                <div class="text-xl font-black font-mono text-purple-400">+${map.maxSkill || map.pBase * 5}</div>
              </div>
            </div>
          </div>
        `).join('');
      };
      renderUnderfarmedMaps(data);

      const renderRecentActivity = (playerData) => {
        const container = document.getElementById('player-recent-activity-container');
        const grid = document.getElementById('recent-activity-grid');
        if (!container || !grid || !window.api.getPlayerRecentActivity) return;

        const activity = window.api.getPlayerRecentActivity(playerData, 7);
        if (activity.length === 0) return;

        let totalRecentPts = 0;
        activity.forEach(d => totalRecentPts += d.pTotal);
        if (totalRecentPts === 0) return; // Hide if 0 activity

        container.classList.remove('hidden');

        const maxPts = Math.max(...activity.map(a => a.pTotal), 1);

        grid.innerHTML = activity.map(d => {
          const heightPct = Math.max(10, (d.pTotal / maxPts) * 100);
          const dateLabel = new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
          const isZero = d.pTotal === 0;

          return `
            <div class="flex-1 flex flex-col justify-end items-center group relative cursor-crosshair">
              <!-- Tooltip -->
              <div class="absolute bottom-full mb-2 bg-slate-900 border border-cyan-500/30 text-white text-xs p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-xl">
                <div class="font-bold text-cyan-400 mb-1">${dateLabel}</div>
                <div>${d.pTotal.toLocaleString()} PTS</div>
                <div class="text-[0.65rem] text-slate-400">${d.count} Maps played</div>
              </div>
              
              <!-- Bar -->
              <div class="w-full mx-1 rounded-t-md transition-all duration-500 ${isZero ? 'bg-white/5' : 'bg-gradient-to-t from-cyan-500/20 to-cyan-400 hover:from-cyan-400/50 hover:to-cyan-300'}" style="height: ${heightPct}%"></div>
              
              <!-- Date Label (Mobile hidden, Desktop visible) -->
              <div class="text-[0.6rem] text-slate-500 mt-2 hidden md:block uppercase tracking-wider font-bold">
                ${new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })}
              </div>
            </div>
          `;
        }).join('');
      };
      const renderTopPartners = (playerData) => {
        const container = document.getElementById('player-top-partners-container');
        const grid = document.getElementById('player-top-partners-grid');
        if (!container || !grid || !window.api.getTopPartners) return;

        const topPartners = window.api.getTopPartners(playerData, 5);
        if (!topPartners || topPartners.length === 0) return;

        container.classList.remove('hidden');

        const rankBadges = [
          { label: '#1', color: 'border-amber-400/60 bg-amber-500/20 text-amber-300' },
          { label: '#2', color: 'border-slate-300/60 bg-slate-300/20 text-slate-200' },
          { label: '#3', color: 'border-amber-700/60 bg-amber-700/20 text-amber-400' },
          { label: '#4', color: 'border-purple-500/40 bg-purple-500/10 text-purple-300' },
          { label: '#5', color: 'border-blue-500/40 bg-blue-500/10 text-blue-300' }
        ];

        grid.innerHTML = topPartners.map((partner, idx) => {
          const badge = rankBadges[idx] || { label: `#${idx + 1}`, color: 'border-white/20 bg-white/5 text-slate-300' };
          const pvpUrl = `../pvp/?p1=${encodeURIComponent(playerData.name)}&p2=${encodeURIComponent(partner.name)}`;
          const playerUrl = `../player/?name=${encodeURIComponent(partner.name)}`;

          return `
            <div class="glass-panel p-4 rounded-2xl border border-white/10 bg-slate-900/60 hover:border-amber-500/50 hover:bg-slate-900/90 transition-all flex flex-col justify-between group shadow-sm">
              <div>
                <div class="flex items-center justify-between gap-2 mb-2.5">
                  <span class="px-2 py-0.5 rounded-md text-[0.68rem] font-mono font-black border ${badge.color}">${badge.label}</span>
                  <span class="text-[0.68rem] font-bold text-slate-400 font-mono">${partner.mapCount} ${currentLang === 'en' ? 'maps' : 'карт'}</span>
                </div>
                <a href="${playerUrl}" class="text-base font-black text-white hover:text-amber-400 transition-colors block truncate" title="${escapeHtml(partner.name)}">
                  ${escapeHtml(partner.name)}
                </a>
                <div class="mt-2 text-xs font-mono font-black text-purple-400">
                  +${partner.totalSkillPts.toLocaleString()} <span class="text-[0.65rem] text-slate-400 font-normal">Skill PTS</span>
                </div>
              </div>

              <div class="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
                <a href="${playerUrl}" class="text-[0.7rem] font-bold text-slate-400 hover:text-white transition-colors" title="${currentLang === 'en' ? 'View Profile' : 'Открыть профиль'}">
                  ${currentLang === 'en' ? 'Profile' : 'Профиль'} →
                </a>
                <a href="${pvpUrl}" class="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-[0.68rem] font-bold transition-all" title="${currentLang === 'en' ? 'Duel PvP' : 'Сравнить в PvP'}">
                  ⚔️ PvP
                </a>
              </div>
            </div>
          `;
        }).join('');
      };

      const renderRival = (playerData) => {
        const container = document.getElementById('player-rival-container');
        if (!container || !window.api.getPlayerRival) return;

        const rival = window.api.getPlayerRival(playerData);
        if (rival) {
          container.classList.remove('hidden');
          container.classList.add('flex');

          document.getElementById('rival-name').textContent = rival.name;
          document.getElementById('rival-pts').textContent = `${(rival.newPtsTotal || 0).toLocaleString()} PTS`;

          const pvpBtn = document.getElementById('rival-pvp-btn');
          if (pvpBtn) {
            pvpBtn.href = `../pvp/?p1=${encodeURIComponent(playerData.name)}&p2=${encodeURIComponent(rival.name)}`;
          }
        }
      };

      renderTopPartners(data);
      renderRival(data);
      renderRecentActivity(data);

      const allMaps = (data.finishDetails || []).filter(m => m.pSkill > 0);

      let currentSortKey = 'pSkill';
      let currentSortDir = 'desc';

      const updateHeaderSortIndicators = () => {
        const thList = document.querySelectorAll('.player-maps-table th[data-sort]');
        thList.forEach(th => {
          const key = th.getAttribute('data-sort');
          const indicator = th.querySelector('.sort-indicator');
          if (!indicator) return;

          if (key === currentSortKey) {
            th.classList.add('text-white');
            indicator.textContent = currentSortDir === 'asc' ? '↑' : '↓';
            indicator.className = 'sort-indicator text-xs text-amber-400 font-bold';
          } else {
            th.classList.remove('text-white');
            indicator.textContent = '↕';
            indicator.className = 'sort-indicator text-xs opacity-40 group-hover:opacity-100 transition-opacity';
          }
        });
      };

      const renderFilteredMaps = () => {
        const catFilter = document.getElementById('map-filter-server')?.value || 'ALL';
        const searchQuery = (document.getElementById('map-search-input')?.value || '').toLowerCase().trim();
        const ptsFilter = Number(document.getElementById('map-filter-pts')?.value || 0);
        const dateFilter = document.getElementById('map-filter-date')?.value || 'all';

        const nowSec = Date.now() / 1000;
        let dateThreshold = 0;
        if (dateFilter !== 'all') {
          dateThreshold = nowSec - (Number(dateFilter) * 86400);
        }

        let list = allMaps.filter(m => {
          if (catFilter !== 'ALL') {
            const s = (m.server || '').toLowerCase();
            if (catFilter.toLowerCase() === 'ddmax') {
              if (!s.includes('ddmax')) return false;
            } else if (s !== catFilter.toLowerCase()) {
              return false;
            }
          }
          if (searchQuery) {
            if (!m.mapName.toLowerCase().includes(searchQuery)) return false;
          }
          if (ptsFilter > 0 && m.pSkill < ptsFilter) return false;
          if (dateThreshold > 0 && m.timestamp > 0 && m.timestamp < dateThreshold) return false;
          return true;
        });

        // Column Header Sorting
        list.sort((a, b) => {
          let res = 0;
          if (currentSortKey === 'mapName') {
            res = (a.mapName || '').localeCompare(b.mapName || '');
          } else if (currentSortKey === 'server') {
            res = (a.server || '').localeCompare(b.server || '');
          } else if (currentSortKey === 'time') {
            res = (a.time || 999999) - (b.time || 999999);
          } else if (currentSortKey === 'pBase') {
            res = (a.pBase || 0) - (b.pBase || 0);
          } else if (currentSortKey === 'pSkill') {
            res = (a.pSkill || 0) - (b.pSkill || 0);
          } else if (currentSortKey === 'rank') {
            const rA = (typeof a.rank === 'number' && a.rank > 0) ? a.rank : 999999;
            const rB = (typeof b.rank === 'number' && b.rank > 0) ? b.rank : 999999;
            res = rA - rB;
          }
          return currentSortDir === 'desc' ? -res : res;
        });

        const countText = list.length === allMaps.length
          ? `(${allMaps.length})`
          : `(${list.length} / ${allMaps.length})`;

        document.getElementById('player-maps-title').textContent =
          `${dict.player.mapsWithSkillBonus} ${countText}`;

        const tbody = document.getElementById('maps-body');
        tbody.innerHTML = '';

        if (list.length === 0) {
          tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-500">${dict.player.noMapsMatch || (currentLang === 'en' ? 'No maps match filter' : 'Нет карт, соответствующих фильтру')}</td></tr>`;
          return;
        }

        const fragment = document.createDocumentFragment();
        list.forEach(map => {
          const tr = document.createElement('tr');
          tr.className = 'premium-table-row transition-colors';

          const isSoloCategory = ['solo', 'race'].includes((map.server || '').toLowerCase());
          const isSoloOnTeamMap = !isSoloCategory && (map.server !== 'Dummy') && (!map.rank || map.rank === '—');

          let rankDisplay = '—';
          if (typeof map.rank === 'number' && map.rank > 0) {
            rankDisplay = '#' + map.rank;
          } else if (map.rank === '???') {
            rankDisplay = '???';
          } else if (isSoloOnTeamMap) {
            rankDisplay = dict.player.soloOnTeam || '— (Solo)';
          } else if (map.rank) {
            rankDisplay = String(map.rank);
          }

          if (typeof map.rank === 'number' && map.rank <= 3) {
            tr.classList.add('top-rank-row', `top-rank-${map.rank}`);
          }

          const rankBadgeClass = (typeof map.rank === 'number' && map.rank <= 3)
            ? `ranking-position-${map.rank}`
            : (isSoloOnTeamMap ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' : 'ranking-position-other');

          tr.innerHTML = `
            <td class="p-4 font-bold">
              <a href="/map?name=${encodeURIComponent(map.mapName)}" class="text-white hover:text-amber-400 transition-colors">
                ${escapeHtml(map.mapName)}
              </a>
            </td>
            <td class="p-4"><span class="server-badge ${getServerBadgeClass(map.server)}">${escapeHtml(map.server)}</span></td>
            <td class="p-4 font-mono text-slate-100 font-medium text-right">${formatTime(map.time)}</td>
            <td class="p-4 font-semibold text-emerald-400 text-right">${map.pBase > 0 ? '+' + map.pBase : '0'}</td>
            <td class="p-4 font-bold text-right">${map.pSkill > 0 ? '<span class="text-purple-400">+' + map.pSkill + '</span>' : '<span class="text-rose-400 font-semibold">0</span>'}</td>
            <td class="p-4 font-bold text-center"><span class="ranking-position-badge ${rankBadgeClass}">${escapeHtml(rankDisplay)}</span></td>
          `;
          fragment.appendChild(tr);
        });
        tbody.appendChild(fragment);
      };

      // Header click listeners for direct column sorting
      const tableHeaders = document.querySelectorAll('.player-maps-table th[data-sort]');
      tableHeaders.forEach(th => {
        th.addEventListener('click', () => {
          const key = th.getAttribute('data-sort');
          if (currentSortKey === key) {
            currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
          } else {
            currentSortKey = key;
            if (key === 'mapName' || key === 'server' || key === 'time' || key === 'rank') {
              currentSortDir = 'asc';
            } else {
              currentSortDir = 'desc';
            }
          }
          updateHeaderSortIndicators();
          renderFilteredMaps();
        });
      });

      ['map-filter-server', 'map-filter-pts', 'map-filter-date'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', renderFilteredMaps);
      });
      const searchInput = document.getElementById('map-search-input');
      if (searchInput) {
        let searchTimer;
        searchInput.addEventListener('input', () => {
          clearTimeout(searchTimer);
          searchTimer = setTimeout(renderFilteredMaps, 120);
        });

        if (window.setupMapAutocomplete) {
          window.setupMapAutocomplete('map-search-input', () => {
            renderFilteredMaps();
          });
        }
      }

      const shareProfileBtn = document.getElementById('share-profile-btn');
      if (shareProfileBtn) {
        shareProfileBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(window.location.href);
          const txt = document.getElementById('share-profile-text');
          if (txt) {
            const old = txt.textContent;
            txt.textContent = dict.player.copied || (currentLang === 'en' ? 'Copied!' : 'Скопировано!');
            setTimeout(() => txt.textContent = old, 2000);
          }
        });
      }

      const exportProfileBtn = document.getElementById('export-card-btn');
      if (exportProfileBtn) {
        exportProfileBtn.addEventListener('click', () => {
          if (typeof window.api.generateProfileCard === 'function') {
            window.api.generateProfileCard(data);
          }
        });
      }

      renderFilteredMaps();

      document.getElementById('loading').classList.add('hidden');
      document.getElementById('content').classList.remove('hidden');

    } catch (e) {
      console.error(e);
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('error').classList.remove('hidden');
    }
  });
})();
