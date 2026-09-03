import { useCallback, useState } from 'react'
import { LOGROS, type Logro, type ResultadoPartida } from '../data/logros'
import type { Stats, StatKey } from '../types'

const KEY = 'nomeconsta.logros'

// Lo que se guarda: qué logros están conseguidos y los totales que hacen falta
// para los logros acumulativos (partidas jugadas, finales distintos vistos,
// récord de meses, qué epítetos han salido).
interface Guardado {
  conseguidos: string[]
  partidas: number
  finales: string[]
  mesesRecord: number
  epitetoRecord: number // epíteto (índice 0-10) de la partida más larga
  epitetos: number[] // índices 0-10
}

const VACIO: Guardado = {
  conseguidos: [],
  partidas: 0,
  finales: [],
  mesesRecord: 0,
  epitetoRecord: -1,
  epitetos: [],
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

// Se llama una vez al terminar la partida. Actualiza los totales, comprueba
// todos los logros y devuelve los que se acaban de conseguir (para el pop-up).
export function registrarPartida(d: DatosPartida): Logro[] {
  const g = cargar()

  g.partidas += 1
  if (!g.finales.includes(d.endingId)) g.finales.push(d.endingId)
  const epi = Math.max(0, Math.min(10, Math.round(d.moralidad)))
  if (d.meses > g.mesesRecord) {
    g.mesesRecord = d.meses
    g.epitetoRecord = epi
  }
  if (!g.epitetos.includes(epi)) g.epitetos.push(epi)

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
  return nuevos
}

// Ids que existen HOY. Un guardado viejo puede tener ids que ya no estan (si
// alguna vez se renombra un logro): siguen en localStorage por si vuelven,
// pero no cuentan para el "X de Y" ni descuadran el total.
const IDS_VIGENTES = new Set(LOGROS.map((l) => l.id))

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
    refrescar,
  }
}
