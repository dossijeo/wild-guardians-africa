// Applies only to newly generated reports. Never rewrites historical captures.
// Metric policy 2 still defines the calculations; acceptance policy 3 changes
// their role, without changing a numeric threshold or inventing a reviewer.
export function attachHumanVisualReview(report){
 report.visualAcceptancePolicyVersion=3;
 report.visualReview={status:'HUMAN_REVIEW_PENDING',reviewer:null,decision:null,
  basis:'Explicit user instruction, 8 October 2026: pixel/color/silhouette/small-hole thresholds are diagnostic; inspect perceptible defects in real conditions.',
  numericPassMeaning:'Every passes/colorPasses/quantitativeGate field is a historical-threshold diagnostic, never model acceptance.',
  required:['Recognizable shape, leaves and continuous growth; no perceptible deformation, disappearance or defects.','Real game distances, day/night, relevant biomes, transitions/actions and effective shadows.','Functional contracts and stability, resources and measured net GPU benefit before integration.'],
  captureScope:'Only retained captures and actually inspected live views may support review; uncaptured metrics do not prove human inspection.'};
 if(Object.hasOwn(report,'failed')){report.diagnosticThresholdExceeded=report.failed;delete report.failed;}
 return report;
}
