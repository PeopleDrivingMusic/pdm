<script lang="ts">
    import { Button  } from '$lib/ui';
    import SvgIcon from '$lib/ui/SvgIcon.svelte';
    import {
        mdiMagnify,
        mdiTrendingUp,
        mdiFire,
        mdiMusicBoxMultiple,
        mdiCloudUploadOutline,

		mdiPlay

    } from '@mdi/js';
    import ArtistCard from './components/ArtistCard.svelte';
    import ArtistGrid from './components/ArtistGrid.svelte';
    import SearchBar from './components/SearchBar.svelte';

    interface Artist {
        id: string;
        name: string;
        avatar: string;
        genre: string;
        followers: number;
        tracks: number;
        isVerified: boolean;
        coverImg: string;
        description: string;
    }

    // Mock data
    const recommendedArtists: Artist[] = [
        {
            id: '1',
            name: 'Luna Echo',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=luna',
            genre: 'Synthwave',
            followers: 45230,
            tracks: 87,
            isVerified: true,
            coverImg: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
            description: 'Electronic music producer with a passion for atmospheric sounds'
        },
        {
            id: '2',
            name: 'Cosmic Vibes',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cosmic',
            genre: 'Lo-Fi Hip Hop',
            followers: 32150,
            tracks: 124,
            isVerified: true,
            coverImg: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
            description: 'Chill beats and lo-fi production for your daily vibes'
        },
        {
            id: '3',
            name: 'Aurora Sky',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=aurora',
            genre: 'Ambient',
            followers: 28900,
            tracks: 156,
            isVerified: true,
            coverImg: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800',
            description: 'Creating ethereal soundscapes for meditation and relaxation'
        },
        {
            id: '4',
            name: 'Neon Dreams',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=neon',
            genre: 'Electronic',
            followers: 51200,
            tracks: 98,
            isVerified: true,
            coverImg: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
            description: 'Future-forward electronic music with innovative production'
        }
    ];

    const newArtists: Artist[] = [
        {
            id: '5',
            name: 'Rising Star',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rising',
            genre: 'Indie Pop',
            followers: 5230,
            tracks: 12,
            isVerified: false,
            coverImg: 'https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=800',
            description: 'Fresh indie pop sounds from an emerging artist'
        },
        {
            id: '6',
            name: 'Echo Chamber',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=echo',
            genre: 'Alt Rock',
            followers: 3450,
            tracks: 8,
            isVerified: false,
            coverImg: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800',
            description: 'Alternative rock with experimental edge'
        },
        {
            id: '7',
            name: 'Pixel Dreams',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pixel',
            genre: 'Chiptune',
            followers: 2100,
            tracks: 34,
            isVerified: false,
            coverImg: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
            description: 'Retro gaming-inspired electronic music'
        },
        {
            id: '8',
            name: 'Jazz Odyssey',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jazz',
            genre: 'Jazz Fusion',
            followers: 4890,
            tracks: 45,
            isVerified: false,
            coverImg: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
            description: 'Contemporary jazz with modern fusion elements'
        }
    ];

    const topArtists: Artist[] = [
        {
            id: '9',
            name: 'Stellar Sound',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=stellar',
            genre: 'Electronic',
            followers: 125000,
            tracks: 287,
            isVerified: true,
            coverImg: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=800',
            description: 'Grammy-nominated electronic artist'
        },
        {
            id: '10',
            name: 'Wave Master',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wave',
            genre: 'Synthwave',
            followers: 98500,
            tracks: 234,
            isVerified: true,
            coverImg: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
            description: 'Iconic synthwave producer with massive following'
        },
        {
            id: '11',
            name: 'Harmony Flow',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=harmony',
            genre: 'Chill Pop',
            followers: 87300,
            tracks: 156,
            isVerified: true,
            coverImg: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800',
            description: 'Billboard charting artist with smooth pop vibes'
        },
        {
            id: '12',
            name: 'Quantum Beat',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=quantum',
            genre: 'Tech House',
            followers: 76200,
            tracks: 198,
            isVerified: true,
            coverImg: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
            description: 'Pioneer in experimental electronic music'
        }
    ];

    let searchQuery = $state('');

    function handleSearch(query: string) {
        searchQuery = query;
    }

</script>

<div class="artists-page">
    <!-- Hero Section -->
    <section class="artists-hero">
        <div class="artists-hero__content">
            <h1 class="artists-hero__title">Discover Amazing Artists</h1>
            <p class="artists-hero__subtitle">Find new music and support artists worldwide</p>

            <div class="artists-hero__search">
                <SearchBar {handleSearch} />
            </div>
        </div>
    </section>

    <!-- Main Content -->
    <div class="artists-container">
        <!-- Main Content Area -->
        <main class="artists-main">
            <!-- Recommended Section -->
            <section class="artists-section">
                <div class="artists-section__header">
                    <div>
                        <h2 class="artists-section__title">
                            <SvgIcon path={mdiFire} size={24} />
                            Recommended For You
                        </h2>
                        <p class="artists-section__subtitle">
                            Personalized picks based on your taste
                        </p>
                    </div>
                    <div>
                        <Button size="md" href="/artists/recommended" variant="secondary">View All</Button>
                    </div>
                </div>
                <ArtistGrid artists={recommendedArtists} />
            </section>

            <!-- Top Artists Section -->
            <section class="artists-section">
                <div class="artists-section__header">
                    <div>
                        <h2 class="artists-section__title">
                            <SvgIcon path={mdiTrendingUp} size={24} />
                            Top Artists
                        </h2>
                        <p class="artists-section__subtitle">Most followed and listened to</p>
                    </div>
                    <div>
                        <Button size="md" href="/artists/top" variant="secondary">View All</Button>
                    </div>
                </div>
                <ArtistGrid artists={topArtists} />
            </section>

            <!-- New Artists Section -->
            <section class="artists-section">
                <div class="artists-section__header">
                    <div>
                        <h2 class="artists-section__title">
                            <SvgIcon path={mdiCloudUploadOutline} size={24} />
                            Emerging Artists
                        </h2>
                        <p class="artists-section__subtitle">Fresh talent just starting their journey</p>
                    </div>
                    
                    <div>
                        <Button size="md" href="/artists/new" variant="secondary">View All</Button>
                    </div>
                </div>
                <ArtistGrid artists={newArtists} />
            </section>

            <!-- Featured Playlists by Artists -->
            <section class="artists-section">
                <div class="artists-section__header">
                    <div>
                        <h2 class="artists-section__title">
                            <SvgIcon path={mdiMusicBoxMultiple} size={24} />
                            Curated Collections
                        </h2>
                        <p class="artists-section__subtitle">
                            Playlists by our top artists
                        </p>
                    </div>
                </div>
                <div class="featured-playlists">
                    <div class="playlist-card">
                        <div class="playlist-card__cover">
                            <img
                                src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400"
                                alt="Synthwave Nights"
                            />
                            <div class="playlist-card__overlay">
                                <button  class="playlist-card__play">
                                    <SvgIcon path={mdiFire} size={24} />
                                </button>
                            </div>
                        </div>
                        <div class="playlist-card__content">
                            <h3>Synthwave Nights</h3>
                            <p>By Luna Echo & Neon Dreams</p>
                            <span class="playlist-card__track-count">42 tracks</span>
                        </div>
                    </div>

                    <div class="playlist-card">
                        <div class="playlist-card__cover">
                            <img
                                src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400"
                                alt="Chill Beats"
                            />
                            <div class="playlist-card__overlay">
                               <button  class="playlist-card__play">
                                    <SvgIcon path={mdiPlay} size={24} />
                                </button>
                            </div>
                        </div>
                        <div class="playlist-card__content">
                            <h3>Chill Beats Collection</h3>
                            <p>By Cosmic Vibes</p>
                            <span class="playlist-card__track-count">67 tracks</span>
                        </div>
                    </div>

                    <div class="playlist-card">
                        <div class="playlist-card__cover">
                            <img
                                src="https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400"
                                alt="Ambient Dreams"
                            />
                            <div class="playlist-card__overlay">
                                <button  class="playlist-card__play">
                                    <SvgIcon path={mdiPlay} size={24} />
                                </button>
                            </div>
                        </div>
                        <div class="playlist-card__content">
                            <h3>Ambient Dreams</h3>
                            <p>By Aurora Sky</p>
                            <span class="playlist-card__track-count">89 tracks</span>
                        </div>
                    </div>

                    <div class="playlist-card">
                        <div class="playlist-card__cover">
                            <img
                                src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400"
                                alt="Future Sounds"
                            />
                            <div class="playlist-card__overlay">
                                <button  class="playlist-card__play">
                                    <SvgIcon path={mdiPlay} size={24} />
                                </button>
                            </div>
                        </div>
                        <div class="playlist-card__content">
                            <h3>Future Sounds</h3>
                            <p>By Neon Dreams</p>
                            <span class="playlist-card__track-count">54 tracks</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- CTA Section -->
            <section class="artists-cta">
                <div class="artists-cta__content">
                    <h2>Are You an Artist?</h2>
                    <p>Join PDM Music and share your music with the world</p>
                    <Button variant="primary" size="lg">Start Your Journey</Button>
                </div>
            </section>
        </main>
    </div>
</div>

<style lang="scss">
    .artists-page {
        display: flex;
        flex-direction: column;
        gap: var(--space-8);
        min-height: 100vh;
    }

    // Hero Section
    .artists-hero {
        background: linear-gradient(135deg, var(--color-brand-500) 0%, var(--color-brand-600) 100%);
        padding: var(--space-12) var(--space-6);
        border-radius: var(--radius-lg);
        margin: 0 var(--space-6) var(--space-6) var(--space-6);
        color: var(--color-white);

        @media (prefers-color-scheme: dark) {
            background: linear-gradient(135deg, var(--color-brand-900) 0%, var(--color-brand-800) 100%);
        }

        @media (max-width: 768px) {
            margin: 0;
            border-radius: 0;
            padding: var(--space-8) var(--space-4);
        }
    }

    .artists-hero__content {
        max-width: 800px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: var(--space-6);
        align-items: center;
        text-align: center;
    }

    .artists-hero__title {
        margin: 0;
        @include text-display-lg();
        font-weight: 700;
    }

    .artists-hero__subtitle {
        margin: 0;
        @include text-lg();
        opacity: 0.95;
    }

    .artists-hero__search {
        width: 100%;
        max-width: 600px;
    }

    // Main Container
    .artists-container {
        display: grid;
        gap: var(--space-6);
        padding: 0 var(--space-6) var(--space-8) var(--space-6);
        max-width: 1600px;
        margin: 0 auto;
        width: 100%;

        @media (max-width: 1024px) {
            grid-template-columns: 1fr;
            padding: 0 var(--space-4) var(--space-8) var(--space-4);
        }

        @media (max-width: 768px) {
            padding: 0;
            gap: 0;
        }
    }

    // Sidebar
    .artists-sidebar {
        position: sticky;
        top: var(--space-6);
        height: fit-content;
        background-color: var(--color-white);
        border-radius: var(--radius-lg);
        border: 1px solid var(--color-gray-200);
        padding: var(--space-6);

        @media (prefers-color-scheme: dark) {
            background-color: var(--color-gray-950);
            border-color: var(--color-gray-800);
        }

        @media (max-width: 1024px) {
            display: none;

            &--open {
                display: block;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 100;
                max-width: 100%;
                border-radius: 0;
                border: none;
                overflow-y: auto;
            }
        }
    }

    .artists-sidebar__close {
        display: none;
        background: transparent;
        border: none;
        cursor: pointer;
        margin-bottom: var(--space-4);
        color: var(--color-gray-600);

        @media (max-width: 1024px) {
            display: flex;
            align-items: center;
            justify-content: center;

            @media (prefers-color-scheme: dark) {
                color: var(--color-gray-400);
            }
        }
    }

    // Main Content
    .artists-main {
        display: flex;
        flex-direction: column;
        gap: var(--space-8);
    }

    // Filter Toggle (Mobile)
    .artists-filter-toggle {
        display: none;

        @media (max-width: 1024px) {
            display: flex;
            margin-bottom: var(--space-4);
        }

        @media (max-width: 768px) {
            margin: var(--space-4);
        }
    }

    .artists-filter-btn {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-3) var(--space-4);
        background-color: var(--color-white);
        border: 1px solid var(--color-gray-200);
        border-radius: var(--radius-md);
        cursor: pointer;
        font-weight: 500;
        transition: all var(--duration-normal) var(--easing-ease-out);
        @include text-sm();

        @media (prefers-color-scheme: dark) {
            background-color: var(--color-gray-900);
            border-color: var(--color-gray-800);
            color: var(--color-white);
        }

        &:hover {
            background-color: var(--color-gray-50);
            border-color: var(--color-brand-500);

            @media (prefers-color-scheme: dark) {
                background-color: var(--color-gray-800);
                border-color: var(--color-brand-400);
            }
        }
    }

    // Sections
    .artists-section {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
    }

    .artists-section__header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--space-4);

        @media (max-width: 768px) {
            align-items: center;
        }
    }

    .artists-section__title {
        margin: 0;
        @include text-display-sm();
        font-weight: 700;
        color: var(--color-gray-900);
        display: flex;
        align-items: center;
        gap: var(--space-3);

        @media (prefers-color-scheme: dark) {
            color: var(--color-white);
        }

        :global(svg) {
            color: var(--color-brand-500);
        }
    }

    .artists-section__subtitle {
        margin: var(--space-1) 0 0 0;
        @include text-sm();
        color: var(--color-gray-600);

        @media (prefers-color-scheme: dark) {
            color: var(--color-gray-400);
        }
    }

    .artists-section__link {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-4);
        background-color: var(--color-brand-50);
        color: var(--color-brand-600);
        border-radius: var(--radius-md);
        text-decoration: none;
        font-weight: 500;
        @include text-sm();
        transition: all var(--duration-normal) var(--easing-ease-out);

        @media (prefers-color-scheme: dark) {
            background-color: var(--color-brand-900);
            color: var(--color-brand-300);
        }

        &:hover {
            background-color: var(--color-brand-100);

            @media (prefers-color-scheme: dark) {
                background-color: var(--color-brand-800);
            }
        }

        @media (max-width: 768px) {
            display: none;
        }
    }

    // Featured Playlists
    .featured-playlists {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: var(--space-4);
    }

    .playlist-card {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        background-color: var(--color-white);
        border-radius: var(--radius-md);
        border: 1px solid var(--color-gray-200);
        padding: var(--space-3);
        transition: all var(--duration-normal) var(--easing-ease-out);

        @media (prefers-color-scheme: dark) {
            background-color: var(--color-gray-900);
            border-color: var(--color-gray-800);
        }

        &:hover {
            transform: translateY(-4px);
            border-color: var(--color-brand-500);

            @media (prefers-color-scheme: dark) {
                border-color: var(--color-brand-400);
            }
        }
    }

    .playlist-card__cover {
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

    .playlist-card__overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all var(--duration-normal) var(--easing-ease-out);

        .playlist-card:hover & {
            background: rgba(0, 0, 0, 0.4);
        }
    }

    .playlist-card__play {
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

        .playlist-card:hover & {
            transform: scale(1);
            opacity: 1;
        }

        &:hover {
            background-color: var(--color-brand-600);
            transform: scale(1.1);
        }
    }

    .playlist-card__content {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);

        h3 {
            margin: 0;
            @include text-md();
            font-weight: 600;
            color: var(--color-gray-900);

            @media (prefers-color-scheme: dark) {
                color: var(--color-white);
            }
        }

        p {
            margin: 0;
            @include text-sm();
            color: var(--color-gray-600);

            @media (prefers-color-scheme: dark) {
                color: var(--color-gray-400);
            }
        }
    }

    .playlist-card__track-count {
        @include text-xs();
        color: var(--color-gray-500);
        font-weight: 500;
    }

    // CTA Section
    .artists-cta {
        background: linear-gradient(135deg, var(--color-purple-500) 0%, var(--color-brand-500) 100%);
        border-radius: var(--radius-lg);
        padding: var(--space-12);
        text-align: center;
        color: var(--color-white);

        @media (prefers-color-scheme: dark) {
            background: linear-gradient(135deg, var(--color-purple-900) 0%, var(--color-brand-900) 100%);
        }

        @media (max-width: 768px) {
            padding: var(--space-8) var(--space-4);
        }
    }

    .artists-cta h2 {
        margin: 0 0 var(--space-3) 0;
        @include text-display-md();
        font-weight: 700;
    }

    .artists-cta p {
        margin: 0 0 var(--space-6) 0;
        @include text-lg();
        opacity: 0.95;
    }
</style>