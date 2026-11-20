# EDUVENTURE room server

One Cloudflare Durable Object per island room (up to 12 visible players). It relays positions and emotes and
holds no Supabase secret: each player's own sign-in token is used to read their room card (`my_room_card`).

## On this PC (no Cloudflare account needed)

```bash
cd server/rooms
npm install
echo "SUPABASE_PUBLISHABLE_KEY=<the VITE_SUPABASE_PUBLISHABLE_KEY from .env.local>" > .dev.vars
npm run dev                      # ws://localhost:8787
node smoke.mjs                   # from the repo root: node server/rooms/smoke.mjs
```

Point the game at it with `VITE_ROOMS_URL=ws://localhost:8787` in `.env.local`.

## Putting it online (free plan)

1. Create a free account at cloudflare.com, then an API token from the "Edit Cloudflare Workers" template.
2. Put it in `.env.local` as `CLOUDFLARE_API_TOKEN=...` (never commit it).
3. From `server/rooms`:
   ```bash
   npx wrangler secret put SUPABASE_PUBLISHABLE_KEY   # paste the publishable key
   npm run deploy                                     # prints https://eduventure-rooms.<account>.workers.dev
   ```
4. Set `VITE_ROOMS_URL=wss://eduventure-rooms.<account>.workers.dev` for the web app and rebuild.
