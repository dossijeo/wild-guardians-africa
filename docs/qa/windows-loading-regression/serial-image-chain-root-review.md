# Root review: bounded diorama image scheduling

Frozen source `37427276c669b6ffd74573b6c62a540a9292ecca`, reviewed independently
on10 October2026. Preservation verifier PASS and35/35 directed tests PASS
(1232.308ms). These are CPU correctness receipts, not loading benchmarks.

Sky and catalogues retain their original order. After catalogues, the existing
model/bridge pair overlaps only one serial soil-then-atlas chain. All resources
join before scene adoption, batch construction and unchanged GPU preparation.
No loader, model split, cache, renderer, shader variant, readiness milestone
or fence changes. The original OFF branch and GPU tail are byte-equivalent.
Private atlas ownership bookkeeping during loading remains the existing path.

Root read the helper and actual preparation tests: real ordering/join boundary,
GLB cache reuse, sibling/soil failure, cancellation, late shared and private
resources, exactly-once disposal and both TextureLoader/bitmap atlas paths.
Promise.all observes the concurrent rejections; caller lifecycle cleanup
continues through the existing owner disposal. Tests do not establish rendered
first-frame quality or native timing.

Original49ef early spans contain a2.7332s awaited image tail. Hiding that tail
is only a theoretical opportunity if its durations remain unchanged. Delivery
and decoding may contend with GLB work. The previous broad f738 overlap failed;
this narrower chain leaves sky separate and permits only one image load at a
time. Its failure evidence remains valid and is not superseded by CPU tests.

Authorized next step: explicit false-default smoke/App/CLI/workflow selection
and recipe reporting, then another frozen wiring review before any dispatch.
A subsequent isolated recipe must keep wall packaging, compiler window and
the earlier resource overlap OFF. No native run, promotion or merge is
authorized at this review boundary.
