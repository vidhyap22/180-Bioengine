export const calculateSPL = (amplitude) => {
  const rsp = 20e-6;
  // Handle very small or zero amplitude values
  if (Math.abs(amplitude) < rsp) {
    return 0;
  }
  const spl = 20 * Math.log10(Math.abs(amplitude) / rsp);
  // Limit SPL range to reasonable values
  return Math.min(Math.max(spl, 0), 140);
};

export const calculateStats = (data) => {
  if (data.length === 0) return { max: 0, min: 0, mean: 0, sd: 0 };
  
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
  
  return {
    max: Math.max(...data),
    min: Math.min(...data),
    mean: mean,
    sd: Math.sqrt(variance)
  };
};