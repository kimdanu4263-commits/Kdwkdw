import React, { useRef, useState } from 'react';
import { LogOut, RotateCw } from 'lucide-react';

interface BicycleCrankControlProps {
  rpm: number;
  onCrankSpin: (deltaRadians: number) => void;
  onExitBicycle: () => void;
}

export const BicycleCrankControl: React.FC<BicycleCrankControlProps> = ({
  rpm,
  onCrankSpin,
  onExitBicycle,
}) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const lastAngleRef = useRef<number | null>(null);
  const [visualAngle, setVisualAngle] = useState(0);

  const getPointerAngle = (clientX: number, clientY: number) => {
    const rect = wheelRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(clientY - cy, clientX - cx);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    pointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    lastAngleRef.current = getPointerAngle(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId || lastAngleRef.current === null) return;
    e.stopPropagation();
    const angle = getPointerAngle(e.clientX, e.clientY);
    let delta = angle - lastAngleRef.current;
    // Wrap around -PI..PI
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    lastAngleRef.current = angle;

    setVisualAngle((prev) => prev + (delta * 180) / Math.PI);
    onCrankSpin(delta);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    pointerIdRef.current = null;
    lastAngleRef.current = null;
  };

  return (
    <div
      className="fixed bottom-5 left-5 z-20 flex flex-col items-start gap-2 select-none pointer-events-auto"
      aria-label="자전거 페달 돌리기 컨트롤"
    >
      <button
        onClick={onExitBicycle}
        style={{ backgroundColor: 'rgba(10, 15, 26, 0.85)' }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 text-xs font-medium text-slate-200 hover:text-white cursor-pointer"
      >
        <LogOut className="w-3.5 h-3.5 text-rose-400" />
        <span>자전거에서 내리기</span>
      </button>

      <div
        ref={wheelRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ backgroundColor: 'rgba(10, 15, 26, 0.62)' }}
        className="relative w-36 h-36 rounded-full border-2 border-amber-400/50 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
      >
        {/* Rotating Crank Arm */}
        <div
          style={{ transform: `rotate(${visualAngle}deg)` }}
          className="absolute inset-3 pointer-events-none flex items-center justify-center"
        >
          <div className="w-full h-1.5 bg-slate-500/50 rounded-full relative flex items-center">
            <div className="w-7 h-7 rounded-full bg-amber-400 border-2 border-white shadow-md ml-auto flex items-center justify-center">
              <RotateCw className="w-3.5 h-3.5 text-slate-950" />
            </div>
          </div>
        </div>

        {/* Center Readout */}
        <div className="pointer-events-none text-center">
          <div className="text-[11px] font-semibold text-amber-300">페달 돌리기</div>
          <div className="text-xs font-mono-tabular font-bold text-white mt-0.5">
            {Math.round(rpm)} RPM
          </div>
        </div>
      </div>
    </div>
  );
};
