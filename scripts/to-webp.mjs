// Convierte los retratos .png de public/characters/ a .webp, que pesa una
// fracción con la misma transparencia y sin diferencia visible: el arte es
// plano y de pocos colores, justo lo que mejor comprime.
//
// Medido sobre los 16 retratos del juego: 14,20 MB -> 1,16 MB (92% menos).
// La calidad 0.82 sale de medir, no de tantear: con los 22 retratos actuales
// baja de 1,81 a 1,29 MB (29% menos) y el peor PSNR del lote es 38,5 dB, que
// a ojo es indistinguible en arte plano de pocos colores como este. Importa
// porque la pantalla de carga espera a que esten los 22: cada MB ahorrado son
// veinte segundos menos en 3G. Por debajo de 0.75 si empieza a ensuciar los
// degradados de la piel.
//
// Uso (hace falta un servidor de dev levantado):
//   1. npm run dev            (en otra terminal)
//   2. node scripts/to-webp.mjs              -> todos los .png
//      node scripts/to-webp.mjs guru.png ... -> solo esos
//
// No borra los .png: eso se hace a mano cuando has comprobado que todo se ve
// bien y has actualizado las cartas que los referencian.
//
// Nota técnica: usa un navegador (canvas.toDataURL) porque Node no trae
// codificador WebP. La página se carga desde localhost para que el canvas no
// quede "tainted" por CORS al leer los píxeles.

import { writeFileSync, readdirSync, statSync } from 'node:fs'
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
  throw new Error('No encuentro playwright. Instálalo con: npm i -D playwright  (o define PLAYWRIGHT_PATH)')
}
const chromium = await loadChromium()

const CHARDIR = fileURLToPath(new URL('../public/characters/', import.meta.url))
const DEV_URL = process.env.DEV_URL || 'http://localhost:5173/'
const CALIDAD = Number(process.env.CALIDAD || 0.82)

const args = process.argv.slice(2)
const files = args.length > 0 ? args : readdirSync(CHARDIR).filter((f) => f.endsWith('.png'))

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(DEV_URL, { waitUntil: 'domcontentloaded' })

let antes = 0
let despues = 0
for (const f of files) {
  const dataUrl = await page.evaluate(
    async ({ f, CALIDAD }) => {
      const img = new Image()
      img.src = '/characters/' + f
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      c.getContext('2d').drawImage(img, 0, 0)
      return c.toDataURL('image/webp', CALIDAD)
    },
    { f, CALIDAD }
  )
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64')
  const destino = f.replace(/\.png$/, '.webp')
  writeFileSync(CHARDIR + destino, buf)
  const pesaba = statSync(CHARDIR + f).size
  antes += pesaba
  despues += buf.length
  console.log(
    `${destino.padEnd(30)} ${(pesaba / 1024).toFixed(0).padStart(5)} KB -> ${(buf.length / 1024).toFixed(0).padStart(4)} KB`
  )
}

await browser.close()
console.log(
  `\n${files.length} retratos: ${(antes / 1024 / 1024).toFixed(2)} MB -> ${(despues / 1024 / 1024).toFixed(2)} MB ` +
    `(${Math.round((1 - despues / antes) * 100)}% menos)`
)
