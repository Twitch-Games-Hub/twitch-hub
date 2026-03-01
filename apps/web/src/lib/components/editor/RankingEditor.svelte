<script lang="ts">
  import Input from '$lib/components/ui/Input.svelte';
  import Label from '$lib/components/ui/Label.svelte';
  import AddButton from '$lib/components/ui/AddButton.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import CollectionItemHeader from '$lib/components/ui/CollectionItemHeader.svelte';

  interface RankingItem {
    id: string;
    name: string;
    imageUrl?: string;
  }

  let {
    items: initialItems,
    bracketSize: initialBracketSize,
    roundDurationSec: initialDuration,
    onchange,
  }: {
    items: RankingItem[];
    bracketSize: 8 | 16 | 32;
    roundDurationSec: number;
    onchange: (config: {
      items: RankingItem[];
      bracketSize: 8 | 16 | 32;
      roundDurationSec: number;
    }) => void;
  } = $props();

  let items = $state<RankingItem[]>(initialItems.map((item) => ({ ...item })));
  let bracketSize = $state<8 | 16 | 32>(initialBracketSize);
  let roundDurationSec = $state(initialDuration);

  $effect(() => {
    onchange({ items: items.map((item) => ({ ...item })), bracketSize, roundDurationSec });
  });

  function addItem() {
    items = [...items, { id: crypto.randomUUID(), name: '' }];
  }

  function removeItem(index: number) {
    items = items.filter((_, i) => i !== index);
  }

  function updateItem(index: number, field: keyof RankingItem, value: string) {
    items = items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
  }

  const validItemCount = $derived(items.filter((item) => item.name.trim()).length);
</script>

<div class="space-y-4">
  <div>
    <Label for="bracketSize">Bracket Size</Label>
    <select
      id="bracketSize"
      class="w-full rounded-lg border border-border-default bg-surface-secondary px-3 py-2 text-sm text-text-primary"
      value={bracketSize}
      onchange={(e) => {
        bracketSize = parseInt((e.target as HTMLSelectElement).value) as 8 | 16 | 32;
      }}
    >
      <option value={8}>8 items</option>
      <option value={16}>16 items</option>
      <option value={32}>32 items</option>
    </select>
  </div>

  <div>
    <Label>Items</Label>
    <p class="mb-2 text-sm text-text-muted">
      You need at least {bracketSize} items. Currently: {validItemCount}
      {#if validItemCount < bracketSize}
        <span class="text-warning-500">({bracketSize - validItemCount} more needed)</span>
      {:else}
        <span class="text-success-500">(ready)</span>
      {/if}
    </p>
    <div class="space-y-4">
      {#each items as item, i (item.id)}
        <Card variant="item" padding="md">
          <CollectionItemHeader
            label="Item {i + 1}"
            canDelete={items.length > 2}
            ondelete={() => removeItem(i)}
          />

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label for="name-{i}" variant="secondary">Name</Label>
              <Input
                id="name-{i}"
                type="text"
                inputSize="sm"
                variant="nested"
                value={item.name}
                oninput={(e) => updateItem(i, 'name', (e.target as HTMLInputElement).value)}
                placeholder="e.g. Pizza"
              />
            </div>

            <div>
              <Label for="imageUrl-{i}" variant="secondary">Image URL (optional)</Label>
              <Input
                id="imageUrl-{i}"
                type="url"
                inputSize="sm"
                variant="nested"
                value={item.imageUrl ?? ''}
                oninput={(e) => updateItem(i, 'imageUrl', (e.target as HTMLInputElement).value)}
                placeholder="https://..."
              />
              {#if item.imageUrl?.trim()}
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  loading="lazy"
                  class="mt-1 h-10 w-10 rounded object-cover"
                  onerror={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              {/if}
            </div>
          </div>
        </Card>
      {/each}
    </div>
    <AddButton onclick={addItem}>Add Item</AddButton>
  </div>

  <div>
    <Label for="roundDuration">Round Duration (seconds)</Label>
    <Input id="roundDuration" type="number" min="5" max="300" bind:value={roundDurationSec} />
  </div>
</div>
