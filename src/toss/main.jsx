// 토스 빌드 진입점. src/main.jsx와 같고, Supabase 익명 계정(startAccountSync)만 만들지 않는다.
// 데모 시계는 다른 모듈보다 먼저 평가돼야 한다 (데모 빌드 전용, 기본 빌드에서는 아무것도 하지 않는다).
import '../demo/clock.js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import App from '../App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
