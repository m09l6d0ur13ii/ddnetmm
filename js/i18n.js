const dictionaries = {
  ru: {
    header: {
      searchPlaceholder: "Поиск карты (например: Kintaro)",
      searchButton: "Поиск"
    },
    home: {
      title: "DDNet Map Mastery",
      subtitle: "Абсолютный Топ Игроков. Формула, где решает не количество пройденных карт, а исключительно ваше время.",
      aboutBtn: "Почему эта система лучше старой?",
      compareBtn: "Графики Сравнения",
      howItWorks: "Как считаются очки?",
      basePtsTitle: "Очки за прохождение",
      basePtsDesc: "Стандартные очки DDNet. Вы получаете их 1 раз за финиш.",
      skillPtsTitle: "Скилл Бонус (До х5)",
      skillPtsDesc: "Выдается за близость вашего времени к Мировому Рекорду. Чем ближе вы к Топ-1, тем больше бонуса вы сохраните.",
      leaderboardTitle: "Глобальный ранг",
      tableRank: "Место",
      tablePlayer: "Игрок",
      tableBase: "Base PTS",
      tableSkill: "Skill PTS",
      tableTotal: "Total Mastery",
      loading: "Загрузка...",
      empty: "Нет данных",
      searchResultBase: "New Base:",
      searchResultSkill: "New Skill:",
      searchResultTotal: "Total Map Mastery:"
    },
    player: {
      title: "Профиль игрока",
      back: "Вернуться в топ",
      basePts: "Base PTS",
      skillPts: "Skill PTS",
      totalPts: "Total Mastery",
      mapsTitle: "Топ пройденных карт",
      mapName: "Карта",
      mapServer: "Сервер",
      mapTime: "Время",
      mapRecord: "Рекорд",
      mapGap: "Отставание",
      mapEarned: "Заработано",
      loading: "Загрузка...",
      error: "Игрок не найден",
      statBase: "Base PTS",
      statSkill: "Skill PTS",
      statTotal: "Total Mastery",
      searchBtn: "Найти",
      searchPlaceholder: "Найти игрока...",
      mapsWithSkillBonus: "Карты со Skill Bonus",
      tableBase: "Base",
      tableSkill: "Skill Bonus",
      tableTopDDNet: "Top DDNet"
    },
    compare: {
      title: "Сравнение систем: Ранг vs Время",
      desc: "Ванильный DDNet распределяет очки основываясь на месте (Ранге) в таблице лидеров. Это создает несправедливые \"ступеньки\". Наша формула Map Mastery распределяет очки основываясь на Времени, создавая плавную кривую скилла.",
      scenarios: [
        {
          name: "Сценарий 1: Плотный Fastcap (s = 3.0)",
          desc: "Короткая карта, 10 игроков приехали в пределах одной секунды. В DDNet игрок на 10 месте почти не получает очков из-за ранга, хотя отстал всего на 0.9 сек. Наша система плавно снижает очки за время."
        },
        {
          name: "Сценарий 2: Ошибка в конце (s = 2.0)",
          desc: "Карта средней длины. Игрок совершает ошибку и теряет 10 секунд. В DDNet его обгоняет толпа из 20 человек, и его очки падают в 10 раз. У нас он теряет только пропорциональную часть очков."
        },
        {
          name: "Сценарий 3: Хардкор на выживание (s = 0.5)",
          desc: "Очень сложная карта. Второй финишер отстал от первого на 30 минут! В DDNet он теряет 20% очков просто потому что он второй. В нашей системе он почти ничего не теряет, потому что дисперсия времени огромная."
        },
        {
          name: "Сценарий 4: Идеальный забег, но ты второй",
          desc: "Ты проехал карту идеально, побив старый рекорд, но кто-то проехал на 0.01 секунду быстрее. В ванильной системе ты лишаешься кучи очков. В Map Mastery твои очки почти равны Топ-1."
        },
        {
          name: "Сценарий 5: Мертвая карта (Мало игроков)",
          desc: "Карту прошло всего 3 человека. В DDNet 3-е место получает мало очков, хотя время может быть отличным. В нашей системе время решает всё, независимо от количества игроков."
        }
      ]
    },
    about: {
      title: "Почему эта система лучше?",
      back: "На главную",
      intro: "Оригинальная система DDNet прекрасна для любителей гриндить (проходить тысячи легких карт). Но она плохо отражает настоящий скилл игрока. Мы создали математическую модель, которая справедливо награждает за мастерство.",
      card1: {
        title: "Оригинальный DDNet",
        p1: "Игрок А прошел 1000 легких карт на среднее время и получил 5000 очков.",
        p2: "Игрок Б прошел 100 сложных карт, везде поставил Мировой Рекорд и получил 2500 очков.",
        p3: "Итог: Игрок А в таблице выше, хотя Игрок Б — легенда спидрана."
      },
      card2: {
        title: "Наша система (Map Mastery)",
        p1: "Мы сохраняем базовые очки (чтобы гринд имел смысл), но добавляем Огромный Скилл-Бонус (до x5) за ваше время.",
        p2: "Важно только ВРЕМЯ. Формула плавно снижает ваши бонусные очки в зависимости от того, насколько вы отстали от Мирового Рекорда на конкретной карте.",
        p3: "Итог: Рекордсмены получают заслуженные топовые места."
      },
      techTitle: "Технические детали (Математика)",
      formula1Title: "Экспоненциальная кривая вместо лесенок",
      formula1Desc: "Очки падают по плавной кривой. Вы не потеряете очки просто из-за того, что кто-то занял место перед вами.",
      formula2Title: "Защита от t0-абузеров",
      formula2Desc: "Мы проверяем 'rank >= team_rank'. Это математически доказывает, что лучший рекорд игрока был поставлен именно в команде.",
      formula3Title: "TimeRatio Limit",
      formula3Desc: "Ограничитель, защищающий систему от взрыва очков при рассинхронах рекордов.",
      formula4Title: "Статистический коэффициент (s)",
      formula4Desc: "Формула высчитывает дисперсию (стандартное отклонение) времен Топ-50 игроков. Если конкуренция плотная — алгоритм делает 's' строгим. Если результаты растянуты на часы — делает 's' мягким. Баланс настраивается сам!",
      antiTas: {
        title: "Многоуровневая система защиты от ТАС-ботов и читеров",
        desc: "Публичные серверы DDStats часто подвергаются атакам ТАС-ботов и сомнительных скриптов, забивающих первые места в таблицах. В Map Mastery внедрена 5-ступенчатая система очистки данных и обогащения рекордов.",
        l1Title: "1. Глобальный Черный Список (Blacklist)",
        l1Desc: "Известные ТАСеры и читеры заносятся в blacklist.txt и полностью исключаются из глобального Топ-500 и таблиц всех карт.",
        l2Title: "2. Порог минимального времени (Map Min Times)",
        l2Desc: "Для сложных или забагованных карт задаётся минимально физически возможный порог времени (например 2 Days in the back | 7:30). Любой финиш быстрее этого времени отбрасывается без бана игрока на других картах.",
        l3Title: "3. Исключения конкретных финишей (Ignored Finishes)",
        l3Desc: "Точечное аннулирование фейковых результатов на конкретной карте (например .x0r* | 2 Days in the back), когда читер поставил фейковый результат под именем честного игрока.",
        l4Title: "4. Кастомные Мировые Рекорды (Custom Map Records)",
        l4Desc: "Возможность вручную задать настоящий Мировой Рекорд (например 2 Days in the back | 08:07 | Xardas), если топ-100 DDStats забит ТАС-ботами, а истинный рекордсмен находится за пределами глобального Топ-500.",
        l5Title: "5. Автоматический алгоритм обогащения карт (Map Enrichment Engine)",
        l5Desc: "Скрипт сканирует верифицированные профили всех легитимных игроков из Топ-500 и автоматически восстанавливает честные места и рекорды на сломанных картах."
      },
      footerSummary: "Итог: Новая система наказывает тех, кто просто собирает легкие топы с плохим временем, и невероятно щедро награждает тех, кто ставит действительно мощные времена!"
    },
    map: {
      title: "Лидерборд карты",
      back: "На главную",
      mapNotFound: "Карта не найдена в базе (или никто из Топ 500 ее не прошел)",
      stats: "Статистика карты",
      statRecord: "Рекорд (из Топ 500)",
      statS: "Строгость (s)",
      tableRank: "Место",
      tablePlayer: "Игрок",
      tableTime: "Время",
      tableGap: "Отставание",
      tablePts: "Skill PTS",
      loading: "Загрузка...",
      enrichedBanner: "⚡ Данная карта была обогащена верифицированными финишами легитимных игроков из-за ТАС-рекордов / сомнительных результатов на DDStats",
      loadTop100: "Загрузить Топ 100"
    }
  },
  en: {
    header: {
      searchPlaceholder: "Search map (e.g. Kintaro)",
      searchButton: "Search"
    },
    home: {
      title: "DDNet Map Mastery",
      subtitle: "The Absolute Player Top. A formula where your time decides, not the quantity of completed maps.",
      aboutBtn: "Why is this better?",
      compareBtn: "Comparison Graphs",
      howItWorks: "How are points calculated?",
      basePtsTitle: "Base Points",
      basePtsDesc: "Standard DDNet points. You get them once for finishing.",
      skillPtsTitle: "Skill Bonus (Up to x5)",
      skillPtsDesc: "Awarded for being close to the World Record. The closer you are to Top 1, the more bonus you keep.",
      leaderboardTitle: "Global Rank",
      tableRank: "Rank",
      tablePlayer: "Player",
      tableBase: "Base PTS",
      tableSkill: "Skill PTS",
      tableTotal: "Total Mastery",
      loading: "Loading...",
      empty: "No data",
      searchResultBase: "New Base:",
      searchResultSkill: "New Skill:",
      searchResultTotal: "Total Map Mastery:"
    },
    player: {
      title: "Player Profile",
      back: "Back to ladder",
      basePts: "Base PTS",
      skillPts: "Skill PTS",
      totalPts: "Total Mastery",
      mapsTitle: "Top Played Maps",
      mapName: "Map",
      mapServer: "Server",
      mapTime: "Time",
      mapRecord: "Record",
      mapGap: "Gap",
      mapEarned: "Earned",
      loading: "Loading...",
      error: "Player not found",
      statBase: "Base PTS",
      statSkill: "Skill PTS",
      statTotal: "Total Mastery",
      searchBtn: "Search",
      searchPlaceholder: "Search player...",
      mapsWithSkillBonus: "Maps with Skill Bonus",
      tableBase: "Base",
      tableSkill: "Skill Bonus",
      tableTopDDNet: "Top DDNet"
    },
    compare: {
      title: "System Comparison: Rank vs Time",
      desc: "Vanilla DDNet distributes points based on your place (Rank) in the leaderboard. This creates unfair \"staircases\". Our Map Mastery formula distributes points based on Time, creating a smooth skill curve.",
      scenarios: [
        {
          name: "Scenario 1: Dense Fastcap (s = 3.0)",
          desc: "A short map, 10 players finished within one second. In DDNet, the 10th player gets almost no points because of rank, even though they are only 0.9s behind. Our system smoothly reduces points for time."
        },
        {
          name: "Scenario 2: Mistake at the end (s = 2.0)",
          desc: "Medium length map. A player makes a mistake and loses 10 seconds. In DDNet, a crowd of 20 people overtakes them, and their points drop 10x. With us, they only lose a proportional chunk of points."
        },
        {
          name: "Scenario 3: Hardcore Survival (s = 0.5)",
          desc: "A very hard map. The second finisher is 30 minutes behind the first! In DDNet they lose 20% points just for being second. In our system they lose almost nothing, because the time variance is huge."
        },
        {
          name: "Scenario 4: Perfect run, but you're second",
          desc: "You drove the map perfectly, beating the old record, but someone was 0.01 seconds faster. In the vanilla system you lose a lot of points. In Map Mastery your points are almost equal to Top 1."
        },
        {
          name: "Scenario 5: Dead map (Few players)",
          desc: "Only 3 people finished the map. In DDNet 3rd place gets few points, even if the time is excellent. In our system, time decides everything, regardless of player count."
        }
      ]
    },
    about: {
      title: "Why is this system better?",
      back: "Back to home",
      intro: "The original DDNet system is great for grinders (passing thousands of easy maps). But it poorly reflects a player's true skill. We created a mathematical model that fairly rewards mastery.",
      card1: {
        title: "Original DDNet",
        p1: "Player A passed 1000 easy maps with average times and got 5000 points.",
        p2: "Player B passed 100 hard maps, set World Records everywhere and got 2500 points.",
        p3: "Result: Player A is higher in the table, even though Player B is a speedrun legend."
      },
      card2: {
        title: "Our System (Map Mastery)",
        p1: "We keep the base points (so grinding has a purpose), but add a Huge Skill Bonus (up to x5) for your time.",
        p2: "TIME is all that matters. The formula smoothly decreases your bonus points based on how far behind the World Record you are on a specific map.",
        p3: "Result: Record holders get the top spots they deserve."
      },
      techTitle: "Technical Details (Math)",
      formula1Title: "Exponential curve instead of staircases",
      formula1Desc: "Points drop on a smooth curve. You won't lose points just because someone took the spot ahead of you.",
      formula2Title: "Protection against t0-abusers",
      formula2Desc: "We check 'rank >= team_rank'. This mathematically proves that the player's best record was indeed set in a team.",
      formula3Title: "TimeRatio Limit",
      formula3Desc: "A limiter that protects the system from points explosion during record desyncs.",
      formula4Title: "Statistical coefficient (s)",
      formula4Desc: "The formula calculates the variance of Top 50 times. If competition is dense — the algorithm makes 's' strict. If results are spread across hours — it makes 's' forgiving. The balance auto-tunes itself!",
      antiTas: {
        title: "Multi-Layer Anti-TAS & Cheat Protection System",
        desc: "Public DDStats servers are often targeted by TAS bots and suspicious scripts that flood leaderboard tables. Map Mastery features a 5-stage data cleanup and map enrichment engine.",
        l1Title: "1. Global Blacklist",
        l1Desc: "Known TASers and cheaters are listed in blacklist.txt and completely excluded from global Top 500 and all map leaderboards.",
        l2Title: "2. Minimum Map Time Thresholds (Map Min Times)",
        l2Desc: "Configures minimum realistic finish time thresholds per map (e.g. 2 Days in the back | 7:30). Any finish faster than the threshold is filtered as TAS without banning the player globally.",
        l3Title: "3. Specific Ignored Finishes",
        l3Desc: "Per-player per-map exceptions to remove individual fake finishes set under a legitimate player's nickname.",
        l4Title: "4. Custom World Records",
        l4Desc: "Allows manual specification of true legal World Records (e.g. 2 Days in the back | 08:07 | Xardas) when DDStats top 100 is flooded and the legitimate record holder is outside global Top 500.",
        l5Title: "5. Automated Map Enrichment Engine",
        l5Desc: "Scans verified profiles of all legitimate top players and automatically reconstructs accurate map leaderboards and World Records."
      },
      footerSummary: "Conclusion: The new system punishes those who collect easy tops with bad times, and incredibly generously rewards those who set truly powerful times!"
    },
    map: {
      title: "Map Leaderboard",
      back: "Back to home",
      mapNotFound: "Map not found in database (or nobody in Top 500 finished it)",
      stats: "Map Statistics",
      statRecord: "Record (from Top 500)",
      statS: "Strictness (s)",
      tableRank: "Rank",
      tablePlayer: "Player",
      tableTime: "Time",
      tableGap: "Gap",
      tablePts: "Skill PTS",
      loading: "Loading...",
      enrichedBanner: "⚡ This map leaderboard was enriched with verified legitimate player finishes due to TAS / suspicious records on DDStats",
      loadTop100: "Load Top 100"
    }
  }
};
