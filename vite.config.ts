import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // 새 버전이 배포되면 자동으로 업데이트
      manifest: {
        name: '사주매칭앱 SajuSync',
        short_name: '사주싱크',
        description: '나의 부족한 기운을 채워주는 오행 기반 운명 매칭 앱',
        theme_color: '#111827', // 다크모드 배경색 기준 (스마트폰 상단바 색상)
        background_color: '#111827',
        display: 'standalone', // 브라우저 UI 없이 전체화면(앱처럼) 실행
        icons: [
          {
            src: '/app-icon.png',
            sizes: '192x192 512x512', // 하나의 이미지로 여러 사이즈 호환
            type: 'image/png'
          }
        ]
      }
    })
  ],
});