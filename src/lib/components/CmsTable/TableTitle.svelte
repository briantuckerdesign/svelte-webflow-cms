<script lang="ts">
	import { SquareArrowUpRight } from '@lucide/svelte';
	import { Button } from '../ui/button';

	interface Props {
		title: string;
		href?: string;
	}

	let { title, href }: Props = $props();
</script>

<div class="flex items-center justify-between gap-4">
	<h1 class="text-2xl font-bold">{title}</h1>
	{#if href}
		<Button {href} variant="ghost" size="sm" target="_blank">
			Visit Page
			<SquareArrowUpRight />
		</Button>
	{/if}
</div>
