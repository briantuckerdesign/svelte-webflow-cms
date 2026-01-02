<script lang="ts">
  import type { Field } from "$lib/types.js";
  import { untrack } from "svelte";
  import ImageInput from "./inputs/ImageInput.svelte";
  import LinkInput from "./inputs/LinkInput.svelte";
  import NumberInput from "./inputs/NumberInput.svelte";
  import OptionInput from "./inputs/OptionInput.svelte";
  import SwitchInput from "./inputs/SwitchInput.svelte";
  import TextInput from "./inputs/TextInput.svelte";
  import EmailInput from "./inputs/EmailInput.svelte";
  import PhoneInput from "./inputs/PhoneInput.svelte";
  import ColorInput from "./inputs/ColorInput.svelte";
  import ReferenceInput from "./inputs/ReferenceInput.svelte";
  import MultiReferenceInput from "./inputs/MultiReferenceInput.svelte";
  import DateInput from "./inputs/DateInput.svelte";

  interface Props {
    field: Field;
    value: any;
    itemId?: string;
    itemName?: string;
    referenceData?: Record<string, any[]>;
    onTempFile?: (itemId: string, filename: string) => void;
  }

  let {
    field,
    value = $bindable(),
    itemId = "",
    itemName = "",
    referenceData = {},
    onTempFile,
  }: Props = $props();

  let schema = $derived(field.schema);
  let editable = $derived(field.editable !== false);

  // VideoLink comes as { url: string } from Webflow but we write it as string
  let displayValue = $state(
    // svelte-ignore state_referenced_locally
    schema.type === "VideoLink" && typeof value === "object" && value?.url
      ? value.url
      : value
  );

  $effect(() => {
    // Sync incoming value changes (e.g. from server load) to displayValue
    const newVal =
      schema.type === "VideoLink" && typeof value === "object" && value?.url
        ? value.url
        : value;
    if (newVal !== untrack(() => displayValue)) {
      displayValue = newVal;
    }
  });

  $effect(() => {
    // Sync outgoing displayValue changes to value
    // We use untrack on the derivation check to avoid triggering this effect when value changes from parent
    const currentVal = untrack(() =>
      schema.type === "VideoLink" && typeof value === "object" && value?.url
        ? value.url
        : value
    );
    if (displayValue !== currentVal) {
      value = displayValue;
    }
  });
</script>

{#if schema.type === "PlainText"}
  {#if editable}
    <TextInput
      bind:value={displayValue}
      maxlength={schema.validations?.maxLength}
      validations={schema.validations}
      displayValidations={schema.displayValidations}
    />
  {:else}
    <span class="text-sm">{displayValue || "-"}</span>
  {/if}
{:else if schema.type === "Link" || schema.type === "VideoLink"}
  {#if editable}
    <LinkInput bind:value={displayValue} />
  {:else}
    <a
      href={displayValue}
      class="text-sm text-blue-600 hover:underline"
      target="_blank">{displayValue || "-"}</a
    >
  {/if}
{:else if schema.type === "Email"}
  {#if editable}
    <EmailInput bind:value={displayValue} />
  {:else}
    <a
      href="mailto:{displayValue}"
      class="text-sm text-blue-600 hover:underline">{displayValue || "-"}</a
    >
  {/if}
{:else if schema.type === "Phone"}
  {#if editable}
    <PhoneInput bind:value={displayValue} />
  {:else}
    <a href="tel:{displayValue}" class="text-sm text-blue-600 hover:underline"
      >{displayValue || "-"}</a
    >
  {/if}
{:else if schema.type === "Number"}
  {#if editable}
    <NumberInput
      bind:value={displayValue}
      format={schema.validations?.format}
      precision={schema.validations?.precision}
      allowNegative={schema.validations?.allowNegative}
    />
  {:else}
    <span class="text-sm">{displayValue ?? "-"}</span>
  {/if}
{:else if schema.type === "Switch"}
  <SwitchInput bind:value={displayValue} disabled={!editable} />
{:else if schema.type === "Color"}
  <ColorInput bind:value={displayValue} disabled={!editable} />
{:else if schema.type === "Option"}
  {#if editable}
    <OptionInput
      bind:value={displayValue}
      options={schema.validations?.options || []}
    />
  {:else}
    {@const options = schema.validations?.options || []}
    <span class="text-sm"
      >{options.find((o: any) => o.id === displayValue)?.name ||
        displayValue ||
        "-"}</span
    >
  {/if}
{:else if schema.type === "Reference"}
  {#if editable}
    {@const collectionId = schema.validations?.collectionId}
    {@const referenceItems = collectionId
      ? referenceData[collectionId] || []
      : []}
    <ReferenceInput bind:value={displayValue} {referenceItems} />
  {:else}
    {@const collectionId = schema.validations?.collectionId}
    {@const referenceItems = collectionId
      ? referenceData[collectionId] || []
      : []}
    {@const referencedItem = referenceItems.find(
      (item: any) => item.id === displayValue
    )}
    <span class="text-sm"
      >{referencedItem?.fieldData?.name || displayValue || "-"}</span
    >
  {/if}
{:else if schema.type === "MultiReference"}
  {#if editable}
    {@const collectionId = schema.validations?.collectionId}
    {@const referenceItems = collectionId
      ? referenceData[collectionId] || []
      : []}
    <MultiReferenceInput bind:value={displayValue} {referenceItems} />
  {:else}
    {@const collectionId = schema.validations?.collectionId}
    {@const referenceItems = collectionId
      ? referenceData[collectionId] || []
      : []}
    {@const selectedNames = (displayValue || [])
      .map(
        (id: string) =>
          referenceItems.find((item: any) => item.id === id)?.fieldData?.name ||
          id
      )
      .join(", ")}
    <span class="text-sm">{selectedNames || "-"}</span>
  {/if}
{:else if schema.type === "Image"}
  <ImageInput
    bind:value
    {itemId}
    {itemName}
    imageSettings={field.schema.imageSettings}
    {onTempFile}
    disabled={!editable}
  />
{:else if schema.type === "DateTime"}
  {#if editable}
    <DateInput bind:value={displayValue} />
  {:else}
    {@const dateStr = displayValue
      ? new Date(displayValue).toLocaleDateString("en-US", {
          dateStyle: "medium",
        })
      : "-"}
    <span class="text-sm">{dateStr}</span>
  {/if}
{:else}
  <div class="text-sm text-gray-500 italic">Unsupported: {schema.type}</div>
{/if}
