# Streamer Setup

## 1. Create a Twitch Application

1. Go to the [Twitch Developer Console](https://dev.twitch.tv/console)
2. Click **Register Your Application**
3. Set the OAuth Redirect URL to your app's callback URL (e.g., `http://localhost:5173/api/auth/callback`)
4. Copy your **Client ID** and **Client Secret**

## 2. Configure Environment

Add your Twitch credentials to `.env`:

```
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
TWITCH_REDIRECT_URI=http://localhost:5173/api/auth/callback
```

## 3. Log In

1. Navigate to `http://localhost:5173`
2. Click **Login with Twitch**
3. Authorize the application

## 4. Create a Game

1. Go to **Dashboard** → **New Game**
2. Select a game type (Hot Take, Balance, Bracket, etc.)
3. Enter a title and configure the game settings
4. Save the game (status: `DRAFT`)
5. Set status to `READY` when configuration is complete

## 5. Run a Session

1. From the dashboard, click **Start Session** on a game
2. A new session is created in `WAITING` status
3. Share the play link with viewers: `/play/{sessionId}`
4. Click **Start** to begin the first round
5. Use **Next Round** to advance through rounds
6. Click **End** to finish the session and see final results

## Session Lifecycle

```
WAITING → ACTIVE → (round 1 → round 2 → ... → round N) → COMPLETED
```

Viewers can join at any time during `ACTIVE` status.
