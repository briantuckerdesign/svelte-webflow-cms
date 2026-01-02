<script lang="ts">
  import * as Table from "$lib/components/ui/table";
  import type { Snippet } from "svelte";

  interface Props {
    /** Table content (header and body) */
    children: Snippet;
    /** Additional CSS classes for the table container */
    class?: string;
  }

  let { children, class: className = "" }: Props = $props();
</script>

<div class="overflow-x-hidden rounded-md border {className}">
  <Table.Root>
    {@render children()}
  </Table.Root>
</div>
