// 원격 계층이 켜지는 조건. 셋 다 브라우저에 노출돼도 되는 값이다 (비밀 키는 쓰지 않는다).
// URL이나 publishable 키가 비면 계층 전체가 아무것도 하지 않는다 — analytics.js와 같은 태도다.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
export const TURNSTILE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

export const REMOTE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_KEY);
