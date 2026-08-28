import type { Card } from '../types'
import { contentCards } from './cards.content'

// Cartas de "final de partida" (mecánica de final de partida tipo Reigns).
// Van aparte de cards.content.ts porque llevan código (la función
// `condition`, que decide si el final aplica), no solo texto. Si solo
// quieres añadir/editar contenido normal, no hace falta que toques esto:
// edita src/data/cards.content.ts.
//
// Cada final "de stat" (tocar fondo o techo en medios/partido/votantes/caja)
// tiene 3 variantes según la MORALIDAD acumulada durante la partida (oculta,
// 0-10, ver GameState.moralidad y CardChoice.moralidad):
//   - alta (7-10): intentó jugar limpio, o al menos no fue el más corrupto.
//   - media (4-6): un político normal, ni héroe ni villano.
//   - baja (0-3): corrupción con todas las letras.
// No es aleatorio como antes — combina "qué se rompió" (la stat) con "cómo
// se llegó hasta ahí" (la moralidad), así que la misma stat a 0 puede leerse
// como tragedia o como justicia poética según cómo se haya jugado.
const endingCards: Card[] = [
  // MEDIOS a 0 — la prensa le ha destrozado
  {
    id: 'final_medios_alta',
    phase: 4,
    character: 'Portada de mañana',
    text: 'La prensa ha destapado todo. Lo curioso es que, esta vez, no había gran cosa que destapar — pero un titular manso no vende igual que uno con sangre.',
    left: { text: 'Dar la cara con la verdad', effects: {}, epilogueText: 'Sale a explicarlo todo, sin trampa ni cartón. No le sirve de nada: para entonces ya nadie escucha explicaciones. Fin del gobierno, el más injusto de todos.' },
    right: { text: 'Dimitir sin dar más guerra', effects: {}, epilogueText: 'Se va tal y como llegó: sin un escándalo real a sus espaldas. La historia lo recordará mal de todos modos. Fin del gobierno, con la conciencia tranquila y el resto en contra.' },
    isEnding: true,
    condition: (s, m) => s.medios <= 0 && m >= 7,
  },
  {
    id: 'final_medios_media',
    phase: 4,
    character: 'El Consejo Editorial',
    text: 'Hasta el medio más afín que le quedaba ha dejado de defenderle. Ni sus aciertos ni sus deslices han bastado para inclinar la balanza en ningún sentido. La portada de mañana ya está cerrada, y no es buena.',
    left: { text: 'Rueda de prensa desesperada', effects: {}, epilogueText: 'Le hacen la pregunta que llevaban años sin atreverse. Fin del gobierno, en directo y con audiencia récord.' },
    right: { text: 'No dar más declaraciones', effects: {}, epilogueText: 'Su silencio se convierte en el meme del año. Fin del gobierno, sin decir una palabra.' },
    isEnding: true,
    condition: (s, m) => s.medios <= 0 && m >= 4 && m <= 6,
  },
  {
    id: 'final_medios_baja',
    phase: 4,
    character: 'La Redacción',
    text: 'Se ha filtrado el documento definitivo: años de trapicheos, uno detrás de otro, todos con su firma al pie. Ni el mejor community manager del país le salva ya de esta.',
    left: { text: 'Publicar la verdad completa', effects: {}, epilogueText: 'Se queda sin apoyos, pero al menos sin más secretos que esconder — los pocos que le quedaban. Fin del gobierno, tarde mejor que nunca.' },
    right: { text: 'Culpar a "una campaña orquestada"', effects: {}, epilogueText: 'Hasta su hermano, que llevaba años cobrando de más, deja de compartirlo en el grupo de WhatsApp. Fin del gobierno.' },
    isEnding: true,
    condition: (s, m) => s.medios <= 0 && m <= 3,
  },

  // PARTIDO a 0 — el aparato le echa
  {
    id: 'final_partido_alta',
    phase: 4,
    character: 'El Comité Ejecutivo',
    text: 'El partido ya no le sostiene. Han convocado una moción interna sin avisarle del todo — dicen que "ya no representa los valores del partido". La ironía no se le escapa a nadie más que a ellos.',
    left: { text: 'Presentar batalla en el Parlamento', effects: {}, epilogueText: 'Pierde 400 votos a 3. Los 3 eran los suyos, y los únicos que no le debían nada a nadie. Fin del gobierno.' },
    right: { text: 'Dimitir con dignidad (o lo que quede)', effects: {}, epilogueText: 'Se retira a dar conferencias sobre ética institucional por 30.000€ la charla. La ironía tampoco se le escapa a usted. Fin del gobierno, con PowerPoint incluido.' },
    isEnding: true,
    condition: (s, m) => s.gobierno <= 0 && m >= 7,
  },
  {
    id: 'final_partido_media',
    phase: 4,
    character: 'Los Barones Territoriales',
    text: 'Los barones se han reunido sin usted, en un reservado, con jamón y sin agenda oficial. La decisión ya está tomada.',
    left: { text: 'Aceptar la salida pactada', effects: {}, epilogueText: 'Le sustituyen por alguien "de consenso" que nadie recuerda haber votado. Fin del gobierno.' },
    right: { text: 'Negarse a irse del cargo', effects: {}, epilogueText: 'El partido se parte en dos, cada mitad con un logo casi idéntico. Fin del gobierno, con abogados de por medio.' },
    isEnding: true,
    condition: (s, m) => s.gobierno <= 0 && m >= 4 && m <= 6,
  },
  {
    id: 'final_partido_baja',
    phase: 4,
    character: 'La Militancia',
    text: 'En cada asamblea local piden su cabeza — con razón, esta vez. Hasta en la del pueblo de su suegro, que ya no le coge el teléfono.',
    left: { text: 'Convocar primarias internas', effects: {}, epilogueText: 'Pierde por goleada frente a alguien que hace un mes nadie conocía. Fin del gobierno.' },
    right: { text: 'Cancelar las primarias por "unidad"', effects: {}, epilogueText: 'La militancia se lo toma como el último insulto, después de tantos otros. Fin del gobierno, con carteles quemados de fondo.' },
    isEnding: true,
    condition: (s, m) => s.gobierno <= 0 && m <= 3,
  },

  // VOTANTES a 0 — la calle le da la espalda
  {
    id: 'final_votantes_alta',
    phase: 4,
    character: 'Noche electoral',
    text: 'Los resultados son un baño de sangre. Ni las medidas buenas ni la mano tendida han servido de nada: la gente ha votado con la cartera, no con la memoria. El escaño número uno ya no lleva su nombre.',
    left: { text: 'Aceptar el resultado', effects: {}, epilogueText: 'Se acabó. La oposición jura que ellos serán distintos (no lo serán). Al menos usted se va sabiendo que lo intentó de verdad.' },
    right: { text: 'Impugnar el proceso', effects: {}, epilogueText: 'Nadie le cree, ni siquiera su propio abogado, y menos después de una legislatura tan limpia. Fin del gobierno, con extra de ridículo.' },
    isEnding: true,
    condition: (s, m) => s.calle <= 0 && m >= 7,
  },
  {
    id: 'final_votantes_media',
    phase: 4,
    character: 'El Sondeo a Pie de Urna',
    text: 'El sondeo a pie de urna es tan malo que nadie del partido quiere salir en la foto de esta noche.',
    left: { text: 'Salir usted mismo a dar la cara', effects: {}, epilogueText: 'Asume la derrota en directo, con la voz temblando solo un poco. Fin del gobierno, con cierto respeto.' },
    right: { text: 'Mandar a un portavoz secundario', effects: {}, epilogueText: 'Se le acusa de esconderse hasta en su propio funeral político. Fin del gobierno.' },
    isEnding: true,
    condition: (s, m) => s.calle <= 0 && m >= 4 && m <= 6,
  },
  {
    id: 'final_votantes_baja',
    phase: 4,
    character: 'La Calle',
    text: 'Las manifestaciones frente a la sede llevan semanas sin parar, y esta vez llevan pruebas, no solo pancartas. Hasta los que le votaron llevan una.',
    left: { text: 'Convocar elecciones anticipadas', effects: {}, epilogueText: 'Pierde igualmente, pero al menos elige la fecha del funeral. Fin del gobierno.' },
    right: { text: 'Agotar la legislatura hasta el final', effects: {}, epilogueText: 'Le echan en las urnas de todos modos, solo que más tarde y más enfadados. Fin del gobierno.' },
    isEnding: true,
    condition: (s, m) => s.calle <= 0 && m <= 3,
  },

  // CAJA a 0 — el partido se queda sin un euro
  {
    id: 'final_caja_alta',
    phase: 4,
    character: 'El Interventor',
    text: 'Las cuentas del partido están intervenidas. Todas esas comisiones que rechazó por principios habrían dado para pagar la luz de la sede unos cuantos años más.',
    left: { text: 'Pedir un préstamo a un banco "amigo"', effects: {}, epilogueText: 'Por primera vez en su carrera, "amigo" significa amigo de verdad, y el banco no pasa factura política después. Rareza total. Fin del gobierno, casi limpio.' },
    right: { text: 'Cerrar la sede central', effects: {}, epilogueText: 'El partido se disuelve por pura falta de fondos, sin trampa detrás. Ni siquiera queda una caja B que repartirse. Fin del gobierno, insólitamente honesto.' },
    isEnding: true,
    condition: (s, m) => s.caja <= 0 && m >= 7,
  },
  {
    id: 'final_caja_media',
    phase: 4,
    character: 'El Ministro Caído',
    text: 'No queda ni para las nóminas. Los proveedores llevan meses sin cobrar y ya le han bloqueado en el móvil.',
    left: { text: 'Recorte drástico de gastos', effects: {}, epilogueText: 'El partido sobrevive, reducido a un local y una cafetera. Fin del gobierno, con austeridad de verdad por una vez.' },
    right: { text: 'Buscar financiación venga de donde venga', effects: {}, epilogueText: 'La procedencia del dinero se convierte en la pregunta favorita de todos los jueces del país. Fin del gobierno.' },
    isEnding: true,
    condition: (s, m) => s.caja <= 0 && m >= 4 && m <= 6,
  },
  {
    id: 'final_caja_baja',
    phase: 4,
    character: 'La Agencia Tributaria',
    text: 'Hacienda ha embargado las cuentas mientras dura la instrucción — la de la caja B que llevaba años funcionando como un cajero automático particular. Ya ni para imprimir un cartel de campaña.',
    left: { text: 'Aceptar el embargo y colaborar', effects: {}, epilogueText: 'El partido queda bajo administración judicial, como una empresa cualquiera en concurso. Fin del gobierno.' },
    right: { text: 'Recurrir el embargo por todas las vías', effects: {}, epilogueText: 'Gana tiempo, pero pierde toda la campaña por el camino. Fin del gobierno, con las costas a su cargo.' },
    isEnding: true,
    condition: (s, m) => s.caja <= 0 && m <= 3,
  },

  // TECHO — como en el Reigns original, tener una stat DEMASIADO alta (10)
  // también acaba mal, no solo tocar fondo. Mismo esquema de 3 variantes por
  // moralidad que los finales de fondo, de arriba.
  {
    id: 'final_medios_max_alta',
    phase: 4,
    character: 'El Editor Jefe',
    text: 'Ya no queda un solo medio que le haga una pregunta incómoda. No porque los hayan comprado ni amenazado: simplemente, no encuentran nada que preguntar. Eso, en política, también da miedo.',
    left: { text: 'Provocar el debate usted mismo', effects: {}, epilogueText: 'Organiza ruedas de prensa solo para que le hagan preguntas difíciles. Casi nadie se las cree del todo, pero se agradece el esfuerzo. Fin del gobierno, con final feliz relativo.' },
    right: { text: 'Disfrutar del silencio', effects: {}, epilogueText: 'La ausencia total de crítica se vuelve, con los años, indistinguible de la censura, aunque nadie recuerde quién la empezó. Fin del gobierno.' },
    isEnding: true,
    condition: (s, m) => s.medios >= 10 && m >= 7,
  },
  {
    id: 'final_medios_max_media',
    phase: 4,
    character: 'El Editor Jefe',
    text: 'Ya no queda un medio que le lleve la contraria. Unos por conveniencia, otros por cansancio, la mayoría porque total, para qué. El resultado es el mismo silencio, venga de donde venga.',
    left: { text: 'Premiar a los que aún preguntan', effects: {}, epilogueText: 'Un par de periodistas vuelven a hacer su trabajo, más por sorpresa que por convicción. Fin del gobierno, con la prensa a medio despertar.' },
    right: { text: 'Dejarlo correr', effects: {}, epilogueText: 'El silencio se instala del todo, sin que nadie tenga que forzar nada. A veces ni hace falta un Ministerio de la Verdad. Fin del gobierno.' },
    isEnding: true,
    condition: (s, m) => s.medios >= 10 && m >= 4 && m <= 6,
  },
  {
    id: 'final_medios_max_baja',
    phase: 4,
    character: 'El Editor Jefe',
    text: 'Ya no queda un solo medio que se atreva a preguntarle nada. El silencio informativo es tan absoluto que hasta sus propios votantes empiezan a mosquearse.',
    left: { text: 'Abrir la mano un poco', effects: {}, epilogueText: 'Vuelven las preguntas incómodas, y con ellas, algo parecido a la democracia. Fin del gobierno, con final feliz relativo.' },
    right: { text: 'Apretar aún más el control', effects: {}, epilogueText: 'Su propio "Ministerio de la Verdad" se convierte en la noticia del año, y encima gana un premio internacional a la libertad de prensa que ya no existe. Fin del gobierno.' },
    isEnding: true,
    condition: (s, m) => s.medios >= 10 && m <= 3,
  },
  {
    id: 'final_partido_max_alta',
    phase: 4,
    character: 'El Aparato',
    text: 'El partido entero le sigue, no por miedo, sino porque de verdad cree en usted. Han dejado de discutir sus decisiones simplemente porque llevan años acertando. Da vértigo de todos modos.',
    left: { text: 'Pedir que le lleven la contraria', effects: {}, epilogueText: 'Cuesta encontrar voces discrepantes de verdad, pero al final aparece alguna. Fin del gobierno, con algo de contrapeso salvado a tiempo.' },
    right: { text: 'Dejar que siga el consenso', effects: {}, epilogueText: 'Un partido que solo dice que sí, aunque sea de corazón, deja de ser un partido. Fin del gobierno, querido hasta el final por gente que ya no le cuestiona nada.' },
    isEnding: true,
    condition: (s, m) => s.gobierno >= 10 && m >= 7,
  },
  {
    id: 'final_partido_max_media',
    phase: 4,
    character: 'El Aparato',
    text: 'El partido ya no delibera nada, solo aplaude. Hace tiempo que nadie le lleva la contraria en una reunión, y eso, en política, nunca es buena señal.',
    left: { text: 'Abrir el debate interno', effects: {}, epilogueText: 'Las primeras voces discrepantes le acaban comiendo el puesto en menos de un mes. Fin del gobierno.' },
    right: { text: 'Que siga el aplauso', effects: {}, epilogueText: 'El día que se acaba la fiesta, cae usted y cae el partido entero con usted, aplaudiendo hasta el final. Fin del gobierno.' },
    isEnding: true,
    condition: (s, m) => s.gobierno >= 10 && m >= 4 && m <= 6,
  },
  {
    id: 'final_partido_max_baja',
    phase: 4,
    character: 'El Aparato',
    text: 'El partido le obedece sin rechistar. Ayudó que los últimos tres que rechistaron ya no están en el partido, ni, según se cuenta, muy activos en ningún otro sitio.',
    left: { text: 'Aflojar la mano, por si acaso', effects: {}, epilogueText: 'Las primeras voces discrepantes, ahora que se atreven a hablar, no se andan con contemplaciones. Fin del gobierno, rápido y sin margen para el relato.' },
    right: { text: 'Apretar todavía más', effects: {}, epilogueText: 'El miedo sostiene el aparato hasta que deja de hacerlo, de golpe, como pasa siempre. Fin del gobierno, con final poco digno.' },
    isEnding: true,
    condition: (s, m) => s.gobierno >= 10 && m <= 3,
  },
  {
    id: 'final_votantes_max_alta',
    phase: 4,
    character: 'El Politólogo',
    text: 'Su popularidad no es un espejismo: ha gobernado bien y la gente lo sabe. Le llaman "el líder", a secas, y por una vez el apodo se lo ha ganado a pulso limpio.',
    left: { text: 'Bajar el perfil, por si acaso', effects: {}, epilogueText: 'Recupera algo de normalidad democrática, con gran alivio de los politólogos, aunque en el fondo todos saben que se lo merecía. Fin de un gobierno que rozó el culto a la personalidad, por las razones correctas.' },
    right: { text: 'Disfrutar del pedestal', effects: {}, epilogueText: 'Cuando por fin cae, cae de muy arriba, con eco en los libros de historia y sin un solo escándalo que lo manche. Fin del gobierno, de los que hacen doctorado por las razones buenas.' },
    isEnding: true,
    condition: (s, m) => s.calle >= 10 && m >= 7,
  },
  {
    id: 'final_votantes_max_media',
    phase: 4,
    character: 'El Politólogo',
    text: 'Su popularidad roza lo religioso. Ya le llaman "el líder", a secas, sin apellidos, y hay tesis doctorales enteras preocupadas por usted.',
    left: { text: 'Bajar el perfil, por si acaso', effects: {}, epilogueText: 'Recupera algo de normalidad democrática, con gran alivio de los politólogos. Fin de un gobierno que rozó el culto a la personalidad.' },
    right: { text: 'Disfrutar del pedestal', effects: {}, epilogueText: 'Cuando por fin cae, cae de muy arriba y con eco en los libros de historia. Fin del gobierno, de los que hacen doctorado.' },
    isEnding: true,
    condition: (s, m) => s.calle >= 10 && m >= 4 && m <= 6,
  },
  {
    id: 'final_votantes_max_baja',
    phase: 4,
    character: 'El Politólogo',
    text: 'Su popularidad es enorme, y también, en buena parte, de fabricación propia: encuestas cocinadas, bots, medios afines. Da igual: en las calles le aclaman como a un mesías.',
    left: { text: 'Confesar el tinglado', effects: {}, epilogueText: 'El culto se desinfla en cuanto se sabe la verdad, pero al menos queda algo parecido a la honestidad. Fin del gobierno, con la fantasía rota a tiempo.' },
    right: { text: 'Dejar que la fe siga creciendo', effects: {}, epilogueText: 'Cuando alguien finalmente destapa el montaje, la caída es proporcional a la mentira. Fin del gobierno, de los que también hacen doctorado, pero en la facultad de Periodismo, apartado "manipulación".' },
    isEnding: true,
    condition: (s, m) => s.calle >= 10 && m <= 3,
  },
  {
    id: 'final_caja_max_alta',
    phase: 4,
    character: 'El Perito Judicial',
    text: 'La caja B ha crecido tanto que ni sus propios contables saben ya justificarla. Casi todo, revisando bien los números, ha ido a parar a "amigos" con problemas: una boda, una operación, una entrada de piso.',
    left: { text: 'Confesarlo antes de que estalle', effects: {}, epilogueText: 'El escándalo igualmente estalla, pero al menos lo cuenta usted primero, y con los nombres cambiados. Fin del gobierno, con matices y con la conciencia razonablemente tranquila.' },
    right: { text: 'Seguir escondiéndolo', effects: {}, epilogueText: 'Solo quería lo mejor para sus amigos. Quizás siete yates eran demasiado. Fin del gobierno, con capítulo propio en la carrera de Económicas, apartado "de buena fe".' },
    isEnding: true,
    condition: (s, m) => s.caja >= 10 && m >= 7,
  },
  {
    id: 'final_caja_max_media',
    phase: 4,
    character: 'El Perito Judicial',
    text: 'La caja B ha crecido tanto que ni sus propios contables saben ya justificarla. Los números son tan absurdos que se han vuelto imposibles de esconder.',
    left: { text: 'Confesarlo antes de que estalle', effects: {}, epilogueText: 'El escándalo igualmente estalla, pero al menos lo cuenta usted primero. Fin del gobierno, con matices.' },
    right: { text: 'Seguir escondiéndolo', effects: {}, epilogueText: 'Se convierte en el mayor caso de corrupción de la historia reciente, con capítulo propio en la carrera de Económicas. Fin del gobierno.' },
    isEnding: true,
    condition: (s, m) => s.caja >= 10 && m >= 4 && m <= 6,
  },
  {
    id: 'final_caja_max_baja',
    phase: 4,
    character: 'El Perito Judicial',
    text: 'La caja B ha crecido tanto que hasta usted ha perdido la cuenta. No hubo "amigos" ni "causas": fue avaricia, sin más adornos, durante años.',
    left: { text: 'Confesarlo antes de que estalle', effects: {}, epilogueText: 'Confiesa solo cuando ya no le queda ninguna otra salida. Nadie se traga el arrepentimiento. Fin del gobierno, tarde y sin gracia.' },
    right: { text: 'Seguir escondiéndolo', effects: {}, epilogueText: 'Se convierte en el mayor caso de corrupción de la historia reciente, sin una sola excusa presentable. Fin del gobierno, el más caro de todos.' },
    isEnding: true,
    condition: (s, m) => s.caja >= 10 && m <= 3,
  },

]

// ============================================================================
// ELECCIONES — el hito de la partida, cada 4 años de gobierno.
// ============================================================================
// Antes se podía "ganar" por accidente: bastaba con sobrevivir mucho tiempo y
// que en algún momento las 4 stats pasaran de 6 a la vez. En simulación, un
// bot que solo buscaba el centro ganaba el 90% de las partidas jugando 200
// turnos. Ahora la victoria es un hito de verdad: al llegar el turno tocan
// elecciones sí o sí, y el resultado depende de cómo llegues.
//
// useGameStore fuerza una de estas cartas cuando `turn % ELECTION_INTERVAL`
// es 0 (ver pickNextCard). Nunca salen por sorteo normal.
export const ELECTION_INTERVAL = 48 // 1 turno = 1 mes, así que 48 = 4 años
export const ELECTION_MAX_TERMS = 3 // a la tercera convocatoria, se acaba

const electionCards: Card[] = [
  // --- DERROTA: llegas con algo hundido ---
  {
    id: 'elecciones_derrota',
    phase: 4,
    isElection: true,
    character: 'Noche electoral',
    characterImage: 'nocheelectoral.svg',
    text: 'Cuatro años. Llega la noche electoral con el peor dato posible en la mano y el escrutinio no deja lugar a dudas: se acabó. En la sede ya han quitado la foto grande del vestíbulo.',
    left: {
      text: 'Salir a felicitar al ganador',
      effects: {},
      epilogueText: 'Sale con una sonrisa que no engaña a nadie y felicita al ganador en directo. Se le recordará más por esa cara que por la legislatura entera. Fin del gobierno.',
    },
    right: {
      text: 'Encerrarse y no salir',
      effects: {},
      epilogueText: 'No sale a comparecer. La silla vacía en la sala de prensa es la última imagen de su gobierno, y da la vuelta al mundo. Fin del gobierno.',
    },
    condition: (s) => s.medios <= 2 || s.gobierno <= 2 || s.calle <= 2 || s.caja <= 2,
  },
  // --- TRIUNFO: llegas fuerte en todo ---
  {
    id: 'elecciones_triunfo',
    phase: 4,
    isElection: true,
    character: 'Noche electoral',
    characterImage: 'nocheelectoral.svg',
    text: 'Cuatro años completos y llega usted con los cuatro indicadores en verde. Es tan raro que hasta los suyos desconfían. Los resultados: mayoría, y de las cómodas.',
    left: {
      text: 'Repetir mandato y apretar el acelerador',
      effects: { medios: -1, gobierno: 1 },
      epilogueText: 'Gana con mayoría y encara otra legislatura entera. Muy pocos llegan hasta aquí de una pieza. Fin del gobierno, en lo más alto y por la puerta grande.',
    },
    right: {
      text: 'Retirarse invicto, por una vez',
      effects: {},
      epilogueText: 'Se va ganando, que en este oficio no lo hace nadie. Los libros de historia le tratarán mejor que sus propios compañeros de partido. Fin del gobierno.',
    },
    // 3 de las 4 en verde y ninguna floja: exigente, pero alcanzable si se
    // juega bien. Con las 4 a 7 la victoria salía en el 0,5% de partidas.
    condition: (s) => {
      const v = [s.medios, s.gobierno, s.calle, s.caja]
      return v.filter((n) => n >= 7).length >= 3 && v.every((n) => n >= 6)
    },
  },
  // --- APRETADA: el caso normal, sigues gobernando ---
  {
    id: 'elecciones_apretada',
    phase: 4,
    isElection: true,
    character: 'Noche electoral',
    characterImage: 'nocheelectoral.svg',
    text: 'Cuatro años. Toca renovar. El recuento va tan justo que a las tres de la mañana nadie se atreve a salir al balcón. Al final: se queda, pero por los pelos y debiendo favores.',
    left: {
      text: 'Pactar con quien haga falta para seguir',
      effects: { gobierno: 1, medios: -1, calle: -1 },
    },
    right: {
      text: 'Gobernar en minoría y sufrir cada votación',
      effects: { medios: 1, gobierno: -1 },
    },
  },
  {
    id: 'elecciones_repeticion',
    phase: 4,
    isElection: true,
    character: 'Noche electoral',
    characterImage: 'nocheelectoral.svg',
    text: 'Cuatro años y ni usted ni nadie suma para gobernar. Toca repetir elecciones, con el país entero poniendo los ojos en blanco y una campaña más que pagar.',
    left: {
      text: 'Repetir campaña a lo grande',
      effects: { caja: -2, calle: 1 },
    },
    right: {
      text: 'Campaña austera, casi de tapadillo',
      effects: { caja: 1, calle: -1, medios: -1 },
    },
    condition: (s) => s.gobierno <= 5,
  },

  {
    id: 'elecciones_sorpresa',
    phase: 4,
    isElection: true,
    character: 'Noche electoral',
    characterImage: 'nocheelectoral.svg',
    text: 'Cuatro años. Todas las encuestas le daban fuera y a las once de la noche resulta que sigue dentro. El encuestador ha apagado el móvil. Usted tampoco se lo cree.',
    left: {
      text: 'Salir al balcón a celebrarlo',
      effects: { calle: 1, medios: -1 },
    },
    right: {
      text: 'Salir muy serio, como si lo esperara',
      effects: { medios: 1 },
    },
    condition: (s) => s.calle <= 4,
  },
  {
    id: 'elecciones_abstencion',
    phase: 4,
    isElection: true,
    character: 'Noche electoral',
    characterImage: 'nocheelectoral.svg',
    text: 'Cuatro años. Gana usted, sí, pero con la abstención más alta que se recuerda: han votado menos de la mitad. Nadie sabe muy bien qué celebrar esta noche.',
    left: {
      text: 'Prometer "escuchar a los que no votaron"',
      effects: { medios: 1, calle: 1, gobierno: -1 },
    },
    right: {
      text: 'Una victoria es una victoria',
      effects: { gobierno: 1, calle: -1 },
    },
    condition: (s) => s.medios <= 5,
  },

  // --- ÚLTIMA CONVOCATORIA (ELECTION_MAX_TERMS): aquí se acaba siempre ---
  {
    id: 'elecciones_quemado_final',
    phase: 4,
    isElection: true,
    isEnding: true,
    character: 'Noche electoral',
    characterImage: 'nocheelectoral.svg',
    text: 'Doce años. Le quedan un partido agotado, una oposición que ya ni le ataca porque no hace falta, y una legislatura más que nadie, ni usted, tiene ganas de empezar.',
    left: {
      text: 'Presentarse igualmente y perder',
      effects: {},
      epilogueText: 'Se presenta por costumbre y pierde por goleada. Doce años se acaban en una sala de prensa medio vacía, con dos cámaras y un becario. Fin del gobierno.',
    },
    right: {
      text: 'Dimitir la noche antes de la campaña',
      effects: {},
      epilogueText: 'Dimite la víspera de la campaña y deja al partido vendido. Dicen que fue lo más honesto que hizo en doce años, y probablemente sea verdad. Fin del gobierno.',
    },
    condition: (s) => s.gobierno <= 4 || s.medios <= 4,
  },
  {
    id: 'elecciones_retirada_final',
    phase: 4,
    isElection: true,
    isEnding: true,
    character: 'Noche electoral',
    characterImage: 'nocheelectoral.svg',
    text: 'Doce años en el cargo. Ya no hay legislatura que renovar: ni el partido, ni la ley, ni su propia espalda dan para otra. Esta noche se decide solo cómo quiere que se cuente.',
    left: {
      text: 'Anunciar la retirada en directo',
      effects: {},
      epilogueText: 'Anuncia la retirada él mismo, con la sala en pie. Doce años dan para muchos titulares, y usted se va eligiendo el último. Fin del gobierno, con final elegido.',
    },
    right: {
      text: 'Dejar que le echen las urnas',
      effects: {},
      epilogueText: 'Se presenta una vez más y las urnas hacen el trabajo. Doce años se acaban en una noche y en un balcón sin gente. Fin del gobierno.',
    },
  },
  {
    id: 'elecciones_leyenda_final',
    phase: 4,
    isElection: true,
    isEnding: true,
    character: 'Noche electoral',
    characterImage: 'nocheelectoral.svg',
    text: 'Doce años y sigue con los cuatro indicadores altos. A estas alturas ya no le discute nadie: es usted el sistema. Y eso, en política, es la señal para irse.',
    left: {
      text: 'Irse convertido en estatua',
      effects: {},
      epilogueText: 'Se retira invicto tras doce años. Le ponen su nombre a una plaza y a un instituto. Nadie recuerda ya cómo empezó todo, y a usted le viene muy bien. Fin del gobierno, en leyenda.',
    },
    right: {
      text: 'Dejar sucesor y mover los hilos desde fuera',
      effects: {},
      epilogueText: 'Coloca a un sucesor de su cuerda y se va a un consejo de administración a seguir mandando sin salir en la foto. Fin del gobierno, solo sobre el papel.',
    },
    condition: (s) => s.medios >= 6 && s.gobierno >= 6 && s.calle >= 6 && s.caja >= 6,
  },
]

export const cards: Card[] = [...contentCards, ...endingCards, ...electionCards]

export const STAT_MAX = 10
export const STAT_START = 5
