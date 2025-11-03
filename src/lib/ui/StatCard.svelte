<script lang="ts">
  interface Props {
    label: string;
    value: string | number;
    icon?: string;
    description?: string;
  }

  let {
    label,
    value,
    icon,
    description
  }: Props = $props();
</script>

<div class="stat-card">
  {#if icon}
    <div class="stat-card__icon">
      {icon}
    </div>
  {/if}
  <div class="stat-card__content">
    <p class="stat-card__label">{label}</p>
    <p class="stat-card__value">{value}</p>
    {#if description}
      <p class="stat-card__description">{description}</p>
    {/if}
  </div>
</div>

<style lang="scss">
  .stat-card {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-5);
    background-color: var(--color-gray-50);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-gray-200);
    transition: all var(--duration-normal) var(--easing-ease-out);

    &:hover {
      background-color: var(--color-gray-100);
      border-color: var(--color-gray-300);
    }

    @media (prefers-color-scheme: dark) {
      background-color: var(--color-gray-900);
      border-color: var(--color-gray-800);

      &:hover {
        background-color: var(--color-gray-800);
        border-color: var(--color-gray-700);
      }
    }
  }

  .stat-card__icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--space-10);
    height: var(--space-10);
    color: var(--color-brand-500);
    font-size: var(--font-size-2xl);
  }

  .stat-card__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .stat-card__label {
    margin: 0;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-gray-600);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-wide);

    @media (prefers-color-scheme: dark) {
      color: var(--color-gray-400);
    }
  }

  .stat-card__value {
    margin: 0;
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-gray-900);

    @media (prefers-color-scheme: dark) {
      color: var(--color-white);
    }
  }

  .stat-card__description {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-gray-500);

    @media (prefers-color-scheme: dark) {
      color: var(--color-gray-400);
    }
  }
</style>
