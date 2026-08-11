<script lang="ts">
    interface Props {
        type?: 'mdi' | 'simple-icons';
        path: string;
        size?: number | null;
        viewbox?: string | null;
        flip?: 'none' | 'horizontal' | 'vertical' | 'both';
        rotate?: number | string;
        class?: string;
    }

    const types = {
        mdi: {
            size: 24,
            viewbox: '0 0 24 24',
        },
        'simple-icons': {
            size: 24,
            viewbox: '0 0 24 24',
        },
        default: {
            size: 0,
            viewbox: '0 0 0 0',
        },
    };

    let {
        type = "mdi",
        path,
        size = null,
        viewbox = null,
        flip = 'none',
        rotate = 0,
        class: className = '',
        ...rest
    }: Props = $props();

    const defaults = $derived(types[type as keyof typeof types] || types.default);
    const sizeValue = $derived(size || defaults.size);
    const viewboxValue = $derived(viewbox || defaults.viewbox);
    const sx = $derived(['both', 'horizontal'].includes(flip) ? '-1' : '1');
    const sy = $derived(['both', 'vertical'].includes(flip) ? '-1' : '1');
    const r = $derived(isNaN(Number(rotate)) ? rotate : `${rotate}deg`);
</script>

<svg
    width={sizeValue}
    height={sizeValue}
    viewBox={viewboxValue}
    class={className}
    style="--sx: {sx}; --sy: {sy}; --r: {r}"
    {...rest}
>
    <path d={path} />
</svg>

<style>
    svg {
        transform: rotate(var(--r, 0deg)) scale(var(--sx, 1), var(--sy, 1));
    }

    path {
        fill: currentColor;
    }
</style>
