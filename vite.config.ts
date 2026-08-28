import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { aiProxyPlugin } from './vite-plugin-ai-proxy';

export default defineConfig(({ mode }) => {
  // The '' prefix reads non-VITE_ vars too. Only the NON-SECRET ai mode is forwarded to the
  // client below; ANTHROPIC_API_KEY is deliberately never touched here — it is read only
  // inside vite-plugin-ai-proxy.ts, which runs in the Node process and is not bundled.
  const env = loadEnv(mode, process.cwd(), '');
  const aiMode = env.VITE_AI_MODE || env.AI_MODE || 'auto';

  return {
    plugins: [react(), aiProxyPlugin()],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    define: {
      // Fixes F-003: .env documents AI_MODE, but the client only ever read VITE_AI_MODE, so
      // setting AI_MODE=fixture silently did nothing. One variable now drives both sides.
      'import.meta.env.VITE_AI_MODE': JSON.stringify(aiMode),
    },
  };
});
