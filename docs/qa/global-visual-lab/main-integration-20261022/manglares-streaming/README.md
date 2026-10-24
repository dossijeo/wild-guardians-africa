# Manglares: streaming postmerge

Cuatro fases estructurales completadas: media/baja, día/noche. Mismos chunks, cámara y target al regresar; estado de simulación intacto, sin errores. Carga de retorno constante: media 91 llamadas / 490544 triángulos; baja 86 / 358626.

Entre primer y segundo retorno diurno aumenta una geometría (media 168→169, baja 147→148), sin aumentar texturas ni carga enviada. En la fase nocturna posterior, sobre la misma página, ambos retornos mantienen 169/109 y 148/107 geometrías/texturas respectivamente. No hay crecimiento continuo en estas cuatro vueltas; la causa concreta del recurso adicional no está aislada y esto no acredita ausencia de fugas largas.

Revisada media-day-4: hojas grandes y densas aprobadas, musgo, orilla y agua azul conservados. Persisten repetición del musgo y algunas agrupaciones de cobertura perceptibles. No se reduce densidad. Comparaciones de píxeles en return-images.json; pendiente revisión visual nocturna y baja completa.
