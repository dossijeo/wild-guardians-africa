# Primer ajuste postjam del margen de cosecha

El runtime usa los valores enteros derivados del [diagnóstico de cinco campañas](../farm-margin-baseline/README.md): mijo 11, girasol 36, sorgo 13, maíz 17, batata 23, algodón 178, yuca 32 y plátano 267. Se conservan los valores originales del plan en su JSON; las revisiones de jugador y el generador declaran el ajuste explícitamente. Los precios de semillas, jornales, daños, tiempos de cultivo y requisitos de riego permanecen en sus valores anteriores.

El factor de referencia 1,112 es el primero, en pasos de 0,001 y con precios enteros, que produce al menos un 20 % de margen sobre costes operativos en las entregas históricas de los cinco ensayos. No es una prueba de que la nueva simulación vaya a mantener exactamente ese margen: reinversión y atracción cambian su evolución. También quedan por resolver las grandes pérdidas de algodón/plátano y verificar el ritmo de las cien noches.

## Pruebas actuales

- [169 pruebas dirigidas](directed-tests.txt), todas correctas: contabilidad, entrega física, multiplicación persistente, contratos que cruzan amanecer, límites de derrota/victoria, atracción, composición de incursiones, cuatro aperturas con terreno nativo y diagnóstico histórico.
- [Cuatro ensayos de política nativa](native-policy-tests.txt), todos correctos: crecimiento intensivo responsable de tres noches, reconciliación de una campaña histórica, contratación proporcional real y derrota en menos de diez noches al reinvertir sin reservas crecientes de personal/mantenimiento. La estrategia de mala gestión no se ha cambiado para forzar el resultado.
- Compilación correcta, 196 módulos, 9,03 segundos; permanece la advertencia de bundle grande. Paquete: 586 archivos, 393.994.577 bytes y 859 enlaces relativos verificados.
- El generador reproduce exactamente las revisiones. Las expectativas aritméticas de los tests se actualizan a la nueva tabla: por ejemplo mijo masculino paga `ceil(11 × 1,2) = 14`, multiplicado paga 22 y yuca multiplicada paga 64. No se rebajan las condiciones de recorrido, trabajo, riego ni entrega.

Estas pruebas no acreditan cien noches con los nuevos valores, menor inactividad, todas las culturas/biomas, escucha, render ni móvil físico. El ajuste está en main para seguir verificándolo, sin publicar en itch.io. El objetivo completo sigue abierto.
