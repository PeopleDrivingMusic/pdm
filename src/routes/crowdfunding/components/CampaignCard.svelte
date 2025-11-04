<script lang="ts">
    import SvgIcon from '$lib/ui/SvgIcon.svelte';
    import { mdiPlay, mdiCheckCircle, mdiMusicBox, mdiMicrophone, mdiTicket, mdiTrendingUp } from '@mdi/js';
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

    function formatCurrency(value: number) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(value);
    }
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

        <div class="campaign-card__artist">
            <img src={campaign.artistAvatar} alt={campaign.artist} class="campaign-card__avatar" />
            <span>{campaign.artist}</span>
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
                            <span class="reward-amount">{formatCurrency(reward.amount)}+</span>
                            <span class="reward-title">{reward.title}</span>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- CTA Button -->
        <Button variant="primary" fullWidth>Back This Campaign</Button>
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

    .campaign-card__artist {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        @include text-sm();
        font-weight: 500;
        color: var(--color-gray-700);

        @media (prefers-color-scheme: dark) {
            color: var(--color-gray-300);
        }
    }

    .campaign-card__avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        object-fit: cover;
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