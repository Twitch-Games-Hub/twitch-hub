<script lang="ts">
  import { RankTier } from '@twitch-hub/shared-types';

  let { tier, size = 'md' } = $props<{ tier: RankTier; size?: 'sm' | 'md' | 'lg' }>();

  const tierColors: Record<RankTier, { gradient: string; border: string }> = {
    [RankTier.BRONZE]: {
      gradient: 'from-amber-700 to-amber-500',
      border: 'border-amber-600',
    },
    [RankTier.SILVER]: {
      gradient: 'from-gray-400 to-gray-200',
      border: 'border-gray-300',
    },
    [RankTier.GOLD]: {
      gradient: 'from-yellow-500 to-yellow-300',
      border: 'border-yellow-400',
    },
    [RankTier.PLATINUM]: {
      gradient: 'from-cyan-400 to-blue-300',
      border: 'border-cyan-300',
    },
    [RankTier.DIAMOND]: {
      gradient: 'from-cyan-300 to-teal-200',
      border: 'border-cyan-200',
    },
  };

  const sizeClasses: Record<string, string> = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  let colors = $derived(tierColors[tier] ?? tierColors[RankTier.BRONZE]);
  let isDiamond = $derived(tier === RankTier.DIAMOND);
</script>

<span
  class="inline-block rounded-full border bg-gradient-to-r font-bold uppercase {colors.gradient} {colors.border} {sizeClasses[
    size
  ]}"
  class:rank-badge-shimmer={isDiamond}
>
  {tier}
</span>

<style>
  .rank-badge-shimmer {
    background-size: 200% auto;
    animation: shimmer 3s linear infinite;
  }

  @keyframes shimmer {
    0% {
      background-position: 0% center;
    }
    100% {
      background-position: 200% center;
    }
  }
</style>
