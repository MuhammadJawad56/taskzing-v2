/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use the default `.next` output dir. A custom `distDir` (e.g. `build`) shares one
  // folder between `next dev` and `next build`; interrupted compiles can leave webpack
  // chunks missing (e.g. "Cannot find module './8948.js'"). Deploy with `next build` + `next start` or `output: 'standalone'`.
  // If the browser 404s `/_next/static/chunks/main-app.js`, stop all `next dev` processes and run `npm run dev:clean`.

  images: {
    domains: ["images.unsplash.com", "via.placeholder.com"],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

module.exports = nextConfig;

