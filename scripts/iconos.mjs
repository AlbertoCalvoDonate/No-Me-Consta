// Los iconos de la app, dibujados con lo que ya es el juego.
//
// Hacen falta para que se pueda instalar: el manifest los pide y Android los
// usa en la pantalla de inicio, en la lista de apps y en el cambiador de
// tareas. Sin ellos no hay instalacion posible, ni PWA ni APK.
//
// Se dibujan aqui y no se traen de un diseñador porque son el mismo motivo
// que el fondo del juego (public/bg-flags.svg, la bandera de tres trazos)
// sobre el negro de la interfaz, con el oro del acento. Si cambia la paleta,
// se cambian dos constantes y se vuelve a pasar.
//
// LOS DOS TAMAÑOS Y POR QUE SON DOS COSAS DISTINTAS:
//   - `normal`: el icono tal cual, con su fondo. Lo usan los sitios que lo
//     pintan entero.
//   - `maskable`: Android RECORTA el icono con la forma que tenga el movil
//     (circulo, cuadrado redondeado, gota...). Si el dibujo llega al borde, se
//     lo come. Por eso en este el motivo va al 60% del centro: lo que queda
//     fuera es relleno sacrificable.
//
// Uso (hace falta un servidor de dev levantado y npx playwright):
//   1. npm run dev
//   2. node scripts/iconos.mjs

import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

async function loadChromium() {
  for (const mod of ['playwright', 'playwright-core']) {
    try {
      return (await import(mod)).chromium
    } catch {
      /* siguiente */
    }
  }
  if (process.env.PLAYWRIGHT_PATH) return (await import(process.env.PLAYWRIGHT_PATH)).chromium
  throw new Error('No encuentro playwright. Instalalo con: npm i -D playwright')
}

const SALIDA = fileURLToPath(new URL('../public/iconos/', import.meta.url))
const DEV_URL = process.env.DEV_URL || 'http://localhost:5173/'

const FONDO = '#0e0e10'
const ORO = '#e0b84d'

// Cuanto del lienzo ocupa el dibujo. En el recortable se encoge para que la
// forma del movil no se lleve por delante media bandera.
const PIEZAS = [
  { nombre: 'icono-192.png', lado: 192, ocupa: 0.78, redondeado: 0.22 },
  { nombre: 'icono-512.png', lado: 512, ocupa: 0.78, redondeado: 0.22 },
  { nombre: 'icono-512-recortable.png', lado: 512, ocupa: 0.6, redondeado: 0 },
  // Para iOS, que no entiende maskable y pinta el icono tal cual.
  { nombre: 'icono-180-apple.png', lado: 180, ocupa: 0.78, redondeado: 0 },
]

const chromium = await loadChromium()
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(DEV_URL, { waitUntil: 'domcontentloaded' })

mkdirSync(SALIDA, { recursive: true })

for (const p of PIEZAS) {
  const datos = await page.evaluate(
    ({ lado, ocupa, redondeado, FONDO, ORO }) => {
      const c = document.createElement('canvas')
      c.width = lado
      c.height = lado
      const g = c.getContext('2d')

      // Fondo. Con esquinas redondeadas solo en los que NO se recortan: si el
      // sistema va a recortar, el redondeo propio se ve como un borde doble.
      g.fillStyle = FONDO
      if (redondeado > 0) {
        const r = lado * redondeado
        g.beginPath()
        g.moveTo(r, 0)
        g.arcTo(lado, 0, lado, lado, r)
        g.arcTo(lado, lado, 0, lado, r)
        g.arcTo(0, lado, 0, 0, r)
        g.arcTo(0, 0, lado, 0, r)
        g.closePath()
        g.fill()
      } else {
        g.fillRect(0, 0, lado, lado)
      }

      // LA BANDERA. Los mismos tres trazos de bg-flags.svg: el mastil, el paño
      // ondeando y la linea de dentro. Alli van a opacidad 0,06 de fondo;
      // aqui en oro y en grande, que es el icono.
      const dibujo = lado * ocupa
      const k = dibujo / 32 // el motivo original mide 32 de alto
      const anchoMotivo = 28 * k
      const x = (lado - anchoMotivo) / 2
      const y = (lado - 32 * k) / 2

      g.save()
      g.translate(x, y)
      g.scale(k, k)
      g.strokeStyle = ORO
      g.lineWidth = 2.6
      g.lineCap = 'round'
      g.lineJoin = 'round'

      // Mastil.
      g.beginPath()
      g.moveTo(0, 0)
      g.lineTo(0, 32)
      g.stroke()

      // Paño: dos ondas arriba, dos abajo, cerrado.
      g.beginPath()
      g.moveTo(0, 2)
      g.quadraticCurveTo(7, -1.5, 14, 2)
      g.quadraticCurveTo(21, 5.5, 28, 2)
      g.lineTo(28, 15)
      g.quadraticCurveTo(21, 18.5, 14, 15)
      g.quadraticCurveTo(7, 11.5, 0, 15)
      g.closePath()
      g.stroke()

      // La franja de dentro.
      g.beginPath()
      g.moveTo(0, 8.5)
      g.quadraticCurveTo(7, 5, 14, 8.5)
      g.quadraticCurveTo(21, 12, 28, 8.5)
      g.stroke()
      g.restore()

      return c.toDataURL('image/png')
    },
    { lado: p.lado, ocupa: p.ocupa, redondeado: p.redondeado, FONDO, ORO }
  )
  const bin = Buffer.from(datos.split(',')[1], 'base64')
  writeFileSync(SALIDA + p.nombre, bin)
  console.log(`${p.nombre.padEnd(26)} ${p.lado}x${p.lado}  ${(bin.length / 1024).toFixed(1)} KB`)
}

await browser.close()
console.log('\nIconos en public/iconos/. Los declara public/manifest.webmanifest.')
