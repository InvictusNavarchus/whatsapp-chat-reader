<script lang="ts">
import '../index.css';

let { children } = $props();
</script>

<svelte:head>
	<title>WhatsApp Chat Reader</title>
</svelte:head>

{@render children()}
