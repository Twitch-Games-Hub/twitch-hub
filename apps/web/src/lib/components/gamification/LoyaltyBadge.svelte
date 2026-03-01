<script lang="ts">
  import { LoyaltyTier } from '@twitch-hub/shared-types';

  let { tier, size = 'md' } = $props<{ tier: string; size?: 'sm' | 'md' }>();

  const tierConfig: Record<string, { label: string; color: string; icon: string }> = {
    [LoyaltyTier.NEWCOMER]: { label: 'Newcomer', color: 'text-text-muted', icon: '🌱' },
    [LoyaltyTier.REGULAR]: { label: 'Regular', color: 'text-success-500', icon: '⭐' },
    [LoyaltyTier.DEDICATED]: { label: 'Dedicated', color: 'text-blue-400', icon: '💎' },
    [LoyaltyTier.SUPERFAN]: { label: 'Superfan', color: 'text-brand-400', icon: '🔥' },
    [LoyaltyTier.LEGENDARY]: { label: 'Legendary', color: 'text-warning-500', icon: '👑' },
  };

  let config = $derived(tierConfig[tier] ?? tierConfig[LoyaltyTier.NEWCOMER]);
  let sizeClasses = $derived(
    size === 'sm' ? 'text-xs px-1.5 py-0.5 gap-1' : 'text-sm px-2 py-1 gap-1.5',
  );
</script>

<span class="inline-flex items-center rounded-md bg-surface-elevated {sizeClasses} {config.color}">
  <span>{config.icon}</span>
  <span class="font-medium">{config.label}</span>
</span>
