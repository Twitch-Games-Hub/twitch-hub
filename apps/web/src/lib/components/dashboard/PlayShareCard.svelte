<script lang="ts">
  import CopyButton from '$lib/components/ui/CopyButton.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import QrCode from '$lib/components/ui/QrCode.svelte';
  import ShareIcon from '$lib/components/ui/icons/ShareIcon.svelte';

  let { sessionId, appUrl }: { sessionId: string; appUrl: string } = $props();

  const playUrl = $derived(`${appUrl}/play/${sessionId}`);
  const overlayUrl = $derived(`${appUrl}/overlay/${sessionId}`);

  let canShare = $derived(typeof globalThis.navigator?.share === 'function');

  async function share() {
    try {
      await navigator.share({ title: 'Join the game!', url: playUrl });
    } catch {
      // user cancelled or not supported
    }
  }

  function openOverlayPreview() {
    window.open(
      overlayUrl,
      'obs-overlay',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no',
    );
  }
</script>

<div
  class="overflow-hidden rounded-xl border border-brand-600/30 bg-gradient-to-br from-brand-900/20 to-surface-secondary"
>
  <div class="border-b border-border-default px-4 py-2.5">
    <h3 class="text-xs font-semibold uppercase tracking-wider text-text-muted">
      Share with your audience
    </h3>
  </div>

  <div class="p-4">
    <div class="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <!-- QR Code -->
      <div class="flex-shrink-0">
        <QrCode value={playUrl} size={140} />
      </div>

      <!-- Play link + actions -->
      <div class="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <span class="mb-1 block text-xs font-medium text-text-muted">Play Link</span>
          <div class="flex items-center gap-1.5 rounded-lg bg-surface-tertiary px-3 py-2">
            <code class="min-w-0 flex-1 truncate text-sm text-brand-400">{playUrl}</code>
            <CopyButton value={playUrl} />
          </div>
        </div>

        {#if canShare}
          <Button variant="primary" size="sm" onclick={share}>
            <ShareIcon size={16} />
            Share Link
          </Button>
        {/if}
      </div>
    </div>

    <!-- Divider + OBS overlay -->
    <div class="mt-4 border-t border-border-default pt-3">
      <div class="flex items-center gap-1.5 rounded-lg bg-surface-tertiary px-3 py-2">
        <span class="flex-shrink-0 text-xs text-text-muted">OBS Overlay</span>
        <code class="min-w-0 flex-1 truncate text-sm text-text-secondary">{overlayUrl}</code>
        <button
          onclick={openOverlayPreview}
          class="flex-shrink-0 rounded-md px-2 py-1 text-xs font-medium text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary"
        >
          Preview
        </button>
        <CopyButton value={overlayUrl} />
      </div>
    </div>
  </div>
</div>
