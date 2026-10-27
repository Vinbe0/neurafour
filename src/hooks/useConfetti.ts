import { useCallback, useEffect, useRef } from 'react';

// Canvas confetti for a win: start() rains confetti for five seconds, stop() clears it.
// Skipped entirely when the system asks for reduced motion.

interface ConfettiParticle {
  x: number;
  y: number;
  r: number;
  color: string;
  tilt: number;
  tiltAngleIncremental: number;
  tiltAngle: number;
}

const makeParticle = (width: number, height: number): ConfettiParticle => ({
  x: Math.random() * width,
  y: Math.random() * height - height,
  r: Math.random() * 6 + 4,
  color: `hsl(${Math.random() * 360}, 100%, 50%)`,
  tilt: Math.random() * 10 - 5,
  tiltAngleIncremental: Math.random() * 0.07 + 0.02,
  tiltAngle: 0,
});

export const useConfetti = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particles = useRef<ConfettiParticle[]>([]);
  const frame = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const start = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particles.current = Array.from({ length: 150 }, () => makeParticle(canvas.width, canvas.height));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.current.forEach((p, idx) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (p.r + 2) / 3;
        p.tilt = Math.sin(p.tiltAngle) * 12;

        ctx.beginPath();
        ctx.lineWidth = p.r / 2;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();

        // Recycle particles falling off-screen
        if (p.y > canvas.height) {
          particles.current[idx] = { ...makeParticle(canvas.width, canvas.height), y: -20 };
        }
      });
      frame.current = requestAnimationFrame(draw);
    };

    draw();
    // Stop on its own so it never runs forever in the background
    setTimeout(stop, 5000);
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { canvasRef, start, stop };
};
