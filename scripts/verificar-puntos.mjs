// El contrato entre lo que el jugador VE y lo que el motor HACE.
//
// Al arrastrar una carta se encienden puntos sobre los indicadores que van a
// moverse. Eso es una promesa, y hasta ahora nadie la comprobaba: el motor se
// probaba por un lado (tasas de victoria, reparto de finales) y la interfaz
// por otro (capturas, desbordes), pero el punto vive justo en medio.
//
// El fallo que motivó este script: `jitter` sumaba o restaba 1 al azar a cada
// efecto, así que un efecto de ±1 se quedaba en 0 una de cada cinco veces. El
// punto se encendía, el jugador decidía contando con ese movimiento, y la
// barra no se movía. En un juego que esconde los números es el peor fallo
// posible, porque no hay forma de distinguirlo de haber leído mal.
//
// No se detectó en meses de pruebas por una razón que merece quedar escrita:
// los simuladores de balance llevaban una COPIA de `jitter`, con el mismo
// fallo. Reproducían la partida fielmente, incluido el error, y contestaban
// que todo estaba bien. Por eso esto lee la función del motor de verdad en
// vez de copiarla.
//
// Uso:  node scripts/verificar-puntos.mjs

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('../', import.meta.url))
const fuente = readFileSync(RAIZ + 'src/hooks/useGameStore.ts', 'utf8')
// Las constantes estan repartidas: DAMP_ZONE en el store, STAT_MAX en los
// datos del mazo. Se miran los dos sitios.
const fuentes = fuente + readFileSync(RAIZ + 'src/data/cards.ts', 'utf8')

// Se extraen las funciones TAL CUAL están en el motor. Si alguien las cambia,
// esta prueba las coge cambiadas; si se copiaran aquí, no.
function extraer(nombre) {
  const i = fuente.indexOf('function ' + nombre + '(')
  if (i < 0) throw new Error('no encuentro ' + nombre + ' en useGameStore.ts')
  let prof = 0
  for (let k = fuente.indexOf('{', i); k < fuente.length; k++) {
    if (fuente[k] === '{') prof++
    else if (fuente[k] === '}') {
      prof--
      if (prof === 0) return fuente.slice(i, k + 1)
    }
  }
  throw new Error('no se cierra ' + nombre)
}
function constante(nombre) {
  const m = fuentes.match(new RegExp('const ' + nombre + ' = (-?[\\d.]+)'))
  if (!m) throw new Error('no encuentro la constante ' + nombre)
  return Number(m[1])
}

const STAT_MAX = constante('STAT_MAX') || 10
const DAMP_ZONE = constante('DAMP_ZONE')

const aJs = (src) =>
  src
    .replace(/: number/g, '')
    .replace(/\bSTAT_MAX\b/g, String(STAT_MAX))
    .replace(/\bDAMP_ZONE\b/g, String(DAMP_ZONE))
    .replace(/^function \w+/, 'function')

const jitter = eval('(' + aJs(extraer('jitter')) + ')')
const damp = eval('(' + aJs(extraer('damp')) + ')')
const clamp = (n) => Math.max(0, Math.min(STAT_MAX, n))

// Los efectos que declaran las cartas del juego, para probar los de verdad y
// no una lista inventada.
const contenido = readFileSync(RAIZ + 'src/data/cards.content.ts', 'utf8')
const magnitudes = new Set()
for (const m of contenido.matchAll(/(?:medios|gobierno|calle|caja): (-?\d+)/g)) {
  const v = Number(m[1])
  if (v !== 0) magnitudes.add(v)
}

const VUELTAS = 3000
let casos = 0
let fallos = 0
const ejemplos = []
for (let valor = 0; valor <= STAT_MAX; valor++) {
  for (const efecto of [...magnitudes].sort((a, b) => a - b)) {
    // Si la barra ya está pegada al extremo hacia el que empuja la carta, no
    // puede moverse: ahí StatBars NO pinta el punto, así que no hay promesa
    // que cumplir y el caso no cuenta.
    const puedeMoverse = efecto > 0 ? valor < STAT_MAX : valor > 0
    if (!puedeMoverse) continue
    for (let n = 0; n < VUELTAS; n++) {
      casos++
      if (clamp(valor + damp(valor, jitter(efecto))) === valor) {
        fallos++
        if (ejemplos.length < 8) ejemplos.push(`barra en ${valor}, efecto ${efecto > 0 ? '+' : ''}${efecto}`)
      }
    }
  }
}

console.log('Contrato: si se enciende el punto, la barra se mueve.')
console.log(`  magnitudes de efecto en el mazo: ${[...magnitudes].sort((a, b) => a - b).join(', ')}`)
console.log(`  DAMP_ZONE = ${DAMP_ZONE}`)
console.log(`  casos probados: ${casos}`)
if (fallos === 0) {
  console.log('  incumplimientos: 0. Correcto.')
} else {
  console.log(`  INCUMPLIMIENTOS: ${fallos} (${((fallos * 100) / casos).toFixed(2)}%)`)
  for (const e of [...new Set(ejemplos)]) console.log('    ' + e)
  process.exitCode = 1
}
