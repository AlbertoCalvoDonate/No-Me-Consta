# Partidas de verdad

Lo que juega la gente, guardado para poder compararlo.

Existe porque todo lo que sabemos del balance sale de simuladores que juegan
con heurísticas, no con intuición. Un óptimo del 16 % en banda no dice si la
partida se siente bien, ni si el ritmo funciona, ni si los personajes caen
simpáticos. Esto sí.

Los manda el botón rojo de la pantalla de final (ver `src/utils/logPruebas.ts`,
que es temporal y se quitará).

## Cómo añadir uno

Guárdalo tal cual llegue, con el nombre `NNN-final-meses.txt`, y apunta la fila
en la tabla de abajo. No hace falta limpiarlo ni ordenarlo: el valor está en
tener muchos y poder mirarlos juntos.

## Cómo se lee

```
1 trama_hermano_diligencias I M6 G4 C7 B2 m9
│ │                         │ │            └─ moralidad después de decidir (0-10)
│ │                         │ └─ las cuatro barras después de decidir
│ │                         └─ lado elegido: I izquierda, D derecha
│ └─ id de la carta
└─ mes
```

## Lo que hay hasta ahora

| # | Final | Meses | Moral | Barras al morir | Qué pasó |
|---|---|---|---|---|---|
| [001](001-mocion-20-meses.txt) | moción de censura | 20 | 3 | M1 G0 C5 B2 | La trama del hermano entera |

## Lo que se ha aprendido

**001 — la cadena larga funciona con humanos.** La trama del hermano corrió de
principio a fin: colocarlo (mes 5), diligencias (7), la prensa con la nómina
(14), la imputación (19) y la condena (20). Cinco cartas encadenadas a lo largo
de catorce meses. Hasta ahora eso solo se había visto en el simulador.

**La curva moral fue la que el juego quiere: 6 → 10 → 3.** Jugó de santo la
primera mitad -hizo dimitir al hermano, se adelantó a la exclusiva- y se rompió
en las dos últimas cartas: mintió en el juicio y no le dejó caer. Esas dos
decisiones se llevaron los medios de 8 a 1 y el gobierno de 2 a 0.

**No murió por la moción: llegó a la moción con todo a cero.** La moción sólo
llegó antes que las otras dos muertes que ya tenía encima.

## Lo que hay que vigilar cuando haya más

- **Veinte meses es poco.** El simulador da 44 al jugador "prudente" y 79 al
  "bueno". Con un solo log no se puede saber si esto fue esta partida o si la
  dificultad real está muy por debajo de lo que dicen las cabezas del
  simulador. Es lo primero que hay que mirar con tres o cuatro más.
- **El goteo de gobierno.** Perdió gobierno en trece de las veintiuna cartas.
  Si eso se repite en otros logs, el problema no es una carta: es que el
  indicador del gobierno sangra por todas partes.
- **La trama del hermano como trampa de compromiso.** En cuanto le colocas,
  cada paso cuesta, y el jugador que no lo sabe sangra sin darse cuenta. Puede
  ser exactamente lo que el juego quiere decir, o puede ser demasiado castigo.
  Para distinguirlo hace falta ver partidas donde NO se le coloque.
