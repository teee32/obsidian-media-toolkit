import esbuild from 'esbuild';

const isProd = process.env.NODE_ENV === 'production';

esbuild.build({
  entryPoints: ['src/main.ts', 'src/styles.css'],
  bundle: true,
  external: ['obsidian', 'electron'],
  format: 'cjs',
  target: 'es2020',
  outdir: 'dist',
  sourcemap: !isProd,
  minify: isProd,
  platform: 'node',
}).catch(() => process.exit(1));
