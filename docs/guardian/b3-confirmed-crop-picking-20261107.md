# Selección con cultivos provisionales y confirmados

El selector de WebGPU considera preparada la escena únicamente cuando cada cultivo vivo confirmado figura en un lote visible y admitido. Los cultivos provisionales siguen mostrando feedback, pero no pueden suplir en el recuento a un cultivo confirmado cuya etapa todavía está cargando. La prueba utiliza el roster real con una admisión retenida, además del contrato del selector.

La comprobación se efectúa al consultar el estado del roster para una selección; no añade comprobaciones por actor al bucle de simulación. La validación en navegador, incluidos selección durante carga y efectos de reconstrucción, sigue pendiente.
