import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'))

// LA VERSION LLEVA EL COMMIT, Y HACE FALTA PARA LEER LA TELEMETRIA.
//
// `pkg.version` es "0.1.0" y no se ha subido nunca, asi que todas las partidas
// recogidas decian la misma version y no habia forma de saber QUE build estaba
// usando cada jugador. Eso importa justo cuando se acaba de desplegar algo y
// hay que decidir si los datos nuevos ya lo llevan: el 02/10/2026 no se pudo
// saber si las partidas abandonadas faltaban porque nadie abandona o porque la
// baliza aun no habia llegado a los moviles.
//
// Si no hay git -un zip, un entorno raro- se queda solo con la version, que es
// lo que habia antes: esto es para identificar, no para funcionar.
function commit(): string {
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return ''
  }
}
// El servidor corta `version` en 20 caracteres (ver worker/index.ts), y lo que
// pase de ahi no se guarda: mas vale cortarlo aqui y que entre.
const VERSION = `${pkg.version}${commit() ? '+' + commit() : ''}`.slice(0, 20)

export default defineConfig({
  plugins: [react()],
  // Versión y fecha de build, para poder identificar en pantalla qué
  // despliegue se está viendo (útil sobre todo mientras se prueban cambios
  // en producción). Se inyectan como constantes en tiempo de build, no hay
  // llamada a ningún sitio en tiempo de ejecución.
  define: {
    __APP_VERSION__: JSON.stringify(VERSION),
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
