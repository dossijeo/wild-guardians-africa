# Transporte musical de los labs originales

Implementación `fd524ac`, posterior a las [mezclas verticales](qa-native-music-mixes.md).
Se consultaron los motores originales de ambos HTML, especialmente chooseDestination,
prepareSplice, createDeck, runNavigation y disposeDeck; no se alteran sus marcadores
ni se generan nuevos enlaces musicales.

## Comportamiento

- La continuidad natural I/A/B/C/D/E/F conserva el mismo deck, sin reiniciar capas.
- A mantiene B_A, C_B, A_D; B mantiene D_B, E_B, A_E. Son los seis enlaces
  registrados, con su estado candidate_not_listening_validated intacto.
- Las probabilidades de desvío son 0,35 para A y 0,20 para B. Los intervalos mínimos
  son 40/50 s respectivamente. Se conserva el veto al último enlace, penalización
  de las últimas tres visitas y ponderación por densidad de la mezcla del lab.
- El sorteo utiliza Math.random de presentación; no consume el RNG del dominio.
  En pruebas se inyecta un sorteo controlado para comprobar todos los enlaces.
- Diez stems viajan juntos, rate=1, fuentes sin loop individual. Los desvíos usan
  preroll de 0,1 s y fundido que termina en el marcador destino.
- El retorno global a introducción usa 4 s, limitado por la longitud del tramo
  de salida como en el lab. El nuevo deck puede comenzar a sonar antes de marcar
  la visita I; no se describe ese retorno como un empalme métrico exacto.
- Los decks comparten curvas verticales durante el solape; una curva en curso se
  inicializa en el deck entrante. La rejilla se recalcula desde start-offset del
  deck principal. Las tareas próximas se protegen dos compases tras el salto.
- Un callback que pierde el plazo conserva el recorrido original. Si ya terminó
  la canción, limpia y reinicia desde introducción; no hace un corte tardío arbitrario.
- Cada deck libera fuentes y gain nodes. Salir durante una transición limpia ambos.
  Un error parcial de arranque también limpia nodos, se conserva en musicError y
  permite reintentar el mismo día, sin lanzar una excepción al bucle de simulación.

## Validación

[38 pruebas dirigidas](qa/music-transport/directed.txt), cero fallos/cancelaciones/
omisiones, 3533,9589 ms. Incluyen las regresiones de SFX, cargas tardías y reintentos.
Doce pruebas nuevas prueban para ambos packs los seis enlaces, recorrido natural,
wrap, offsets/clock/rate compartidos, cooldown, parada con dos decks, retraso del
callback y fallo parcial/reintento sin mutar el estado de dominio.
Son AudioContexts dobles; no se presentan como escucha real.

El visor tests/browser/music-transport.html decodifica los MP3 originales con
AudioContext real. Arranca cerca del marcador para acortar la espera, sin acelerar
el sample clock ni el fundido. Las pruebas de retorno desactivan el sorteo de ramas;
las de salto fuerzan el enlace registrado desde A. La salida permanece silenciada.
Los historiales públicos registran ambos wraps y saltos A_D/A_E, hasta dos decks y
20 fuentes programadas durante la transición, seguidos de un deck/10 fuentes.
Las 20 fuentes incluyen las que están programadas para empezar después: no se
presenta el contador como veinte sonidos audibles durante todo ese intervalo.
La parada deja cero fuentes; la consola se conserva con los datos del visor.

[Build](qa/music-transport/build.txt) correcto en 4,40 s con aviso conocido de bundle.
[Paquete](qa/music-transport/package.txt): 555 archivos / 379769932 bytes,
794 enlaces relativos, 20 GLB runtime sin duplicados originales.

## Alcance restante

QA-156 sigue parcial: faltan evolución automática de capas, arreglos temporales,
validación auditiva de los enlaces candidatos y alternancia A/B en campaña integrada.
La selección impar/par por día sigue siendo una decisión técnica de integración;
los labs independientes no prescriben una regla A/B para la campaña.
No se afirma que una salida silenciada valide fraseo o calidad musical perceptiva.

## Continuacion: evolucion y resultados

`8798a1b` integra la evolucion de una capa y los arreglos temporales nativos.
[Evidencia y limites](qa-native-music-evolution.md). Se conserva QA-156 parcial
por la escucha de empalmes candidatos y la alternancia dentro de campaña.
