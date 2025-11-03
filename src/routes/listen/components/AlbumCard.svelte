<script lang="ts">
    import SvgIcon from '$lib/ui/SvgIcon.svelte';
    import { mdiPlay, mdiHeart, mdiHeartOutline } from '@mdi/js';

    interface Props {
        album: {
            id: string;
            title: string;
            artist: string;
            cover: string;
            year: number;
            trackCount: number;
            duration: string;
        };
    }

    const { album }: Props = $props();

    let isFavorite = $state(false);
</script>

<a href={`/album/${album.id}`} class="album-card">
    <div class="album-card__cover">
        <img src={album.cover} alt={album.title} />
        <div class="album-card__overlay">
            <button
                class="album-card__play"
                onclick={() => console.log('Play album')}
            >
                <SvgIcon path={mdiPlay} size={24} />
            </button>
            <button
                class="album-card__favorite"
                onclick={() => (isFavorite = !isFavorite)}
            >
                <SvgIcon path={isFavorite ? mdiHeart : mdiHeartOutline} size={20} />
            </button>
        </div>
    </div>

    <div class="album-card__content">
        <h3 class="album-card__title">{album.title}</h3>
        <p class="album-card__artist">{album.artist}</p>
        <div class="album-card__meta">
            <span>{album.year}</span>
            <span>•</span>
            <span>{album.trackCount} tracks</span>
        </div>
    </div>
</a>

<style lang="scss">
    .album-card {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        background-color: var(--bg-primary);
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-primary);
        padding: var(--space-3);
        text-decoration: none;
        color: inherit;
        transition: all var(--duration-normal) var(--easing-ease-out);

        &:hover {
            transform: translateY(-4px);
            border-color: var(--color-brand-500);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);

            @media (prefers-color-scheme: dark) {
                box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
            }
        }
    }

    .album-card__cover {
        position: relative;
        width: 100%;
        aspect-ratio: 1;
        border-radius: var(--radius-md);
        overflow: hidden;
        background-color: var(--color-gray-200);

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    .album-card__overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-3);
        transition: all var(--duration-normal) var(--easing-ease-out);

        .album-card:hover & {
            background: rgba(0, 0, 0, 0.4);
        }
    }

    .album-card__play {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background-color: var(--color-brand-500);
        color: var(--color-white);
        border: none;
        cursor: pointer;
        transition: all var(--duration-normal) var(--easing-ease-out);
        transform: scale(0.8);
        opacity: 0;

        .album-card:hover & {
            transform: scale(1);
            opacity: 1;
        }

        &:hover {
            background-color: var(--color-brand-600);
            transform: scale(1.1);
        }
    }

    .album-card__favorite {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.2);
        color: var(--color-white);
        border: none;
        cursor: pointer;
        transition: all var(--duration-normal) var(--easing-ease-out);
        transform: scale(0.8);
        opacity: 0;

        .album-card:hover & {
            transform: scale(1);
            opacity: 1;
        }

        &:hover {
            background-color: var(--color-red-500);
            transform: scale(1.1);
        }
    }

    .album-card__content {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        min-height: 60px;
    }

    .album-card__title {
        margin: 0;
        @include text-md();
        font-weight: 600;
        color: var(--color-gray-900);
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;

        @media (prefers-color-scheme: dark) {
            color: var(--color-white);
        }
    }

    .album-card__artist {
        margin: 0;
        @include text-sm();
        color: var(--color-gray-600);

        @media (prefers-color-scheme: dark) {
            color: var(--color-gray-400);
        }
    }

    .album-card__meta {
        display: flex;
        gap: var(--space-2);
        @include text-xs();
        color: var(--color-gray-500);

        @media (prefers-color-scheme: dark) {
            color: var(--color-gray-500);
        }
    }
</style>