# Produccion desde la autoridad para cohortes nativas restauradas

Continua la [integracion de la parada22 en Game](e-r3-native-idle-stroll-stop-game-20261117.md). La autoridad ordinaria vincula ahora los cuerpos de una cohorte restaurada compatible y despacha las transiciones preparadas que ya existen. No requiere llamadas manuales de los tests al ABI ni introduce otra autoridad, cola de peticiones, reloj o dependencia. Esto integra el productor de ese dominio; no completa el productor general ni cierra A6/e-R3/e-R4/f-R4/A/B/C. D no se inicia.

## Codigo consultado y adaptacion

Se consulta [`dtCrowd::updateMoveRequest`, Recast/Detour v1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp): recorre agentes activos, conserva la peticion en el agente, limita el trabajo pendiente y valida la correspondencia con el corredor actual antes de aplicar un resultado asincrono. Se adapta esa separacion entre peticion, trabajo y adopcion. Se reutilizan los getters y transacciones nativas existentes; no se importan el planner, el corredor, el ajuste de posicion al navmesh ni la cola de Detour.

El despacho conserva una sola promesa/controlador en curso y consulta las peticiones nativas actuales. Recorre el roster existente desde el actor posterior al ultimo intento para que una fuente bloqueada no impida atender a otra. No copia una cola de actores ni acumula resultados o temporizadores. Una nueva frontera de Game cancela el trabajo si cambia la identidad de su fuente; el despertar de esa orden se conserva hasta liberar la preparacion anterior.

## Integracion

Al cargar marcadores nativos, y solo si toda la cohorte tiene una clase con proyeccion Game disponible y no hay raid ni puerta activa, `createSimulationAuthority` crea el puente de identidad ya existente antes de restaurar declaraciones. Publica y vincula cada cuerpo una sola vez. El acceso de lectura `id` pertenece a ese mismo registro; no hay otro mapa de identidades ni eco de posiciones por tick. Los snapshots y la presencia de puertos no conceden movimiento: sigue siendo obligatorio preparar recursos, drenar la GPU y adquirir la propuesta exacta.

Las conexiones independientes de control y recursos despiertan el productor cuando estan disponibles. Las publicaciones ordinarias de Game lo despiertan despues. Se despachan20/21/22,18/19 y14/15/16/17 mediante los metodos de admision existentes, con la urgencia ordinaria y las fases/presupuesto actuales. La identidad de Task14 incluye esa politica: si crece la cola y cambia la urgencia, se cancela la preparacion anterior aunque se conserve el mismo handle de peticion. La transicion siguiente espera una publicacion real de los valores adquiridos; el preparador recibe su `minSequence`. Esto evita solicitar21 mientras el roster aun conoce solamente un20 pendiente. La ausencia Home conserva el camino nativo ya existente.

El cierre aborta la preparacion pendiente antes de retirar conexiones y cuerpos. Los fallos de control/preparacion se exponen por estado y por el aviso de fallo existente; los comandos posteriores no repiten indefinidamente una preparacion fallida. Las cohortes mixtas conservan el estado `unsupported-cohort` y no se activan parcialmente.

## Carrera de obsolescencia grafica

La orden de cosecha de una prueba real revoca un WALK pendiente mientras el preparador esta detenido. El aviso directo puede adelantarse al mensaje de cancelacion del puerto de recursos. Se detecto que la validacion inicial del Host estaba fuera de su tratamiento de obsolescencia y convertia ese rechazo en fallo global del Host.

El Host reutiliza ahora su camino existente de frame obsoleto y retencion de recursos para los codigos tipados de obsolescencia de las familias nativas, tanto al validar la propuesta como despues de esperar recursos. Una propuesta obsoleta no adquiere permisos ni se dibuja. Los paquetes malformados y los errores no reconocidos conservan el tratamiento fatal. No hay filtro general de excepciones ni recuperacion nueva. La prueba posterior adquiere la Task genuina en el mismo Host sano, sin reconstruir el dispositivo.

## Evidencia y pendientes

[Resultados, hashes y alcance de validacion](performance/native-intent-production-authority-validation-20261117.json). Los nuevos recorridos usan `createSimulationAuthority`, ambas conexiones, Game y WASM reales y el Host remoto con cola GPU determinista. Las comprobaciones de hardware son regresiones de las verticales graficas existentes; no se presentan como validacion visual del nuevo productor entre Workers de producto.

Quedan la llegada inicial a la granja y el resto de origenes/finales, cohortes mixtas/puertas/raid, la parada automatica de WALK para Task/Home, los cambios de contratos/roster y la recuperacion completa, ademas de la validacion del productor con WorldSurface/roster originales y Workers/WebGPU reales. El origen restaurado no sustituye esos requisitos. Tambien siguen abiertos el guardado de interfaz, la recuperacion incremental integral de3123 recursos, los picos historicos85.62/41.01ms y los siete fallos anteriores registrados para C. Este incremento no demuestra ausencia de tirones.
