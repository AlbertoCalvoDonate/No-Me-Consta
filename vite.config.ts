import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'))

export default defineConfig({
  plugins: [react()],
  // Versión y fecha de build, para poder identificar en pantalla qué
  // despliegue se está viendo (útil sobre todo mientras se prueban cambios
  // en producción). Se inyectan como constantes en tiempo de build, no hay
  // llamada a ningún sitio en tiempo de ejecución.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
})
