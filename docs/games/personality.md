# Personality

Multi-question personality quiz where answers are weighted toward result types.

## How It Works

1. Streamer creates a quiz with questions, options, and result types
2. Each option has weighted scores toward different result types
3. Viewers answer each question
4. At the end, each viewer gets a result type based on accumulated weights
5. Aggregate results show the distribution of personality types

## Config

```ts
interface PersonalityConfig {
  questions: {
    text: string;
    options: {
      label: string;
      weight: Record<string, number>; // resultTypeId → score
    }[];
  }[];
  resultTypes: {
    id: string;
    title: string;
    description: string;
  }[];
}
```

## Participation

Viewers participate via the web interface at `/play/{sessionId}`. Chat-based participation is not supported for this game type due to the multi-option nature of questions.

## Results

Final results show the percentage breakdown of viewers across all result types.
