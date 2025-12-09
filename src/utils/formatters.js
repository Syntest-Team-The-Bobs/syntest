// src/utils/formatters.js

export function formatPercentage(value) {
    if (value === null || value === undefined) return "N/A";
    return `${value}%`;
  }
  
  export function formatNumber(value) {
    if (value === null || value === undefined) return 0;
    return value.toLocaleString();
  }
  
  export function calculateCompletionRate(completed, total) {
    if (!total || total === 0) return 0;
    return Math.round((completed / total) * 100);
  }