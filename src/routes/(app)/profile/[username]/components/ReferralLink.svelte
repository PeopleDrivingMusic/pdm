<script lang="ts">
    import { Button } from '$lib/ui';
    import SvgIcon from '$lib/ui/SvgIcon.svelte';
    import { mdiContentCopy, mdiShare, mdiQrcode, mdiClose } from '@mdi/js';

    interface Props {
        link: string;
        qrCode: string;
        copyToClipboard: () => void;
        shareReferralLink: () => void;
        copyFeedback: string;
        showQR: boolean;
    }

    const { link, qrCode, copyToClipboard, shareReferralLink, copyFeedback } = $props();
    let showQR = $state(false);
</script>

<div class="referral-section">
    <div class="referral-link-box">
        <div class="referral-link-content">
            <input type="text" readonly value={link} class="referral-link-input" />
        </div>
        <div class="referral-link-actions">
            <Button
                variant="secondary"
                size="sm"
                onClick={copyToClipboard}
            >
                <SvgIcon path={mdiContentCopy} size={16} />
                {copyFeedback || 'Copy'}
            </Button>
            <Button
                variant="secondary"
                size="sm"
                onClick={shareReferralLink}
            >
                <SvgIcon path={mdiShare} size={16} />
                Share
            </Button>
            <Button
                variant="secondary"
                size="sm"
                onClick={() => (showQR = !showQR)}
            >
                <SvgIcon path={mdiQrcode} size={16} />
                QR Code
            </Button>
        </div>
    </div>

    {#if showQR}
        <div class="qr-code-modal">
            <div class="qr-code-content">
                <button class="qr-close" onclick={() => (showQR = false)}>
                    <SvgIcon path={mdiClose} size={20} />
                </button>
                <h3>Your QR Code</h3>
                <img src={qrCode} alt="Referral QR Code" class="qr-image" />
                <p>Scan this code to share your referral link</p>
            </div>
        </div>
    {/if}
</div>

<style lang="scss">
    .referral-section {
        position: relative;
    }

    .referral-link-box {
        display: flex;
        gap: var(--space-3);
        align-items: center;

        @media (max-width: 768px) {
            flex-direction: column;
            align-items: stretch;
        }
    }

    .referral-link-content {
        flex: 1;
        background-color: var(--color-gray-100);
        border: 1px solid var(--color-gray-300);
        border-radius: var(--radius-md);
        padding: var(--space-3) var(--space-4);
        display: flex;
        align-items: center;

        @media (prefers-color-scheme: dark) {
            background-color: var(--color-gray-800);
            border-color: var(--color-gray-700);
        }
    }

    .referral-link-input {
        border: none;
        background: transparent;
        width: 100%;
        font-family: var(--font-family-mono);
        @include text-sm();
        color: var(--color-gray-900);
        outline: none;

        @media (prefers-color-scheme: dark) {
            color: var(--color-white);
        }

        &::selection {
            background-color: var(--color-brand-200);
        }
    }

    .referral-link-actions {
        display: flex;
        gap: var(--space-2);

        @media (max-width: 768px) {
            width: 100%;
            justify-content: stretch;

            button {
                flex: 1;
            }
        }
    }

    .referral-link-btn {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        white-space: nowrap;
    }

    // QR Code Modal
    .qr-code-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: var(--space-4);
        animation: fadeIn 0.2s ease-out;
    }

    .qr-code-content {
        background-color: var(--color-white);
        border-radius: var(--radius-lg);
        padding: var(--space-8);
        text-align: center;
        position: relative;
        max-width: 400px;
        animation: slideUp 0.3s ease-out;

        @media (prefers-color-scheme: dark) {
            background-color: var(--color-gray-950);
        }

        h3 {
            margin: 0 0 var(--space-4) 0;
            @include text-lg();
            font-weight: 600;
            color: var(--color-gray-900);

            @media (prefers-color-scheme: dark) {
                color: var(--color-white);
            }
        }

        p {
            margin: var(--space-4) 0 0 0;
            @include text-sm();
            color: var(--color-gray-600);

            @media (prefers-color-scheme: dark) {
                color: var(--color-gray-400);
            }
        }
    }

    .qr-close {
        position: absolute;
        top: var(--space-4);
        right: var(--space-4);
        background: transparent;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-gray-600);
        transition: color var(--duration-normal) var(--easing-ease-out);

        &:hover {
            color: var(--color-gray-900);
        }

        @media (prefers-color-scheme: dark) {
            color: var(--color-gray-400);

            &:hover {
                color: var(--color-white);
            }
        }
    }

    .qr-image {
        max-width: 300px;
        width: 100%;
        border-radius: var(--radius-md);
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes slideUp {
        from {
            transform: translateY(20px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
</style>