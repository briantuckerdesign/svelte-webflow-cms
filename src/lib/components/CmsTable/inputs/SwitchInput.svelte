<script lang="ts">
	import { Switch } from '$lib/components/ui/switch';

	interface Props {
		value: boolean;
		disabled?: boolean;
	}

	let { value = $bindable(), disabled }: Props = $props();
</script>

<Switch bind:checked={value} {disabled} />
