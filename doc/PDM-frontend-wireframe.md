# PDM Frontend Wireframe

Этот документ описывает текущую фронтенд-структуру PDM для быстрого построения wireframe в Pencil, Figma, Miro или другом инструменте.

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
  - `/studio/dashboard`
  - `/studio/music`
  - `/studio/content`
  - `/studio/community`
  - `/studio/analytics`
  - `/studio/wallet`
- `/studio/artist/login` — вход студийного пользователя
- `/studio/artist/register` — регистрация студийного пользователя

### Основной layout `(app)`

Файл: `src/routes/(app)/+layout.svelte`

Содержит:

- фиксированный левый сайдбар `Sidebar.svelte`
- основное содержимое страницы внутри `.page`
- плавающий плеер `MusicPlayer.svelte`, показывается только если в `playerStore` есть текущий трек

Каркас страницы:

```
| Sidebar | Main page content |
|         | -----------------|
|         | Page body         |
|         |                   |
|         | Music player      |
```

Sidebar содержит:

- логотип / кнопка разворачивания
- поиск
- навигационные ссылки
- разделители
- аккаунт пользователя

---

## 2. Login / Register page

Файл: `src/routes/(login)/login/LoginPage.svelte`

### Структура

- split-screen layout
  - левый экран: форма входа/регистрации
  - правый экран: визуальный блок с брендом, заголовком и текстом

### Форма

- Email
- Password
- Confirm password (только в режиме регистрации)
- Remember me
- Forgot password
- Primary button Sign in / Create account
- Google OAuth кнопка
- Текст-переключение между login/register

### Компоненты

- `Input.svelte`
- `Checkbox.svelte`
- `Button.svelte`
- `Link.svelte`
- `notificationStore`

### Pencil-блоки

1. Header: заголовок, подзаголовок
2. Form: карточка с полями ввода
3. Actions: Primary button, Google button
4. Footer: переключение режима
5. Side visual: панель бренда и сообщение

---

## 3. Главная страница `Home`

Файл: `src/routes/(app)/+page.svelte`

### Структура

- верхний хедер с приветствием, подписью и кнопкой обновления
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
- grid карточек

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

- карточки с контентом и grid layout
- правый сайд с уведомлениями и предложениями
- заголовки секций с иконками и ссылкой "View all"

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

- `MusicTrack.svelte`
- `AlbumCard.svelte`
- `PlaylistCard.svelte`
- `HeroSection.svelte`
- `SvgIcon.svelte`

### Pencil-блоки

- Hero header
- список секций карточек
- горизонтальные скроллы / grid
- discovery секция с карточками альбомов и плейлистов

---

## 5. Страница `Artists`

Файл: `src/routes/(app)/artists/+page.svelte`

### Структура

- hero search
- основной контент
- сетка артистов

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

- одна страница демонстрации дизайн-системы
- включает компонент `DesignSystemDemo.svelte`

### Основные разделы

- Typography samples
- Color swatches
- Button examples
- Form element examples
- Spacing scale
- Shadow examples
- Theme-aware card

---

## 8. Студийная зона артиста

Файл: `src/routes/studio/+layout.svelte`

### Основные точки входа

- `/studio/dashboard`
- `/studio/music`
- `/studio/content`
- `/studio/community`
- `/studio/analytics`
- `/studio/wallet`

### Особенности layout

- общая структура как у `(app)`
- sidebar с другими пунктами
- `NotificationContainer` для системных сообщений

---

## 9. Дизайн-система и токены

### Основные файлы

- `src/styles/tokens.css`
- `src/styles/themes/dark.css`
- `src/styles/themes/light.css`
- `src/app.scss`

### Токены

- Brand: `--color-brand-25` … `--color-brand-900`
- Semantic: `--primary`, `--success`, `--warning`, `--error`, `--info`
- Background: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-surface`, `--bg-overlay`
- Text: `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-disabled`, `--text-inverse`, `--text-on-primary`
- Border: `--border-primary`, `--border-secondary`, `--border-focus`, `--border-error`, `--border-success`
- Spacing: `--space-1` … `--space-24`
- Radius: `--radius-xs` … `--radius-full`
- Typography: `--font-family-sans`, `--font-size-xs` … `--font-size-7xl`, `--font-weight-normal`, `--font-weight-medium`, `--font-weight-semibold`, `--font-weight-bold`

### Theme toggling

- Тема сохраняется в `localStorage`
- Изменяет `document.documentElement.dataset.theme`
- Работает с `src/styles/themes/dark.css` и `src/styles/themes/light.css`

---

## 10. Компонентная библиотека

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

## 11. Pencil-ready wireframe suggestions

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

## 12. Рекомендации для продолжения

Если нужно, можно:

1. построить схему каждой страницы в формате `Page -> Sections -> Components`;
2. сконвертировать текущие страницы в набор wireframes с простыми блоками;
3. добавить текстовые обозначения размеров и отступов для Pencil.
