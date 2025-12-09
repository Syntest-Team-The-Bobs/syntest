import { useEffect, useRef } from 'react';

export default function ActivityHeatmap({ data }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!data || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const cellSize = 15;
    const gap = 2;
    const days = 7;
    const weeks = Math.ceil(data.length / days);

    canvas.width = weeks * (cellSize + gap);
    canvas.height = days * (cellSize + gap);

    // Draw heatmap
    data.forEach((value, index) => {
      const week = Math.floor(index / days);
      const day = index % days;
      const x = week * (cellSize + gap);
      const y = day * (cellSize + gap);

      // Color based on activity level
      const intensity = Math.min(value / 10, 1);
      const color = `rgba(59, 130, 246, ${intensity})`;
      
      ctx.fillStyle = color;
      ctx.fillRect(x, y, cellSize, cellSize);
    });
  }, [data]);

  return (
    <div className="activity-heatmap">
      <canvas ref={canvasRef} />
      <div className="heatmap-legend">
        <span>Less</span>
        <div className="legend-gradient" />
        <span>More</span>
      </div>
    </div>
  );
}