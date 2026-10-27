# Ciclo de vida del proxy de sombras: correcciones QA

Fallos detectados por inspeccion: el proxy anterior ignoraba q.group.visible (podria proyectar sombras sin hojas en muy_baja), y su firma solo incluia las claves de chunks (no reemplazos con la misma clave). Nueva variante guarded omite el proxy si la cobertura esta desactivada y registra chunk/release/rebuild/flush, ademas de markDirtyAt.

Prueba real del componente, no cambio integral de ajustes del juego: media -> muy_baja -> baja -> media -> reconstruccion del mismo chunk -> invalidacion/flush. Seis capturas y lifecycle.json.

Verificado:
- Media18670 casters; muy_baja proxy inactivo; baja10100; regreso a media18670.
- Reemplazo del chunk y flush reconstruyen la poblacion aun con las mismas claves/camara. Como los datos resultantes son iguales, el comparador original puede reutilizar la sombra: comportamiento esperado.
- Sin overflow, errores GL ni entradas untracked.

No se ha modificado simulacion ni perfiles de produccion. Esta variante aun usa el comparador original por valores. Integrar la optimizacion versionada requiere repetir su contrato con estas invalidaciones. Pendientes restauracion de contexto, terreno realmente modificado durante campaña activa, streaming largo y transiciones del borde. No se presenta como validacion completa de seis biomas ni mejora de FPS.

Reproduccion: Vite5190; WG_CARD_TREATMENTS=cards; node tools/experiments/probe-holly-fern-shadow-lifecycle-20261023.mjs.
