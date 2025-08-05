<script lang="ts">
  interface Props {
    checked?: boolean;
    label?: string;
    id?: string;
  }

  let {
    checked = $bindable(false),
    label = '',
    id = ''
  }: Props = $props();
</script>

<div class="checkbox-group">
  <input
    {id}
    type="checkbox"
    class="checkbox"
    bind:checked
  />
  
  {#if label}
    <label for={id} class="checkbox-label">
      {label}
    </label>
  {/if}
</div>

<style lang="scss">
  .checkbox-group {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .checkbox {
    width: var(--space-4);
    height: var(--space-4);
    accent-color: var(--primary);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: all var(--duration-fast) var(--easing-ease-out);

    &:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 2px;
    }

    &:hover {
      transform: scale(1.05);
    }
  }

  .checkbox-label {
    font-size: var(--font-size-sm);
    font-family: var(--font-family-sans);
    color: var(--text-secondary);
    cursor: pointer;
    user-select: none;
    transition: color var(--duration-fast) var(--easing-ease-out);

    &:hover {
      color: var(--text-primary);
    }
  }
</style>
