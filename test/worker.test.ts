import { describe, expect, test } from 'bun:test';
import { timingSafeEqual } from 'node:crypto';

// Bun lacks Workers' Web Crypto extension. Only the test host needs this shim;
// production uses crypto.subtle.timingSafeEqual without nodejs_compat.
Object.defineProperty(crypto.subtle, 'timingSafeEqual', { value: timingSafeEqual, configurable: true });
import worker from '../src/index';
import { faces } from '../src/faces';

interface InlineResponse {
  method: string;
  inline_query_id: string;
  next_offset: string;
  results: { title: string; id: string }[];
}

const env = { WEBHOOK_SECRET: 'test-webhook-secret' };
const authHeaders = { 'X-Telegram-Bot-Api-Secret-Token': env.WEBHOOK_SECRET };
function call(body: unknown, path = '/webhook', method = 'POST') {
  return worker.fetch(new Request(`https://example.com${path}`, {
    method, headers: authHeaders, ...(method === 'GET' || method === 'HEAD' ? {} : { body: JSON.stringify(body) }),
  }), env);
}

 test('exact original face sequence fingerprint, duplicates and backslashes', async () => {
  expect(faces).toHaveLength(163);
  expect(new Bun.CryptoHasher('sha256').update(faces.join('\n')).digest('hex'))
    .toBe('8b1787201d6d1a786fb7c127f2b8e69e8fa5996dd18483c9a853bccc22600c7f');
  expect(faces[0]).toBe('¯\\_(ツ)_/¯');
  expect(faces[157]).toBe(faces[161]);
});

test('greeting, method restrictions and unknown routes', async () => {
  expect(await (await call(null, '/', 'GET')).text()).toBe('Hello!');
  expect(await (await call(null, '/', 'HEAD')).text()).toBe('');
  expect((await call({message: {}}, '/wrong')).status).toBe(404);
  expect((await call(null, '/webhook/')).status).toBe(404);
  expect((await call(null, '/webhook', 'GET')).status).toBe(405);
  expect((await call(null, '/')).status).toBe(405);
  expect((await call(null, '/test-token')).status).toBe(404);
});

test('webhook requires the secret header before parsing the body', async () => {
  for (const secret of [undefined, '', 'wrong', 'test-webhook-secreu', 'test-webhook-secret-extra', 'é'.repeat(19)]) {
    const response = await worker.fetch(new Request('https://example.com/webhook', {
      method: 'POST', body: '{',
      headers: secret === undefined ? {} : { 'X-Telegram-Bot-Api-Secret-Token': secret },
    }), env);
    expect(response.status).toBe(403);
  }
  // HTTP header names are case-insensitive.
  const response = await worker.fetch(new Request('https://example.com/webhook', {
    method: 'POST', body: '{}',
    headers: { 'x-telegram-bot-api-secret-token': env.WEBHOOK_SECRET },
  }), env);
  expect(await response.text()).toBe('OK');
});

test('missing runtime webhook secret fails closed', async () => {
  for (const secret of [undefined, '']) {
    const response = await worker.fetch(new Request('https://example.com/webhook', {
      method: 'POST', headers: authHeaders, body: '{}',
    }), { ...env, WEBHOOK_SECRET: secret } as Env);
    expect(response.status).toBe(503);
  }
});

 test('commands and fallback target sender, not chat', async () => {
  for (const [text, expected] of [
    ['/list', faces.join('\n')],
    ['/start', 'I allow you to append funny ascii faces to your messages.\nYou can contribute to the code here:\nhttps://github.com/phil-r/asciifacesbot'],
    ['/unknown', 'I know only /list command ¯\\_(ツ)_/¯'],
    [undefined, 'I know only /list command ¯\\_(ツ)_/¯'],
  ]) {
    const response = await call({message:{text, from:{id:123}, chat:{id:456}}});
    expect(await response.json()).toEqual({method:'sendMessage', text:expected, chat_id:123});
  }
});

describe('inline pagination', () => {
  for (const query of ['', 'hello 🌍']) {
    test(`all pages, query ${JSON.stringify(query)}`, async () => {
      const collected: string[] = [];
      for (const offset of [0, 50, 100, 150, 163, 999]) {
        const response = await call({inline_query:{id:'q', query, offset:offset === 0 ? '' : String(offset)}, message:{}});
        const json = await response.json() as InlineResponse;
        const page = faces.slice(offset, offset + 50);
        expect(json.method).toBe('answerInlineQuery');
        expect(json.inline_query_id).toBe('q');
        expect(json.next_offset).toBe(String(offset + page.length));
        expect(json.results).toEqual(page.map((face,i) => ({
          type:'article', id:String(offset+i), title:face,
          description: query ? `${query} ${face}` : face,
          input_message_content:{message_text: query ? `${query} ${face}` : face},
        })));
        collected.push(...json.results.map((r: {title:string}) => r.title));
      }
      expect(collected).toEqual([...faces]);
    });
  }
  test('missing offset defaults to zero; numeric offset keeps index IDs', async () => {
    for (const offset of [undefined, '0001']) {
      const json = await (await call({inline_query:{id:'q', query:'', offset}})).json() as InlineResponse;
      expect(json.results[0]?.id).toBe(offset ? '1' : '0');
    }
  });
});

test('unhandled updates acknowledged', async () => {
  for (const body of [{}, {update_id:1}, {callback_query:{id:'x'}}]) {
    expect(await (await call(body)).text()).toBe('OK');
  }
});

test('malformed JSON and update/message shapes are 400', async () => {
  const badJson = await worker.fetch(new Request('https://example.com/webhook', {method:'POST', headers:authHeaders, body:'{'}), env);
  expect(badJson.status).toBe(400);
  for (const body of [null, [], 'text', 1, {message:[]}, {message:{}},
    {message:{from:{id:'1'}}}, {message:{from:{id:1.5}}},
    {message:{from:{id:1}, text:42}}, {inline_query:[]},
    {inline_query:{id:'q'}}, {inline_query:{id:4, query:''}}]) {
    expect((await call(body)).status).toBe(400);
  }
});

test('malformed inline offsets are 400, never fall back to message', async () => {
  for (const offset of [-1, 1, {}, [], '-1', '1.5', 'wat', 'NaN', 'Infinity', ' 1', '9007199254740992']) {
    expect((await call({inline_query:{id:'q', query:'', offset}, message:{from:{id:1}}})).status).toBe(400);
  }
});
