---
name: voz-de-las-cartas
description: >-
  Cómo se escribe una carta de No Me Consta para que suene como las otras 634:
  quién habla, cuándo se narra a propósito, y los tres casos que los auditores
  mezclan. Úsala siempre que haya que ESCRIBIR o REESCRIBIR texto de cartas —
  cartas nuevas, un personaje nuevo, arreglar las que suenan raras, repasar
  diálogos, "esta carta no suena a él", o cuando `qa-voz` marque algo. También
  antes de tocar `qa-voz`, `qa-personalidad` o `auditar-riesgo`, porque aquí
  está lo que esos scripts NO pueden ver. Lleva dentro los errores de criterio
  que ya se cometieron una vez, que es donde está el valor.
---

# La voz de las cartas

Lo que hace que el mazo suene a una sola cosa no es el vocabulario: es **quién
habla**. En Reigns, el que trae el asunto te lo dice a la cara. Aquí igual.

`qa-voz` mide esto, pero **busca palabras, no entiende quién habla**. Esta skill
es el criterio que el script no puede tener.

## Los tres casos, y solo uno es un fallo

Esto es lo que más se mezcla, y mezclarlo lleva a reescribir cartas que estaban
bien. Antes de tocar nada, decide en cuál de los tres está:

**1. El personaje te habla.** Lo normal y lo que se busca.
> *"Le traigo mi ley: doscientas páginas y un preámbulo que emociona."*

**2. La carta narra un hecho que te pasa a TI.** Nadie está hablando: pasa algo
y reaccionas. **Esto está bien, no se toca.**
> `meme_photocall`: *"En la foto de familia le han colocado en la última fila."*

El personaje está asignado porque la carta es de su órbita, no porque esté en
la habitación. Reigns hace lo mismo: reserva la tercera persona para lo que
pasa sin nadie delante.

**3. El narrador describe al que debería estar hablándote.** **Este es el
fallo.**
> antes: *"Ha lanzado una criptomoneda ética y descentralizada. Ya la tiene el
> 40% él."*
> después: *"He lanzado una moneda ética y descentralizada. Tengo el cuarenta
> por ciento, que es justo lo que hace falta para garantizar que siga siendo
> ética."*

## Al pasar de (3) a (1), mueve el chiste

Es lo que más cuesta y lo que más se olvida. **Muchas veces la ironía la pone el
narrador**, y si el personaje habla, la ironía se queda sin dueño. Hay que
dársela a él.

> antes: *"«Esto no va a salir en ningún lado», promete el jefe de
> comunicación, minutos antes de que salga en todos lados."*

La gracia está en el "minutos antes", que lo dice un narrador que sabe el
futuro. En primera persona eso no existe, así que se cambia por algo que él
pueda saber:

> después: *"Esto no va a salir en ningún lado, presidente. Se lo digo con la
> misma calma con la que se lo dije en marzo. Y en marzo acabó saliendo, sí,
> pero por otra cosa."*

**Un personaje nunca admite que miente: lo reformula.** El Gurú no esconde el
chanchullo, lo justifica, y por eso en su boca es más gracioso que contado
desde fuera.

## Lo que `qa-voz` NO puede ver

Su lista de verbos es finita y el castellano no. Antes de dar por buena una
carta que marca, comprueba si es uno de estos:

- Primera persona del plural rara: ya entra por terminación, pero ojo con
  `primos`, `extremos`, `buenísimos` y `carísimos`, que acaban igual y están
  excluidos a mano.
- Verbos en `-o` que no están en la lista: `pregunto`, `anuncio`, `cobro`,
  `propongo`. Se añaden con cuidado, porque varios son también nombres.
- Que el personaje hable **dentro de una cita** aunque el marco narre.

Si encuentras un hueco nuevo, **arréglalo en el script antes de reescribir la
carta**: el 05/10/2026, de 99 cartas marcadas, 16 estaban bien escritas y el
detector no sabía verlas.

## Quién es cada uno

Está en `src/data/reparto.ts`, una línea por personaje, y es la fuente. Antes de
escribirle una carta a alguien, **lee tres suyas que ya funcionen**: la voz se
coge leyendo, no describiéndola.

Dos reglas que sí se pueden enunciar:

- **Cada personaje encarna un indicador** (`dueno`). Sus cartas lo tocan casi
  siempre: ver quién habla y saber qué te juegas es la habilidad central del
  juego.
- **Lo que un personaje quiere es siempre lo mismo.** Lo vigila
  `qa-personalidad`. Un personaje que un día pide una cosa y al siguiente la
  contraria no es complejo: es que se nos ha olvidado quién era.

## Cuántas cartas tiene cada uno

El mazo son **634 cartas entre 31 voces**, mediana de **20 por personaje**.

Al escribir nuevas, mira el reparto: El Ministro Caído tiene 55 y El Sindicalista
16. No hay una cuota, pero un personaje con cinco cartas no llega a existir para
el jugador — en una partida mediana se ven **9 personajes distintos y solo 2
repiten** (medido sobre partidas reales, ver `PARA-MANANA.md`).

## Antes de dar una carta por buena

```bash
npm run validate-cards      # bloquea: ids, efectos, retratos, campos
npm run qa-voz              # ¿habla el que tiene que hablar?
npm run qa-personalidad     # ¿quiere siempre lo mismo?
npm run qa-ortografia       # contra diccionario de verdad
npm run auditar-coherencia  # ¿puede salir cuando no toca?
npm run auditar-riesgo      # ¿esto nos mete en un lío?
```

Ninguno de ellos lee la carta preguntándose si **se entiende sin contexto**. Eso
hay que hacerlo a mano, y es de donde salió el fallo de "¿por qué ha bajado la
calle?": el número era correcto y el jugador no tenía de dónde deducirlo.
