// ¿Lo que dice la opción cuadra con lo que hace?
//
// El otro auditor (auditar-coherencia) mira si una carta puede SALIR cuando no
// toca. Este mira otra cosa, que se ve jugando y no leyendo: eliges "subir las
// pensiones" y la calle BAJA. El juego no falla —el número es el que el autor
// escribió— pero el jugador lee una cosa y ve la contraria, y eso se siente
// como un error aunque no lo sea.
//
// NO ES UN VALIDADOR, ES UNA LISTA DE SOSPECHAS. Cada aviso hay que leerlo y
// decidir: a veces la contradicción es el chiste (pagas a la gente y los
// medios te crujen por electoralista), y entonces está bien y se deja. Por eso
// no devuelve código de error: no puede bloquear nada.
//
// SE INTENTÓ ANTES DE OTRA FORMA Y NO VALÍA, que es útil saber para no
// repetirlo: la primera versión cruzaba `pleases` (el lado que le da la razón
// al personaje) con el indicador que ese personaje encarna, y daba por mala
// toda carta donde contentarle le bajara lo suyo. Señaló 150 de 428. Mirándolas
// se ve el fallo del razonamiento: `pleases` es lo que el personaje quiere PARA
// ÉL, no lo que le conviene a su indicador. El Hermano encarna la caja y quiere
// el puesto a dedo; dárselo cuesta dinero. Es coherente, no un fallo.
//
// Así que aquí se mira la única señal que de verdad promete una dirección: lo
// que dice el texto de la opción.
//
// Uso:  node scripts/auditar-efectos.mjs

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const CONTENT = fileURLToPath(new URL('../src/data/cards.content.ts', import.meta.url))

// EL VOCABULARIO. Solo expresiones donde la dirección es casi segura — no
// "reforma" ni "acuerdo", que valen para cualquier cosa. Si hay que pensarlo
// dos veces, no entra: una lista con ruido no se lee, y una que no se lee no
// sirve.
//
// `sube` = si la opción dice esto, ese indicador NO debería bajar.
// `baja` = si la opción dice esto, ese indicador NO debería subir.
const VOCABULARIO = [
  {
    stat: 'calle',
    sube: [
      /\bsubir (las )?pensiones\b/i, /\bsubir el salario m[ií]nimo\b/i,
      /\bbajar (el )?(iva|los impuestos)\b/i, /\bcongelar (el )?alquiler\b/i,
      /\bm[áa]s plantilla\b/i, /\bm[áa]s m[ée]dicos\b/i, /\bcontratar m[áa]s\b/i,
      /\bindemnizar a las? v[ií]ctimas\b/i, /\brecibir a los manifestantes\b/i,
      /\bceder a la huelga\b/i, /\bretirar la (ley|subida|tasa)\b/i,
      /\bgratis\b/i, /\babaratar\b/i,
    ],
    baja: [
      /\brecortar\b/i, /\bcongelar las pensiones\b/i, /\bsubir (el )?(iva|los impuestos)\b/i,
      /\bcopago\b/i, /\bcargar contra\b/i, /\bdesalojar\b/i, /\bprivatizar\b/i,
      /\bcerrar (el |la )?(hospital|ambulatorio|centro de salud|colegio)\b/i,
    ],
  },
  {
    stat: 'caja',
    sube: [/\bcomisi[óo]n\b/i, /\bmordida\b/i, /\bsobre\b.*\ben efectivo\b/i, /\bcobrar\b/i],
    baja: [
      /\bindemnizar\b/i, /\bdevolver el dinero\b/i, /\bpagar de su bolsillo\b/i,
      /\bpagar la (multa|sanci[óo]n|fianza)\b/i, /\brenunciar al (dinero|cobro)\b/i,
    ],
  },
  {
    stat: 'medios',
    sube: [
      /\bdar la exclusiva\b/i, /\bcomparecer\b/i, /\brueda de prensa\b/i,
      /\bcontarlo todo\b/i, /\badmitirlo\b/i, /\bpublicar(lo)? (todo|el informe)\b/i,
      /\btransparencia total\b/i,
    ],
    baja: [
      /\bvetar (a|al)\b/i, /\bno comparecer\b/i, /\bquerella contra (el|la|los)\b/i,
      /\bretirar la publicidad institucional\b/i, /\bnegarlo todo\b/i, /\btaparlo\b/i,
    ],
  },
]

function sacarCartas(fuente) {
  const marca = 'export const contentCards: Card[] = ['
  const desde = fuente.indexOf(marca)
  if (desde === -1) throw new Error('no encuentro el array de cartas en cards.content.ts')
  // El corchete bueno es el del FINAL de la marca. Buscar el primer '[' a
  // partir de `desde` encuentra el de `Card[]`, y entonces lo que se evalúa es
  // `[]`: cero cartas, y un auditor que dice que todo está bien sin haber
  // mirado nada. Pasó, y no falló: solo no encontraba nunca nada.
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
const sospechas = []

for (const c of cartas) {
  for (const lado of ['left', 'right']) {
    const op = c[lado]
    if (!op?.text) continue
    for (const { stat, sube, baja } of VOCABULARIO) {
      const efecto = op.effects?.[stat] ?? 0
      const pSube = sube.find((r) => r.test(op.text))
      const pBaja = baja.find((r) => r.test(op.text))
      if (pSube && efecto < 0) {
        sospechas.push({ id: c.id, lado, texto: op.text, stat, efecto, dice: 'sube', pista: pSube })
      } else if (pBaja && efecto > 0) {
        sospechas.push({ id: c.id, lado, texto: op.text, stat, efecto, dice: 'baja', pista: pBaja })
      }
    }
  }
}

console.log(`${cartas.length} cartas miradas, ${cartas.length * 2} opciones.\n`)
if (!sospechas.length) {
  console.log('Ninguna opción dice una cosa y hace la contraria.')
} else {
  console.log(`SOSPECHAS (${sospechas.length}) — hay que leerlas, no todas son fallos:\n`)
  for (const s of sospechas) {
    const flecha = s.dice === 'sube' ? 'debería SUBIR' : 'debería BAJAR'
    console.log(`  ${s.id} (${s.lado})`)
    console.log(`     "${s.texto}"`)
    console.log(
      `     dice algo que ${flecha} ${s.stat} (${s.pista}), y hace ${s.stat} ${s.efecto > 0 ? '+' : ''}${s.efecto}\n`
    )
  }
}
