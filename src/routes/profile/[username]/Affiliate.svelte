<script lang="ts">
    import SvgIcon from '$lib/ui/SvgIcon.svelte';
    import {
        mdiTrendingUp,
        mdiCurrencyUsd,
        mdiCheckCircle
    } from '@mdi/js';
    import AffiliateStats from './components/AffiliateStats.svelte';
    import EarningsChart from './components/EarningsChart.svelte';
    import ReferralLink from './components/ReferralLink.svelte';
    import CommissionInfo from './components/CommissionInfo.svelte';
    import TopReferrals from './components/TopReferrals.svelte';

    let copyFeedback = $state('');
    let showQR = $state(false);

    const referralData = $state({
        referralLink: 'https://pdm.music/ref/johndoe2024',
        qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://pdm.music/ref/johndoe2024',
        totalReferrals: 47,
        activeReferrals: 35,
        totalEarnings: 2847.5,
        monthlyEarnings: 324.8,
        commissionRate: 10,
        topReferrals: [
            {
                id: 1,
                name: 'Alex Johnson',
                joinDate: '2024-01-15',
                earnings: 450.25,
                status: 'active'
            },
            {
                id: 2,
                name: 'Sarah Wilson',
                joinDate: '2024-02-20',
                earnings: 380.5,
                status: 'active'
            },
            {
                id: 3,
                name: 'Mike Chen',
                joinDate: '2024-03-10',
                earnings: 275.0,
                status: 'active'
            },
            {
                id: 4,
                name: 'Emma Davis',
                joinDate: '2024-04-05',
                earnings: 0,
                status: 'pending'
            }
        ],
        earningsHistory: [
            { month: 'Jan', earnings: 120, referrals: 8 },
            { month: 'Feb', earnings: 245, referrals: 12 },
            { month: 'Mar', earnings: 189, referrals: 10 },
            { month: 'Apr', earnings: 312, referrals: 15 },
            { month: 'May', earnings: 278, referrals: 14 },
            { month: 'Jun', earnings: 324.8, referrals: 18 }
        ]
    });

    function copyToClipboard() {
        navigator.clipboard.writeText(referralData.referralLink);
        copyFeedback = 'Copied!';
        setTimeout(() => {
            copyFeedback = '';
        }, 2000);
    }

    function shareReferralLink() {
        if (navigator.share) {
            navigator.share({
                title: 'Join PDM Music',
                text: 'Join me on PDM Music and get exclusive benefits!',
                url: referralData.referralLink
            });
        } else {
            copyToClipboard();
        }
    }
</script>

<div class="affiliate-container">
    <!-- Header Section -->
    <section class="affiliate-header">
        <div class="affiliate-header__content">
            <div>
                <h2 class="affiliate-header__title">Affiliate Program</h2>
                <p class="affiliate-header__subtitle">
                    Earn money by inviting friends to PDM Music
                </p>
            </div>
            <div class="affiliate-header__badge">
                <SvgIcon path={mdiTrendingUp} size={24} />
                <span>10% Commission</span>
            </div>
        </div>
    </section>

    <!-- Stats Grid -->
    <AffiliateStats {referralData} />

    <!-- Referral Link Section -->
    <section class="affiliate-section">
        <h3 class="affiliate-section__title">Your Referral Link</h3>
        <ReferralLink
            link={referralData.referralLink}
            qrCode={referralData.qrCode}
            {copyToClipboard}
            {shareReferralLink}
            {copyFeedback}
        />
    </section>

    <!-- Commission Info Section -->
    <CommissionInfo commissionRate={referralData.commissionRate} />

    <!-- Earnings Chart -->
    <section class="affiliate-section">
        <h3 class="affiliate-section__title">Earnings Overview</h3>
        <EarningsChart data={referralData.earningsHistory} />
    </section>

    <!-- Top Referrals -->
    <section class="affiliate-section">
        <h3 class="affiliate-section__title">Top Referrals</h3>
        <TopReferrals referrals={referralData.topReferrals} />
    </section>

    <!-- Payout Information -->
    <section class="affiliate-section affiliate-section--highlight">
        <div class="payout-info">
            <div class="payout-info__header">
                <SvgIcon path={mdiCurrencyUsd} size={28} />
                <h3>How It Works</h3>
            </div>
            <div class="payout-info__content">
                <div class="payout-info__item">
                    <div class="payout-info__step">1</div>
                    <div>
                        <h4>Invite Friends</h4>
                        <p>Share your unique referral link with friends and colleagues</p>
                    </div>
                </div>
                <div class="payout-info__item">
                    <div class="payout-info__step">2</div>
                    <div>
                        <h4>They Subscribe</h4>
                        <p>Your referrals sign up and start using PDM Music</p>
                    </div>
                </div>
                <div class="payout-info__item">
                    <div class="payout-info__step">3</div>
                    <div>
                        <h4>You Earn</h4>
                        <p>Get 10% commission from all their in-app purchases and subscriptions</p>
                    </div>
                </div>
                <div class="payout-info__item">
                    <div class="payout-info__step">4</div>
                    <div>
                        <h4>Auto-Credited to Your Balance</h4>
                        <p>Earnings are automatically credited to your platform balance</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Balance Info Section -->
    <section class="affiliate-section">
        <div class="balance-info">
            <div class="balance-info__header">
                <SvgIcon path={mdiCurrencyUsd} size={24} />
                <h3>Your Platform Balance</h3>
            </div>
            <div class="balance-info__content">
                <p>
                    All affiliate earnings are automatically credited to your platform balance at the end of each month. 
                    You can use your balance to:
                </p>
                <ul class="balance-benefits">
                    <li>
                        <SvgIcon path={mdiCheckCircle} size={18} />
                        <span>Purchase premium subscriptions for artists</span>
                    </li>
                    <li>
                        <SvgIcon path={mdiCheckCircle} size={18} />
                        <span>Buy individual tracks and albums</span>
                    </li>
                    <li>
                        <SvgIcon path={mdiCheckCircle} size={18} />
                        <span>Unlock premium features and tools</span>
                    </li>
                    <li>
                        <SvgIcon path={mdiCheckCircle} size={18} />
                        <span>Support your favorite artists directly</span>
                    </li>
                </ul>
                <div class="balance-note">
                    <p>
                        <strong>Note:</strong> Your balance is stored securely on the platform and can be managed from your account settings. 
                        Balance transactions are tracked in your payment history for full transparency.
                    </p>
                </div>
            </div>
        </div>
    </section>
</div>

<style lang="scss">
    .affiliate-container {
        display: flex;
        flex-direction: column;
        gap: var(--space-8);
        padding: var(--space-6);
    }

    // Header Section
    .affiliate-header {
        background: linear-gradient(135deg, var(--color-brand-500) 0%, var(--color-brand-600) 100%);
        border-radius: var(--radius-lg);
        padding: var(--space-8);
        color: var(--color-white);

        @media (prefers-color-scheme: dark) {
            background: linear-gradient(135deg, var(--color-brand-900) 0%, var(--color-brand-800) 100%);
        }
    }

    .affiliate-header__content {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--space-6);

        @media (max-width: 768px) {
            flex-direction: column;
            align-items: flex-start;
        }
    }

    .affiliate-header__title {
        margin: 0;
        @include text-display-md();
        font-weight: 700;
    }

    .affiliate-header__subtitle {
        margin: var(--space-2) 0 0 0;
        @include text-md();
        opacity: 0.9;
    }

    .affiliate-header__badge {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(8px);
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-md);
        border: 1px solid rgba(255, 255, 255, 0.3);
        font-weight: 600;
        @include text-sm();
    }

    // Section
    .affiliate-section {
        background-color: var(--color-white);
        border-radius: var(--radius-lg);
        border: 1px solid var(--color-gray-200);
        padding: var(--space-6);

        @media (prefers-color-scheme: dark) {
            background-color: var(--color-gray-950);
            border-color: var(--color-gray-800);
        }

        &--highlight {
            background: linear-gradient(135deg, var(--color-gray-50) 0%, var(--color-white) 100%);

            @media (prefers-color-scheme: dark) {
                background: linear-gradient(135deg, var(--color-gray-900) 0%, var(--color-gray-950) 100%);
            }
        }
    }

    .affiliate-section__title {
        margin: 0 0 var(--space-6) 0;
        @include text-display-sm();
        font-weight: 700;
        color: var(--color-gray-900);

        @media (prefers-color-scheme: dark) {
            color: var(--color-white);
        }
    }

    // Payout Info
    .payout-info {
        display: flex;
        flex-direction: column;
        gap: var(--space-6);
    }

    .payout-info__header {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        color: var(--color-brand-600);

        h3 {
            margin: 0;
            @include text-lg();
            font-weight: 600;
        }

        @media (prefers-color-scheme: dark) {
            color: var(--color-brand-400);
        }
    }

    .payout-info__content {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--space-6);
    }

    .payout-info__item {
        display: flex;
        gap: var(--space-4);
        align-items: flex-start;

        h4 {
            margin: 0 0 var(--space-1) 0;
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

    .payout-info__step {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--color-brand-500) 0%, var(--color-brand-600) 100%);
        color: var(--color-white);
        font-weight: 700;
        flex-shrink: 0;
        @include text-sm();
    }

    // Requirements Grid
    .requirements-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--space-4);
    }

    .requirement-card {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-3);
        padding: var(--space-4);
        background-color: var(--color-gray-50);
        border-radius: var(--radius-md);
        border: 1px solid var(--color-gray-200);
        transition: all var(--duration-normal) var(--easing-ease-out);

        @media (prefers-color-scheme: dark) {
            background-color: var(--color-gray-900);
            border-color: var(--color-gray-800);
        }

        &:hover {
            transform: translateY(-2px);
            border-color: var(--color-brand-500);

            @media (prefers-color-scheme: dark) {
                border-color: var(--color-brand-400);
            }
        }

        h4 {
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

    .requirement-card__icon {
        color: var(--color-brand-500);

        @media (prefers-color-scheme: dark) {
            color: var(--color-brand-400);
        }
    }
</style>