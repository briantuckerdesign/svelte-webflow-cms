<script lang="ts">
	import * as Select from '$lib/components/ui/select';

	interface Props {
		value: string;
		options: { name: string; id: string }[];
		disabled?: boolean;
	}

	let { value = $bindable(), options, disabled }: Props = $props();
</script>

<Select.Root type="single" bind:value {disabled}>
	<Select.Trigger class="w-full">
		<span class={value ? '' : 'text-muted-foreground'}>
			{options.find((o) => o.id === value)?.name || 'Select an option'}
		</span>
	</Select.Trigger>
	<Select.Content>
		{#each options as option}
			<Select.Item value={option.id}>{option.name}</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
