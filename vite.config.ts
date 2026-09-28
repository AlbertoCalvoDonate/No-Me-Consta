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
  build: {
    rollupOptions: {
      output: {
        // DOS TROZOS EN VEZ DE UNO, y no por el peso total -que es el mismo-
        // sino por lo que hay que volver a bajarse en cada despliegue.
        //
        // Aqui se publica a menudo, y casi siempre son cartas nuevas: texto.
        // Con un solo fichero, cambiar una coma de una carta le cambia el
        // nombre al paquete entero y el que vuelve al juego se baja otra vez
        // React y framer-motion, que no han cambiado en meses. Separados, esa
        // mitad se queda en su cache y solo viaja lo que de verdad es nuevo.
        manualChunks(id) {
          if (id.includes('node_modules')) return 'motor'
        },
      },
    },
  },
})
