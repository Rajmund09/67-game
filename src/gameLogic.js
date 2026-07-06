export const check67Gesture = (leftWrist, rightWrist) => {
  if (!leftWrist || !rightWrist) return 'neutral';
  
  // Low threshold (5% of screen height) to detect even quick, small lateral movements
  const threshold = 0.05; 
  
  const leftHigher = leftWrist.y < rightWrist.y - threshold;
  const rightHigher = rightWrist.y < leftWrist.y - threshold;
  
  if (leftHigher) return 'left_high';
  if (rightHigher) return 'right_high';
  
  return 'neutral';
};
