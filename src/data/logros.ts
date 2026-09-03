import type { Stats, StatKey } from '../types'

// Sistema de logros. Cada logro tiene un check(r) que decide si se consigue,
// mirando el RESULTADO de la partida que acaba de terminar (mas los totales
// acumulados de todas las partidas anteriores). Se comprueban todos al final
// de cada partida; los que pasan y no estaban ya, saltan como pop-up y se
// tachan de la lista. Persistencia en localStorage (ver useLogros).

// Lo que se sabe al terminar una partida.
export interface ResultadoPartida {
  meses: number // turnos - 1
  moralidad: number // 0-10
  epitetoIndex: number // = Math.round(moralidad)
  stats: Stats // las 4 barras al terminar
  endingId: string // id de la carta de final
  esEleccion: boolean // el final fue una noche electoral
  porEvento: boolean // el final fue una mocion / registro / ruptura
  deathStat?: StatKey // barra que revento (0 o max), si aplica
  gano: boolean // final electoral que no es derrota / repeticion
  aguantoLasTres: boolean // llego al final de la 3a legislatura (carta _final)
  cartas: string[] // ids de todas las cartas vistas esta partida
  flags: string[] // flags que se encendieron alguna vez esta partida
  // acumulado de SIEMPRE (localStorage):
  partidasJugadas: number
  finalesDistintos: number // cuantos endingId distintos se han visto en total
  mesesRecord: number // el mejor "meses" de cualquier partida (ya incluye esta)
  epitetosVistos: number // cuantos epitetos distintos se han sacado
}

export interface Logro {
  id: string
  nombre: string
  desc: string
  // Oculto: la descripcion no se ve hasta desbloquearlo (para no destripar
  // finales y tramas).
  oculto?: boolean
  check: (r: ResultadoPartida) => boolean
}

const K4: StatKey[] = ['medios', 'gobierno', 'calle', 'caja']

export const LOGROS: Logro[] = [
  // --- SUPERVIVENCIA (incremental) ---
  { id: 'sobrevive_12', nombre: 'Un ano en el cargo', desc: 'Aguanta 12 meses.', check: (r) => r.meses >= 12 },
  { id: 'sobrevive_24', nombre: 'Reincidente', desc: 'Aguanta 24 meses.', check: (r) => r.meses >= 24 },
  { id: 'sobrevive_36', nombre: 'Cuesta abajo', desc: 'Aguanta 36 meses.', check: (r) => r.meses >= 36 },
  { id: 'sobrevive_48', nombre: 'Legislatura completa', desc: 'Aguanta 48 meses: una legislatura entera.', check: (r) => r.meses >= 48 },
  { id: 'sobrevive_96', nombre: 'La reeleccion', desc: 'Aguanta 96 meses: dos legislaturas.', check: (r) => r.meses >= 96 },
  { id: 'sobrevive_140', nombre: 'Doce anos', desc: 'Aguanta 140 meses: casi tres legislaturas enteras.', check: (r) => r.meses >= 140 },

  // --- ESTADOS DE MORAL (los 11 epitetos) ---
  // Visibles a proposito: la lista ensena que existe un espectro moral (de
  // saqueador a santo), pero NO como se mueve. Al empezar no sabes cual te va
  // a tocar; el numero sigue oculto toda la partida.
  { id: 'moral_0', nombre: 'El Saqueador', desc: 'Termina como El Saqueador.', check: (r) => r.epitetoIndex === 0 },
  { id: 'moral_1', nombre: 'El Felon', desc: 'Termina como El Felon.', check: (r) => r.epitetoIndex === 1 },
  { id: 'moral_2', nombre: 'El Trincon', desc: 'Termina como El Trincon.', check: (r) => r.epitetoIndex === 2 },
  { id: 'moral_3', nombre: 'El Escurridizo', desc: 'Termina como El Escurridizo.', check: (r) => r.epitetoIndex === 3 },
  { id: 'moral_4', nombre: 'El Tibio', desc: 'Termina como El Tibio.', check: (r) => r.epitetoIndex === 4 },
  { id: 'moral_5', nombre: 'El Equidistante', desc: 'Termina como El Equidistante.', check: (r) => r.epitetoIndex === 5 },
  { id: 'moral_6', nombre: 'El Correcto', desc: 'Termina como El Correcto.', check: (r) => r.epitetoIndex === 6 },
  { id: 'moral_7', nombre: 'El Prudente', desc: 'Termina como El Prudente.', check: (r) => r.epitetoIndex === 7 },
  { id: 'moral_8', nombre: 'El Integro', desc: 'Termina como El Integro.', check: (r) => r.epitetoIndex === 8 },
  { id: 'moral_9', nombre: 'El Sabio', desc: 'Termina como El Sabio.', check: (r) => r.epitetoIndex === 9 },
  { id: 'moral_10', nombre: 'El Santo', desc: 'Termina como El Santo, con la moralidad perfecta.', check: (r) => r.epitetoIndex === 10 },
  { id: 'moral_todos', nombre: 'Todos los santos y todos los pecados', desc: 'Consigue los 11 epitetos a lo largo de tus partidas.', check: (r) => r.epitetosVistos >= 11 },

  // --- FINALES: por donde caes ---
  // Solo el desplome (barra a 0). Reventar por arriba es otro final: 'cae_techo'.
  { id: 'cae_medios', nombre: 'Muerto en portada', desc: 'Cae con la prensa por los suelos.', oculto: true, check: (r) => r.deathStat === 'medios' && r.stats.medios <= 0 },
  { id: 'cae_gobierno', nombre: 'Punalada por la espalda', desc: 'Cae porque tu propio Gobierno te suelta la mano.', oculto: true, check: (r) => r.deathStat === 'gobierno' && r.stats.gobierno <= 0 },
  { id: 'cae_calle', nombre: 'A la calle', desc: 'Cae con la gente en tu contra.', oculto: true, check: (r) => r.deathStat === 'calle' && r.stats.calle <= 0 },
  { id: 'cae_caja', nombre: 'Sin un duro', desc: 'Cae con la caja a cero.', oculto: true, check: (r) => r.deathStat === 'caja' && r.stats.caja <= 0 },
  { id: 'cae_techo', nombre: 'Demasiado de algo bueno', desc: 'Cae porque un contrapoder te elimina por haberte hecho fuerte de mas.', oculto: true, check: (r) => /_max_/.test(r.endingId) },
  { id: 'cae_mocion', nombre: 'Mocion de censura', desc: 'Te tumban en el Parlamento.', oculto: true, check: (r) => r.endingId === 'final_evento_mocion' },
  { id: 'cae_ruptura', nombre: 'Solo ante el peligro', desc: 'Se rompe la coalicion y te quedas sin nadie.', oculto: true, check: (r) => r.endingId === 'final_evento_ruptura' },
  { id: 'cae_registro', nombre: 'A las seis de la manana', desc: 'Coches en la puerta y una orden de registro.', oculto: true, check: (r) => r.endingId === 'final_evento_registro' },
  { id: 'cae_mes_1', nombre: 'Un suspiro', desc: 'Cae en el primer o segundo mes.', check: (r) => r.meses <= 2 && !r.gano },

  // --- FINALES: coleccionista ---
  { id: 'finales_5', nombre: 'Se acaba de mil maneras', desc: 'Ve 5 finales distintos.', check: (r) => r.finalesDistintos >= 5 },
  { id: 'finales_12', nombre: 'Museo de derrotas', desc: 'Ve 12 finales distintos.', check: (r) => r.finalesDistintos >= 12 },
  { id: 'finales_20', nombre: 'Lo has visto todo', desc: 'Ve 20 finales distintos.', check: (r) => r.finalesDistintos >= 20 },

  // --- ELECCIONES ---
  { id: 'gana_elecciones', nombre: 'Cuatro anos mas', desc: 'Gana unas elecciones y sigue gobernando.', check: (r) => r.gano },
  { id: 'gana_triunfo', nombre: 'Mayoria absoluta', desc: 'Llega a una noche electoral con los cuatro indicadores en verde.', oculto: true, check: (r) => r.endingId === 'elecciones_triunfo' },
  { id: 'leyenda', nombre: 'Nombre para una plaza', desc: 'Aguanta las tres legislaturas y retirate invicto.', oculto: true, check: (r) => r.endingId === 'elecciones_leyenda_final' },
  { id: 'aguanta_tres', nombre: 'Hasta el final', desc: 'Llega al final de la tercera legislatura, como sea.', check: (r) => r.aguantoLasTres },

  // --- TRAMAS ---
  { id: 'hermano_condena', nombre: 'Cosas de familia', desc: 'Deja que la trama de tu hermano llegue hasta el juicio.', oculto: true, check: (r) => r.flags.includes('hermano_juicio') },
  { id: 'guru_candidato', nombre: 'La izquierda partida', desc: 'El Guru monta su partido y se presenta contra ti.', oculto: true, check: (r) => r.flags.includes('guru_candidato') },
  { id: 'te_salvan', nombre: 'Una mano lava la otra', desc: 'Alguien a quien has hecho muchos favores aparece a salvarte de caer.', oculto: true, check: (r) => r.flags.includes('ya_te_salvaron') },
  { id: 'fiscal_debe', nombre: 'El fiscal amigo', desc: 'Acepta un favor del Fiscal.', oculto: true, check: (r) => r.flags.includes('magistrado_debe') || r.flags.includes('magistrado_colocado') },
  { id: 'bomba', nombre: 'Todo tiene consecuencias', desc: 'Enciende una bomba de relojeria y aguanta hasta que estalla.', oculto: true, check: (r) => r.cartas.some((c) => (c.startsWith('bomba_') && c !== 'bomba_sobre') || /_cobro_/.test(c) || /_vuelve$/.test(c)) },
  { id: 'vacaciones', nombre: 'Vacaciones tecnicas', desc: 'Coge las vacaciones de agosto.', oculto: true, check: (r) => r.cartas.includes('vacaciones_tecnicas') },

  // --- RAREZAS ---
  { id: 'equilibrio', nombre: 'Funambulista', desc: 'Cae con las cuatro barras a la vez entre 4 y 6. Ni frio ni calor.', oculto: true, check: (r) => !r.gano && K4.every((k) => r.stats[k] >= 4 && r.stats[k] <= 6) },
  { id: 'rechazas_rescate', nombre: 'Yo solo', desc: 'Rechaza un rescate y cae por tu cuenta.', oculto: true, check: (r) => r.cartas.some((c) => c.startsWith('rescate_') && !c.includes('cobro')) && !r.flags.includes('ya_te_salvaron') },

  // --- META ---
  { id: 'partidas_10', nombre: 'Enganchado', desc: 'Juega 10 partidas.', check: (r) => r.partidasJugadas >= 10 },
  { id: 'partidas_50', nombre: 'Esto ya es vicio', desc: 'Juega 50 partidas.', check: (r) => r.partidasJugadas >= 50 },
]

export const TOTAL_LOGROS = LOGROS.length
