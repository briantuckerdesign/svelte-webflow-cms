<script lang="ts">
	import * as Select from '$lib/components/ui/select';

	interface Props {
		value: string;
		referenceItems: any[];
		disabled?: boolean;
	}

	let { value = $bindable(), referenceItems, disabled }: Props = $props();

	// Sort items alphabetically by name
	let sortedItems = $derived(
		[...referenceItems].sort((a, b) => {
			const nameA = a.fieldData?.name || a.id;
			const nameB = b.fieldData?.name || b.id;
			return nameA.localeCompare(nameB);
		})
	);

	// Find the selected item's name
	let selectedName = $derived.by(() => {
		if (!value) return 'None';
		const item = sortedItems.find((item) => item.id === value);
		return item?.fieldData?.name || 'Select an item';
	});
</script>

<Select.Root type="single" bind:value {disabled}>
	<Select.Trigger class="w-full">
		<span class={value ? '' : 'text-muted-foreground'}>
			{selectedName}
		</span>
	</Select.Trigger>
	<Select.Content>
		<Select.Item value="">None</Select.Item>
		{#each sortedItems as item}
			<Select.Item value={item.id}>{item.fieldData?.name || item.id}</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
