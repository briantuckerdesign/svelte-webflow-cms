<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { validateNumber } from '../validation';

	interface Props {
		value: number | null;
		placeholder?: string;
		format?: 'integer' | 'decimal';
		precision?: number;
		allowNegative?: boolean;
	}

	let {
		value = $bindable(),
		placeholder,
		format = 'decimal',
		precision,
		allowNegative = true
	}: Props = $props();

	let error = $derived(!validateNumber(value, { format, precision, allowNegative }));

	function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
		const val = e.currentTarget.valueAsNumber;
		if (isNaN(val)) {
			value = null;
		} else {
			value = val;
		}
	}
</script>

<div class="relative">
	<Input
		type="number"
		{value}
		oninput={handleInput}
		{placeholder}
		step={format === 'integer' ? '1' : precision ? `0.${'0'.repeat(precision - 1)}1` : 'any'}
		class={error ? 'border-red-500 focus-visible:ring-red-500' : ''}
	/>
	{#if error && value !== null}
		<span class="absolute -bottom-4 left-0 text-[10px] text-red-500">Invalid Number</span>
	{/if}
</div>
