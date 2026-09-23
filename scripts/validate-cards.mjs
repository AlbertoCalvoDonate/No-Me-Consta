// Valida src/data/cards.content.ts sin necesidad de arrancar el juego.
// Uso:  npm run validate-cards
//
// Comprueba: ids duplicados o con formato raro, stats mal escritas en
// `effects`, valores de efecto fuera de rango, campos obligatorios
// vacíos, y referencias rotas de `nextCardId`. Pensado para que lo
// pueda correr alguien que no programa: si algo falla, dice
// exactamente qué carta y qué está mal, en español.
//
// Nota técnica: en vez de compilar el .ts, extraemos el array literal
// de cartas como texto y lo evaluamos como JS. Funciona porque
// cards.content.ts solo contiene objetos planos (sin tipos ni lógica
// dentro de las cartas) — si eso deja de ser cierto, este script habrá
// que actualizarlo.

import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const CONTENT_FILE = fileURLToPath(new URL('../src/data/cards.content.ts', import.meta.url))
const RETRATOS_DIR = fileURLToPath(new URL('../public/characters', import.meta.url))
const RETRATOS = new Set(readdirSync(RETRATOS_DIR))
const VALID_STATS = ['medios', 'gobierno', 'calle', 'caja']
const VALID_PHASES = [1, 2, 3, 4]
const EFFECT_MIN = -3
const EFFECT_MAX = 3
const TEXT_SOFT_LIMIT = 220

function extractCardsArray(source) {
  const marker = 'export const contentCards: Card[] = ['
  const start = source.indexOf(marker)
  if (start === -1) {
    throw new Error(`No encuentro "${marker}" en cards.content.ts. ¿Se ha renombrado el export?`)
  }
  const arrayStart = start + marker.length - 1 // incluye el '['
  const closingIndex = source.lastIndexOf(']')
  if (closingIndex === -1 || closingIndex < arrayStart) {
    throw new Error('No encuentro el cierre "]" del array de cartas.')
  }
  const literal = source.slice(arrayStart, closingIndex + 1)
  // eslint-disable-next-line no-eval -- ver nota técnica arriba
  return eval(literal)
}

function fmt(id, index) {
  return id ? `"${id}" (carta #${index + 1})` : `carta sin id (posición #${index + 1})`
}

function validate(cards) {
  const errors = []
  const warnings = []
  const seenIds = new Map()

  cards.forEach((card, index) => {
    const label = fmt(card.id, index)

    if (!card.id || typeof card.id !== 'string') {
      errors.push(`${label}: falta el "id" o no es texto.`)
    } else {
      if (!/^[a-z][a-z0-9_]*$/.test(card.id)) {
        errors.push(`${label}: el id "${card.id}" debería ser minúsculas/números/guion_bajo (ej. "mi_carta_2").`)
      }
      if (card.id.startsWith('final_')) {
        errors.push(`${label}: el prefijo "final_" está reservado para las cartas de cards.ts, usa otro id.`)
      }
      if (seenIds.has(card.id)) {
        errors.push(`${label}: id duplicado, ya lo usa la carta #${seenIds.get(card.id) + 1}.`)
      } else {
        seenIds.set(card.id, index)
      }
    }

    if (!VALID_PHASES.includes(card.phase)) {
      errors.push(`${label}: "phase" debe ser 1, 2, 3 o 4 (tiene ${JSON.stringify(card.phase)}).`)
    }

    if (!card.character || typeof card.character !== 'string') {
      errors.push(`${label}: falta "character" (quién habla en la carta).`)
    }

    // El retrato tiene que existir en public/characters. Sin esto, escribir
    // mal el nombre del fichero no falla en ningún sitio: la carta sale en
    // el juego con un hueco donde debería estar la cara.
    if (card.characterImage !== undefined) {
      if (typeof card.characterImage !== 'string') {
        errors.push(`${label}: "characterImage" debería ser el nombre del fichero, entre comillas.`)
      } else if (!RETRATOS.has(card.characterImage)) {
        errors.push(
          `${label}: el retrato "${card.characterImage}" no está en public/characters/.`,
        )
      }
    }

    if (!card.text || typeof card.text !== 'string') {
      errors.push(`${label}: falta "text" (el texto de la situación).`)
    } else if (card.text.length > TEXT_SOFT_LIMIT) {
      warnings.push(`${label}: el texto tiene ${card.text.length} caracteres, puede no caber bien en la carta (aviso, no bloqueante).`)
    }

    for (const side of ['left', 'right']) {
      const choice = card[side]
      if (!choice || typeof choice !== 'object') {
        errors.push(`${label}: falta la opción "${side}".`)
        continue
      }
      if (!choice.text || typeof choice.text !== 'string') {
        errors.push(`${label}: la opción "${side}" no tiene texto.`)
      }
      const effects = choice.effects
      if (!effects || typeof effects !== 'object') {
        errors.push(`${label}: la opción "${side}" no tiene "effects" (puede ser un objeto vacío {} si no cambia nada).`)
      } else {
        for (const [key, value] of Object.entries(effects)) {
          if (!VALID_STATS.includes(key)) {
            errors.push(`${label}: "${side}.effects.${key}" no es una stat válida (usa: ${VALID_STATS.join(', ')}).`)
            continue
          }
          if (typeof value !== 'number' || !Number.isInteger(value)) {
            errors.push(`${label}: "${side}.effects.${key}" debería ser un número entero.`)
          } else if (value < EFFECT_MIN || value > EFFECT_MAX) {
            warnings.push(`${label}: "${side}.effects.${key}" = ${value}, fuera del rango habitual ${EFFECT_MIN}..${EFFECT_MAX} (aviso, no bloqueante).`)
          }
        }
      }
      if (choice.moralidad !== undefined) {
        if (typeof choice.moralidad !== 'number' || !Number.isInteger(choice.moralidad)) {
          errors.push(`${label}: "${side}.moralidad" debería ser un número entero (o no ponerlo, si es neutro).`)
        } else if (choice.moralidad < EFFECT_MIN || choice.moralidad > EFFECT_MAX) {
          warnings.push(`${label}: "${side}.moralidad" = ${choice.moralidad}, fuera del rango habitual ${EFFECT_MIN}..${EFFECT_MAX} (aviso, no bloqueante).`)
        }
      }

      if (choice.nextCardId !== undefined && typeof choice.nextCardId !== 'string') {
        errors.push(`${label}: "${side}.nextCardId" debería ser texto (el id de la siguiente carta).`)
      }
    }

    if (card.isEnding) {
      warnings.push(`${label}: tiene "isEnding: true" — eso normalmente solo se usa en cards.ts, no en cards.content.ts.`)
    }
  })

  // Referencias nextCardId: deben apuntar a un id que exista en este mismo
  // archivo. (Las cartas de final viven en cards.ts y no se pueden encadenar
  // con nextCardId, así que no hace falta comprobar contra esas).
  // --- Repaso mecanico de los textos ---
  // Nada de esto juzga la escritura: son fallos de tecleo que se cuelan al
  // escribir cientos de cartas y que luego se ven en pantalla. Auditado el
  // mazo entero de golpe la primera vez: 465 cartas, 0 avisos, asi que esto
  // esta aqui para que siga asi.
  const textosVistos = new Map()
  cards.forEach((card, index) => {
    const label = fmt(card.id, index)
    const cuerpo = (card.text ?? '').trim()
    if (cuerpo) {
      const gemela = textosVistos.get(cuerpo)
      if (gemela) warnings.push(`${label}: tiene el MISMO texto que "${gemela}".`)
      else textosVistos.set(cuerpo, card.id)
      if (!/[.!?»"…)]$/.test(cuerpo)) {
        warnings.push(`${label}: el texto no acaba en signo de puntuación ("…${cuerpo.slice(-28)}").`)
      }
    }
    const trozos = [
      ['text', card.text],
      ['left.text', card.left?.text],
      ['right.text', card.right?.text],
      ['left.epilogueText', card.left?.epilogueText],
      ['right.epilogueText', card.right?.epilogueText],
    ]
    for (const [donde, txt] of trozos) {
      if (typeof txt !== 'string' || !txt) continue
      if ((txt.match(/"/g) ?? []).length % 2 !== 0) {
        warnings.push(`${label}: comillas sin cerrar en "${donde}".`)
      }
      if (/\s{2,}/.test(txt)) warnings.push(`${label}: espacio doble en "${donde}".`)
      if (/\s+[,.;:]/.test(txt)) warnings.push(`${label}: espacio antes de puntuación en "${donde}".`)
    }
    // Dos opciones con el mismo rotulo solo tiene sentido en las cartas de
    // muerte, donde los dos lados acaban la partida y esa es la broma.
    const esMuerte = Boolean(card.left?.epilogueText && card.right?.epilogueText)
    if (card.left?.text && card.left.text === card.right?.text && !esMuerte) {
      warnings.push(`${label}: las dos opciones dicen lo mismo ("${card.left.text}").`)
    }
  })

  const allIds = new Set(seenIds.keys())
  cards.forEach((card, index) => {
    const label = fmt(card.id, index)
    for (const side of ['left', 'right']) {
      const nextId = card[side]?.nextCardId
      if (nextId && !allIds.has(nextId)) {
        errors.push(`${label}: "${side}.nextCardId" apunta a "${nextId}", que no existe en cards.content.ts.`)
      }
    }
  })

  return { errors, warnings }
}

function main() {
  const source = readFileSync(CONTENT_FILE, 'utf8')
  let cards
  try {
    cards = extractCardsArray(source)
  } catch (err) {
    console.error('No se ha podido leer el mazo:', err.message)
    process.exit(1)
  }

  if (!Array.isArray(cards)) {
    console.error('cards.content.ts no exporta un array. Revisa que no se haya roto la sintaxis.')
    process.exit(1)
  }

  const { errors, warnings } = validate(cards)

  console.log(`Cartas analizadas: ${cards.length}`)

  if (warnings.length > 0) {
    console.log(`\nAVISOS (${warnings.length}, no bloquean, pero échales un ojo):`)
    warnings.forEach((w) => console.log('  - ' + w))
  }

  if (errors.length > 0) {
    console.log(`\nERRORES (${errors.length}):`)
    errors.forEach((e) => console.log('  - ' + e))
    console.log('\nCorrige lo de arriba antes de hacer commit / npm run dev.')
    process.exit(1)
  }

  console.log('\nTodo correcto, no hay errores.')
}

main()
