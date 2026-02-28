<script lang="ts">
  import Input from '$lib/components/ui/Input.svelte';
  import Label from '$lib/components/ui/Label.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';

  let {
    title = $bindable(''),
    description = $bindable(''),
    coverImageUrl = $bindable(''),
  }: {
    title: string;
    description: string;
    coverImageUrl: string;
  } = $props();
</script>

<div>
  <Label for="title">Game Title</Label>
  <Input id="title" type="text" bind:value={title} placeholder="My Awesome Game" />
</div>

<div>
  <Label for="description">
    Description <span class="text-text-muted">(optional)</span>
  </Label>
  <Textarea
    id="description"
    bind:value={description}
    placeholder="A short description of your game..."
    rows={2}
  />
</div>

<div>
  <Label for="coverImageUrl">
    Cover Image URL <span class="text-text-muted">(optional)</span>
  </Label>
  <Input
    id="coverImageUrl"
    type="url"
    bind:value={coverImageUrl}
    placeholder="https://example.com/cover.jpg"
  />
  {#if coverImageUrl.trim()}
    <img
      src={coverImageUrl}
      alt="Cover preview"
      loading="lazy"
      class="mt-2 h-24 w-auto rounded-lg object-contain"
      onerror={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  {/if}
</div>
