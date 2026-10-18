// supabase-js를 실제로 들고 있는 유일한 모듈. 여기서만 동적 import한다 —
// 첫 페인트를 막지 않고, 메인 엔트리 청크에도 들어가지 않는다.
//
// 익명 사용자는 "저장할 것이 생겼을 때"만 만든다. 기기당 한 명이고, 세션이 이미 있으면 새로 만들지 않는다.
// 실패하면 이번 방문은 포기한다 — 재시도 루프를 돌지 않는다(다음 방문에 다시 시도).
import { SUPABASE_URL, SUPABASE_KEY, REMOTE_ENABLED } from './config.js';
import { authStorage } from './storage-adapter.js';

let clientPromise = null;   // createClient까지
let sessionPromise = null;  // 세션 확보까지 (StrictMode 이중 실행·동시 호출이 공유한다)
let gaveUp = false;         // 이번 방문에서는 더 시도하지 않는다

async function getClient() {
  if (!REMOTE_ENABLED) return null;
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          storage: authStorage,
          storageKey: 'gantry.auth',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      }))
      .catch(() => { clientPromise = null; return null; });
  }
  return clientPromise;
}

// 세션이 있으면 그대로, 없으면 익명 사용자를 한 번 만든다. 돌려주는 건 { client } 또는 null.
// 동시에 여러 번 불려도 signInAnonymously는 한 번만 간다(promise 공유).
export function ensureSession() {
  if (gaveUp || !REMOTE_ENABLED) return Promise.resolve(null);
  if (sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    const client = await getClient();
    if (!client) { gaveUp = true; return null; }

    const { data } = await client.auth.getSession();
    if (data?.session) return { client };

    // 세션이 없을 때만 Turnstile을 부른다. 토큰을 못 받아도 그대로 진행한다.
    const { getTurnstileToken } = await import('./turnstile.js');
    const captchaToken = await getTurnstileToken();

    const { error } = await client.auth.signInAnonymously(
      captchaToken ? { options: { captchaToken } } : undefined,
    );
    if (error) { gaveUp = true; return null; }
    return { client };
  })().catch(() => { gaveUp = true; return null; });

  return sessionPromise;
}

// 설정을 서버에 올리고 캘린더 토큰을 돌려받는다. 실패는 조용히 null.
export async function saveMyPreferences(prefs) {
  const session = await ensureSession();
  if (!session) return null;
  try {
    const { data, error } = await session.client.rpc('save_my_preferences', { prefs });
    if (error) return null;
    return typeof data === 'string' && data ? data : null;
  } catch {
    return null;
  }
}
