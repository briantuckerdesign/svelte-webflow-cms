<script lang="ts">
  import { buttonVariants } from "$lib/components/ui/button";
  import * as Table from "$lib/components/ui/table";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { bytesToMb } from "$lib/utils";
  import { InfoIcon } from "@lucide/svelte";
  import type { Snippet } from "svelte";
  import { getCmsTableContext } from "./context.js";

  interface Props {
    /** Custom header cells to render before the field columns */
    beforeColumns?: Snippet;
    /** Custom header cells to render after the field columns (before actions) */
    afterColumns?: Snippet;
    /** Whether to show the drag handle column (auto-detected from config) */
    showDragHandle?: boolean;
    /** Whether to show the actions column header (defaults to true) */
    showActions?: boolean;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    beforeColumns,
    afterColumns,
    showDragHandle,
    showActions,
    class: className,
  }: Props = $props();

  const ctx = getCmsTableContext();
  const config = $derived(ctx.config);
  const isDragEnabled = $derived(showDragHandle ?? ctx.isDragEnabled);
  const shouldShowActions = $derived(showActions ?? ctx.hasActionsColumn);
</script>

<Table.Header class={className}>
  <Table.Row class="hover:bg-transparent">
    <!-- Drag handle column -->
    {#if isDragEnabled}
      <Table.Head class="w-10 px-2 py-2"></Table.Head>
    {:else}
      <Table.Head class="w-1 p-0"></Table.Head>
    {/if}

    {#if beforeColumns}
      {@render beforeColumns()}
    {/if}

    <!-- Field columns -->
    {#each config.fields as field}
      {#if field.visible}
        <Table.Head
          class="{field.editable ? 'px-2' : 'px-1'} py-2"
          style={ctx.getCellStyle(field)}
        >
          <div style="display: flex; align-items: center;">
            {field.schema.name}
            {#if (field.schema.displayValidations && field.schema.validations && field.schema.type === "PlainText") || field.schema.type === "RichText"}
              <Tooltip.Root>
                <Tooltip.Trigger
                  class="ml-2 {buttonVariants({
                    variant: 'ghost',
                    size: 'icon-sm',
                  })}"
                >
                  <InfoIcon color="gray" />
                </Tooltip.Trigger>
                <Tooltip.Content>
                  {field.schema.validations.maxLength
                    ? `Max length: ${field.schema.validations.maxLength} characters`
                    : ""}
                  {field.schema.validations.minLength
                    ? `Min length: ${field.schema.validations.minLength} characters`
                    : ""}
                  {field.schema.validations.maxFileSize
                    ? `Max file size: ${bytesToMb(field.schema.validations.maxFileSize)} MB`
                    : ""}
                </Tooltip.Content>
              </Tooltip.Root>
            {/if}
          </div>
        </Table.Head>
      {/if}
    {/each}

    {#if afterColumns}
      {@render afterColumns()}
    {/if}

    <!-- Actions column -->
    {#if shouldShowActions}
      <Table.Head
        class="sticky right-0 px-8"
        style="padding-left: 3rem; background: linear-gradient(90deg, transparent 0%, white 20%);"
      >
        <!--actions-->
      </Table.Head>
    {/if}
  </Table.Row>
</Table.Header>
