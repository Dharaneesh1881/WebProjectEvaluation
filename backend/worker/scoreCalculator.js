export function calculateScore({ domResults, styleResults, interactionResults, visualResult, rubric }) {
  function bucket(results, maxBucketScore) {
    const totalWeight = results.reduce((sum, t) => sum + t.weight, 0);
    const earnedWeight = results.reduce((sum, t) => sum + t.earned, 0);
    const ratio = totalWeight > 0 ? earnedWeight / totalWeight : 0;
    return {
      score: Math.round(ratio * maxBucketScore * 10) / 10,
      maxScore: maxBucketScore,
      tests: results
    };
  }

  const html = bucket(domResults, rubric.html);
  const css  = bucket(styleResults, rubric.css);
  const js   = bucket(interactionResults, rubric.js);

  const rawVisualScore = (visualResult.diffScore / 100) * rubric.visual;
  const visual = {
    score: Math.round(rawVisualScore * 10) / 10,
    maxScore: rubric.visual,
    diffPercent: visualResult.diffPercent,
    tests: []
  };

  const totalScore = html.score + css.score + js.score + visual.score;

  return {
    totalScore: Math.round(totalScore * 10) / 10,
    html,
    css,
    js,
    visual
  };
}
