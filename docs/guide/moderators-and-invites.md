# Moderators & Session Invites

## Moderator System

Twitch Hub syncs your moderator list directly from Twitch. Enabled mods can create and control game sessions on your behalf — perfect for delegation during live streams.

### Setting Up Moderators

1. Go to **Dashboard > Settings**
2. Your Twitch moderators will be automatically synced
3. Toggle each mod on/off to control their app permissions
4. Click **Sync** to refresh the list from Twitch

::: tip Missing Permission?
If the moderator list doesn't load, you may need to re-authorize with Twitch to grant the `moderation:read` scope. Click the re-authorize link on the Settings page.
:::

### What Mods Can Do

- **Create sessions** on behalf of the streamer (the session appears under the streamer's account)
- **Control sessions** — start, advance rounds, and end sessions
- **Send invites** to the streamer's followers
- **View session results** for sessions they are moderating

### What Mods Cannot Do

- Edit or delete games
- Access the streamer's billing or account settings
- Create sessions for games they don't moderate for

### Mod Dashboard

Mods see a **Mod For** tab on their Dashboard page, listing streamers who have enabled them. From there, mods can browse the streamer's ready games and start sessions.

Active mod sessions also appear in the **Sessions** page under a "Moderating" section.

## Session Invites

Invites are in-app notifications that nudge your followers to join a live session. Sessions remain public — invites are informational only.

### Sending Invites

1. Start or resume a session (LOBBY or LIVE status)
2. Click **Invite Followers** in the session metadata bar
3. Search and select followers (only those with Twitch Hub accounts appear)
4. Click **Invite** to send notifications

### Receiving Invites

When you're invited to a session:

- A **notification bell** badge appears in the navbar
- Click the bell to see your notifications
- Click a notification to jump directly to the session's play page
- Use **Mark all as read** to clear the badge

### Real-Time Delivery

If you're online when an invite is sent, the notification appears instantly — no page refresh needed. The unread badge updates in real-time via WebSocket.
