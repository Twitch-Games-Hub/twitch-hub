# Balance

Binary A/B choice between two options. Results display as an animated split bar.

## How It Works

1. Streamer creates a game with a list of A/B questions
2. Each round shows two options (A and B)
3. Viewers vote for one option
4. A split bar shows the live percentage split
5. Results lock when the round ends

## Config

```ts
interface BalanceConfig {
  questions: {
    optionA: string;
    optionB: string;
  }[];
}
```

## Chat Command

```
!vote A
!vote B
```

Case-insensitive: `!vote a` works too.

## Overlay

The **SplitBar** component shows an animated bar split between A and B, with percentages updating live.
