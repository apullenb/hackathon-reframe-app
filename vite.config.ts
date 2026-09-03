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
  // Non-secret deployment label. 'vibeland' switches the live-AI transport to the platform's
  // own relay (src/ai/platform.ts), which holds the key server-side the same way the dev plugin
  // does — so the hosted build gets live AI with no key in the browser. Empty everywhere else.
  const deployTarget = env.VITE_DEPLOY_TARGET || '';
  const vibelandSlug = env.VITE_VIBELAND_SLUG || '';

  return {
    // GitHub Pages serves a project site from /<repo>/, so assets need that prefix. Set by the
    // deploy workflow; local builds and `npm run dev` stay at '/'.
    base: env.VITE_BASE || '/',
    plugins: [react(), aiProxyPlugin()],
    // Honor the PORT the harness assigns (autoPort in .claude/launch.json). Vite does not read
    // PORT on its own, so without this the launcher and the server would disagree about the
    // port. strictPort stays false so a busy port steps to the next free one instead of dying —
    // the AI route is a relative path, so nothing is pinned to a specific port.
    server: {
      port: Number(process.env.PORT) || 5173,
      strictPort: false,
    },
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    define: {
      // Fixes F-003: .env documents AI_MODE, but the client only ever read VITE_AI_MODE, so
      // setting AI_MODE=fixture silently did nothing. One variable now drives both sides.
      'import.meta.env.VITE_AI_MODE': JSON.stringify(aiMode),
      // Defined here rather than relying on Vite's automatic VITE_* inlining, for the same
      // reason as VITE_AI_MODE above: loadEnv reads the process environment too, so a value set
      // only by the deploy command still reaches the client.
      'import.meta.env.VITE_DEPLOY_TARGET': JSON.stringify(deployTarget),
      'import.meta.env.VITE_VIBELAND_SLUG': JSON.stringify(vibelandSlug),
    },
  };
});
