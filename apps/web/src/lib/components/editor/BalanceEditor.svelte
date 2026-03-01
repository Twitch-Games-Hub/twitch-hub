<script lang="ts">
  import Input from '$lib/components/ui/Input.svelte';
  import Label from '$lib/components/ui/Label.svelte';
  import AddButton from '$lib/components/ui/AddButton.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import CollectionItemHeader from '$lib/components/ui/CollectionItemHeader.svelte';

  interface BalanceQuestion {
    optionA: string;
    optionB: string;
    imageUrlA?: string;
    imageUrlB?: string;
  }

  let {
    questions,
    roundDurationSec,
    onchange,
  }: {
    questions: BalanceQuestion[];
    roundDurationSec: number;
    onchange: (config: { questions: BalanceQuestion[]; roundDurationSec: number }) => void;
  } = $props();

  function addQuestion() {
    onchange({ questions: [...questions, { optionA: '', optionB: '' }], roundDurationSec });
  }

  function removeQuestion(index: number) {
    onchange({ questions: questions.filter((_, i) => i !== index), roundDurationSec });
  }

  function updateQuestion(index: number, field: keyof BalanceQuestion, value: string) {
    onchange({
      questions: questions.map((q, i) => (i === index ? { ...q, [field]: value } : q)),
      roundDurationSec,
    });
  }
</script>

<div class="space-y-4">
  <div>
    <Label>Questions</Label>
    <div class="space-y-4">
      {#each questions as question, i (i)}
        <Card variant="item" padding="md">
          <CollectionItemHeader
            label="Question {i + 1}"
            canDelete={questions.length > 1}
            ondelete={() => removeQuestion(i)}
          />

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label for="optionA-{i}" variant="secondary">Option A</Label>
              <Input
                id="optionA-{i}"
                type="text"
                inputSize="sm"
                variant="nested"
                value={question.optionA}
                oninput={(e) => updateQuestion(i, 'optionA', (e.target as HTMLInputElement).value)}
                placeholder="e.g. Cats"
              />
            </div>

            <div>
              <Label for="optionB-{i}" variant="secondary">Option B</Label>
              <Input
                id="optionB-{i}"
                type="text"
                inputSize="sm"
                variant="nested"
                value={question.optionB}
                oninput={(e) => updateQuestion(i, 'optionB', (e.target as HTMLInputElement).value)}
                placeholder="e.g. Dogs"
              />
            </div>

            <div>
              <Label for="imageUrlA-{i}" variant="secondary">Image URL A (optional)</Label>
              <Input
                id="imageUrlA-{i}"
                type="url"
                inputSize="sm"
                variant="nested"
                value={question.imageUrlA ?? ''}
                oninput={(e) =>
                  updateQuestion(i, 'imageUrlA', (e.target as HTMLInputElement).value)}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label for="imageUrlB-{i}" variant="secondary">Image URL B (optional)</Label>
              <Input
                id="imageUrlB-{i}"
                type="url"
                inputSize="sm"
                variant="nested"
                value={question.imageUrlB ?? ''}
                oninput={(e) =>
                  updateQuestion(i, 'imageUrlB', (e.target as HTMLInputElement).value)}
                placeholder="https://..."
              />
            </div>
          </div>
        </Card>
      {/each}
    </div>
    <AddButton onclick={addQuestion}>Add Question</AddButton>
  </div>

  <div>
    <Label for="roundDuration">Round Duration (seconds) — 0 for no timer</Label>
    <Input
      id="roundDuration"
      type="number"
      min="0"
      max="300"
      value={roundDurationSec}
      oninput={(e) => {
        const val = (e.target as HTMLInputElement).valueAsNumber;
        if (!isNaN(val)) onchange({ questions, roundDurationSec: val });
      }}
    />
  </div>
</div>
