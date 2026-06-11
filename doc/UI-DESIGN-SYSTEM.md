# PDM Frontend UI & Design System Overview

## 1. Общая архитектура

Фронтенд PDM основан на SvelteKit и использует модульную UI-систему с компонентами в `src/lib/ui` и общими компонентами в `src/lib/components`.

Основные зоны:

- `src/routes/(app)/+layout.svelte` — оболочка основного приложения с сайдбаром и плеером
- `src/routes/(login)/login/+page.svelte` — страница авторизации / регистрации
- `src/routes/(app)` — пользовательская часть с Home, Listen, Artists, Profile, Crowdfunding и админ-дизайн
- `src/routes/studio` — студийная зона для артистов (музыка, регистрация, дашборд, контент и т.д.)
- `src/routes/(app)/admin/design/+page.svelte` — демонстрация дизайн-системы

## 2. Дизайн-система

### CSS-токены

Файлы с токенами и темами:

- `src/styles/tokens.css` — базовые CSS-переменные (цвета, отступы, радиусы, типографика)
- `src/styles/_variables.scss` — миксины для типографики, кнопок, инпутов и контейнеров
- `src/styles/themes/dark.css` — тема "dark"
- `src/styles/themes/light.css` — тема "light"
- `src/app.scss` — импорт тем и базовые глобальные стили

### Ключевые токены

- Цвета бренда: `--color-brand-XXX`
- Semantic: `--primary`, `--success`, `--warning`, `--error`, `--info`
- Фоны: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-surface`
- Текст: `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-on-primary`
- Отступы: `--space-1` … `--space-24`
- Радиусы: `--radius-sm` … `--radius-full`

### Миксины

- `text-display-*`, `text-*` — типографика
- `font-medium`, `font-semibold`, `font-bold`
- `container`, `flex-center`, `flex-between`
- `button-base`, `button-primary`, `button-secondary`, `button-outline`
- `input-base`

## 3. UI-компоненты

### Базовые компоненты

- `src/lib/ui/Button.svelte`
- `src/lib/ui/Input.svelte`
- `src/lib/ui/Select.svelte`
- `src/lib/ui/Link.svelte`
- `src/lib/ui/Checkbox.svelte`
- `src/lib/ui/Avatar.svelte`
- `src/lib/ui/StatCard.svelte`
- `src/lib/ui/Tabs.svelte`
- `src/lib/ui/InfoMessage.svelte`
- `src/lib/ui/NotificationContainer.svelte`
- `src/lib/ui/FileUpload.svelte`
- `src/lib/ui/Progress.svelte`
- `src/lib/ui/SvgIcon.svelte`

### Медиа / звук

- `src/lib/ui/components/MusicTrack.svelte`
- `src/lib/ui/components/MusicAlbum.svelte`
- `src/lib/ui/components/MusicPlayer/MusicPlayer.svelte`
- `src/lib/ui/components/MusicPlayer/Player.svelte`
- `src/lib/ui/components/MusicPlayer/PlayerAudio.svelte`
- `src/lib/ui/components/MusicPlayer/CoverPreview.svelte`
- `src/lib/ui/components/Modal/Modal.svelte`
- `src/lib/ui/components/Modal/SaveTrackModal.svelte`

### Общие вспомогательные компоненты

- `src/lib/components/Sidebar.svelte`
- `src/lib/components/ThemeToggle.svelte`
- `src/lib/components/DesignSystemDemo.svelte`

### Экспорт UI-пакета

- `src/lib/ui/index.ts`
  - экспортирует `Button`, `Input`, `Select`, `Link`, `Checkbox`, `Avatar`, `StatCard`, `Tabs`, `InfoMessage`, `NotificationContainer`, `notificationStore`

## 4. Основные страницы

### Пользовательская часть `(app)`

- `/` — `src/routes/(app)/+page.svelte` — главная дашборд-страница
- `/listen` — `src/routes/(app)/listen/+page.svelte` — музыкальный интерфейс с разделами, плейлистами и треками
- `/artists` — `src/routes/(app)/artists/+page.svelte` — список артистов
- `/crowdfunding` — `src/routes/(app)/crowdfunding/+page.svelte`
- `/profile/[username]` — профиль артиста `src/routes/(app)/profile/[username]/+page.svelte`
- `/admin/design` — демонстрация дизайн-системы `src/routes/(app)/admin/design/+page.svelte`

### Аутентификация

- `/login` — `src/routes/(login)/login/LoginPage.svelte` и `+page.svelte`
- `/login/google` — OAuth вход через Google
- `/logout` — `src/routes/(login)/logout/+page.svelte`

### Студия артиста `(studio)`

- `/studio/artist/login` — логин артиста
- `/studio/artist/register` — регистрация артиста
- `/studio/music` — страница управления музыкой
- `/studio/dashboard` — панель управления
- `/studio/content` — контент
- `/studio/community` — сообщество
- `/studio/wallet` — кошелек

## 5. Что уже реализовано и что нужно восстановить

### Реализовано

- Рабочая тема с CSS-переменными и двумя тематическими файлами
- Базовая дизайн-система через `DesignSystemDemo`
- Кнопки, поля ввода, ссылки, чекбоксы, аватары, табы и уведомления
- Плеер и музыкальные карточки
- Маршрутизация и оболочка приложения с сайдбаром

### Что нужно уточнить / восстановить

- Есть ли пропавшие страницы или маршруты, которые должны быть добавлены к `/app` или `/studio`
- Нужен ли более полный дизайн-документ с макетами страниц и компонентной библиотекой
- Нужно ли синхронизировать темы `light`/`dark` с реальными макетами Figma

## 6. Рекомендация

Если нужно, я могу дальше:

1. построить схему страниц и компонентной системы в markdown с привязкой к реальным файлам;
2. привести `DesignSystemDemo` в полный UI-паспорт (все токены, кнопки, формы, карточки);
3. восстановить недостающие маршруты/компоненты по фактической схеме приложения.

---

Файл создан автоматически на основе текущего состояния фронтенда и структуры `src/`.
