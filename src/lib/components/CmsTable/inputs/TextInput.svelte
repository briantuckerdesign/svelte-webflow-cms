<script lang="ts">
  import * as InputGroup from "$lib/components/ui/input-group";

  interface Props {
    value: string;
    placeholder?: string;
    maxlength?: number;
    disabled?: boolean;
    validations: {
      maxLength?: number;
      minLength?: number;
    };
  }

  let {
    value = $bindable(),
    placeholder,
    maxlength,
    disabled,
    validations,
  }: Props = $props();
</script>

<InputGroup.Root>
  <InputGroup.Input
    type="text"
    bind:value
    {placeholder}
    {maxlength}
    {disabled}
  />
  {#if validations.maxLength}
    <InputGroup.Addon
      align="inline-end"
      class="text-[0.65rem]"
      style="margin-right: 6px;"
      >{validations.maxLength - (value?.length || 0)}</InputGroup.Addon
    >
  {/if}
</InputGroup.Root>
