import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

interface KineticGridProps { children: React.ReactNode; className?: string; }

/** Subtle pointer-reactive canvas background for the operations console. */
export function KineticGrid({ children, className }: KineticGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: -1000, y: -1000 });
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const move = (event: MouseEvent) => { pointer.current = { x: event.clientX, y: event.clientY }; };
    const draw = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      context.clearRect(0, 0, width, height);
      const spacing = 56;
      const radius = 190;
      for (let x = spacing / 2; x < width; x += spacing) {
        for (let y = spacing / 2; y < height; y += spacing) {
          const distance = Math.hypot(x - pointer.current.x, y - pointer.current.y);
          const intensity = Math.max(0, 1 - distance / radius);
          context.beginPath();
          context.arc(x, y, 1 + intensity * 1.8, 0, Math.PI * 2);
          context.fillStyle = `rgba(37, 99, 235, ${0.06 + intensity * 0.22})`;
          context.fill();
        }
      }
      frame.current = requestAnimationFrame(draw);
    };
    resize(); window.addEventListener('resize', resize); window.addEventListener('mousemove', move); frame.current = requestAnimationFrame(draw);
    return () => { window.removeEventListener('resize', resize); window.removeEventListener('mousemove', move); if (frame.current) cancelAnimationFrame(frame.current); };
  }, []);

  return <div className={cn('relative min-h-screen overflow-hidden', className)}>
    <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 opacity-80" />
    <div className="relative z-10">{children}</div>
  </div>;
}
