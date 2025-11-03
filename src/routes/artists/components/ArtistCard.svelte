<script lang="ts">
    import SvgIcon from '$lib/ui/SvgIcon.svelte';
    import { mdiCheckCircle, mdiPlay, mdiHeart, mdiHeartOutline } from '@mdi/js';
    import { Button } from '$lib/ui';

    interface Props {
        artist: {
            id: string;
            name: string;
            avatar: string;
            genre: string;
            followers: number;
            tracks: number;
            isVerified: boolean;
            coverImg: string;
            description: string;
        };
    }

    const { artist }: Props = $props();

    let isFavorite = $state(false);

    function toggleFavorite() {
        isFavorite = !isFavorite;
    }
</script>

<div class="artist-card">
    <div class="artist-card__cover">
        <img src={artist.coverImg} alt={artist.name} />
        <div class="artist-card__overlay">
            <button class="artist-card__play">
                <SvgIcon path={mdiPlay} size={24} />
            </button>
        </div>
    </div>

    <div class="artist-card__content">
        <div class="artist-card__header">
            <div class="artist-card__info">
                <img src={artist.avatar} alt={artist.name} class="artist-card__avatar" />
                <div>
                    <div class="artist-card__name-wrapper">
                        <h3 class="artist-card__name">{artist.name}</h3>
                        {#if artist.isVerified}
                            <SvgIcon path={mdiCheckCircle} size={18} class="artist-card__verified" />
                        {/if}
                    </div>
                    <p class="artist-card__genre">{artist.genre}</p>
                </div>
            </div>
            <button
                class="artist-card__favorite"
                onclick={toggleFavorite}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
                <SvgIcon path={isFavorite ? mdiHeart : mdiHeartOutline} size={20} />
            </button>
        </div>

        <p class="artist-card__description">{artist.description}</p>

        <div class="artist-card__stats">
            <div class="artist-card__stat">
                <span class="artist-card__stat-label">Followers</span>
                <span class="artist-card__stat-value">{(artist.followers / 1000).toFixed(1)}K</span>
            </div>
            <div class="artist-card__stat">
                <span class="artist-card__stat-label">Tracks</span>
                <span class="artist-card__stat-value">{artist.tracks}</span>
            </div>
        </div>

        <a href={`/artists/${artist.id}`} class="artist-card__link">
            <Button variant="primary" fullWidth>View Artist</Button>
        </a>
    </div>
</div>

<style lang="scss">
    .artist-card {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        background-color: var(--bg-primary);
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-primary);
        overflow: hidden;
        transition: all var(--duration-normal) var(--easing-ease-out);


        &:hover {
            transform: translateY(-8px);
            border-color: var(--color-brand-500);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);

            @media (prefers-color-scheme: dark) {
                box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
                border-color: var(--color-brand-400);
            }
        }
    }

    .artist-card__cover {
        position: relative;
        width: 100%;
        height: 200px;
        background-color: var(--color-gray-200);
        overflow: hidden;

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    .artist-card__overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all var(--duration-normal) var(--easing-ease-out);

        .artist-card:hover & {
            background: rgba(0, 0, 0, 0.4);
        }
    }

    .artist-card__play {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background-color: var(--color-brand-500);
        color: var(--color-white);
        border: none;
        cursor: pointer;
        transition: all var(--duration-normal) var(--easing-ease-out);
        transform: scale(0.8);
        opacity: 0;

        .artist-card:hover & {
            transform: scale(1);
            opacity: 1;
        }

        &:hover {
            background-color: var(--color-brand-600);
            transform: scale(1.1);
        }
    }

    .artist-card__content {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        padding: var(--space-4);
    }

    .artist-card__header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--space-3);
    }

    .artist-card__info {
        display: flex;
        gap: var(--space-3);
        align-items: flex-start;
        flex: 1;
    }

    .artist-card__avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
    }

    .artist-card__name-wrapper {
        display: flex;
        align-items: center;
        gap: var(--space-2);
    }

    .artist-card__name {
        margin: 0;
        @include text-md();
        font-weight: 600;
        color: var(--color-gray-900);

        @media (prefers-color-scheme: dark) {
            color: var(--color-white);
        }
    }

    .artist-card__verified {
        color: var(--color-brand-500);
    }

    .artist-card__genre {
        margin: var(--space-1) 0 0 0;
        @include text-xs();
        color: var(--color-gray-600);
        text-transform: uppercase;
        letter-spacing: var(--letter-spacing-wide);
        font-weight: 500;

        @media (prefers-color-scheme: dark) {
            color: var(--color-gray-400);
        }
    }

    .artist-card__favorite {
        background: transparent;
        border: none;
        cursor: pointer;
        color: var(--color-gray-400);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all var(--duration-normal) var(--easing-ease-out);
        flex-shrink: 0;

        @media (prefers-color-scheme: dark) {
            color: var(--color-gray-600);
        }

        &:hover {
            color: var(--color-red-500);
            transform: scale(1.1);
        }
    }

    .artist-card__description {
        margin: 0;
        @include text-sm();
        color: var(--color-gray-600);
        line-height: 1.5;
        min-height: 3em; // 2 строки × 1.5 высота = 3em
        max-height: 3em;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;

        @media (prefers-color-scheme: dark) {
            color: var(--color-gray-400);
        }
    }

    .artist-card__stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-3);
        padding-top: var(--space-3);
        border-top: 1px solid var(--border-primary);
    }

    .artist-card__stat {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
    }

    .artist-card__stat-label {
        @include text-xs();
        color: var(--color-gray-600);
        text-transform: uppercase;
        letter-spacing: var(--letter-spacing-wide);
        font-weight: 500;

        @media (prefers-color-scheme: dark) {
            color: var(--color-gray-400);
        }
    }

    .artist-card__stat-value {
        @include text-md();
        font-weight: 600;
        color: var(--color-gray-900);

        @media (prefers-color-scheme: dark) {
            color: var(--color-white);
        }
    }

    .artist-card__link {
        text-decoration: none;
    }
</style>