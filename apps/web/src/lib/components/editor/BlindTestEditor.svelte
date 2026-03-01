<script lang="ts">
  import { TrashIcon } from '$lib/components/ui/icons';
  import Input from '$lib/components/ui/Input.svelte';
  import Label from '$lib/components/ui/Label.svelte';
  import AddButton from '$lib/components/ui/AddButton.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import CollectionItemHeader from '$lib/components/ui/CollectionItemHeader.svelte';

  interface BlindRound {
    answer: string;
    hints: string[];
    mediaSrc?: string;
    imageUrl?: string;
  }

  let {
    rounds,
    answerWindowSec,
    onchange,
  }: {
    rounds: BlindRound[];
    answerWindowSec: number;
    onchange: (config: { rounds: BlindRound[]; answerWindowSec: number }) => void;
  } = $props();

  function emitRounds(updated: BlindRound[]) {
    onchange({ rounds: updated, answerWindowSec });
  }

  function addRound() {
    emitRounds([...rounds, { answer: '', hints: [''] }]);
  }

  function removeRound(index: number) {
    emitRounds(rounds.filter((_, i) => i !== index));
  }

  function updateRoundAnswer(index: number, value: string) {
    emitRounds(rounds.map((r, i) => (i === index ? { ...r, answer: value } : r)));
  }

  function updateRoundImageUrl(index: number, value: string) {
    emitRounds(rounds.map((r, i) => (i === index ? { ...r, imageUrl: value } : r)));
  }

  function addHint(roundIndex: number) {
    emitRounds(rounds.map((r, i) => (i === roundIndex ? { ...r, hints: [...r.hints, ''] } : r)));
  }

  function removeHint(roundIndex: number, hintIndex: number) {
    emitRounds(
      rounds.map((r, i) =>
        i === roundIndex ? { ...r, hints: r.hints.filter((_, j) => j !== hintIndex) } : r,
      ),
    );
  }

  function updateHint(roundIndex: number, hintIndex: number, value: string) {
    emitRounds(
      rounds.map((r, i) =>
        i === roundIndex
          ? { ...r, hints: r.hints.map((h, j) => (j === hintIndex ? value : h)) }
          : r,
      ),
    );
  }
</script>

<div class="space-y-4">
  <div>
    <Label>Rounds</Label>
    <div class="space-y-4">
      {#each rounds as round, ri (ri)}
        <Card variant="item" padding="md">
          <CollectionItemHeader
            label="Round {ri + 1}"
            canDelete={rounds.length > 1}
            ondelete={() => removeRound(ri)}
          />
          <Input
            type="text"
            variant="nested"
            value={round.answer}
            oninput={(e) => updateRoundAnswer(ri, (e.target as HTMLInputElement).value)}
            placeholder="Correct answer..."
            class="mb-2"
          />
          <Input
            type="url"
            inputSize="sm"
            variant="nested"
            value={round.imageUrl ?? ''}
            oninput={(e) => updateRoundImageUrl(ri, (e.target as HTMLInputElement).value)}
            placeholder="Image clue URL (optional)"
            class="mb-2"
          />
          <Label variant="secondary">Hints</Label>
          <div class="space-y-2">
            {#each round.hints as hint, hi (hi)}
              <div class="flex gap-2">
                <Input
                  type="text"
                  variant="nested"
                  value={hint}
                  oninput={(e) => updateHint(ri, hi, (e.target as HTMLInputElement).value)}
                  placeholder="Hint {hi + 1}..."
                  class="flex-1"
                />
                {#if round.hints.length > 1}
                  <Button variant="danger-outline" size="xs" onclick={() => removeHint(ri, hi)}>
                    <TrashIcon size={16} />
                  </Button>
                {/if}
              </div>
            {/each}
          </div>
          <AddButton onclick={() => addHint(ri)}>Add Hint</AddButton>
        </Card>
      {/each}
    </div>
    <AddButton onclick={addRound}>Add Round</AddButton>
  </div>

  <div>
    <Label for="answerWindow">Answer Window (seconds)</Label>
    <Input
      id="answerWindow"
      type="number"
      min="5"
      max="300"
      value={answerWindowSec}
      oninput={(e) => {
        const val = (e.target as HTMLInputElement).valueAsNumber;
        if (!isNaN(val)) onchange({ rounds, answerWindowSec: val });
      }}
    />
  </div>
</div>
