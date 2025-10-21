<script lang="ts">
  interface Props {
    href?: string;
    color?: 'primary' | 'secondary';
    underline?: boolean;
    onclick?: (e: MouseEvent) => void;
    children?: () => any;
  }

  let {
    href,
    color = 'primary',
    underline = true,
    onclick,
    children
  }: Props = $props();
</script>

{#if href}
  <a 
    {href}
    onclick={onclick}
    class="link link--{color}" 
    class:link--underline={underline}
  >
    {@render children?.()}
  </a>
{:else}
  <button 
    class="link link--{color} link--button" 
    class:link--underline={underline}
    {onclick}
  >
    {@render children?.()}
  </button>
{/if}

<style lang="scss">
  .link {
    font-size: var(--font-size-sm);
    font-family: var(--font-family-sans);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--duration-normal) var(--easing-ease-out);
    text-decoration: none;
    background: none;
    border: none;
    padding: 0;

    &:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 2px;
      border-radius: var(--radius-sm);
    }

    &--primary {
      color: var(--primary);

      &:hover {
        color: var(--primary-hover);
      }

      &:active {
        color: var(--primary-dark);
      }
    }

    &--secondary {
      color: var(--text-secondary);

      &:hover {
        color: var(--text-primary);
      }

      &:active {
        color: var(--text-tertiary);
      }
    }

    &--underline {
      text-decoration: underline;
      text-underline-offset: 2px;
      text-decoration-thickness: 1px;
    }

    &--button {
      font-family: var(--font-family-sans);
    }
  }
</style>
