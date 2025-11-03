<script lang="ts">
    import { backOut } from 'svelte/easing';
    import { Tween } from 'svelte/motion';

    const {
        progress,
        height = 10,
        changeable = false,
        onchange
    }: {
        height?: number;
        progress: number;
        changeable?: boolean;
        onchange?: (value: number) => void;
    } = $props();

    let visible = $state(false);
    let isHovering = $state(false);
    let progressElement: HTMLElement;
    const width = new Tween(0, { duration: changeable ? 0 : 240, easing: backOut });
    let isDragging = $state(false);

    $effect(() => {
        if (visible && !isNaN(progress)) {
            width.target = Math.max(0, Math.min(100, progress));
        }
    });

    function runAnimationOnViewportVisible(node: HTMLElement) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        visible = true;
                        observer.unobserve(node);
                    }
                });
            },
            { threshold: 0.1 }
        );

        observer.observe(node);

        return {
            destroy() {
                observer.unobserve(node);
            }
        };
    }

    function handleMouseDown(e: MouseEvent) {
        if (!changeable) return;
        isDragging = true;
        updateProgress(e);
    }

    function handleMouseMove(e: MouseEvent) {
        if (!isDragging || !progressElement) return;
        updateProgress(e);
    }

    function handleMouseUp() {
        isDragging = false;
    }

    function updateProgress(e: MouseEvent) {
        if (!progressElement) return;
        
        const rect = progressElement.getBoundingClientRect();
        const newProgress = ((e.clientX - rect.left) / rect.width) * 100;
        const clampedProgress = Math.max(0, Math.min(100, newProgress));
        
        if (onchange) {
            onchange(clampedProgress);
        }

        width.target = clampedProgress;
        progressElement.dispatchEvent(new CustomEvent('change', { detail: clampedProgress }));
    }

    function handleMouseEnter() {
        if (changeable) isHovering = true;
    }

    function handleMouseLeave() {
        isHovering = false;
    }
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<div
    bind:this={progressElement}
    class="progress"
    use:runAnimationOnViewportVisible
    style="height: {height}px;"
    onmousedown={changeable ? handleMouseDown : null}
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
    class:changeable
    class:hovering={isHovering || isDragging}
    role="slider"
    aria-valuenow={Math.round(progress)}
    aria-valuemin="0"
    aria-valuemax="100"
    tabindex="0"
>
    <div class="bar" style="width: {width.current}%;"></div>
    {#if (isHovering || isDragging) && changeable}
        <div class="thumb" style="left: {width.current}%;"></div>
    {/if}
</div>

<style lang="scss">
    .progress {
        position: relative;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 999px;
        overflow: visible;
        cursor: default;
        transition: height 200ms ease;

        &.changeable {
            cursor: pointer;

            &:hover .bar {
                filter: brightness(1.1);
            }
            &.hovering {
                height: 20px;
            }
        }

        .bar {
            height: 100%;
            background: linear-gradient(90deg, var(--color-brand-600), var(--color-brand-800));
            border-radius: inherit;
            transition: width 240ms ease;
            pointer-events: none;
        }

        .thumb {
            position: absolute;
            top: 50%;
            width: 12px;
            height: 12px;
            background: linear-gradient(135deg, var(--color-brand-500), var(--color-brand-600));
            border-radius: 50%;
            transform: translate(-50%, -50%);
            box-shadow:
                0 2px 8px rgba(255, 255, 255, 0.1),
                0 0 0 3px rgba(255, 255, 255, 0.05);
            pointer-events: none;
            transition: all 200ms ease;
        }
    }
</style>