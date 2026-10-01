// SACA TODO EL ARTE A PNG, PARA PODER TRABAJAR CON EL.
//
// Los retratos viven en .webp porque pesan una fracción (ver to-webp), pero un
// .webp no se abre en cualquier sitio y, sobre todo, no se puede soltar en
// Photoshop para ver cómo era uno que hay que rehacer. Esto deja una copia en
// .png de todo, con su transparencia, en una carpeta aparte.
//
// NO SON LOS ORIGINALES, Y ESTO IMPORTA. El .webp ya pasó por una compresión
// con pérdida (calidad 0,82): el .png que sale de aquí es una copia EXACTA de
// ese resultado, no del dibujo que salió de Photoshop. Sirve para mirar, para
// comparar y para organizarse. No sirve para retocar y volver a meterlo: eso
// sería comprimir encima de lo ya comprimido. Para rehacer un retrato se parte
// del original, y si no existe, se dibuja de nuevo.
//
// Los originales de verdad van en arte-fuentes/, fuera de git (ver .gitignore).
//
// Uso (hace falta un servidor de dev levantado y npx playwright):
//   1. npm run dev
//   2. node scripts/exportar-png.mjs

import { writeFileSync, mkdirSync, readdirSync } from 'node:fs'
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

const CHARDIR = fileURLToPath(new URL('../public/characters/', import.meta.url))
const SALIDA = fileURLToPath(new URL('../arte-fuentes/png-actuales/', import.meta.url))
const DEV_URL = process.env.DEV_URL || 'http://localhost:5173/'

const webps = readdirSync(CHARDIR).filter((f) => f.endsWith('.webp')).sort()

const chromium = await loadChromium()
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(DEV_URL, { waitUntil: 'domcontentloaded' })

mkdirSync(SALIDA, { recursive: true })
let total = 0
for (const f of webps) {
  const datos = await page.evaluate(async (f) => {
    const img = new Image()
    img.src = '/characters/' + f
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    // Sin fondo: el canvas empieza transparente y la figura se pinta encima,
    // asi que el alfa del retrato se conserva tal cual.
    c.getContext('2d').drawImage(img, 0, 0)
    return { url: c.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight }
  }, f)
  const bin = Buffer.from(datos.url.split(',')[1], 'base64')
  const nombre = f.replace(/\.webp$/, '.png')
  writeFileSync(SALIDA + nombre, bin)
  total += bin.length
  console.log(`  ${nombre.padEnd(30)} ${datos.w}x${datos.h}  ${(bin.length / 1024).toFixed(0)} KB`)
}
await browser.close()
console.log(`\n${webps.length} retratos en arte-fuentes/png-actuales/  (${(total / 1048576).toFixed(1)} MB)`)
console.log('Recuerda: son copias del .webp ya comprimido, no los originales.')
