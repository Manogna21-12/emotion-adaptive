/**
 * Helper to calculate new focus score using a running average
 * @param {Number} currentScore - The current average focus score
 * @param {Number} currentLogCount - Number of logs BEFORE this new entry
 * @param {Number} newLogScore - The focus score of the latest entry
 * @returns {Number} - The newly calculated average score
 */
const calculateNewFocusScore = (currentScore, currentLogCount, newLogScore) => {
  if (currentLogCount === 0) {
    return newLogScore;
  }
  
  // Running average logic
  const totalPreviousScore = currentScore * currentLogCount;
  const updatedAverage = (totalPreviousScore + newLogScore) / (currentLogCount + 1);
  
  // Return rounded to nearest integer
  return Math.round(updatedAverage);
};

module.exports = {
  calculateNewFocusScore
};
