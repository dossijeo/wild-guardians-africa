# Selección con cultivos provisionales y confirmados

El selector de WebGPU considera preparada la escena únicamente cuando cada cultivo vivo confirmado figura en un lote visible y admitido. Los cultivos provisionales siguen mostrando feedback, pero no pueden suplir en el recuento a un cultivo confirmado cuya etapa todavía está cargando. La prueba utiliza el roster real con una admisión retenida, además del contrato del selector.

La comprobación se efectúa al consultar el estado del roster para una selección; no añade comprobaciones por actor al bucle de simulación. La validación en navegador, incluidos selección durante carga y efectos de reconstrucción, sigue pendiente.

Las construcciones con terreno residente tampoco se consideran preparadas mientras su malla o una fase confirmada siguen pendientes de admisión. Las construcciones sin geometría residente no bloquean por sí solas el selector; la comprobación independiente del terreno del rayo mantiene la barrera cuando el área consultada aún no está disponible. Las pruebas cubren el centro con compilación retenida y el caso sin terreno residente.

Esta barrera es global: mientras una construcción residente espera admisión, también aplaza selecciones en otras zonas. Falta medir y evaluar ese comportamiento en partida.
