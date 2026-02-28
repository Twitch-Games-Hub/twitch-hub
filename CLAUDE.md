when planning make sure to always split task using divid et impera approach, so that it ease the planning for creating multiple phases with parallelizabble simultanoues stream between phases

# Conventions & Best Practices

## Reuse before creating

- Check `$lib/components/ui/` for shared primitives (Input, Textarea, Label, Button, Card, AddButton, CollectionItemHeader, etc.) before writing raw HTML elements or inline Tailwind classes.
- Use `Textarea` (not raw `<textarea>`) for multi-line text inputs — mirrors `Input` props (`inputSize`, `variant`).
- Use `CollectionItemHeader` for numbered item headers with delete buttons in collection editors (label + optional danger-outline delete button).
- Use `GameDetailsForm` (`$lib/components/editor/`) for title/description/coverImageUrl fields — accepts all three as `$bindable` props.
- Check `$lib/server/` for auth and config helpers before writing local versions in API routes.
- Check `$lib/utils/` for date, pagination, and other utilities before inlining logic.
- Check `$lib/constants.ts` and `apps/server/src/engine/GameEngine.ts` for named constants before using magic numbers.

## Frontend (SvelteKit + Svelte 5)

- Use shared UI components with their `variant` and `size` props to stay consistent — read each component's props before using.
- SvelteKit API routes (`src/routes/api/`) must use `$lib/server/auth` for auth headers and `$lib/server/config` for the server URL — never define these locally.
- Keep magic values (timeouts, cookie names, URLs) in `$lib/constants.ts`.

## Backend (Express)

- Wrap all async route handlers with `asyncHandler` from `src/middleware/asyncHandler.js` — never write manual try/catch in routes.
- Use `requireGameOwner` middleware for routes needing game ownership — it attaches `req.game`.
- Auth middleware attaches `req.userId` (typed via `src/types/express.d.ts`) — no casting needed.
- Game engine subclasses should use base class helpers (`recordVote`, `getBinaryDistribution`) and `REDIS_VOTE_TTL_SEC` — never hardcode Redis TTLs or duplicate vote logic.
- Socket handlers requiring host auth should use `requireHost` wrapper from `src/socket/helpers.js`.
