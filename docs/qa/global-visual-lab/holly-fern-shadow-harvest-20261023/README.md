# Ciclo real de cultivo: recuperacion de cobertura y sombras

Partida poblada guardada de Manglares. Se compra mijo en una posicion legal con cobertura y se avanza Game.tick en pasos0.5s, sin alterar crecimiento, dinero, reloj o reglas. Se solicita la cosecha mediante Game.harvest al alcanzar madurez. Los trabajadores realizan los dos riegos manuales y la recogida. La prueba se detiene cuando ese cultivo deja de estar vivo.

Resultado verificado:333pasos,166.5s simulados; crecimiento140, ambos riegos manuales. Eventos HarvestRequested y CropPicked observados; planta objetivo plant-50 recogida. Cobertura en radio1.2m:6 antes,0 al plantar,6 tras cosechar. Region de sombra reconstruida; cero errores GL/callbacks desconocidos. Casters totales19373->19343->19441: otros cultivos existentes tambien se cosechan durante el avance normal, por eso el total final no debe igualar el inicial. Se verifica el area local del cultivo objetivo.

Las imagenes antes/despues tienen distinta hora real de campaña (no son un A/B de iluminacion). La prueba ejecuta la simulacion real por lotes y sincroniza el renderer cada10pasos, no mide FPS de partida en tiempo real. No es una prueba de campaña completa, seis biomas, streaming largo o restauracion de contexto.

Modulo canonico de Game importado desde la URL versionada cargada por Vite para compartir sus observadores. No se emiten eventos artificiales ni se elimina el cultivo directamente. Ningun cambio de simulacion/navegacion.

Reproduccion: Vite5190, WG_CARD_TREATMENTS=cards, node tools/experiments/probe-holly-fern-shadow-harvest-20261023.mjs. Datos completos en planting.json (nombre heredado del guion de colocacion).
