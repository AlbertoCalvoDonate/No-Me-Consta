// Saca de CADA retrato el color de fondo que le pega, y escribe el mapa en
// src/data/coloresRetrato.ts para que la carta lo use.
//
// El problema que resuelve: el fondo de la carta salia de un hash del NOMBRE
// del personaje (`hsl(hash % 360, 38%, 22%)`), o sea un tono al azar sin
// ninguna relacion con la ilustracion. A `presi` le tocaba azul marino y,
// como lleva traje azul, la carta parecia llena de lado a lado. A los demas
// les tocaba lo que fuera, y como los retratos son PNG transparentes que se
// estrechan al llegar a los hombros, las esquinas quedaban de un color
// ajeno: los "huecos".
//
// Ahora el fondo sale del tono dominante de la ROPA (mitad inferior del
// retrato, que es la parte que toca los bordes de la carta), oscurecido
// siempre igual. Asi cada personaje conserva su color pero todos reciben el
// mismo tratamiento, que es lo que hace que el reparto se lea como una serie.
//
// Uso (hace falta un servidor de dev levantado):
//   1. npm run dev
//   2. node scripts/colores-retrato.mjs
//
// Hay que volver a pasarlo al anadir o cambiar un retrato. Si no se pasa, el
// personaje nuevo cae al color por defecto y sigue funcionando todo.

import { writeFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

async function loadChromium() {
  for (const mod of ['playwright', 'playwright-core']) {
    try {
      return (await import(mod)).chromium
    } catch {
      /* siguiente */
    }
  }
  const npxCache = process.env.PLAYWRIGHT_PATH
  if (npxCache) return (await import(npxCache)).chromium
  throw new Error('No encuentro playwright. Instalalo con: npm i -D playwright  (o define PLAYWRIGHT_PATH)')
}

const CHARDIR = fileURLToPath(new URL('../public/characters/', import.meta.url))
const SALIDA = fileURLToPath(new URL('../src/data/coloresRetrato.ts', import.meta.url))
const DEV_URL = process.env.DEV_URL || 'http://localhost:5173/'

// Las ilustraciones de escena (fin de partida) no son retratos de personaje.
const ESCENAS = /^(comite|max_|min_|nocheelectoral)/

// Cuanto se oscurece el color de la ropa para usarlo de fondo. 0.42 sale de
// probarlo: por encima de ~0.55 el personaje se funde con su propio fondo y
// deja de recortarse; por debajo de ~0.30 vuelve a parecer un agujero negro.
const OSCURO = 0.42
const LUZ = 20 // solo para el caso raro de un retrato sin un pixel opaco abajo

const files = readdirSync(CHARDIR)
  .filter((f) => (f.endsWith('.webp') || f.endsWith('.png')) && !ESCENAS.test(f))
  .sort()

const browser = await loadChromium().then((c) => c.launch())
const page = await browser.newPage()
await page.goto(DEV_URL, { waitUntil: 'domcontentloaded' })

const mapa = {}
for (const f of files) {
  mapa[f] = await page.evaluate(
    async ({ f, LUZ, OSCURO }) => {
      const img = new Image()
      img.src = '/characters/' + f
      await img.decode()
      const w = img.naturalWidth
      const h = img.naturalHeight
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const x = c.getContext('2d')
      x.drawImage(img, 0, 0)
      const d = x.getImageData(0, 0, w, h).data

      // Se mira SOLO la franja de abajo del retrato, que es exactamente la
      // que toca el borde inferior de la carta y la que deja los huecos en
      // las dos esquinas cuando los hombros se estrechan. Mirar el retrato
      // entero no vale: el cuello y las manos son piel, y la piel es naranja
      // y bastante saturada, asi que se come el histograma y a TODOS los
      // personajes les salia el mismo marron (medido: 19 de 22).
      const desde = Math.floor(h * 0.90)
      let r = 0, g = 0, b = 0, n = 0
      for (let y = desde; y < h; y++) {
        for (let px = 0; px < w; px++) {
          const i = (y * w + px) * 4
          if (d[i + 3] < 200) continue
          r += d[i]; g += d[i + 1]; b += d[i + 2]; n++
        }
      }
      if (n === 0) return `hsl(220, 12%, ${LUZ}%)`
      // Promedio, oscurecido hacia el negro. El fondo tiene que quedar DETRAS
      // de la cara: si sale con el mismo brillo que la ropa, el personaje se
      // funde con el fondo y deja de recortarse.
      const k = OSCURO
      const to2 = (v) => Math.round(Math.min(255, (v / n) * k)).toString(16).padStart(2, '0')
      return '#' + to2(r) + to2(g) + to2(b)
    },
    { f, LUZ, OSCURO }
  )
  console.log(f.padEnd(28), mapa[f])
}
await browser.close()

const cuerpo = `// GENERADO POR scripts/colores-retrato.mjs — no editar a mano.
//
// Color de fondo de la carta de cada personaje, sacado del tono dominante de
// su propia ilustracion (ver el script para el porque). Vuelve a generarlo
// con \`node scripts/colores-retrato.mjs\` cada vez que anadas o cambies un
// retrato; lo que no este aqui cae al color por defecto y no rompe nada.
export const COLOR_RETRATO: Record<string, string> = {
${files.map((f) => `  '${f}': '${mapa[f]}',`).join('\n')}
}
`
writeFileSync(SALIDA, cuerpo, 'utf8')
console.log(`\n${files.length} retratos -> src/data/coloresRetrato.ts`)
