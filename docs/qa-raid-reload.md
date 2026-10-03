# Incursiones: carga activa, combos y cambio de objetivo

Implementación comprobada: `503b7c9`. [Pruebas](../tests/acceptance-raid-reload.test.js)
y [salida dirigida completa](qa/raid-reload/directed.txt): **71/71**, cero
fallos, cancelaciones u omisiones, 9.412,2693 ms. La selección incluye navegación
de incursiones, clips nativos, VFX y audio; no se suman sus repeticiones como
pruebas distintas. Node emite el aviso experimental de imports JSON.

## QA-145: guardar y continuar durante una incursión

Se prueban 150 guardados: cinco especies por cinco culturas por seis momentos
(entrada, desplazamiento, inicio de ataque, mitad del clip, golpe aplicado y
retirada). Se utiliza Game, SaveRepository y Navigation de producción. Se paga
el centro con los comandos reales, conservando su footprint cultural. El crédito
de 10.000 monedas, la composición de una bestia y el terreno plano sin props
son condiciones explícitas de QA; no acreditan probabilidades de composición,
obstáculos de biomas ni rendimiento de la escena completa.

Cada carga reconstruye Navigation y conserva exactamente la instantánea antes
de continuar. Se comparan posición, pose nativa, fase, golpes y reservas en cada
paso de 50 ms, y todo el dominio cada veinte pasos. Se excluye únicamente
`animal.pathVersion` durante la continuación: es la época de caché de navegación,
que cambia al reconstruir Navigation. Al salir la incursión, las instantáneas
completas vuelven a coincidir, sin exclusiones. Una pausa de 30 s deja ambos
estados idénticos e inmóviles. No se vuelve a sortear la incursión ni se repiten
daños, y el RNG forma parte de la comparación de dominio.

Es aceptación del guardado y la presentación de poses calculadas, no una prueba
nueva del botón Continuar ni del renderizado WebGL de todas las combinaciones.

## QA-099: los dos combos

Para cada especie se buscan semillas que seleccionen realmente Weapon_Combo y
Weapon_Combo_2, sin forzar clip, posición ni cupos. Hasta un milisegundo antes de
terminar su duración nativa no cambia la vida del objetivo ni el presupuesto de
golpes. Se guarda y carga en ese instante; la terminación produce un único golpe
lógico, un cupo consumido y un StructureHit, sin repetirlos en el paso siguiente.

La suite complementaria attack-vfx verifica los cuatro clips de cada especie:
actualizar contactos decorativos no modifica el estado, los contactos múltiples
del león no multiplican el daño, la pausa congela el efecto y la carga conserva
su fase antes y después del impacto. Esta prueba usa Three y los descriptores
VFX de producción; no implica una nueva inspección visual en navegador.

## QA-097: destruir, liberar y buscar otro objetivo

Para las cinco especies se plantan y pagan mijo y plátano mediante comandos
legales, antes de lanzar una composición explícita. La bestia elige el plátano,
lo destruye consumiendo un golpe y vuelve a elegir el mijo con el presupuesto
restante intacto. Libera la reserva anterior y conserva una sola reserva propia;
destruir el mijo consume exclusivamente el segundo golpe. En la matriz de carga,
el rinoceronte destruye el único centro y se retira con golpes sobrantes cuando
ya no existe un objetivo válido. No se fuerza su retirada ni el presupuesto.

## QA-104: alcance parcial del final de incursión

En todas las cargas se emite RaidEnded una sola vez, las bestias quedan fuera y
las reservas vacías. AudioSystem procesa el aviso original game_attack_over
(SFX 124) una vez; recordar el historial al cargar impide repetirlo. Se sustituye
solamente la reproducción sonora por un registro de solicitudes: esto verifica
la política de despacho, no escucha real ni desbloqueo de audio del navegador.

La matriz no incluye trabajadores ni tareas agrícolas. La reconstrucción de
necesidades al regreso sigue pendiente para cerrar QA-104 completamente.
