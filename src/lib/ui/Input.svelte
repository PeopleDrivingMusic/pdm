<script lang="ts">
  interface Props {
    type?: HTMLInputElement['type'];
    placeholder?: string;
    value?: string | number;
    label?: string;
    required?: boolean;
    disabled?: boolean;
    id?: string;
  }

  let {
    type = 'text',
    placeholder = '',
    value = $bindable(''),
    label = '',
    required = false,
    disabled = false,
    id = label || `input-${Math.random().toString(36).substr(2, 9)}`
  }: Props = $props();
</script>

<div class="input-group">
  {#if label}
    <label class="input-label" for={id}>
      {label}
    </label>
  {/if}
  
  <input
    {id}
    class="input"
    {type}
    {placeholder}
    bind:value
    {required}
    {disabled}
  />
</div>

<style lang="scss">
  .input-group {
    width: 100%;
  }

  .input-label {
    display: block;
    margin-bottom: var(--space-2);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--text-primary);
    font-family: var(--font-family-sans);
  }

  .input {
    width: 100%;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-family: var(--font-family-sans);
    background-color: var(--bg-surface);
    color: var(--text-primary);
    transition: all var(--duration-normal) var(--easing-ease-out);
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: var(--border-focus);
    }

    &:hover:not(:disabled):not(:focus) {
      border-color: var(--border-secondary);
    }

    &:disabled {
      background-color: var(--bg-tertiary);
      color: var(--text-disabled);
      cursor: not-allowed;
      opacity: 0.6;
    }

    &::placeholder {
      color: var(--text-tertiary);
    }

    &:invalid:not(:placeholder-shown) {
      border-color: var(--border-error);
    }
  }
</style>
