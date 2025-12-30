<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { validateUrl } from '../validation';

	let { value = $bindable(), placeholder }: { value: string; placeholder?: string } = $props();

	let error = $derived(!validateUrl(value));
</script>

<div class="relative">
	<Input
		type="url"
		bind:value
		{placeholder}
		class={error ? 'border-red-500 focus-visible:ring-red-500' : ''}
	/>
	{#if error && value}
		<span class="absolute -bottom-4 left-0 text-[10px] text-red-500">Invalid URL</span>
	{/if}
</div>
