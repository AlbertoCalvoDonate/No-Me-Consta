// ¿Los efectos de una carta dicen lo mismo que la carta?
//
// El otro auditor (auditar-coherencia) mira si una carta puede SALIR cuando no
// toca. Este mira otra cosa, que se ve jugando y no leyendo: eliges una cosa y
// el número hace la contraria. El juego no falla —el número es el que alguien
// escribió— pero el jugador lee una cosa y ve otra, y eso se siente como un
// error aunque no lo sea.
//
// Uso:  npm run auditar-efectos
//
// ===========================================================================
// LO QUE SE PROBÓ Y NO VALIÓ (02/10/2026). Está aquí para no repetirlo:
//
//  1. CRUZAR `pleases` CON EL INDICADOR DEL PERSONAJE. Dar por mala toda carta
//     donde contentar a alguien le baje el indicador que encarna: señaló 150
//     de 428. El razonamiento estaba mal, no las cartas — `pleases` es lo que
//     el personaje quiere PARA ÉL, no lo que le conviene a su indicador. El
//     Hermano encarna la caja y quiere el puesto a dedo; dárselo cuesta dinero.
//
//  2. UN VOCABULARIO DE FRASES de programa electoral ("subir las pensiones"):
//     1 sospecha en 1268 opciones, y falsa. Las opciones están escritas cortas
//     e idiomáticas ("Puesto a dedo", "Seguirle el rollo"), no así.
//
//  3. FRASES REPETIDAS CON SIGNOS OPUESTOS. Objetivo y barato, pero solo hay
//     14 textos repetidos en todo el mazo y su única discrepancia es legítima
//     ("Dejarlo como está" cuesta caja en un enchufe y la gana en unas dietas).
//     Se deja puesto abajo porque no cuesta nada y el día que haya más textos
//     repetidos sí servirá.
//
//  4. UN VOCABULARIO DE VERBOS ("pagar" -> la caja baja): 9 avisos, 8 falsos.
//     Se cuela "que lo pague ÉL", que sube la caja en vez de bajarla. Se deja,
//     acotado, porque el que no era falso llevó a un fallo de verdad.
//
// LO QUE SÍ DA SEÑAL es cruzar los efectos con la `moralidad` que el autor ya
// escribió en cada opción. Eso no es una suposición mía sobre el español: son
// dos campos del mismo objeto que tienen que contarse lo mismo.
// ===========================================================================

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const CONTENT = fileURLToPath(new URL('../src/data/cards.content.ts', import.meta.url))
const REPARTO = fileURLToPath(new URL('../src/data/reparto.ts', import.meta.url))

// Quien encarna que indicador. Esta escrito una sola vez, en el reparto.
const DUENO = new Map(
  [...readFileSync(REPARTO, 'utf8').matchAll(/\{ nombre: '([^']+)'[^}]*?dueno: '([a-z]+)'/g)].map(
    (m) => [m[1], m[2]]
  )
)

function sacarCartas(fuente) {
  const marca = 'export const contentCards: Card[] = ['
  const desde = fuente.indexOf(marca)
  if (desde === -1) throw new Error('no encuentro el array de cartas en cards.content.ts')
  // El corchete bueno es el del FINAL de la marca. Buscar el primer '[' desde
  // `desde` encuentra el de `Card[]`, y entonces lo que se evalúa es `[]`: cero
  // cartas, y un auditor que dice que todo está bien sin haber mirado nada.
  // Pasó, y no falló — solo no encontraba nunca nada.
  const abre = desde + marca.length - 1
  let nivel = 0
  for (let i = abre; i < fuente.length; i++) {
    if (fuente[i] === '[') nivel++
    else if (fuente[i] === ']') {
      nivel--
      // eslint-disable-next-line no-new-func
      if (nivel === 0) return new Function(`return ${fuente.slice(abre, i + 1)}`)()
    }
  }
  throw new Error('el array de cartas no cierra')
}

const cartas = sacarCartas(readFileSync(CONTENT, 'utf8'))
const opciones = []
for (const c of cartas) {
  for (const lado of ['left', 'right']) {
    if (c[lado]) opciones.push({ id: c.id, lado, ...c[lado] })
  }
}
const N = { medios: 'Me', gobierno: 'Go', calle: 'Ca', caja: 'Cj' }
const pinta = (o) =>
  Object.entries(o.effects || {})
    .map(([k, v]) => N[k] + (v > 0 ? '+' : '') + v)
    .join(' ') || '(nada)'

console.log(`${cartas.length} cartas, ${opciones.length} opciones.\n`)

// ---------------------------------------------------------------------------
// 1. MORALIDAD CONTRA MEDIOS. Es la relación más fuerte del mazo y por eso es
// la que mejor detecta un descuido: medido el 02/10/2026, de las opciones
// turbias (moralidad <= -2) 235 bajan los medios y solo 15 los suben; de las
// decentes (>= +2), 247 los suben y 12 los bajan. O sea un 94% en el mismo
// sentido.
//
// Las excepciones NO son fallos, y conviene saberlo antes de "arreglarlas":
// son los fontaneros. Aceptar el favor sucio sube los medios porque la
// historia se entierra, y negarse los baja porque sale. Esa es la gracia del
// personaje. Lo que este número vigila es que esas excepciones sigan siendo
// pocas: si un día son cincuenta, alguien ha dejado de mirar.
const BANDA = 0.88
let turbiaBaja = 0
let turbiaSube = 0
let decenteSube = 0
let decenteBaja = 0
const excepciones = []
for (const o of opciones) {
  const m = o.moralidad ?? 0
  const me = o.effects?.medios ?? 0
  if (m <= -2) {
    if (me < 0) turbiaBaja++
    else if (me > 0) {
      turbiaSube++
      excepciones.push({ ...o, por: 'turbia y le sube los medios' })
    }
  } else if (m >= 2) {
    if (me > 0) decenteSube++
    else if (me < 0) {
      decenteBaja++
      excepciones.push({ ...o, por: 'decente y le baja los medios' })
    }
  }
}
const ratioT = turbiaBaja / (turbiaBaja + turbiaSube)
const ratioD = decenteSube / (decenteSube + decenteBaja)
console.log('MORALIDAD CONTRA MEDIOS')
console.log(
  `  turbias:  ${turbiaBaja} bajan medios / ${turbiaSube} los suben  (${(ratioT * 100).toFixed(0)}% en sentido)`
)
console.log(
  `  decentes: ${decenteSube} suben medios / ${decenteBaja} los bajan  (${(ratioD * 100).toFixed(0)}% en sentido)`
)
if (ratioT < BANDA || ratioD < BANDA) {
  console.log(`  OJO: por debajo del ${BANDA * 100}%. Antes iba al 94%: algo ha entrado torcido.`)
}
console.log(`  (${excepciones.length} excepciones; casi todas son los fontaneros, a propósito)\n`)

// ---------------------------------------------------------------------------
// 2. LA CAJA NO TIENE REGLA, y es útil saberlo para no inventarse una. Medido:
// de las opciones turbias, 71 LLENAN la caja y 61 la VACÍAN — porque corromper
// es las dos cosas, cobrar un maletín y comprar a un tránsfuga. Lo que sí es
// casi ley es que ser decente CUESTA: 70 decentes vacían la caja y solo 8 la
// llenan (y esas ocho son "que lo pague él").
let tLlena = 0
let tVacia = 0
let dLlena = 0
let dVacia = 0
for (const o of opciones) {
  const m = o.moralidad ?? 0
  const cj = o.effects?.caja ?? 0
  if (m <= -2 && cj > 0) tLlena++
  if (m <= -2 && cj < 0) tVacia++
  if (m >= 2 && cj > 0) dLlena++
  if (m >= 2 && cj < 0) dVacia++
}
console.log('MORALIDAD CONTRA CAJA (informativo, aquí no hay regla que romper)')
console.log(`  turbias:  ${tLlena} llenan la caja / ${tVacia} la vacían`)
console.log(`  decentes: ${dLlena} la llenan / ${dVacia} la vacían\n`)

// ---------------------------------------------------------------------------
// 3. LA MISMA FRASE HACIENDO COSAS CONTRARIAS. Ver la nota 3 de arriba.
const norm = (t) =>
  t
    .toLowerCase()
    .replace(/["«».,¡!¿?:;()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
const porTexto = new Map()
for (const o of opciones) {
  if (!o.text) continue
  const k = norm(o.text)
  if (!porTexto.has(k)) porTexto.set(k, [])
  porTexto.get(k).push(o)
}
const contrarias = []
for (const [k, usos] of porTexto) {
  if (usos.length < 2) continue
  for (const s of Object.keys(N)) {
    const signos = new Set(usos.map((u) => Math.sign(u.effects?.[s] ?? 0)))
    if (signos.has(1) && signos.has(-1)) contrarias.push({ k, s, usos })
  }
}
console.log(`LA MISMA FRASE EN SENTIDOS OPUESTOS: ${contrarias.length}`)
for (const c of contrarias) {
  console.log(`  "${c.k}" -> ${N[c.s]} en los dos sentidos`)
  for (const u of c.usos) console.log(`     ${u.id.padEnd(28)}${pinta(u)}`)
}
console.log()

// ---------------------------------------------------------------------------
// 4. PAGAR Y COBRAR. El vocabulario mínimo que sí dice algo del dinero. Se
// excluye "que lo pague ÉL/ELLA/QUIEN SEA", que es pagar de OTRO bolsillo y
// por tanto sube la caja: sin ese recorte, ocho de los nueve avisos eran eso.
const PAGA_UNO = /\b(pagar|pagarlo|pagarla|pagarles|indemnizar|devolver el dinero|de su bolsillo|costear)\b/i
const PAGA_OTRO = /\bque (lo|la|los|las)? ?(pague|paguen|devuelva)\b|\bque .{0,20}\b(pague|paguen)\b|\bno pagar\b/i
const sospechas = []
for (const o of opciones) {
  if (!o.text) continue
  const cj = o.effects?.caja ?? 0
  if (PAGA_UNO.test(o.text) && !PAGA_OTRO.test(o.text) && cj > 0) {
    sospechas.push(o)
  }
}
console.log(`DICE "PAGAR" Y LA CAJA SUBE: ${sospechas.length}`)
for (const s of sospechas) console.log(`  ${s.id.padEnd(28)}"${s.text.slice(0, 44)}"  ${pinta(s)}`)
if (!sospechas.length) console.log('  (ninguna)')
console.log()

// ---------------------------------------------------------------------------
// 5. EL PERSONAJE CONTRA SU PROPIO INDICADOR.
//
// Cada personaje encarna una barra (`dueno` en data/reparto.ts) y la idea es
// que sus cartas la toquen: ver quien habla y saber que te juegas ES la
// habilidad central de un Reigns. Una carta de quien encarna la calle que no
// mueve la calle no esta mal escrita, pero no ensena lo que tendria que
// ensenar.
//
// Medido el 02/10/2026: la mayoria del reparto va entre el 94% y el 100%. Los
// que menos, El Hermano (81%) y La Oposicion (86%).
//
// OJO AL LEER LA LISTA: casi todas las que salen son tipos de carta donde el
// personaje NARRA en vez de protagonizar — las de pelea entre dos (`feud_`),
// los chistes (`meme_`), el balance de fin de ano (`recap_`), la herencia del
// gobierno anterior (`herencia_`) y los rescates. Ahi es normal y correcto que
// lo que se mueva sea otra cosa. Lo que merece una mirada son las ORDINARIAS.
const FAMILIAS_NARRADAS = /^(feud_|meme_|recap_|herencia_|corte_|rescate_|react_|anger_|roce_|secuela_|bomba_|trama_)/
console.log('EL PERSONAJE CONTRA SU PROPIO INDICADOR')
const flojos = []
const sueltas = []
for (const [per, stat] of DUENO) {
  const suyas = cartas.filter((c) => c.character === per)
  if (!suyas.length) continue
  const tocan = suyas.filter((c) => ['left', 'right'].some((l) => c[l]?.effects?.[stat]))
  const pct = Math.round((100 * tocan.length) / suyas.length)
  if (pct < 95) flojos.push({ per, stat, pct, n: suyas.length })
  for (const c of suyas) {
    if (tocan.includes(c)) continue
    if (FAMILIAS_NARRADAS.test(c.id)) continue
    sueltas.push({ id: c.id, per, stat })
  }
}
flojos.sort((a, b) => a.pct - b.pct)
for (const f of flojos) {
  console.log(`  ${f.per.padEnd(26)} encarna ${f.stat.padEnd(9)} toca lo suyo en el ${f.pct}% de sus ${f.n} cartas`)
}
console.log(`
  Cartas ORDINARIAS que no tocan el indicador de su personaje: ${sueltas.length}`)
for (const s of sueltas) console.log(`    ${s.id.padEnd(30)}${s.per} (encarna ${s.stat})`)
console.log()

console.log('Esto es una lista de sospechas, no un validador: no bloquea nada.')
console.log('A veces la contradicción es el chiste, y entonces está bien.')
