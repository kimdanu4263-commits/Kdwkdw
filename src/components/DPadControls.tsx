import React, { useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';

interface DPadControlsProps {
  onMoveChange: (x: number, y: number) => void;
}

export const DPadControls: React.FC<DPadControlsProps> = ({ onMoveChange }) => {
  const padRef = useRef<HTMLDivElement>(null);
  const [activeDir, setActiveDir] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragPointerId = useRef<number | null>(null);

  const setDirection = (x: number, y: number) => {
    setActiveDir({ x, y });
    onMoveChange(x, y);
  };

  const handlePadPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    dragPointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointer(e);
  };

  const handlePadPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragPointerId.current !== e.pointerId) return;
    e.stopPropagation();
    updateFromPointer(e);
  };

  const handlePadPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragPointerId.current !== e.pointerId) return;
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragPointerId.current = null;
    setDirection(0, 0);
  };

  const updateFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.42;
    let dx = (e.clientX - cx) / maxR;
    let dy = -(e.clientY - cy) / maxR; // up = +1 forward
    const mag = Math.hypot(dx, dy);
    if (mag > 1) {
      dx /= mag;
      dy /= mag;
    }
    setDirection(dx, dy);
  };

  return (
    <div
      className="fixed bottom-5 left-5 z-20 select-none pointer-events-auto"
      aria-label="1인칭 이동 방향 패드"
    >
      <div
        ref={padRef}
        onPointerDown={handlePadPointerDown}
        onPointerMove={handlePadPointerMove}
        onPointerUp={handlePadPointerUp}
        onPointerCancel={handlePadPointerUp}
        style={{ backgroundColor: 'rgba(10, 15, 26, 0.52)' }}
        className="relative w-32 h-32 rounded-full border border-white/15 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
      >
        {/* Directional guide icons */}
        <ArrowUp
          className={`absolute top-2.5 w-4 h-4 transition-colors ${
            activeDir.y > 0.25 ? 'text-amber-400' : 'text-slate-300/75'
          }`}
        />
        <ArrowDown
          className={`absolute bottom-2.5 w-4 h-4 transition-colors ${
            activeDir.y < -0.25 ? 'text-amber-400' : 'text-slate-300/75'
          }`}
        />
        <ArrowLeft
          className={`absolute left-2.5 w-4 h-4 transition-colors ${
            activeDir.x < -0.25 ? 'text-amber-400' : 'text-slate-300/75'
          }`}
        />
        <ArrowRight
          className={`absolute right-2.5 w-4 h-4 transition-colors ${
            activeDir.x > 0.25 ? 'text-amber-400' : 'text-slate-300/75'
          }`}
        />

        {/* Center movable thumb knob */}
        <div
          style={{
            transform: `translate(${activeDir.x * 28}px, ${-activeDir.y * 28}px)`,
            backgroundColor: 'rgba(248, 250, 252, 0.22)',
          }}
          className="w-11 h-11 rounded-full border border-white/30 pointer-events-none flex items-center justify-center"
        >
          <span className="text-[10px] font-medium text-white/85">이동</span>
        </div>
      </div>
    </div>
  );
};
