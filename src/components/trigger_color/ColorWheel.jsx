import { useEffect, useRef } from 'react';
import '../../styles/app.css';

export default function ColorWheel({ 
  size = 360, 
  onColorChange, 
  onLockChange,
  selectedColor,
  isLocked 
}) {
  const canvasRef = useRef(null);
  const dotRef = useRef(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2;

    // Draw color wheel
    for (let angle = 0; angle < 360; angle++) {
      const startAngle = (angle - 0.5) * Math.PI / 180;
      const endAngle = (angle + 0.5) * Math.PI / 180;

      for (let r = 0; r < radius; r++) {
        const saturation = (r / radius) * 100;
        const hue = angle;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, startAngle, endAngle);
        ctx.strokeStyle = `hsl(${hue}, ${saturation}%, 50%)`;
        ctx.stroke();
      }
    }
  }, [size]);

  const handleInteraction = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = size / 2;
    const centerY = size / 2;
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= size / 2) {
      const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
      const saturation = (distance / (size / 2)) * 100;
      
      const color = {
        hue: angle,
        saturation: saturation,
        hex: hslToHex(angle, saturation, 50)
      };
      
      onColorChange(color);
      
      // Update dot position
      if (dotRef.current) {
        dotRef.current.style.left = `${x}px`;
        dotRef.current.style.top = `${y}px`;
      }
    }
  };

  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    handleInteraction(e);
  };

  const handleMouseMove = (e) => {
    if (isDraggingRef.current) {
      handleInteraction(e);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleClick = () => {
    onLockChange(!isLocked);
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="wheel-wrap">
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          onMouseDown={handleMouseDown}
          onClick={handleClick}
          aria-label="Color selection area"
          style={{ cursor: 'pointer' }}
        />
        <span 
          ref={dotRef}
          className={`dot ${isLocked ? 'locked' : ''}`}
          aria-hidden="true"
        />
      </div>
      <p className="caption">
        Click and hold, then drag to adjust. Click to <b>lock</b> (circle turns <b>red</b>); click again to unlock.
      </p>
    </div>
  );
}

function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
