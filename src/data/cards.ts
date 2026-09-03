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
    character: 'El Consejo de Administración',
    text: 'No queda un solo medio que le haga una pregunta incómoda, y no porque los haya comprado: es que no encuentran nada. Los que ponen el dinero en esas redacciones tampoco encuentran nada, y eso les inquieta más todavía.',
    left: { text: 'Salir a que le pregunten de verdad', effects: {}, epilogueText: 'Se somete a preguntas incómodas de verdad y aguanta el tipo. Los consejos editoriales deciden que un presidente que responde es más útil que uno intocable. Fin del gobierno, cuando ya no hacía falta ninguno.' },
    right: { text: 'Dejar que nadie pregunte', effects: {}, epilogueText: 'A un presidente al que nadie vigila solo le queda un poder encima: el que firma las nóminas de las redacciones. Un martes deciden que ya no interesa, y el silencio que le protegía se lo traga. Fin del gobierno, sin un solo titular en contra.' },
    isEnding: true,
    condition: (s, m) => s.medios >= 10 && m >= 7,
  },
  {
    id: 'final_medios_max_media',
    phase: 4,
    character: 'El Consejo de Administración',
    text: 'Ningún medio le lleva la contraria: unos por conveniencia, otros por cansancio. Y con la prensa apagada, quien decide qué se cuenta ya no es un director de periódico: es un consejo de administración al que usted no le debe nada. Todavía.',
    left: { text: 'Devolverle el trabajo a los que preguntan', effects: {}, epilogueText: 'Un par de redacciones recuperan el pulso y le hacen la vida imposible, que es exactamente su oficio. Fin del gobierno, con la prensa a medio despertar y usted en la calle.' },
    right: { text: 'Dejar que siga el silencio', effects: {}, epilogueText: 'El día que a los dueños les conviene otro presidente, no hace falta ni una portada en contra: basta con dejar de escribir a favor. Se cae en dos semanas y sin ruido. Fin del gobierno.' },
    isEnding: true,
    condition: (s, m) => s.medios >= 10 && m >= 4 && m <= 6,
  },
  {
    id: 'final_medios_max_baja',
    phase: 4,
    character: 'El Consejo de Administración',
    text: 'Nadie se atreve a preguntarle nada, y le ha costado lo suyo: subvenciones, favores y algún despido sugerido con mucha educación. El problema de comprar el silencio es que el silencio tiene dueño, y no es usted.',
    left: { text: 'Soltar el control de la prensa', effects: {}, epilogueText: 'Vuelven las preguntas incómodas y con ellas la factura de todo lo anterior, que era enorme. Fin del gobierno, pero al menos alguien volvió a preguntar.' },
    right: { text: 'Apretar todavía más', effects: {}, epilogueText: 'Los mismos que callaban por dinero hablan cuando alguien paga más. Y alguien siempre paga más. Fin del gobierno, hundido por la prensa que usted mismo había comprado.' },
    isEnding: true,
    condition: (s, m) => s.medios >= 10 && m <= 3,
  },
  {
    id: 'final_partido_max_alta',
    phase: 4,
    character: 'La Calle',
    text: 'Controla el Gobierno entero y nadie discute una coma. El problema es que cuando dentro no discrepa nadie, el descontento de fuera no tiene por dónde entrar: se queda en la calle, dando vueltas, buscando puerta.',
    left: { text: 'Abrir el debate antes de que sea tarde', effects: {}, epilogueText: 'Las primeras voces discrepantes le comen el puesto en un mes, pero le devuelven al país algo parecido a una conversación. Fin del gobierno, con el contrapeso salvado a tiempo.' },
    right: { text: 'Seguir sin que nadie discuta nada', effects: {}, epilogueText: 'Un Gobierno donde nadie lleva la contraria deja de oír al país entero. Cuando la plaza se llena, ya no hay dentro quien sepa traducir lo que pide. Fin del gobierno, sin un solo enemigo interno y con todos fuera.' },
    isEnding: true,
    condition: (s, m) => s.gobierno >= 10 && m >= 7,
  },
  {
    id: 'final_partido_max_media',
    phase: 4,
    character: 'La Calle',
    text: 'En las reuniones ya nadie delibera: se aplaude y se levanta la sesión. Fuera, en cambio, hay gente que lleva meses queriendo decirle algo y no encuentra a nadie dentro que se lo transmita.',
    left: { text: 'Recuperar la discrepancia interna', effects: {}, epilogueText: 'El primero que se atreve a discrepar le disputa el puesto y se lo gana. Fin del gobierno, devorado por el debate que usted mismo reabrió.' },
    right: { text: 'Que siga el aplauso', effects: {}, epilogueText: 'Sin válvula dentro, la presión sale por donde puede. Y sale toda a la vez, un sábado por la mañana, en todas las plazas. Fin del gobierno, aplaudido hasta el último minuto por quienes ya no mandaban nada.' },
    isEnding: true,
    condition: (s, m) => s.gobierno >= 10 && m >= 4 && m <= 6,
  },
  {
    id: 'final_partido_max_baja',
    phase: 4,
    character: 'La Calle',
    text: 'Le obedecen sin rechistar, y ayuda que los últimos tres que rechistaron ya no estén. Ha construido un Gobierno sin una sola grieta, que es exactamente lo que necesita la calle para decidir que la grieta la abre ella.',
    left: { text: 'Aflojar la mano, por si acaso', effects: {}, epilogueText: 'En cuanto se atreven a hablar, los suyos no se andan con contemplaciones: llevaban años tomando notas. Fin del gobierno, rápido y sin margen para el relato.' },
    right: { text: 'Apretar todavía más', effects: {}, epilogueText: 'El día que la calle se cansa no hay nadie dentro dispuesto a avisarle, porque los que avisaban ya no están. Se entera por la ventana. Fin del gobierno, con final poco digno.' },
    isEnding: true,
    condition: (s, m) => s.gobierno >= 10 && m <= 3,
  },
  {
    id: 'final_votantes_max_alta',
    phase: 4,
    character: 'El Comité Ejecutivo',
    text: 'La gente le quiere de verdad, y se lo ha ganado gobernando bien. Le llaman "el líder", a secas. En el comité del partido eso no se celebra: se mide. Un presidente más grande que sus siglas es un presidente al que ya no pueden decirle que no.',
    left: { text: 'Bajar el perfil y devolverle el foco al partido', effects: {}, epilogueText: 'Se aparta un paso, deja que el partido respire y le dejan terminar. Le sustituyen igual, pero eligiendo él el momento. Fin de un gobierno querido, y por una vez sin puñaladas.' },
    right: { text: 'Seguir siendo más grande que el partido', effects: {}, epilogueText: 'Le querían tanto que se convirtió en un peligro para los suyos. El comité prefiere perder unas elecciones con alguien manejable a ganarlas con alguien que no les debe nada. Le descabalgan en una reunión de tres horas, y fuera nadie entiende nada. Fin del gobierno, por exceso de cariño.' },
    isEnding: true,
    condition: (s, m) => s.calle >= 10 && m >= 7,
  },
  {
    id: 'final_votantes_max_media',
    phase: 4,
    character: 'El Comité Ejecutivo',
    text: 'Su popularidad roza lo religioso: le paran por la calle, le abrazan, le piden fotos. En el partido llevan meses haciendo cuentas y les sale siempre lo mismo: sin usted no son nada, y con usted tampoco son nada.',
    left: { text: 'Repartir el protagonismo', effects: {}, epilogueText: 'Comparte foco, comparte foto y comparte cartel. El partido respira y le deja acabar la legislatura antes de sustituirle sin ruido. Fin del gobierno, en su momento.' },
    right: { text: 'Quedarse con todo el foco', effects: {}, epilogueText: 'Un líder al que la gente quiere más que al partido no es un activo: es una amenaza. Los mismos que le aplaudían en los mítines pactan su relevo entre semana. Fin del gobierno, por ser demasiado grande para las siglas.' },
    isEnding: true,
    condition: (s, m) => s.calle >= 10 && m >= 4 && m <= 6,
  },
  {
    id: 'final_votantes_max_baja',
    phase: 4,
    character: 'El Comité Ejecutivo',
    text: 'Le aclaman como a un mesías y buena parte de eso lo ha fabricado usted: encuestas cocinadas, bots y medios afines. Da igual cómo se construyó: el cariño es real, y en el comité saben que ese cariño no es del partido, es suyo.',
    left: { text: 'Desmontar el tinglado usted mismo', effects: {}, epilogueText: 'Confiesa el montaje antes de que lo cuente otro. El culto se desinfla, el partido respira aliviado y le retira sin hacer sangre. Fin del gobierno, con la fantasía rota a tiempo.' },
    right: { text: 'Alimentar el culto un poco más', effects: {}, epilogueText: 'El aparato no le teme por corrupto, le teme por imprescindible. Un líder al que la gente adora y al partido no le debe nada solo puede acabar de una manera: fuera, y por decisión de los suyos. Fin del gobierno, devorado por su propia devoción.' },
    isEnding: true,
    condition: (s, m) => s.calle >= 10 && m <= 3,
  },
  {
    id: 'final_caja_max_alta',
    phase: 4,
    character: 'El Juez',
    text: 'La caja ha crecido tanto que ni sus contables saben justificarla, y casi todo se fue en ayudar a gente con problemas de verdad. Eso, en un juzgado, no consta en ninguna parte. Lo que consta son los movimientos, y son muchos.',
    left: { text: 'Contarlo todo antes de que estalle', effects: {}, epilogueText: 'Lo confiesa antes de que lo destape nadie. El juez lo agradece en la sentencia, que llega igual. Fin del gobierno, con atenuante y con la conciencia razonablemente tranquila.' },
    right: { text: 'Seguir escondiéndolo', effects: {}, epilogueText: 'Tanto dinero deja rastro, y el rastro tiene fechas, cuentas y nombres. Cuando el juez ata los tres, ya no importa para qué era el dinero. Fin del gobierno, en un coche judicial y sin poder explicar que era de buena fe.' },
    isEnding: true,
    condition: (s, m) => s.caja >= 10 && m >= 7,
  },
  {
    id: 'final_caja_max_media',
    phase: 4,
    character: 'El Juez',
    text: 'Hay tanto dinero fuera de las cuentas que ya no cabe en ningún sitio discreto. Ese es el problema de acumular: llega un punto en que esconderlo hace más ruido que gastarlo.',
    left: { text: 'Sacarlo a la luz y asumir el golpe', effects: {}, epilogueText: 'Lo declara todo y encaja la multa, la portada y la dimisión. Fin del gobierno, pero por la puerta y no esposado.' },
    right: { text: 'Buscarle un sitio mejor', effects: {}, epilogueText: 'Mover una cantidad así deja huella en cada paso, y cada paso lleva a un juzgado distinto. Le detienen un miércoles a las siete de la mañana. Fin del gobierno, en directo.' },
    isEnding: true,
    condition: (s, m) => s.caja >= 10 && m >= 4 && m <= 6,
  },
  {
    id: 'final_caja_max_baja',
    phase: 4,
    character: 'El Juez',
    text: 'La caja ya no es un fondo para imprevistos: es un patrimonio. Y un patrimonio que nadie declara acaba siempre en el mismo sitio, que es mi mesa.',
    left: { text: 'Entregarse antes del registro', effects: {}, epilogueText: 'Se adelanta y colabora. Le sirve de poco, pero le sirve de algo. Fin del gobierno, con rebaja por colaboración.' },
    right: { text: 'Confiar en que nadie ate los cabos', effects: {}, epilogueText: 'Todo el dinero del mundo no compra la única cosa que hacía falta: que nadie sumara. Alguien sumó. Fin del gobierno, con condena firme y capítulo propio en los manuales.' },
    isEnding: true,
    condition: (s, m) => s.caja >= 10 && m <= 3,
  },

  // ==========================================================================
  // MUERTES POR EVENTO (byEvent) — no las dispara una barra en el extremo,
  // sino una situación que has ido construyendo tú: una trama que llega
  // demasiado lejos, media bancada harta de aguantarte. Se comprueban en
  // TODOS los turnos, así que sus condiciones tienen que ser exigentes: son
  // caídas que se ven venir y se pueden esquivar, no trampas.
  // ==========================================================================
  {
    id: 'final_evento_mocion',
    phase: 3,
    minTurn: 12,
    character: 'La Oposición',
    text: 'Su hermano sentado en el banquillo y usted sin un solo medio que le defienda. La oposición ha contado los votos tres veces y le salen. Esta moción no es para hacer ruido: es para ganarla.',
    left: { text: 'Ir al pleno a dar la cara', effects: {}, epilogueText: 'Aguanta dos horas de intervenciones sin pestañear. Pierde por siete votos. Al menos se fue de pie. Fin del gobierno.' },
    right: { text: 'Dimitir antes de la votación', effects: {}, epilogueText: 'Dimite la víspera para no salir en la foto de la derrota. Sale igualmente en todas. Fin del gobierno.' },
    isEnding: true,
    byEvent: true,
    condition: (s, _m, ctx) =>
      (ctx.flags.has('hermano_juicio') || ctx.flags.has('hermano_imputado')) && s.medios <= 4,
  },
  {
    id: 'final_evento_ruptura',
    phase: 2,
    minTurn: 10,
    character: 'La Coalición',
    text: 'Han ido saliendo del despacho uno a uno, cada uno con su motivo, y hoy se han encontrado todos en el mismo restaurante. No hace falta contar los escaños: ya no están.',
    left: { text: 'Convocar elecciones usted mismo', effects: {}, epilogueText: 'Se adelanta al golpe y convoca. Pierde, pero elige el día. Fin del gobierno, con la dignidad de haber puesto la fecha.' },
    right: { text: 'Resistir hasta que le echen', effects: {}, epilogueText: 'Aguanta tres semanas gobernando sin mayoría, sin socios y sin presupuesto. Luego ya no. Fin del gobierno.' },
    isEnding: true,
    byEvent: true,
    // Tres personajes distintos con el enfado muy alto: no es un enfado
    // puntual, es que te has quedado solo.
    condition: (_s, _m, ctx) => {
      const angers = Object.values(ctx.anger)
      return angers.filter((a) => a >= 5).length >= 2 || angers.filter((a) => a >= 3).length >= 4
    },
  },
  {
    id: 'final_evento_registro',
    phase: 3,
    minTurn: 14,
    character: 'El Juez',
    text: 'Caja llena, prensa encima y una causa abierta con su nombre. A las seis de la mañana hay coches en la puerta y un secretario judicial con una orden de registro.',
    left: { text: 'Abrir la puerta y colaborar', effects: {}, epilogueText: 'Entrega los ordenadores él mismo. El vídeo de la caja saliendo del portal abre todos los informativos. Fin del gobierno.' },
    right: { text: 'Llamar al abogado y ganar horas', effects: {}, epilogueText: 'Los abogados retrasan el registro cuatro horas. Cuatro horas que salen en el auto, subrayadas. Fin del gobierno, y con agravante.' },
    isEnding: true,
    byEvent: true,
    condition: (s, m) => s.caja >= 8 && s.medios <= 3 && m <= 3,
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

// Cada cuantos turnos toca balance de fin de ano (12 turnos = 1 ano).
export const RECAP_EVERY = 12
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
    // Solo pierdes la noche electoral si llegas con algo PRÁCTICAMENTE muerto
    // (1 o menos). Antes era <= 2 y se comía demasiadas partidas por los
    // pelos: la mediana del jugador competente ni llegaba a una legislatura.
    condition: (s) => s.medios <= 1 || s.gobierno <= 1 || s.calle <= 1 || s.caja <= 1,
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
    // El caso normal: nada se ha hundido del todo, asi que sobrevives la
    // noche. Lleva condicion para competir de tu a tu con derrota/triunfo/etc.
    // >= 2 (no >= 3) para que no quede hueco entre esta y la derrota (<= 1):
    // con una barra a 2, sobrevives por los pelos, no te quedas sin carta.
    condition: (s) => [s.medios, s.gobierno, s.calle, s.caja].every((n) => n >= 2),
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
    condition: (s) => s.gobierno <= 3,
  },
  {
    id: 'elecciones_guru',
    phase: 4,
    isElection: true,
    character: 'Noche electoral',
    characterImage: 'nocheelectoral.svg',
    text: 'Cuatro años. El partido del Gurú ha sacado escaños, todos de su bolsillo. La izquierda va partida en dos y la suma no da. La culpa, dicen los suyos, es de usted por no haberlo comprado a tiempo.',
    left: {
      text: 'Ofrecerle entrar al Gobierno ahora',
      effects: { gobierno: 1, caja: -2, medios: -1 },
    },
    right: {
      text: 'Gobernar sin él y a ver cuánto dura',
      effects: { medios: 1, gobierno: -2, calle: -1 },
    },
    condition: (_s, _m, ctx) => ctx.flags.has('guru_candidato'),
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
    // Tres de las cuatro en 6 o mas. Exigirlas las cuatro dejaba este final
    // en el 1.9% de las partidas que llegan hasta aqui (0% en minoria), es
    // decir, practicamente nadie lo veia nunca.
    condition: (s) =>
      [s.medios, s.gobierno, s.calle, s.caja].filter((v) => v >= 6).length >= 3,
  },
]

export const cards: Card[] = [...contentCards, ...endingCards, ...electionCards]

export const STAT_MAX = 10
export const STAT_START = 5
