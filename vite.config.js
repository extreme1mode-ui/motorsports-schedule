import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// 개발 서버에서 /api/*를 Vercel Function과 같은 방식으로 다룬다 (프로덕션은 Vercel이 직접 처리).
// 이게 없으면 npm run dev에서 캘린더 구독 주소가 404가 된다.
const devApi = {
  name: 'dev-api',
  apply: 'serve',
  configureServer(server) {
    // 개인 캘린더 주소(?u=)는 Function에서 Supabase를 부른다. Vercel은 Function에도 같은 변수를 주지만
    // 개발 서버는 import.meta.env만 채우므로, 여기서 process.env에 옮겨 둔다.
    const proc = globalThis.process   // eslint 설정이 브라우저 전역이라 globalThis로 읽는다
    const env = loadEnv(server.config.mode, proc.cwd(), 'VITE_')
    for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']) {
      if (env[key] && !proc.env[key]) proc.env[key] = env[key]
    }
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/api/calendar.ics')) return next()
      try {
        const mod = await server.ssrLoadModule('/api/calendar.ics.js')
        // Vercel 핸들러가 쓰는 최소 API(res.status().send())만 얹어준다.
        res.status = (code) => { res.statusCode = code; return res }
        res.send = (body) => { res.end(body) }
        await mod.default(req, res)
      } catch (err) {
        next(err)
      }
    })
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devApi],
})
