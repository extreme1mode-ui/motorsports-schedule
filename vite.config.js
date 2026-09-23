import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 개발 서버에서 /api/*를 Vercel Function과 같은 방식으로 다룬다 (프로덕션은 Vercel이 직접 처리).
// 이게 없으면 npm run dev에서 캘린더 구독 주소가 404가 된다.
const devApi = {
  name: 'dev-api',
  apply: 'serve',
  configureServer(server) {
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
