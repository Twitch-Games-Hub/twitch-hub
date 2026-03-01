<script lang="ts">
  // Generate 10 particles with randomized properties at module level
  const particles = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    size: 4 + Math.random() * 4, // 4-8px
    opacity: 0.1 + Math.random() * 0.1, // 0.1-0.2
    left: Math.random() * 100, // 0-100%
    top: Math.random() * 100, // 0-100%
    duration: 15 + Math.random() * 10, // 15-25s
    delay: Math.random() * -20, // stagger start
    dx1: -30 + Math.random() * 60, // drift waypoint 1
    dy1: -30 + Math.random() * 60,
    dx2: -30 + Math.random() * 60, // drift waypoint 2
    dy2: -30 + Math.random() * 60,
  }));
</script>

<div class="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
  {#each particles as p (p.id)}
    <div
      class="absolute rounded-full bg-brand-400"
      style="
        width: {p.size}px;
        height: {p.size}px;
        opacity: {p.opacity};
        left: {p.left}%;
        top: {p.top}%;
        --drift-duration: {p.duration}s;
        --dx1: {p.dx1}px;
        --dy1: {p.dy1}px;
        --dx2: {p.dx2}px;
        --dy2: {p.dy2}px;
        animation: particle-drift {p.duration}s ease-in-out {p.delay}s infinite;
      "
    ></div>
  {/each}
</div>
