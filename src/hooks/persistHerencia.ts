import type { StatKey } from '../types'

// LA HERENCIA RECIBIDA.
//
// En Reigns tu rey se muere y el reino sigue: el siguiente hereda el mundo que
// dejaste, y esa continuidad es lo que convierte una racha de partidas en una
// historia. Aqui no habia nada de eso: cada partida empezaba con los cuatro
// indicadores a cinco, como si el pais se hubiera creado esa manana.
//
// Y da la casualidad de que el equivalente espanol se llama solo. No hay
// gobierno entrante que no diga "la herencia recibida" en su primera semana.
//
// Se guarda lo minimo: por donde se cayo el anterior y como de sucio lo dejo.
// De ahi salen dos cosas en la partida siguiente: el indicador por el que cayo
// empieza tocado, y la primera carta va de eso.
//
// No se guarda en la partida (nomeconsta.partida se borra al terminar), sino
// aparte y a proposito: es lo unico que sobrevive a la muerte.

const KEY = 'nomeconsta.herencia'
const VERSION = 1

export interface Herencia {
  v: number
  // Por que barra cayo el anterior. `undefined` = se cayo por una situacion
  // (una mocion, una portada), no por un indicador.
  causa?: StatKey
  // Meses que aguanto. Solo para el texto: no cambia ninguna regla.
  meses: number
  // Si se fue por la puerta de atras. Sale de la moralidad oculta.
  sucio: boolean
}

export function guardarHerencia(h: Omit<Herencia, 'v'>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: VERSION, ...h }))
  } catch {
    // Incognito o almacenamiento lleno: se juega igual, sin herencia.
  }
}

export function cargarHerencia(): Herencia | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const h = JSON.parse(raw) as Herencia
    if (!h || h.v !== VERSION || typeof h.meses !== 'number') return null
    // La causa, si viene, tiene que ser una barra de verdad: un guardado de
    // otra version podria traer un nombre que ya no existe.
    if (h.causa && !['medios', 'gobierno', 'calle', 'caja'].includes(h.causa)) {
      return { ...h, causa: undefined }
    }
    return h
  } catch {
    return null
  }
}

export function olvidarHerencia() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nada que olvidar */
  }
}
