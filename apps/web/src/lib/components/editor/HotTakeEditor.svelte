<script lang="ts">
  import { TrashIcon } from '$lib/components/ui/icons';
  import Input from '$lib/components/ui/Input.svelte';
  import Label from '$lib/components/ui/Label.svelte';
  import AddButton from '$lib/components/ui/AddButton.svelte';
  import Button from '$lib/components/ui/Button.svelte';

  let {
    statements: initialStatements,
    roundDurationSec: initialDuration,
    onchange,
  }: {
    statements: string[];
    roundDurationSec: number;
    onchange: (config: { statements: string[]; roundDurationSec: number }) => void;
  } = $props();

  let statements = $state<string[]>([...initialStatements]);
  let roundDurationSec = $state(initialDuration);

  $effect(() => {
    onchange({ statements: [...statements], roundDurationSec });
  });

  function addStatement() {
    statements = [...statements, ''];
  }

  function removeStatement(index: number) {
    statements = statements.filter((_, i) => i !== index);
  }

  function updateStatement(index: number, value: string) {
    statements = statements.map((s, i) => (i === index ? value : s));
  }
</script>

<div class="space-y-4">
  <div>
    <Label>Statements</Label>
    <div class="space-y-2">
      {#each statements as statement, i (i)}
        <div class="flex gap-2">
          <Input
            type="text"
            value={statement}
            oninput={(e) => updateStatement(i, (e.target as HTMLInputElement).value)}
            placeholder="Enter a hot take statement..."
            class="flex-1"
          />
          {#if statements.length > 1}
            <Button variant="danger-outline" size="xs" onclick={() => removeStatement(i)}>
              <TrashIcon size={16} />
            </Button>
          {/if}
        </div>
      {/each}
    </div>
    <AddButton onclick={addStatement}>Add Statement</AddButton>
  </div>

  <div>
    <Label for="roundDuration">Round Duration (seconds)</Label>
    <Input id="roundDuration" type="number" min="5" max="300" bind:value={roundDurationSec} />
  </div>
</div>
