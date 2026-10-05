// CÓMO HABLA CADA PERSONAJE, sacado de sus propias cartas.
//
// `reparto.ts` dice QUIÉN es cada uno en una línea. Esto dice CÓMO habla, y no
// lo inventa: lo mide sobre las cartas que ya están escritas. Sirve para dos
// cosas distintas:
//
//   1. Escribir una carta nueva que suene a él sin tener que leerse las
//      cincuenta anteriores.
//   2. Ver de un vistazo qué personajes NO tienen una voz propia todavía —
//      si sus números son los de la media en todo, es que podría hablar
//      cualquiera.
//
// LO QUE SE MIDE, Y POR QUÉ CADA COSA:
//
//   frase        Longitud media de frase. El que suelta parrafadas y el que
//                habla a golpes no son el mismo personaje.
//   usted        Qué parte de sus cartas le tratan de usted. El Hermano tutea,
//                el Fiscal no; eso es carácter, no gramática.
//   pide         Empieza pidiendo algo (imperativo o "quiero/necesito"). Separa
//                a quien viene a por algo de quien viene a contarte algo.
//   cifras       Lleva números. El Encuestador y El Empresario discuten con
//                datos; El Cruzado, no.
//   comillas     Cita a alguien o se cita a sí mismo.
//   propias      Las palabras que usa ÉL y casi nadie más. Es lo más útil de
//                todo esto y lo que de verdad define una voz.
//
// Uso:  npm run qa-habla            -> la tabla
//       npm run qa-habla <nombre>   -> la ficha de uno, con ejemplos

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const CONTENT = fileURLToPath(new URL('../src/data/cards.content.ts', import.meta.url))
const REPARTO = fileURLToPath(new URL('../src/data/reparto.ts', import.meta.url))

const fuente = readFileSync(CONTENT, 'utf8')
const marca = 'export const contentCards: Card[] = ['
const abre = fuente.indexOf(marca) + marca.length - 1
let nivel = 0
let cartas = []
for (let i = abre; i < fuente.length; i++) {
  if (fuente[i] === '[') nivel++
  else if (fuente[i] === ']') {
    nivel--
    // eslint-disable-next-line no-new-func
    if (nivel === 0) {
      cartas = new Function(`return ${fuente.slice(abre, i + 1)}`)()
      break
    }
  }
}

const QUIEN = new Map(
  [...readFileSync(REPARTO, 'utf8').matchAll(/\{ nombre: '([^']+)'[^}]*?quien: '([^']*)'/g)].map(
    (m) => [m[1], m[2]]
  )
)

const porPersonaje = new Map()
for (const c of cartas) {
  if (!c.character || !c.text) continue
  if (!porPersonaje.has(c.character)) porPersonaje.set(c.character, [])
  porPersonaje.get(c.character).push(c)
}

// Palabras que no dicen nada de nadie: si no se quitan, las "propias" de todos
// acaban siendo "para", "como" y "esto".
const VACIAS = new Set(
  ('el la los las un una unos unas de del a al en y o que se su sus le les lo me mi' +
   ' no si por para con sin sobre como mas más pero ya es son está están hay esto eso' +
   ' esta este estos estas aqui aquí ahi ahí todo toda todos todas nada nadie alguien' +
   ' cuando donde donde porque muy tan solo sólo bien mal usted yo tu tú él ella' +
   ' nos nuestro desde hasta entre tras ante cada otro otra otros otras mismo misma' +
   ' va van ser estar tener hacer decir dice dicen dijo han ha he has hemos' +
   ' una dos tres año años mes meses dia día dias días vez veces').split(/\s+/)
)

const palabras = (t) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .match(/[a-zñ]{4,}/g) ?? []

// Cuántos personajes usan cada palabra: una palabra que usan veinte no
// distingue a nadie.
const enCuantos = new Map()
for (const [, suyas] of porPersonaje) {
  const vistas = new Set()
  for (const c of suyas) for (const w of palabras(c.text)) if (!VACIAS.has(w)) vistas.add(w)
  for (const w of vistas) enCuantos.set(w, (enCuantos.get(w) ?? 0) + 1)
}

const PIDE = /^(?:[«"]?)(?:\w+[aeé]me|d[ée]jeme|déme|deme|quiero|necesito|exijo|p[íi]dale|tr[áa]igame|f[íi]rme|firme|p[áa]re|p[aá]reme|conv[óo]que|baje|suba|quite|saque|meta|ponga|d[ée]|haga|venga|escuche|mire|oiga|perm[íi]tame|le pido|le exijo|le ped)/i

const filas = []
for (const [nombre, suyas] of porPersonaje) {
  const textos = suyas.map((c) => c.text)
  const frases = textos.flatMap((t) => t.split(/(?<=[.?!…])\s+/).filter((x) => x.trim().length > 3))
  const palabrasPorFrase =
    frases.reduce((s, f) => s + (f.match(/\S+/g) ?? []).length, 0) / Math.max(1, frases.length)

  const pct = (f) => Math.round((100 * textos.filter(f).length) / textos.length)

  // Palabras suyas y de casi nadie más.
  const cuenta = new Map()
  for (const t of textos) for (const w of palabras(t)) if (!VACIAS.has(w)) cuenta.set(w, (cuenta.get(w) ?? 0) + 1)
  const propias = [...cuenta.entries()]
    .filter(([w, n]) => n >= 2 && (enCuantos.get(w) ?? 99) <= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w)

  filas.push({
    nombre,
    n: textos.length,
    frase: palabrasPorFrase,
    usted: pct((t) => /\busted\b|\ble (digo|pido|traigo|cuento|aviso|explico)\b/i.test(t)),
    pide: pct((t) => PIDE.test(t.trim())),
    cifras: pct((t) => /\d|\b(cien|mil|mill[oó]n|millones|por ciento|puntos?)\b/i.test(t)),
    comillas: pct((t) => /["«]/.test(t)),
    propias,
  })
}
filas.sort((a, b) => b.n - a.n)

const uno = process.argv[2]
if (uno) {
  const f = filas.find((x) => x.nombre.toLowerCase().includes(uno.toLowerCase()))
  if (!f) {
    console.log(`No encuentro a nadie que se llame como "${uno}".`)
    process.exit(1)
  }
  console.log(`\n${f.nombre}  (${f.n} cartas)`)
  console.log(`  ${QUIEN.get(f.nombre) ?? ''}\n`)
  console.log(`  frase media   ${f.frase.toFixed(1)} palabras`)
  console.log(`  le trata de usted   ${f.usted}% de sus cartas`)
  console.log(`  abre pidiendo algo  ${f.pide}%`)
  console.log(`  lleva cifras        ${f.cifras}%`)
  console.log(`  cita a alguien      ${f.comillas}%`)
  console.log(`  palabras suyas      ${f.propias.join(', ') || '(ninguna propia)'}`)
  console.log('\n  tres cartas suyas, para coger el tono:')
  for (const c of porPersonaje.get(f.nombre).slice(0, 3)) console.log(`    · ${c.text}`)
  console.log()
  process.exit(0)
}

const med = (k) => {
  const v = filas.map((f) => f[k]).sort((a, b) => a - b)
  return v[Math.floor(v.length / 2)]
}
console.log('personaje'.padEnd(26) + 'cartas  frase  usted  pide  cifras  citas   palabras suyas')
for (const f of filas) {
  console.log(
    f.nombre.padEnd(26) +
      String(f.n).padStart(5) +
      f.frase.toFixed(1).padStart(7) +
      (f.usted + '%').padStart(7) +
      (f.pide + '%').padStart(6) +
      (f.cifras + '%').padStart(8) +
      (f.comillas + '%').padStart(7) +
      '   ' +
      f.propias.slice(0, 5).join(' ')
  )
}
console.log(
  `\nmediana: frase ${med('frase').toFixed(1)} palabras, usted ${med('usted')}%, ` +
    `pide ${med('pide')}%, cifras ${med('cifras')}%, citas ${med('comillas')}%`
)

// AVISO, NO VEREDICTO. Esto mide VOCABULARIO, y una voz puede estar en la
// estructura y no en las palabras.
//
// Paso el 05/10/2026: el script dio a El Tertuliano por plano, una sola palabra
// suya en diecinueve cartas, y se dijo que podria hablar cualquiera. Leyendolas,
// tiene de las voces mas marcadas del mazo: el 37% de sus cartas niegan el favor
// mientras lo piden ("no le pido nada, lo digo para que conste que no le pido
// nada"), contra el 1,1% del resto. Treinta y cuatro veces mas que la media.
//
// Su firma es una forma de construir la frase, no un lexico, y eso aqui no se
// ve. Asi que si alguien sale en esta lista, el siguiente paso es LEER tres
// cartas suyas, no reescribirlas.
const sinLexico = filas.filter((f) => f.n >= 10 && f.propias.length <= 1)
if (sinLexico.length) {
  console.log(`
SIN VOCABULARIO PROPIO (${sinLexico.length}). Puede que su voz este en la`)
  console.log('estructura y no en las palabras: lee tres cartas suyas antes de tocar nada.')
  for (const f of sinLexico) console.log(`  ${f.nombre} (${f.n} cartas)`)
}
