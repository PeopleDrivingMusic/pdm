<script lang="ts">
  interface Props {
    name?: string;
    src?: string | null;
    href?: string | null;
    alt?: string;
    size?: 's' | 'md' | 'lg';
    square?: boolean;
    class?: string;
  }

  let {
    name = '',
    src = null,
    href = null,
    alt = '',
    size = 'md',
    square = false,
    class: className = '',
    ...rest
  }: Props = $props();

  let showImage = $state(!!src);

  function getInitials(input = '') {
    const s = (input || '').trim();
    if (!s) return '';
    const parts = s.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function handleImgError() {
    showImage = false;
  }

  const initials = $derived(getInitials(name || alt || ''));
  const ariaLabel = $derived(name || alt ? `${name || alt} avatar` : 'avatar');
  const sizeClass = $derived(`avatar--${size}`);
</script>

{#if href}
  <a class="avatar-link" {href} aria-label={ariaLabel} {...rest}>
    <div class={`avatar ${sizeClass} ${className}`} class:square>
      {#if showImage && src}
        <img {src} {alt} onerror={handleImgError} />
      {:else}
        <span class="avatar__initials">{initials}</span>
      {/if}
    </div>
  </a>
{:else}
  <div
    class={`avatar ${sizeClass} ${className}`}
    class:square
    role="img"
    aria-label={ariaLabel}
    {...rest}
  >
    {#if showImage && src}
      <img {src} {alt} onerror={handleImgError} />
    {:else}
      <span class="avatar__initials">{initials}</span>
    {/if}
  </div>
{/if}

<style lang="scss">
  .avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--avatar-bg, var(--bg-tertiary, #f2f4f6));
    color: var(--avatar-color, var(--text-primary, #111));
    border: 1px solid var(--avatar-border, rgba(0, 0, 0, 0.06));
    overflow: hidden;
    font-weight: 600;
    text-transform: uppercase;
    user-select: none;

    &.square {
      border-radius: var(--radius-sm, 8px);
    }

    &:not(.square) {
      border-radius: 50%;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    &__initials {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      padding: 0.125rem;
    }

    &.avatar--s {
      width: 32px;
      height: 32px;
      font-size: 12px;
    }

    &.avatar--md {
      width: 48px;
      height: 48px;
      font-size: 16px;
    }

    &.avatar--lg {
      width: 72px;
      height: 72px;
      font-size: 22px;
    }
  }

  .avatar-link {
    display: inline-block;
    line-height: 0;
    text-decoration: none;
    color: inherit;
  }
</style>
