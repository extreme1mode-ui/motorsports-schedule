// 토스 빌드 진입점. src/main.jsx와 같고, Supabase 익명 계정(startAccountSync)만 만들지 않는다.
// 렌더 전에 토스 구현(플랫폼·네이티브 저장소)을 끼우고, 렌더 뒤에 외부 링크 처리와 익명 키를 붙인다.
// 데모 시계는 다른 모듈보다 먼저 평가돼야 한다 (데모 빌드 전용, 기본 빌드에서는 아무것도 하지 않는다).
import '../demo/clock.js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import App from '../App.jsx'
import { setPlatform } from '../platform.js'
import { setStorageDriver } from '../storage/index.js'
import { createTossPlatform } from './platform.js'
import { loadTossStorageDriver } from './storage-driver.js'
import { installExternalLinks } from './links.js'
import { syncTossUserKey } from './user-key.js'

async function boot() {
  setPlatform(createTossPlatform())
  // 저장값을 메모리에 올린 뒤 렌더한다 — 화면은 첫 렌더부터 동기로 읽는다. 토스 밖이거나 실패하면 로컬 드라이버 그대로.
  const driver = await loadTossStorageDriver()
  if (driver) setStorageDriver(driver)

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  installExternalLinks()
  syncTossUserKey()
}

boot()
