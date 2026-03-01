# Google AdSense Integration

## Overview

Display ads are shown on the **play page** (`/play/[sessionId]`) during passive moments (lobby, post-submit wait, game over). Subscribers get an ad-free experience. Overlay pages never load ads.

## Environment Setup

Add your AdSense publisher ID to `apps/web/.env`:

```env
PUBLIC_ADSENSE_PUBLISHER_ID=ca-pub-XXXXXXXXXXXXXXXX
```

Replace ad slot placeholder IDs in `apps/web/src/lib/constants.ts` with real ad unit IDs from your AdSense dashboard:

```ts
export const AD_SLOT_LOBBY = 'your-lobby-slot-id';
export const AD_SLOT_POST_SUBMIT = 'your-post-submit-slot-id';
export const AD_SLOT_FINAL_RESULTS = 'your-final-results-slot-id';
```

## Architecture

### Ad Store (`$lib/stores/ads.svelte.ts`)

Singleton store following the same factory pattern as `posthog.svelte.ts`:

- **`enable()` / `disable()`** — master switch, controlled by route (overlay pages disable ads)
- **`shouldShowAds`** — derived getter that returns `true` only when:
  1. Ads are enabled (not on overlay route)
  2. AdSense script loaded successfully
  3. User is NOT a subscriber
- **`pushAd()`** — calls `window.adsbygoogle.push({})` to activate a newly mounted `<ins>` element
- **`loadScript()`** — injects AdSense `<script>` into `<head>` (called internally by `enable()`)

### Components

**`AdSlot.svelte`** — inline ad placement:

- Renders nothing when `shouldShowAds` is false
- Mounts an `<ins class="adsbygoogle">` element with proper data attributes
- Calls `pushAd()` once via `$effect` after script loads

**`AdInterstitial.svelte`** — full-screen ad overlay:

- Shows during natural breaks (e.g., LOBBY → LIVE transition)
- "Continue" dismiss button appears after 3s (`AD_INTERSTITIAL_MIN_DURATION_MS`)
- For subscribers: immediately calls `ondismiss()` — zero-delay passthrough

### Route Integration

- **Root layout** (`+layout.svelte`): enables/disables ads based on route (overlay = off)
- **Play page** (`play/[sessionId]/+page.svelte`): places `AdSlot` in lobby, post-submit, and game-over sections; triggers `AdInterstitial` on LOBBY → LIVE transition

## Adding New Ad Placements

1. Create a new ad unit in AdSense dashboard
2. Add the slot ID constant to `apps/web/src/lib/constants.ts`
3. Use `<AdSlot slotId={YOUR_SLOT} format="rectangle" />` in your template
4. Wrap in a condition that shows ads only during passive moments

## Subscriber Ad-Free Logic

The `shouldShowAds` getter checks `subscriptionStore.isSubscriber`. When a user has `BillingPlan.SUBSCRIBER`, no `<ins>` elements are rendered (not just hidden — completely removed from DOM).

`AdInterstitial` has an additional safeguard: an `$effect` detects when ads shouldn't show and immediately calls `ondismiss()`, ensuring subscribers never see a loading delay.

## Ad Blocker Resilience

- Script load failure is caught and sets `scriptError = true`
- `shouldShowAds` returns `false` when script hasn't loaded, so no broken `<ins>` elements appear
- Errors are logged as Sentry breadcrumbs (info level, not errors) to avoid noisy alerts
- No layout shifts occur because ad containers are conditionally rendered, not hidden

## Testing

### AdSense Test Mode

Add `data-adtest="on"` to your page's `<meta>` tag or use Google's test publisher ID during development. Real ads will not serve on `localhost`.

### Manual Verification

1. **Dev mode**: Set `PUBLIC_ADSENSE_PUBLISHER_ID` to a test value, run `bun dev`, visit `/play/[sessionId]` — ad containers should render in lobby/post-submit/game-over
2. **Subscriber ad-free**: Log in as a subscriber — verify zero ad containers in DOM
3. **Overlay protection**: Visit `/overlay/[sessionId]` — verify zero ad containers
4. **Ad blocker**: Block `pagead2.googlesyndication.com` — verify no errors, no broken layout
5. **Interstitial flow**: Trigger LOBBY → LIVE transition — interstitial appears with 3s delay on dismiss button
