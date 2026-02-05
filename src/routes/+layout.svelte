<script>
	import { NotificationContainer } from '$lib/ui';
	import PlayerAudio from '$lib/ui/components/MusicPlayer/PlayerAudio.svelte';
	import '../styles/global.scss';
</script>

<PlayerAudio />
<NotificationContainer />
<slot />
