<script lang="ts">
	import { X } from '@lucide/svelte';
	import { Portal } from 'bits-ui';
	import * as InputGroup from '$lib/components/ui/input-group';
	import * as Command from '$lib/components/ui/command';
	import { Badge } from '$lib/components/ui/badge';

	interface Props {
		value: string[] | undefined;
		referenceItems: any[];
		disabled?: boolean;
	}

	let { value = $bindable(), referenceItems, disabled }: Props = $props();

	let searchValue = $state('');
	let isOpen = $state(false);
	let inputRef: HTMLInputElement | null = $state(null);
	let containerRef: HTMLDivElement | null = $state(null);
	let dropdownStyle = $state('');

	// Ensure value is always an array internally
	let items = $derived(value ?? []);

	// Sort items alphabetically by name
	let sortedItems = $derived(
		[...referenceItems].sort((a, b) => {
			const nameA = a.fieldData?.name || a.id;
			const nameB = b.fieldData?.name || b.id;
			return nameA.localeCompare(nameB);
		})
	);

	// Filter out already selected items
	let availableItems = $derived(sortedItems.filter((item) => !items.includes(item.id)));

	// Get selected items with their names
	let selectedItems = $derived(
		items
			.map((id) => {
				const item = sortedItems.find((i) => i.id === id);
				return item ? { id, name: item.fieldData?.name || id } : null;
			})
			.filter(Boolean) as { id: string; name: string }[]
	);

	function selectItem(id: string) {
		if (!items.includes(id)) {
			value = [...items, id];
		}
		searchValue = '';
		inputRef?.focus();
	}

	function removeItem(id: string) {
		value = items.filter((v) => v !== id);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Backspace' && !searchValue && selectedItems.length > 0) {
			removeItem(selectedItems[selectedItems.length - 1].id);
		} else if (e.key === 'Escape') {
			isOpen = false;
		}
	}

	let dropdownRef: HTMLDivElement | null = $state(null);

	function updateDropdownPosition() {
		if (!containerRef) return;
		const rect = containerRef.getBoundingClientRect();
		dropdownStyle = `position: fixed; top: ${rect.bottom + 4}px; left: ${rect.left}px; width: ${rect.width}px;`;
	}

	function handleFocus() {
		updateDropdownPosition();
		isOpen = true;
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as Node;
		if (containerRef?.contains(target)) return;
		if (dropdownRef?.contains(target)) return;
		isOpen = false;
	}
</script>

<svelte:document onclick={handleClickOutside} />

<div class="relative w-full" bind:this={containerRef}>
	<InputGroup.Root class="flex-nowrap gap-1 overflow-x-auto px-2 py-1">
		{#each selectedItems as item (item.id)}
			<Badge variant="secondary" class="shrink-0 gap-1 py-1 pr-1.5 text-sm">
				{item.name}
				{#if !disabled}
					<button
						type="button"
						class="rounded-sm hover:bg-secondary-foreground/20"
						onclick={() => removeItem(item.id)}
					>
						<X class="size-3" />
					</button>
				{/if}
			</Badge>
		{/each}
		<input
			bind:this={inputRef}
			type="text"
			data-slot="input-group-control"
			class="min-w-20 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
			placeholder={selectedItems.length === 0 ? 'Select items...' : ''}
			bind:value={searchValue}
			onfocus={handleFocus}
			onclick={handleFocus}
			onkeydown={handleKeydown}
			{disabled}
		/>
	</InputGroup.Root>
</div>

{#if isOpen && availableItems.length > 0}
	<Portal>
		<div
			bind:this={dropdownRef}
			class="z-50 rounded-md border bg-popover text-popover-foreground shadow-md"
			style={dropdownStyle}
		>
			<Command.Root shouldFilter={true}>
				<Command.Input class="hidden" bind:value={searchValue} style="display:none" />
				<Command.List>
					<Command.Empty>No items found.</Command.Empty>
					{#each availableItems as item (item.id)}
						<Command.Item
							value={item.fieldData?.name || item.id}
							onSelect={() => selectItem(item.id)}
						>
							{item.fieldData?.name || item.id}
						</Command.Item>
					{/each}
				</Command.List>
			</Command.Root>
		</div>
	</Portal>
{/if}
