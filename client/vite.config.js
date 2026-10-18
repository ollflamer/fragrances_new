import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createRequire } from 'node:module';
import path from 'node:path';
import { isBuiltin } from 'node:module';

// Node resolves inside the project without esbuild scanning inaccessible Windows ancestors.
const nativeResolver = {
  name: 'windows-project-resolution',
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      if (args.path.startsWith('\0') || args.path.includes('?')) return;
      if (isBuiltin(args.path)) return { path: args.path, external: true };
      try {
        const require = createRequire(path.join(args.resolveDir || process.cwd(), '__resolve.cjs'));
        return { path: require.resolve(args.path) };
      } catch { return undefined; }
    });
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  esbuild: { tsconfigRaw: {} },
  optimizeDeps: { esbuildOptions: { tsconfigRaw: {}, plugins: process.platform === 'win32' ? [nativeResolver] : [] } },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3001',
      '/images': 'http://127.0.0.1:3001',
      '/hero-bg.jpg': 'http://127.0.0.1:3001',
      '/sitemap.xml': 'http://127.0.0.1:3001',
      '/robots.txt': 'http://127.0.0.1:3001',
    },
  },
});
