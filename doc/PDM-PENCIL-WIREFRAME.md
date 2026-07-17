# PDM Frontend Pencil Wireframe

## Цель

Этот документ превращает текущий фронтенд PDM в набор "pencil" блоков и страниц для быстрой визуальной схемы или wireframe.
Он описывает:

- основные макеты и страницы
- компонентную библиотеку
- дизайн-токены и темы
- структуру навигации

> Используйте файл как основу для рисования в Pencil, Figma, Miro или любом другом инструменте.

---

## 1. Общая структура

### Основные маршруты

- `/` — главная страница приложения
- `/listen` — музыкальная лента и подборки
- `/artists` — поиск и каталог артистов
- `/crowdfunding` — кампании поддержки артистов
- `/profile/[username]` — профиль артиста
- `/admin/design` — демонстрация дизайн-системы

- `/login` — вход и регистрация пользователя
- `/login/google` — OAuth авторизация
- `/logout` — выход

- `/studio/*` — студийная зона артиста
  - `/studio/artist/login`
  - `/studio/artist/register`
  - `/studio/music`
  - `/studio/dashboard`
  - `/studio/content`
  - `/studio/community`
  - `/studio/wallet`

### Главный макет `(app)`

Основной layout `src/routes/(app)/+layout.svelte` содержит:

- фиксированный левый сайдбар `Sidebar.svelte`
- основное содержимое страницы
- плавающий плеер `MusicPlayer.svelte`, показывающийся при наличии трека

Каркас страницы:

```
| Sidebar | Main page content |
|         | -----------------|
|         | Page body         |
|         |                   |
|         | Music player      |
```

Sidebar включает:

- логотип / кнопка разворачивания
- поиск
- навигационные ссылки
- разделители
- аккаунт пользователя

---

## 2. Login / Register page

Файл: `src/routes/(login)/login/LoginPage.svelte`

### Структура

- split-screen layout:
  - левый экран: форма входа/регистрации
  - правый экран: визуальный блок с брендом и превью

- форма:
  - Email
  - Password
  - Confirm password (только при регистрации)
  - Remember me / forgot password
  - кнопка Sign in / Create account
  - кнопка Sign in with Google
  - текст-переключение режима

### КомпONENTЫ

- `Input.svelte`
- `Checkbox.svelte`
- `Button.svelte`
- `Link.svelte`
- `notificationStore`

### Pencil-блоки

1. `Header`: заголовок, подзаголовок
2. `Form`: карточка с полями ввода
3. `Actions`: Primary button, Google button
4. `Footer`: переключение между login/register
5. `Side visual`: background gradient + большой логотип и сообщение

---

## 3. Главная страница `Home`

Файл: `src/routes/(app)/+page.svelte`

### Структура

- верхний хедер с приветствием и кнопкой обновления
- две колонки:
  - основная лента контента
  - правая боковая панель

### Блоки основной колонки

- Artist Posts
- What's New / Announcements
- Events Near You
- Recommended for You

Каждый блок состоит из:

- section header
- card grid

### Боковая панель

- Quick Links section
- Coming Soon list
- Follow More Artists suggestions

### Используемые компоненты

- `ArtistPostCard.svelte`
- `AnnouncementCard.svelte`
- `EventCard.svelte`
- `RecommendationCard.svelte`
- `QuickLinksSection.svelte`
- `Avatar.svelte`
- `Button.svelte`

### Ключевые UI-паттерны

- карточки с контентом и перемещением по сетке
- правый асайд с уведомлениями и предложениями
- заголовки с иконками и ссылкой "View all"

---

## 4. Страница `Listen`

Файл: `src/routes/(app)/listen/+page.svelte`

### Структура

- фоновой эффект `Aurora.svelte`
- `HeroSection.svelte`
- список секций с карточками

### Секции

- Your Favorites
- Recently Played
- Trending Now
- New Albums
- Featured Playlists
- Explore

### Компоненты внутри

- `MusicTrack.svelte` — карточка трека
- `AlbumCard.svelte`
- `PlaylistCard.svelte`
- `HeroSection.svelte`
- `SvgIcon.svelte`

### Pencil-блоки

- header hero
- главный список секций карточек
- разделы в виде горизонтальных скроллов / grid
- секция discovery с карточками альбомов

---

## 5. Страница `Artists`

Файл: `src/routes/(app)/artists/+page.svelte`

### Структура

- hero search
- основной контент в виде колонок
- сетки артистов

### Секции

- Recommended For You
- Top Artists
- Emerging Artists
- Curated Collections

### Используемые компоненты

- `SearchBar.svelte`
- `ArtistGrid.svelte`
- `ArtistCard.svelte`
- `Button.svelte`
- `SvgIcon.svelte`

---

## 6. Страница `Crowdfunding`

Файл: `src/routes/(app)/crowdfunding/+page.svelte`

### Структура

- hero / верхняя панель статистики
- панель фильтров
- список кампаний
- карточки кампаний

### Паттерны

- фильтры по типу кампании
- поиск
- сортировка
- статусные карточки `StatCard.svelte`
- `CampaignCard.svelte`

### Пример блоков

- Top header: title + description
- Stats row: 4 cards
- Filter bar
- Campaign list grid

---

## 7. Страница `Design System`

Файл: `src/routes/(app)/admin/design/+page.svelte`

### Структура

- страница демонстрации токенов и компонентов
- секции: Typography, Color Tokens, Components, Spacing, Shadows, Theme System

### Основные разделы

- Typography samples
- Color swatches
- Button examples
- Form element examples
- Spacing scale
- Shadow examples
- Theme-aware card

---

## 8. Дизайн-система и токены

### Основные файлы

- `src/styles/tokens.css`
- `src/styles/_variables.scss`
- `src/styles/themes/dark.css`
- `src/styles/themes/light.css`
- `src/app.scss`

### Токены

- Цвета бренда: `--color-brand-50` … `--color-brand-900`
- Semantic: `--primary`, `--success`, `--warning`, `--error`, `--info`
- Background: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-surface`
- Text: `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-on-primary`
- Border: `--border-primary`, `--border-secondary`, `--border-focus`
- Spacing: `--space-1` … `--space-24`
- Radius: `--radius-sm` … `--radius-full`
- Typography: `--font-family-sans`, `--font-size-xl`, `--font-weight-semibold` и т.д.

### Миксины

- `button-base`, `button-primary`, `button-secondary`, `button-outline`
- `input-base`
- `container`, `flex-center`, `flex-between`
- `text-display-*`, `text-*`

### Theme toggling

- `src/lib/components/ThemeToggle.svelte`
- сохраняет тему в localStorage
- меняет `document.documentElement.dataset.theme`
- работает с `src/styles/themes/dark.css` / `light.css`

---

## 9. Компонентная библиотека

### Базовые элементы

- `Button.svelte`
- `Input.svelte`
- `Select.svelte`
- `Link.svelte`
- `Checkbox.svelte`
- `Avatar.svelte`
- `Tabs.svelte`
- `InfoMessage.svelte`
- `NotificationContainer.svelte`
- `FileUpload.svelte`
- `Progress.svelte`
- `SvgIcon.svelte`

### Медиакомпоненты

- `MusicTrack.svelte`
- `MusicAlbum.svelte`
- `MusicPlayer.svelte`
- `Player.svelte`
- `PlayerAudio.svelte`
- `CoverPreview.svelte`
- `Modal.svelte`
- `SaveTrackModal.svelte`

### Общие UI-компоненты

- `Sidebar.svelte`
- `ThemeToggle.svelte`
- `DesignSystemDemo.svelte`

---

## 10. Pencil-ready wireframe suggestions

### Вариант 1: блоковая схема страницы

- Навигация
- Заголовок
- Фильтр / поиск
- Секции карточек
- Сайдбар
- Плеер

### Вариант 2: таблица цветов и токенов

- Цвета бренда
- Фоновые зоны
- Текстовые оттенки
- Интервалы
- Радиусы

### Вариант 3: компонентная библиотека

- кнопка primary / secondary / outline
- инпут с label и error state
- карточка артиста
- карточка кампании
- карточка трека
- аватар
- стикер статистики

---

## 11. Рекомендация для продолжения

Если нужно, я могу:

1. построить схему каждой страницы в формате `Page -> Sections -> Components`;
2. сконвертировать текущие страницы в отдельный набор wireframes с простыми блоками;
3. добавить текстовые обозначения размеров и отступов для Pencil.
