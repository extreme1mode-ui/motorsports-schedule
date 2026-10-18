// 데모 시계는 다른 모듈보다 먼저 평가돼야 한다 (데모 빌드 전용, 기본 빌드에서는 아무것도 하지 않는다).
import './demo/clock.js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { startAccountSync } from './account/index.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 원격 계층(Supabase). 렌더 뒤에 부른다 — env가 없으면 아무것도 하지 않는다.
startAccountSync()
