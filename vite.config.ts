import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    // e2e/ holds Playwright specs, run separately with `npm run test:e2e`
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
