<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Calendar } from "$lib/components/ui/calendar";
  import * as Popover from "$lib/components/ui/popover";
  import { CalendarIcon } from "@lucide/svelte";
  import {
    CalendarDate,
    type DateValue,
    getLocalTimeZone,
    parseDate,
    today,
  } from "@internationalized/date";
  import { DateFormatter } from "@internationalized/date";

  interface Props {
    value: string | undefined;
    disabled?: boolean;
  }

  let { value = $bindable(), disabled = false }: Props = $props();

  const df = new DateFormatter("en-US", {
    dateStyle: "medium",
  });

  let open = $state(false);

  // Convert ISO string to DateValue for the calendar
  let dateValue = $derived.by(() => {
    if (!value) return undefined;
    try {
      // Webflow dates come as ISO strings like "2024-01-15T00:00:00.000Z"
      const dateStr = value.split("T")[0];
      return parseDate(dateStr);
    } catch {
      return undefined;
    }
  });

  // Format for display
  let displayValue = $derived.by(() => {
    if (!dateValue) return "";
    return df.format(dateValue.toDate(getLocalTimeZone()));
  });

  function handleDateChange(newDate: DateValue | undefined) {
    if (newDate) {
      // Convert DateValue back to ISO string for Webflow
      value = `${newDate.year}-${String(newDate.month).padStart(2, "0")}-${String(newDate.day).padStart(2, "0")}T00:00:00.000Z`;
    } else {
      value = undefined;
    }
    open = false;
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        class="w-full justify-start text-left font-normal {!dateValue
          ? 'text-muted-foreground'
          : ''}"
        {disabled}
      >
        <CalendarIcon class="mr-2 h-4 w-4" />
        {displayValue || "Pick a date"}
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-auto p-0" align="start">
    <Calendar
      type="single"
      value={dateValue}
      onValueChange={handleDateChange}
      initialFocus
    />
  </Popover.Content>
</Popover.Root>
