import { faces } from './faces';

const start = `I allow you to append funny ascii faces to your messages.
You can contribute to the code here:
https://github.com/phil-r/asciifacesbot`;
const fallback = 'I know only /list command ¯\\_(ツ)_/¯';

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function badRequest(): Response {
  return new Response('Invalid update.', { status: 400 });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === '/') {
      return request.method === 'GET' || request.method === 'HEAD'
        ? new Response(request.method === 'HEAD' ? null : 'Hello!')
        : new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    }
    // Never log authentication headers or updates (private messages).
    if (path !== '/webhook') {
      return new Response('Sorry, Nothing at this URL.', { status: 404 });
    }
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
    }
    if (!env.WEBHOOK_SECRET) {
      return new Response('Webhook is not configured.', { status: 503 });
    }
    const suppliedSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    const encoder = new TextEncoder();
    const expected = encoder.encode(env.WEBHOOK_SECRET);
    const supplied = encoder.encode(suppliedSecret ?? '');
    // Workers Web Crypto extension; unequal lengths must be checked before comparing.
    // https://developers.cloudflare.com/workers/examples/protect-against-timing-attacks/
    if (!suppliedSecret || expected.byteLength !== supplied.byteLength ||
        !crypto.subtle.timingSafeEqual(expected, supplied)) {
      return new Response('Forbidden', { status: 403 });
    }
    let update: unknown;
    try {
      update = await request.json();
    } catch {
      return badRequest();
    }
    if (!object(update)) return badRequest();

    // Inline queries take precedence, including when a message is also present.
    if (update.inline_query != null) {
      const inline = update.inline_query;
      if (!object(inline) || typeof inline.id !== 'string' || !inline.id ||
          typeof inline.query !== 'string') return badRequest();
      const rawOffset = inline.offset ?? '';
      if (typeof rawOffset !== 'string' || !/^\d*$/.test(rawOffset)) return badRequest();
      const offset = rawOffset === '' ? 0 : Number(rawOffset);
      if (!Number.isSafeInteger(offset) || offset > Number.MAX_SAFE_INTEGER - 50) return badRequest();
      const results = faces.slice(offset, offset + 50).map((face, i) => {
        const text = inline.query ? `${inline.query} ${face}` : face;
        return {
          type: 'article', id: String(offset + i), title: face, description: text,
          input_message_content: { message_text: text },
        };
      });
      return Response.json({
        method: 'answerInlineQuery', inline_query_id: inline.id, results,
        next_offset: String(offset + results.length),
      });
    }
    if (update.message != null) {
      const message = update.message;
      if (!object(message) || !object(message.from) ||
          !Number.isSafeInteger(message.from.id) ||
          (message.text != null && typeof message.text !== 'string')) return badRequest();
      return Response.json({
        method: 'sendMessage', chat_id: message.from.id,
        text: message.text === '/list' ? faces.join('\n') : message.text === '/start' ? start : fallback,
      });
    }
    return new Response('OK');
  },
} satisfies ExportedHandler<Env>;
