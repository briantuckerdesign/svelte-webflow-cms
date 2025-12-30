<script lang="ts">
	import { Input } from '$lib/components/ui/input';

	interface Props {
		value: string;
		placeholder?: string;
		disabled?: boolean;
	}

	const isValidHexColor = (hex: string): boolean => /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
	const ensurePoundSign = (hex: string): string => (hex.startsWith('#') ? hex : '#' + hex);
	const handleDoublePound = (hex: string): string => hex.replace('##', '#');

	$effect(() => {
		if (!value) return;
		if (!isValidHexColor(value)) {
			value = handleDoublePound(ensurePoundSign(value));
		}
	});

	let { value = $bindable(), placeholder, disabled }: Props = $props();
</script>

<Input type="text" bind:value {placeholder} {disabled} style="border-right: 20px solid {value}" />
