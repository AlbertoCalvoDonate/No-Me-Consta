import { useCallback, useState } from 'react'
import { LOGROS, type Logro, type ResultadoPartida } from '../data/logros'
import { cards } from '../data/cards'
import type { Stats, StatKey } from '../types'

const KEY = 'nomeconsta.logros'

// Cuántas cartas distintas hay en total. Es el denominador de la colección:
// como en Reigns, el mazo es tan grande que en una partida solo se ve un
// pellizco, y saber cuánto queda por ver es media razón para volver a jugar.
export const TOTAL_CARTAS = cards.length

// Lo que se guarda: qué logros están conseguidos y los totales que hacen falta
// para los logros acumulativos (partidas jugadas, finales distintos vistos,
// récord de meses, qué epítetos han salido, qué cartas se han visto alguna vez).
interface Guardado {
  conseguidos: string[]
  partidas: number
  finales: string[]
  mesesRecord: number
  epitetoRecord: number // epíteto (índice 0-10) de la partida más larga
  epitetos: number[] // índices 0-10
  cartasVistas: string[] // ids vistos en CUALQUIER partida (la colección)
}

const VACIO: Guardado = {
  conseguidos: [],
  partidas: 0,
  finales: [],
  mesesRecord: 0,
  epitetoRecord: -1,
  epitetos: [],
  cartasVistas: [],
}

function cargar(): Guardado {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...VACIO }
    const p = JSON.parse(raw)
    return {
      conseguidos: Array.isArray(p.conseguidos) ? p.conseguidos : [],
      partidas: p.partidas || 0,
      finales: Array.isArray(p.finales) ? p.finales : [],
      mesesRecord: p.mesesRecord || 0,
      epitetoRecord: typeof p.epitetoRecord === 'number' ? p.epitetoRecord : -1,
      epitetos: Array.isArray(p.epitetos) ? p.epitetos : [],
      cartasVistas: Array.isArray(p.cartasVistas) ? p.cartasVistas : [],
    }
  } catch {
    return { ...VACIO }
  }
}

function guardar(g: Guardado) {
  try {
    localStorage.setItem(KEY, JSON.stringify(g))
  } catch {
    /* modo incógnito: los logros no persisten, pero el juego funciona */
  }
}

// Datos crudos de la partida que acaba de terminar. La barra que reventó, si
// ganó, etc. los calcula esta función a partir de la carta de final.
export interface DatosPartida {
  meses: number
  moralidad: number
  endingId: string
  esEleccion: boolean
  porEvento: boolean
  stats: Stats
  cartas: string[]
  flags: string[]
}

function statRota(stats: Stats): StatKey | undefined {
  const ks: StatKey[] = ['medios', 'gobierno', 'calle', 'caja']
  return ks.find((k) => stats[k] <= 0 || stats[k] >= 10)
}

export interface ResumenPartida {
  nuevos: Logro[] // logros recién conseguidos, para el pop-up
  // El récord ANTES de esta partida (0 si era la primera). La pantalla de fin
  // lo necesita para poder decir "a cuatro meses de su récord": si se leyera
  // el guardado después, el récord ya incluiría la partida que acaba de
  // terminar y la comparación diría siempre cero.
  recordPrevio: number
}

// Se llama una vez al terminar la partida. Actualiza los totales, comprueba
// todos los logros y devuelve los que se acaban de conseguir (para el pop-up).
export function registrarPartida(d: DatosPartida): ResumenPartida {
  const g = cargar()
  const recordPrevio = g.mesesRecord

  g.partidas += 1
  if (!g.finales.includes(d.endingId)) g.finales.push(d.endingId)
  const epi = Math.max(0, Math.min(10, Math.round(d.moralidad)))
  if (d.meses > g.mesesRecord) {
    g.mesesRecord = d.meses
    g.epitetoRecord = epi
  }
  if (!g.epitetos.includes(epi)) g.epitetos.push(epi)

  // La colección: se suman las cartas de esta partida a las de todas las
  // anteriores. Solo cuentan ids que sigan existiendo en el mazo, para que
  // renombrar una carta no infle el contador para siempre.
  const coleccion = new Set(g.cartasVistas)
  for (const id of d.cartas) if (IDS_CARTAS.has(id)) coleccion.add(id)
  g.cartasVistas = [...coleccion]

  const gano =
    d.esEleccion && !/derrota|repeticion|quemado|retirada/.test(d.endingId)

  const r: ResultadoPartida = {
    meses: d.meses,
    moralidad: d.moralidad,
    epitetoIndex: epi,
    stats: d.stats,
    endingId: d.endingId,
    esEleccion: d.esEleccion,
    porEvento: d.porEvento,
    deathStat: d.porEvento || d.esEleccion ? undefined : statRota(d.stats),
    gano,
    aguantoLasTres: d.endingId.endsWith('_final'),
    cartas: d.cartas,
    flags: d.flags,
    partidasJugadas: g.partidas,
    finalesDistintos: g.finales.length,
    mesesRecord: g.mesesRecord,
    epitetosVistos: g.epitetos.length,
    cartasColeccionadas: g.cartasVistas.length,
  }

  const nuevos: Logro[] = []
  for (const l of LOGROS) {
    if (g.conseguidos.includes(l.id)) continue
    let pasa = false
    try {
      pasa = l.check(r)
    } catch {
      pasa = false
    }
    if (pasa) {
      g.conseguidos.push(l.id)
      nuevos.push(l)
    }
  }

  guardar(g)
  return { nuevos, recordPrevio }
}

// Ids que existen HOY. Un guardado viejo puede tener ids que ya no estan (si
// alguna vez se renombra un logro): siguen en localStorage por si vuelven,
// pero no cuentan para el "X de Y" ni descuadran el total.
const IDS_VIGENTES = new Set(LOGROS.map((l) => l.id))
const IDS_CARTAS = new Set(cards.map((c) => c.id))

// Estado para la pantalla de la lista. Se relee cada vez que se monta el panel.
export function useLogrosEstado() {
  const [tick, setTick] = useState(0)
  const refrescar = useCallback(() => setTick((t) => t + 1), [])
  void tick
  const g = cargar()
  return {
    conseguidos: new Set(g.conseguidos),
    total: LOGROS.length,
    hechos: g.conseguidos.filter((id) => IDS_VIGENTES.has(id)).length,
    partidas: g.partidas,
    mesesRecord: g.mesesRecord,
    epitetoRecord: g.epitetoRecord,
    finalesVistos: g.finales.length,
    epitetosVistos: g.epitetos.length,
    cartasVistas: g.cartasVistas.filter((id) => IDS_CARTAS.has(id)).length,
    totalCartas: TOTAL_CARTAS,
    // Los ids en crudo, no solo el recuento: la pantalla del reparto necesita
    // saber QUE cartas has visto para decir a quien conoces ya.
    idsVistos: new Set(g.cartasVistas),
    refrescar,
  }
}
