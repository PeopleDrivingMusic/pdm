<script lang="ts">
    import SvgIcon from '$lib/ui/SvgIcon.svelte';
    import { mdiPlay, mdiCheckCircle, mdiMusicBox, mdiMicrophone, mdiTicket, mdiTrendingUp, mdiPercent } from '@mdi/js';
    import { Button } from '$lib/ui';

    interface Campaign {
        id: string;
        type: 'song' | 'album' | 'concert' | 'festival';
        title: string;
        artist: string;
        artistAvatar: string;
        description: string;
        goal: number;
        raised: number;
        backers: number;
        daysLeft: number;
        image: string;
        isVerified: boolean;
        rewards: any[];
        artistStats?: {
            trustScore: number;
            songs: number;
            followers: number;
            subscribers: number;
        };
        revenueShare?: number; // 10-80% for songs/albums
        projectedProfit?: number; // for concerts/festivals
    }

    interface Props {
        campaign: Campaign;
    }

    const { campaign }: Props = $props();

    const typeIcons = {
        song: mdiMicrophone,
        album: mdiMusicBox,
        concert: mdiTicket,
        festival: mdiTrendingUp
    };

    const typeLabels = {
        song: 'Song',
        album: 'Album',
        concert: 'Concert',
        festival: 'Festival'
    };

    const progress = (campaign.raised / campaign.goal) * 100;
    const daysLeft = campaign.daysLeft;

    function formatCurrency(value: number | string) {
        if (typeof value === "string") return value
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0
        }).format(value);
    }

    function formatNumber(value: number) {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        }
        if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'K';
        }
        return value.toString();
    }

    const isRevenueSharing = campaign.type === 'song' || campaign.type === 'album';
    const hasProjectedProfit = campaign.type === 'concert' || campaign.type === 'festival';
</script>

<a href={`/crowdfunding/${campaign.id}`} class="campaign-card">
    <div class="campaign-card__image">
        <img src={campaign.image} alt={campaign.title} />
        <div class="campaign-card__overlay">
            <button class="campaign-card__play">
                <SvgIcon path={mdiPlay} size={24} />
            </button>
        </div>
        <div class="campaign-card__badge">
            <SvgIcon path={typeIcons[campaign.type]} size={14} />
            <span>{typeLabels[campaign.type]}</span>
        </div>
        {#if campaign.daysLeft <= 5}
            <div class="campaign-card__urgent">Ending Soon!</div>
        {/if}
    </div>

    <div class="campaign-card__content">
        <div class="campaign-card__header">
            <h3 class="campaign-card__title">{campaign.title}</h3>
            {#if campaign.isVerified}
                <SvgIcon path={mdiCheckCircle} size={16} class="campaign-card__verified" />
            {/if}
        </div>

        <!-- Artist Info Section -->
        <div class="campaign-card__artist-section">
            <div class="artist-info">
                <img src={campaign.artistAvatar} alt={campaign.artist} class="artist-info__avatar" />
                <div class="artist-info__content">
                    <span class="artist-info__name">{campaign.artist}</span>
                    <!-- <a href="/artist/${campaign.artist}" class="artist-info__name">{campaign.artist}</a> -->
                    {#if campaign.artistStats}
                        <div class="artist-stats">
                            <span class="stat-item" title="Trust Score">
                                ⭐ {campaign.artistStats.trustScore}%
                            </span>
                            <span class="stat-item" title="Songs">
                                🎵 {formatNumber(campaign.artistStats.songs)}
                            </span>
                            <span class="stat-item" title="Followers">
                                👥 {formatNumber(campaign.artistStats.followers)}
                            </span>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Projected Profit Info -->
            {#if hasProjectedProfit && campaign.projectedProfit}
                <div class="profit-badge">
                    <SvgIcon path={mdiTrendingUp} size={14} />
                    <span>~{formatCurrency(campaign.projectedProfit)} profit</span>
                </div>
            {/if}
        </div>

        <p class="campaign-card__description">{campaign.description}</p>

        <!-- Progress Bar -->
        <div class="campaign-card__progress">
            <div class="progress-bar">
                <div class="progress-bar__fill" style={`width: ${Math.min(progress, 100)}%`}></div>
            </div>
            <div class="progress-stats">
                <span class="progress-stats__raised">{Math.round(progress)}%</span>
                <span class="progress-stats__goal">of {formatCurrency(campaign.goal)}</span>
            </div>
        </div>

        <!-- Stats -->
        <div class="campaign-card__stats">
            <div class="stat">
                <span class="stat-value">{formatCurrency(campaign.raised)}</span>
                <span class="stat-label">Raised</span>
            </div>
            <div class="stat">
                <span class="stat-value">{campaign.backers}</span>
                <span class="stat-label">Backers</span>
            </div>
            <div class="stat">
                <span class="stat-value">{daysLeft}d</span>
                <span class="stat-label">Left</span>
            </div>
        </div>

        <!-- Rewards Preview -->
        {#if campaign.rewards.length > 0}
            <div class="campaign-card__rewards">
                <span class="rewards-label">{campaign.rewards.length} Rewards available</span>
                <div class="rewards-list">
                    {#each campaign.rewards.slice(0, 2) as reward}
                        <div class="reward-item">
                            <span class="reward-amount">{formatCurrency(reward.amount)}</span>
                            <span class="reward-title">{reward.title}</span>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- CTA Button -->
        <Button variant="primary">Back This Campaign</Button>
    </div>
</a>

<style lang="scss">
    .campaign-card {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        background-color: var(--bg-primary);
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-primary);
        overflow: hidden;
        transition: all var(--duration-normal) var(--easing-ease-out);
        text-decoration: none;
        color: inherit;

        &:hover {
            transform: translateY(-8px);
            border-color: var(--color-brand-500);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);

            @media (prefers-color-scheme: dark) {
                box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
            }
        }
    }

    .campaign-card__image {
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

    .campaign-card__overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all var(--duration-normal) var(--easing-ease-out);

        .campaign-card:hover & {
            background: rgba(0, 0, 0, 0.4);
        }
    }

    .campaign-card__play {
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

        .campaign-card:hover & {
            transform: scale(1);
            opacity: 1;
        }

        &:hover {
            background-color: var(--color-brand-600);
            transform: scale(1.1);
        }
    }

    .campaign-card__badge {
        position: absolute;
        top: var(--space-3);
        left: var(--space-3);
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-3);
        background-color: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
        color: var(--color-white);
        border-radius: var(--radius-md);
        @include text-xs();
        font-weight: 600;
    }

    .campaign-card__urgent {
        position: absolute;
        top: var(--space-3);
        right: var(--space-3);
        padding: var(--space-2) var(--space-3);
        background-color: var(--color-red-500);
        color: var(--color-white);
        border-radius: var(--radius-md);
        @include text-xs();
        font-weight: 600;
        animation: pulse 2s ease-in-out infinite;
    }

    .campaign-card__content {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        padding: var(--space-4);
        flex: 1;
    }

    .campaign-card__header {
        display: flex;
        align-items: flex-start;
        gap: var(--space-2);
        justify-content: space-between;
    }

    .campaign-card__title {
        margin: 0;
        @include text-md();
        font-weight: 600;
        color: var(--color-gray-900);
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        flex: 1;

        @media (prefers-color-scheme: dark) {
            color: var(--color-white);
        }
    }

    .campaign-card__verified {
        color: var(--color-brand-500);
        flex-shrink: 0;
        margin-top: 2px;
    }

    // Artist Section
    .campaign-card__artist-section {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
    }

    .artist-info {
        display: flex;
        align-items: flex-start;
        gap: var(--space-2);
    }

    .artist-info__avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
    }

    .artist-info__content {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        min-width: 0;
    }

    .artist-info__name {
        @include text-sm();
        font-weight: 600;
        color: var(--color-brand-600);
        text-decoration: none;
        transition: color var(--duration-fast) var(--easing-ease-out);

        @media (prefers-color-scheme: dark) {
            color: var(--color-brand-400);
        }

        &:hover {
            color: var(--color-brand-700);

            @media (prefers-color-scheme: dark) {
                color: var(--color-brand-300);
            }
        }
    }

    .artist-stats {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
    }

    .stat-item {
        @include text-xs();
        color: var(--color-gray-600);
        font-weight: 500;

        @media (prefers-color-scheme: dark) {
            color: var(--color-gray-400);
        }
    }

    .revenue-badge,
    .profit-badge {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-3);
        border-radius: var(--radius-md);
        @include text-xs();
        font-weight: 600;
    }

    .revenue-badge {
        background-color: var(--color-green-50);
        color: var(--color-green-700);
        border: 1px solid var(--color-green-200);

        @media (prefers-color-scheme: dark) {
            background-color: var(--color-green-900);
            color: var(--color-green-300);
            border-color: var(--color-green-800);
        }
    }

    .profit-badge {
        background-color: var(--color-blue-50);
        color: var(--color-blue-700);
        border: 1px solid var(--color-blue-200);

        @media (prefers-color-scheme: dark) {
            background-color: var(--color-blue-900);
            color: var(--color-blue-300);
            border-color: var(--color-blue-800);
        }
    }

    .campaign-card__description {
        margin: 0;
        @include text-sm();
        color: var(--color-gray-600);
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;

        @media (prefers-color-scheme: dark) {
            color: var(--color-gray-400);
        }
    }

    .campaign-card__progress {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .progress-bar {
        width: 100%;
        height: 6px;
        background-color: var(--color-gray-200);
        border-radius: 999px;
        overflow: hidden;

        @media (prefers-color-scheme: dark) {
            background-color: var(--color-gray-700);
        }
    }

    .progress-bar__fill {
        height: 100%;
        background: linear-gradient(90deg, var(--color-brand-500) 0%, var(--color-brand-600) 100%);
        transition: width var(--duration-normal) var(--easing-ease-out);
    }

    .progress-stats {
        display: flex;
        justify-content: space-between;
        align-items: center;
        @include text-xs();
        font-weight: 500;
    }

    .progress-stats__raised {
        color: var(--color-brand-600);
    }

    .progress-stats__goal {
        color: var(--color-gray-600);

        @media (prefers-color-scheme: dark) {
            color: var(--color-gray-400);
        }
    }

    .campaign-card__stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--space-3);
        padding: var(--space-3) 0;
        border-top: 1px solid var(--border-primary);
        border-bottom: 1px solid var(--border-primary);
    }

    .stat {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        text-align: center;
    }

    .stat-value {
        @include text-md();
        font-weight: 600;
        color: var(--color-gray-900);

        @media (prefers-color-scheme: dark) {
            color: var(--color-white);
        }
    }

    .stat-label {
        @include text-xs();
        color: var(--color-gray-600);
        text-transform: uppercase;
        letter-spacing: var(--letter-spacing-wide);

        @media (prefers-color-scheme: dark) {
            color: var(--color-gray-400);
        }
    }

    .campaign-card__rewards {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .rewards-label {
        @include text-xs();
        font-weight: 600;
        color: var(--color-gray-600);
        text-transform: uppercase;
        letter-spacing: var(--letter-spacing-wide);

        @media (prefers-color-scheme: dark) {
            color: var(--color-gray-400);
        }
    }

    .rewards-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .reward-item {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-3);
        background-color: var(--color-brand-50);
        border-radius: var(--radius-md);

        @media (prefers-color-scheme: dark) {
            background-color: var(--color-brand-900);
        }
    }

    .reward-amount {
        @include text-xs();
        font-weight: 700;
        color: var(--color-brand-600);

        @media (prefers-color-scheme: dark) {
            color: var(--color-brand-300);
        }
    }

    .reward-title {
        @include text-xs();
        color: var(--color-gray-700);

        @media (prefers-color-scheme: dark) {
            color: var(--color-gray-300);
        }
    }

    @keyframes pulse {
        0%,
        100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.05);
        }
    }
</style>