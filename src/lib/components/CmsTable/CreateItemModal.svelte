<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import * as Select from '$lib/components/ui/select';
	import type { TableConfig } from '$lib/types.js';

	interface Props {
		config: TableConfig;
		open: boolean;
		onOpenChange: (open: boolean) => void;
		onSubmit: (item: any) => void;
	}

	let { config, open = $bindable(), onOpenChange, onSubmit }: Props = $props();

	// Form state - fieldData mirrors the Webflow item structure
	let fieldData = $state<Record<string, any>>({});
	let isDraft = $state(true);
	let lastOpenState = $state(false);

	// Reset form when modal opens (track previous state to avoid infinite loop)
	$effect(() => {
		if (open && !lastOpenState) {
			resetForm();
		}
		lastOpenState = open;
	});

	function resetForm() {
		const newFieldData: Record<string, any> = {};
		// Initialize with defaults
		for (const field of config.fields) {
			if (field.schema.defaultValue !== undefined) {
				newFieldData[field.schema.slug] = field.schema.defaultValue;
			} else if (field.schema.type === 'Switch') {
				newFieldData[field.schema.slug] = false;
			} else if (field.schema.type === 'Number') {
				newFieldData[field.schema.slug] = 0;
			} else {
				newFieldData[field.schema.slug] = '';
			}
		}
		fieldData = newFieldData;
		isDraft = true;
	}

	// Generate slug from name field
	function generateSlug(name: string): string {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/(^-|-$)/g, '');
	}

	function handleSubmit() {
		// Find name field and generate slug
		const nameField = config.fields.find(
			(f) => f.schema.slug === 'name' || f.schema.name.toLowerCase() === 'name'
		);
		const name = nameField ? fieldData[nameField.schema.slug] : '';

		// Generate slug if not provided
		if (!fieldData.slug && name) {
			fieldData.slug = generateSlug(name);
		}

		// Create item structure matching Webflow CollectionItem
		const newItem = {
			id: `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
			fieldData: { ...fieldData },
			isDraft,
			isArchived: isDraft,
			_isNew: true // Mark as pending create
		};

		onSubmit(newItem);
		onOpenChange(false);
	}

	function getFieldValue(slug: string): any {
		return fieldData[slug];
	}

	function setFieldValue(slug: string, value: any) {
		fieldData[slug] = value;
	}
</script>

<Dialog.Root {open} {onOpenChange}>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
		<Dialog.Header>
			<Dialog.Title>Add {config.itemSingular}</Dialog.Title>
			<Dialog.Description>
				Create a new {config.itemSingular}. Click save when you're done.
			</Dialog.Description>
		</Dialog.Header>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
			class="space-y-4 py-4"
		>
			{#each config.fields as field}
				{#if field.visible && field.editable}
					<div class="space-y-2">
						<Label for={field.schema.slug}>{field.schema.name}</Label>

						{#if field.schema.type === 'PlainText'}
							<Input
								id={field.schema.slug}
								type="text"
								value={getFieldValue(field.schema.slug)}
								oninput={(e) => setFieldValue(field.schema.slug, e.currentTarget.value)}
								placeholder={field.schema.name}
								maxlength={field.schema.validations?.maxLength}
							/>
						{:else if field.schema.type === 'Link' || field.schema.type === 'VideoLink'}
							<Input
								id={field.schema.slug}
								type="url"
								value={getFieldValue(field.schema.slug)}
								oninput={(e) => setFieldValue(field.schema.slug, e.currentTarget.value)}
								placeholder="https://..."
							/>
						{:else if field.schema.type === 'Email'}
							<Input
								id={field.schema.slug}
								type="email"
								value={getFieldValue(field.schema.slug)}
								oninput={(e) => setFieldValue(field.schema.slug, e.currentTarget.value)}
								placeholder="name@example.com"
							/>
						{:else if field.schema.type === 'Phone'}
							<Input
								id={field.schema.slug}
								type="tel"
								value={getFieldValue(field.schema.slug)}
								oninput={(e) => setFieldValue(field.schema.slug, e.currentTarget.value)}
								placeholder="(555) 555-5555"
							/>
						{:else if field.schema.type === 'Number'}
							<Input
								id={field.schema.slug}
								type="number"
								value={getFieldValue(field.schema.slug)}
								oninput={(e) => setFieldValue(field.schema.slug, Number(e.currentTarget.value))}
								placeholder={field.schema.name}
								step={field.schema.validations?.format === 'integer'
									? '1'
									: field.schema.validations?.precision
										? `0.${'0'.repeat(field.schema.validations.precision - 1)}1`
										: 'any'}
							/>
						{:else if field.schema.type === 'Switch'}
							<Switch
								id={field.schema.slug}
								checked={getFieldValue(field.schema.slug)}
								onCheckedChange={(checked) => setFieldValue(field.schema.slug, checked)}
							/>
						{:else if field.schema.type === 'Option'}
							{@const options = field.schema.validations?.options || []}
							{@const currentValue = getFieldValue(field.schema.slug)}
							<Select.Root
								type="single"
								value={currentValue}
								onValueChange={(v) => setFieldValue(field.schema.slug, v)}
							>
								<Select.Trigger class="w-full">
									<span class={currentValue ? '' : 'text-muted-foreground'}>
										{options.find((o: any) => o.id === currentValue)?.name ||
											`Select ${field.schema.name}`}
									</span>
								</Select.Trigger>
								<Select.Content>
									{#each options as option (option.id)}
										<Select.Item value={option.id}>{option.name}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						{:else}
							<p class="text-sm text-muted-foreground">Field type not supported in create form</p>
						{/if}
					</div>
				{/if}
			{/each}

			<!-- Live/Draft toggle -->
			<div class="flex items-center gap-4 pt-2">
				<Switch
					id="live-toggle"
					checked={!isDraft}
					onCheckedChange={(checked) => (isDraft = !checked)}
				/>
				<Label for="live-toggle">Create as live (published)</Label>
			</div>

			<Dialog.Footer class="pt-4">
				<Button type="button" variant="outline" onclick={() => onOpenChange(false)}>Cancel</Button>
				<Button type="submit">Add to List</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
