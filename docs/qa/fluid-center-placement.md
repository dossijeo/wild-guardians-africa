# Centers on water and lava

The release correction permits work centers on water/lava in every biome and
culture. Workers may cross those surfaces to reach accepted centers. Animal
fluid collision and crop placement rules remain independent. Center floors must
still have level support across their native hull, and building/large-prop
overlaps remain invalid.

The previous shared error described both fluid and uneven support as “Agua,
lava o pendiente no edificable”. Center support errors now explicitly request
level ground, with Spanish and English text.

Native river and volcano regression cases cover all five authored center hulls,
paid placement, crew routes in both directions and serialized reload. Additional
checks retain slope/support and building overlap rejection. These fluid cases
use a deliberately level submerged native terrain site to isolate fluid
classification from support; they are not an uncontrolled player playthrough.

In the actual main app, a new Volcanes/Mapungubwe campaign successfully placed
the first center at the tutorial point, deducted 800 coins and continued from
its saved slot with the center visible. The originally reported “everywhere is
lava” failure was not reproduced in that seed; the subsequent requested policy
change removes fluid as a construction rejection regardless.
