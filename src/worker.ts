import { mergeConfirmations, mergeRecords } from './store/merge';
import type { CheckRecord, GroupConfirmation } from './types';

interface Env {
  ASSETS: Fetcher;
  CHECKLIST_DATA: KVNamespace;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const key = url.pathname.replace('/api/', ''); // records | categories | confirmations

  const ALLOWED = ['records', 'categories', 'confirmations'];
  if (!ALLOWED.includes(key)) return json({ error: 'not found' }, 404);

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  if (request.method === 'GET') {
    const val = await env.CHECKLIST_DATA.get(key);
    return json(val ? JSON.parse(val) : []);
  }

  if (request.method === 'POST') {
    const body = await request.json();
    // categories は管理画面からの全体保存なので上書き。
    // records / confirmations は端末ごとに手元の分しか持っていないため、上書きせずマージする。
    if (key === 'categories') {
      await env.CHECKLIST_DATA.put(key, JSON.stringify(body));
      return json({ ok: true });
    }
    if (!Array.isArray(body)) return json({ error: 'array expected' }, 400);
    const stored = await env.CHECKLIST_DATA.get(key);
    const current = stored ? JSON.parse(stored) : [];
    const merged = key === 'records'
      ? mergeRecords(current as CheckRecord[], body as CheckRecord[])
      : mergeConfirmations(current as GroupConfirmation[], body as GroupConfirmation[]);
    await env.CHECKLIST_DATA.put(key, JSON.stringify(merged));
    return json(merged);
  }

  return json({ error: 'method not allowed' }, 405);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
