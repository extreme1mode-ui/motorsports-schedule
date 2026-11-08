import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
// 앱인토스 개발 도구(ait init이 넣었다): dev:toss에서 SDK를 mock으로 바꾸고 패널을 띄운다. 프로덕션 빌드에서는 꺼진다.
import aitDevtools from '@apps-in-toss/devtools/unplugin'

// 개발 서버에서 /api/*를 Vercel Function과 같은 방식으로 다룬다 (프로덕션은 Vercel이 직접 처리).
// 이게 없으면 npm run dev에서 캘린더 구독 주소·비 예보·즐겨찾기 수가 404가 된다.
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
    // 캘린더 · 비 예보 · 즐겨찾기 수. 주소 앞부분으로 Function 파일을 고른다.
    const routes = [['/api/calendar.ics', '/api/calendar.ics.js'], ['/api/weather', '/api/weather.js'], ['/api/likes', '/api/likes.js']]
    server.middlewares.use(async (req, res, next) => {
      const route = routes.find(([prefix]) => req.url?.startsWith(prefix))
      if (!route) return next()
      try {
        const mod = await server.ssrLoadModule(route[1])
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

// 토스(앱인토스) 빌드: --mode toss일 때만 붙는다. 입력 HTML은 toss.html, 결과는 dist-toss/index.html.
// 개발 서버에서는 화면 요청을 toss.html로 돌리고, 빌드 뒤에는 toss.html을 index.html로 바꾼다.
const TOSS_HTML = 'toss.html'
const TOSS_OUT = 'dist-toss'
const tossHtml = {
  name: 'toss-html',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const [pathname, query] = (req.url || '').split('?')
      // 화면 요청(/, /index.html, /race/<id> 같은 SPA 주소)만 바꾼다. 모듈·자산 요청은 그대로 둔다.
      const page = pathname === '/' || pathname === '/index.html' || (!path.extname(pathname) && req.headers.accept?.includes('text/html'))
      if (page) req.url = `/${TOSS_HTML}${query ? `?${query}` : ''}`
      next()
    })
  },
  writeBundle(options) {
    const dir = options.dir || TOSS_OUT
    fs.renameSync(path.join(dir, TOSS_HTML), path.join(dir, 'index.html'))
  },
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => mode === 'toss'
  ? {
    plugins: [aitDevtools.vite(), react(), devApi, tossHtml],
    build: { outDir: TOSS_OUT, rolldownOptions: { input: TOSS_HTML } },
  }
  : {
    plugins: [react(), devApi],
  })
