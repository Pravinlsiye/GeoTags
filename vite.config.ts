import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [tailwindcss(), solid()],
  resolve: {
    conditions: ['solid', 'browser', 'module', 'import', 'default'],
  },
})
