# Geometría de efectos en WebGPU

Los efectos de agricultura, los ataques de bestias y el aura del guardián dibujan ahora las cintas y señales generadas por el compositor VFX nativo, utilizando el mismo pase de geometría compartido que Shield. La geometría se actualiza con el tiempo confirmado y pasa por la admisión gráfica antes de mostrarse; cuando el efecto desaparece se cancelan sus admisiones y se liberan sus recursos. Los efectos de pisadas y trabajo no generan estas formas y no crean el pase adicional.

Las pruebas dirigidas comprueban que los tres tipos producen geometría, que cada malla espera su admisión, y que los cambios de estructura y la cancelación no publican recursos obsoletos. La generación y admisión simulada no acreditan la equivalencia visual en GPU real ni el coste adicional. La profundidad suave y las luces proyectadas al mundo siguen pendientes.
