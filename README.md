# asciifacesbot
Telegram Bot [@asciifacesbot](https://telegram.me/asciifacesbot) that allows you to append ascii faces to your messages ¯\\\_(ツ)\_/¯

## Backend
Bot runs on [Cloudflare Workers](https://workers.cloudflare.com/)

## Telegram API
Bot replies to every incoming webhook and doesn't send requests to the API directly

## How to run your own `asciifacesbot`
- Clone this project
- Install [Bun](https://bun.sh/) and a current Node.js LTS (for Wrangler), then run `bun install --frozen-lockfile`
- Register your bot via [BotFather](https://telegram.me/BotFather)
- Copy `.dev.vars.example` to `.dev.vars` and set a random `WEBHOOK_SECRET` (keep this file private). Use 1–256 characters from `A-Z`, `a-z`, `0-9`, `_`, and `-`.
- Run `bun run dev` for local development; POST updates to `/webhook` with the `X-Telegram-Bot-Api-Secret-Token` header matching `WEBHOOK_SECRET`.
- Check locally with `bun run typecheck`, `bun test`, and `bun run build` (dry run).
- Copy `wrangler.local.jsonc.example` to `wrangler.local.jsonc` (gitignored), then replace `<CLOUDFLARE_ACCOUNT_ID>` and `bot.example.com` with your account ID and custom domain. Keep the existing account/domain and Worker name `asciifacesbot-worker` when updating an existing deployment; change account/name/domain for a separate fork.
- `wrangler.jsonc` is the portable config used for development, type generation, and build checks. The pinned Wrangler version does not support config-file inheritance, so keep the shared settings in the local config and example in sync with it. Do not put personal deployment values into tracked files.
- Sign in with `bunx wrangler login`, then check identity/account with `bunx wrangler whoami`. Wrangler does not use `cf` CLI profiles; any `CLOUDFLARE_ACCOUNT_ID` override must match the configured account.
- Keep the existing `WEBHOOK_SECRET` if configured; otherwise use `bunx wrangler secret put WEBHOOK_SECRET --config wrangler.local.jsonc`. **This changes the live Worker secret**; do not rotate it inadvertently. It is the only runtime secret; the bot token is needed locally only for Telegram registration.
- Check deployment packaging with `bun run deploy --dry-run` (no upload), then run `bun run deploy` to update the Worker and custom domain using `wrangler.local.jsonc`.
- Set Telegram's webhook URL to `https://bot.example.com/webhook` with `secret_token` equal to `WEBHOOK_SECRET`. Telegram sends it in the matching header. Replace `bot.example.com` with your configured domain. Example (placeholders only; keep real secrets out of shell history):
  ```sh
  curl -X POST 'https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook' \
    -H 'Content-Type: application/json' \
    --data '{"url":"https://bot.example.com/webhook","secret_token":"<WEBHOOK_SECRET>"}'
  ```
- `¯\_(ツ)_/¯`

## TODO:
- [x] Add basic inline bot
- [ ] Do something with thumbnail
- [ ] Setup your favorite faces through bot commands
- [ ] [Collect feedback](https://core.telegram.org/bots/inline#collecting-feedback)


Thanks to https://github.com/maxogden/cool-ascii-faces for the list of faces ¯\\\_(ツ)\_/¯

## See also
- [Hacker news bot](https://github.com/phil-r/hackernewsbot)
