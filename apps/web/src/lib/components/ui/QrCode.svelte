<script lang="ts">
  import QRCode from 'qrcode';

  let { value, size = 160 }: { value: string; size?: number } = $props();

  let dataUrl = $state<string | null>(null);

  $effect(() => {
    dataUrl = null;
    QRCode.toDataURL(value, {
      width: size,
      margin: 2,
      color: { dark: '#efeff1', light: '#18181b' },
    }).then((url) => {
      dataUrl = url;
    });
  });
</script>

{#if dataUrl}
  <img src={dataUrl} alt="QR Code" width={size} height={size} class="rounded-lg" />
{:else}
  <div
    class="animate-pulse rounded-lg bg-surface-tertiary"
    style="width: {size}px; height: {size}px;"
  ></div>
{/if}
