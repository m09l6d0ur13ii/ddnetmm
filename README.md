# DDNet Map Mastery 🏆

[🇷🇺 Русский](#русский) | [🇬🇧 English](#english)

<a name="русский"></a>
## 🇷🇺 Русский

**DDNet Map Mastery** — это альтернативная система ранжирования и подсчета очков (PTS) для игроков DDNet. Она решает главную проблему оригинального ладдера: здесь решает не количество пройденных карт, а исключительно ваше **время** и **навык** (Skill).

### 🌟 Особенности
- **Base PTS**: Стандартные очки DDNet за завершение карты. Вы получаете их ровно один раз.
- **Skill Bonus (До x5)**: Уникальная система бонусов. Вы получаете дополнительные очки в зависимости от того, насколько близко ваше время к Мировому Рекорду. Чем вы ближе к Топ-1, тем больше бонусов вы зарабатываете.
- **Математическая справедливость**: Формула использует динамический коэффициент строгости (от 0.5 до 3.0), который вычисляется на основе разброса времени (дисперсии) в топе каждой конкретной карты. На картах с плотной конкуренцией бонус получить сложнее!

### 🚀 Запуск (GitHub Pages)
Этот сайт спроектирован для работы в условиях жестких ограничений статических хостингов вроде GitHub Pages.
- **Без бэкенда**: Вся база данных и рекорды пререндерены в статические JSON/JS файлы.
- **Локализация**: Сайт переведен на русский и английский языки (переключение сохраняется в LocalStorage).
- **Быстродействие**: Максимально быстрый интерфейс на чистом JS + Tailwind CSS без тяжелых фреймворков.

---

<a name="english"></a>
## 🇬🇧 English

**DDNet Map Mastery** is an alternative ranking and points (PTS) system for DDNet players. It solves the main issue of the original ladder: here, it's not the sheer number of completed maps that matters, but exclusively your **time** and **skill**.

### 🌟 Features
- **Base PTS**: Standard DDNet points for completing a map. You get these exactly once.
- **Skill Bonus (Up to x5)**: A unique bonus system. You receive additional points depending on how close your time is to the World Record. The closer you are to Top-1, the more bonuses you earn.
- **Mathematical Fairness**: The formula uses a dynamic strictness coefficient (from 0.5 to 3.0), which is calculated based on the variance of times in the top of each specific map. On maps with tight competition, it's harder to get the bonus!

### 🚀 Deployment (GitHub Pages)
This site is designed to run under the strict limitations of static hostings like GitHub Pages.
- **No backend**: The entire database and records are pre-rendered into static JSON/JS files.
- **Localization**: The site is available in English and Russian (language toggle is saved in LocalStorage).
- **Performance**: Extremely fast UI built with Vanilla JS + Tailwind CSS without heavy frameworks.
