import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Pause, Play, RotateCcw, X } from 'lucide-react';
import { STAGES } from '../types/energy';

interface PrincipleModalProps {
  stageIndex: number | null;
  onClose: () => void;
}

function drawRoundedBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawTurbineWheel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  angle: number,
  blades: number,
  bladeColor: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.strokeStyle = bladeColor;
  ctx.fillStyle = bladeColor;
  ctx.lineWidth = 3;
  for (let i = 0; i < blades; i++) {
    ctx.save();
    ctx.rotate((i / blades) * Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(radius * 0.55, -radius * 0.28, radius, 0);
    ctx.lineTo(radius * 0.85, radius * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBulb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  glow: number,
  label = '전구'
) {
  ctx.save();
  if (glow > 0.1) {
    const grad = ctx.createRadialGradient(x, y, 4, x, y, 28 + glow * 14);
    grad.addColorStop(0, `rgba(253, 224, 71, ${0.75 * glow})`);
    grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, 36, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = glow > 0.2 ? '#fef08a' : '#334155';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.fillRect(x - 6, y + 11, 12, 8);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y + 32);
  ctx.restore();
}

export const PrincipleModal: React.FC<PrincipleModalProps> = ({ stageIndex, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playing, setPlaying] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const timeRef = useRef(0);

  useEffect(() => {
    timeRef.current = 0;
    setActiveStep(0);
    setPlaying(true);
  }, [stageIndex]);

  useEffect(() => {
    if (stageIndex === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTs = performance.now();

    const renderFrame = (ts: number) => {
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      if (playing) {
        timeRef.current += dt;
      }

      const t = timeRef.current;
      // Cycle 8 seconds across 4 steps (2s per step highlight)
      const cyclePos = (t % 8) / 8;
      const stepIdx = Math.min(3, Math.floor(cyclePos * 4));
      setActiveStep(stepIdx);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = 420;
      const h = 280;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Clean dark blueprint slate background
      ctx.fillStyle = '#070b14';
      ctx.fillRect(0, 0, w, h);

      // Subtle grid lines
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < w; gx += 28) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += 28) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      ctx.font = 'bold 12px sans-serif';

      if (stageIndex === 0) {
        // 0. Coil & Magnet
        const magX = 88 + Math.sin(t * 4.2) * 44;
        const speed = Math.abs(Math.cos(t * 4.2));

        // Magnetic flux lines
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.25 + speed * 0.55})`;
        ctx.lineWidth = 1.6;
        for (let r = 1; r <= 3; r++) {
          ctx.beginPath();
          ctx.ellipse(magX + 46, 140, 26 + r * 14, 14 + r * 11, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Bar Magnet
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(magX - 38, 124, 38, 32);
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(magX, 124, 38, 32);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('N', magX - 19, 144);
        ctx.fillText('S', magX + 19, 144);

        // Copper Coil
        for (let i = 0; i < 8; i++) {
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.ellipse(178 + i * 11, 140, 6, 36, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = '#fcd34d';
        ctx.fillText('구리 코일', 216, 198);

        // Wire to Bulb + flowing electrons
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(255, 110);
        ctx.lineTo(345, 110);
        ctx.lineTo(345, 130);
        ctx.moveTo(255, 170);
        ctx.lineTo(345, 170);
        ctx.lineTo(345, 154);
        ctx.stroke();

        // Moving electrons
        ctx.fillStyle = '#fde047';
        for (let e = 0; e < 5; e++) {
          const prog = ((t * 1.4 + e * 0.2) % 1);
          ctx.beginPath();
          ctx.arc(260 + prog * 80, 110, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        drawBulb(ctx, 345, 140, 0.3 + speed * 0.7);
      } else if (stageIndex === 1) {
        // 1. Bicycle Generator
        const spin = t * 5.0;
        // Pedal crank
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(105, 175, 22, 0, Math.PI * 2);
        ctx.stroke();
        const px = 105 + Math.cos(spin) * 28;
        const py = 175 + Math.sin(spin) * 28;
        ctx.beginPath();
        ctx.moveTo(105, 175);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(px - 10, py - 4, 20, 8);
        ctx.fillStyle = '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.fillText('1. 페달', 105, 222);

        // Chain
        ctx.strokeStyle = '#94a3b8';
        ctx.setLineDash([5, 4]);
        ctx.lineDashOffset = -t * 45;
        ctx.beginPath();
        ctx.moveTo(105, 153);
        ctx.lineTo(225, 160);
        ctx.moveTo(105, 197);
        ctx.lineTo(225, 190);
        ctx.stroke();
        ctx.setLineDash([]);

        // Rear wheel
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(225, 175, 48, 0, Math.PI * 2);
        ctx.stroke();
        drawTurbineWheel(ctx, 225, 175, 42, spin * 1.6, 6, '#475569');
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('2. 뒷바퀴', 225, 244);

        // Dynamo touching tire
        ctx.fillStyle = '#d97706';
        ctx.fillRect(268, 122, 32, 22);
        drawTurbineWheel(ctx, 268, 133, 12, -spin * 4, 4, '#fbbf24');
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('3. 다이나모', 284, 112);

        // Wire to battery/bulb
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(300, 133);
        ctx.lineTo(355, 133);
        ctx.stroke();
        drawBulb(ctx, 365, 133, 0.9, '4. 전기');
      } else if (stageIndex === 2) {
        // 2. Hydroelectric Power Plant — detailed water pouring and spinning turbine!
        // Upper Dam Reservoir
        ctx.fillStyle = '#334155';
        ctx.fillRect(16, 40, 108, 190);
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(22, 56, 94, 96);
        ctx.fillStyle = '#e0f2fe';
        ctx.textAlign = 'center';
        ctx.fillText('1. 높은 댐의 물', 70, 32);

        // Sluice Gate lifting up & down gently or open during steps 2..4
        const gateOpen = stepIdx >= 1 ? 1 : 0.25;
        const gateY = 122 - gateOpen * 26;
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(116, gateY, 12, 36);
        ctx.fillStyle = '#fca5a5';
        ctx.fillText('2. 수문', 124, 32);

        // Penstock Chute & Pouring Animated Water Stream hitting the turbine!
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 26;
        ctx.beginPath();
        ctx.moveTo(124, 140);
        ctx.lineTo(222, 188);
        ctx.stroke();

        // Flowing water jet & droplets hitting turbine blades
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(118, 140);
        ctx.lineTo(222, 188);
        ctx.stroke();

        for (let d = 0; d < 12; d++) {
          const p = (t * 1.8 + d / 12) % 1;
          const dx = 120 + p * 106;
          const dy = 138 + p * 52 + Math.sin(p * 12) * 3;
          ctx.fillStyle = '#bae6fd';
          ctx.beginPath();
          ctx.arc(dx, dy, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Splash droplets flying off spinning turbine
        for (let s = 0; s < 8; s++) {
          const sp = (t * 2.4 + s * 0.13) % 1;
          ctx.fillStyle = `rgba(186, 230, 253, ${1 - sp})`;
          ctx.beginPath();
          ctx.arc(236 + sp * 32, 206 + sp * 28, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Lower tailrace water pool
        ctx.fillStyle = '#0369a1';
        ctx.fillRect(190, 232, 120, 26);

        // Spinning Water Turbine hit by the water jet
        drawTurbineWheel(ctx, 238, 192, 32, t * 5.2, 8, '#38bdf8');
        ctx.fillStyle = '#7dd3fc';
        ctx.fillText('3. 물이 터빈을 돌림!', 238, 146);

        // Vertical shaft up to Generator
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(238, 160);
        ctx.lineTo(238, 92);
        ctx.stroke();

        // Generator coil box
        drawRoundedBox(ctx, 212, 56, 52, 36, 6);
        ctx.fillStyle = '#b45309';
        ctx.fill();
        ctx.fillStyle = '#fde68a';
        ctx.fillText('발전기', 238, 78);

        // Wire to Bulb
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(264, 74);
        ctx.lineTo(352, 74);
        ctx.lineTo(352, 108);
        ctx.stroke();
        drawBulb(ctx, 352, 122, 0.95, '4. 전기 생산');
      } else if (stageIndex === 3) {
        // 3. Thermal Power Plant
        // Furnace & Coal Fire
        ctx.fillStyle = '#334155';
        ctx.fillRect(28, 168, 100, 68);
        ctx.fillStyle = '#111827';
        ctx.fillRect(42, 198, 72, 26); // coal
        // Flames
        for (let f = 0; f < 5; f++) {
          const fh = 16 + Math.sin(t * 9 + f) * 6;
          ctx.fillStyle = f % 2 === 0 ? '#f97316' : '#facc15';
          ctx.beginPath();
          ctx.moveTo(48 + f * 15, 200);
          ctx.lineTo(55 + f * 15, 200 - fh);
          ctx.lineTo(62 + f * 15, 200);
          ctx.fill();
        }
        ctx.fillStyle = '#fdba74';
        ctx.textAlign = 'center';
        ctx.fillText('1. 석탄 불', 78, 254);

        // Boiler Tank with boiling bubbles
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.fillRect(36, 86, 84, 80);
        ctx.strokeRect(36, 86, 84, 80);
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(38, 114, 80, 50);
        for (let b = 0; b < 7; b++) {
          const bp = (t * 1.4 + b * 0.17) % 1;
          ctx.fillStyle = '#e0f2fe';
          ctx.beginPath();
          ctx.arc(48 + b * 10, 160 - bp * 44, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#bae6fd';
        ctx.fillText('2. 물 끓이기', 78, 76);

        // Steam Pipe & Jet blasting turbine
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(120, 98);
        ctx.lineTo(222, 98);
        ctx.lineTo(222, 134);
        ctx.stroke();

        for (let st = 0; st < 8; st++) {
          const sp = (t * 2.2 + st * 0.14) % 1;
          ctx.fillStyle = `rgba(241, 245, 249, ${1 - sp * 0.6})`;
          ctx.beginPath();
          ctx.arc(124 + sp * 98, 98, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Steam Turbine + Generator + Bulb
        drawTurbineWheel(ctx, 222, 162, 30, t * 6.5, 8, '#e2e8f0');
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText('3. 증기로 터빈 회전', 222, 212);

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(252, 162);
        ctx.lineTo(286, 162);
        ctx.stroke();
        drawRoundedBox(ctx, 286, 142, 42, 40, 6);
        ctx.fillStyle = '#b45309';
        ctx.fill();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(328, 162);
        ctx.lineTo(366, 162);
        ctx.stroke();
        drawBulb(ctx, 368, 162, 0.95, '4. 전기');
      } else if (stageIndex === 4) {
        // 4. Wave Power Plant
        const waveY = (x: number) => 185 + Math.sin(x * 0.045 - t * 3.8) * 18;
        ctx.fillStyle = '#0369a1';
        ctx.beginPath();
        ctx.moveTo(20, 260);
        for (let x = 20; x <= 260; x += 6) {
          ctx.lineTo(x, waveY(x));
        }
        ctx.lineTo(260, 260);
        ctx.closePath();
        ctx.fill();

        // Bobbing Buoy
        const by = waveY(135);
        ctx.fillStyle = '#f59e0b';
        drawRoundedBox(ctx, 113, by - 12, 44, 22, 6);
        ctx.fill();
        ctx.fillStyle = '#bae6fd';
        ctx.textAlign = 'center';
        ctx.fillText('1. 파도 · 2. 부표 흔들림', 135, 248);

        // Piston up to Rotary Generator
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(135, by - 12);
        ctx.lineTo(135, 92);
        ctx.stroke();
        ctx.fillStyle = '#64748b';
        ctx.fillRect(123, 86, 24, 34);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('3. 피스톤 상하 운동', 135, 72);

        // Generator gear
        drawTurbineWheel(ctx, 250, 96, 28, t * 4.5, 6, '#38bdf8');
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(147, 96);
        ctx.lineTo(222, 96);
        ctx.stroke();

        ctx.strokeStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(278, 96);
        ctx.lineTo(354, 96);
        ctx.stroke();
        drawBulb(ctx, 360, 96, 0.9, '4. 전기');
      } else if (stageIndex === 5) {
        // 5. Nuclear Power Plant
        // Reactor Vessel with Cherenkov glow
        drawRoundedBox(ctx, 28, 72, 108, 146, 18);
        ctx.fillStyle = '#0c4a6e';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Control rods lifted
        ctx.fillStyle = '#475569';
        for (let r = 0; r < 3; r++) {
          ctx.fillRect(52 + r * 24, 52, 8, 56);
        }
        ctx.fillStyle = '#bae6fd';
        ctx.textAlign = 'center';
        ctx.fillText('1. 제어봉 올림', 82, 42);

        // U-235 atoms & flying neutrons
        for (let a = 0; a < 4; a++) {
          const ax = 54 + (a % 2) * 52;
          const ay = 136 + Math.floor(a / 2) * 42;
          ctx.fillStyle = '#22d3ee';
          ctx.beginPath();
          ctx.arc(ax, ay, 8, 0, Math.PI * 2);
          ctx.fill();
          const pulse = ((t * 2 + a * 0.25) % 1);
          ctx.strokeStyle = `rgba(250, 204, 21, ${1 - pulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ax, ay, 8 + pulse * 14, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = '#7dd3fc';
        ctx.fillText('2. 핵분열 열', 82, 238);

        // Secondary Steam Loop -> Giant Turbine -> Bulb
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(136, 132);
        ctx.lineTo(192, 132);
        ctx.lineTo(192, 92);
        ctx.lineTo(256, 92);
        ctx.stroke();
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('3. 증기 생성', 188, 76);

        drawTurbineWheel(ctx, 266, 152, 34, t * 7.2, 10, '#e2e8f0');
        ctx.fillText('4. 대형 터빈', 266, 206);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(300, 152);
        ctx.lineTo(356, 152);
        ctx.stroke();
        drawBulb(ctx, 366, 152, 1.0, '대량 전기');
      } else {
        // 6. Miniature Full Seoul Power Grid
        const plants = [
          { label: '자석', y: 42, c: '#38bdf8' },
          { label: '자전거', y: 80, c: '#fb7185' },
          { label: '수력', y: 118, c: '#60a5fa' },
          { label: '화력', y: 156, c: '#f97316' },
          { label: '파력', y: 194, c: '#22d3ee' },
          { label: '원자력', y: 232, c: '#a78bfa' },
        ];
        ctx.textAlign = 'center';
        plants.forEach((p, idx) => {
          ctx.fillStyle = p.c;
          drawRoundedBox(ctx, 22, p.y - 12, 62, 24, 6);
          ctx.fill();
          ctx.fillStyle = '#090d16';
          ctx.fillText(p.label, 53, p.y + 4);

          ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(84, p.y);
          ctx.lineTo(175, 140);
          ctx.stroke();

          const pulse = (t * 1.3 + idx * 0.16) % 1;
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(84 + pulse * 91, p.y + (140 - p.y) * pulse, 3.5, 0, Math.PI * 2);
          ctx.fill();
        });

        // Substation
        drawRoundedBox(ctx, 165, 114, 58, 52, 8);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
        ctx.fillStyle = '#090d16';
        ctx.fillText('변전소', 194, 144);

        // Lines to Miniature Seoul Skyline + Han River
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(223, 140);
        ctx.lineTo(272, 140);
        ctx.stroke();

        // Han river band
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(268, 178, 134, 14);
        // Seoul Towers lighting up
        const heights = [48, 72, 95, 56, 118, 62];
        heights.forEach((bh, i) => {
          const bx = 276 + i * 21;
          ctx.fillStyle = i === 4 ? '#bae6fd' : '#334155';
          ctx.fillRect(bx, 178 - bh, 15, bh);
          ctx.fillStyle = Math.sin(t * 3 + i) > -0.4 ? '#fde047' : '#64748b';
          for (let wy = 168; wy > 184 - bh; wy -= 12) {
            ctx.fillRect(bx + 3, wy, 4, 5);
            ctx.fillRect(bx + 9, wy, 4, 5);
          }
        });
        ctx.fillStyle = '#fde68a';
        ctx.fillText('서울 전역 점등!', 335, 224);
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [stageIndex, playing]);

  if (stageIndex === null) return null;
  const stage = STAGES[stageIndex];
  if (!stage) return null;

  const { explanation } = stage;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/65">
      <div
        style={{ backgroundColor: 'rgba(10, 15, 26, 0.98)' }}
        className="w-full max-w-4xl rounded-2xl border border-white/15 p-5 sm:p-6 text-slate-100 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-sky-400 shrink-0" />
            <div>
              <div className="text-xs text-sky-400 font-medium">{stage.title}</div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                {explanation.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
            aria-label="설명 닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Kid-friendly 1-line summary */}
        <div className="mt-4 p-3 rounded-xl bg-sky-950/50 border border-sky-400/25 text-xs sm:text-sm text-sky-100 font-medium leading-relaxed">
          {explanation.kidSummary}
        </div>

        {/* Video Simulation on Left + Ordered 1->4 Steps on Right */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Animated Video Canvas */}
          <div className="lg:col-span-6 flex flex-col gap-2.5">
            <div className="rounded-xl overflow-hidden border border-white/15 bg-[#070b14]">
              <canvas
                ref={canvasRef}
                className="w-full h-auto block aspect-[3/2]"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlaying((p) => !p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold cursor-pointer"
                >
                  {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{playing ? '영상 일시정지' : '영상 재생'}</span>
                </button>
                <button
                  onClick={() => {
                    timeRef.current = 0;
                    setActiveStep(0);
                    setPlaying(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>처음부터</span>
                </button>
              </div>
              <span className="text-[11px] font-mono-tabular text-amber-300">
                현재 강조: {activeStep + 1}단계
              </span>
            </div>
          </div>

          {/* 1 -> 2 -> 3 -> 4 Ordered Steps */}
          <div className="lg:col-span-6 flex flex-col gap-2.5">
            {explanation.steps.map((st, idx) => {
              const isHighlighted = idx === activeStep;
              return (
                <button
                  key={st.stepNum}
                  type="button"
                  onClick={() => {
                    timeRef.current = idx * 2 + 0.1;
                    setActiveStep(idx);
                  }}
                  className={`text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                    isHighlighted
                      ? 'bg-amber-500/15 border-amber-400/60'
                      : 'bg-slate-900/80 border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isHighlighted
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-800 text-sky-300'
                      }`}
                    >
                      {st.stepNum}
                    </span>
                    <span className="text-sm font-bold text-white">{st.title}</span>
                  </div>
                  <p className="mt-1.5 pl-8 text-xs text-slate-300 leading-relaxed">
                    {st.desc}
                  </p>
                </button>
              );
            })}

            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/25">
              <div className="text-[11px] font-semibold text-emerald-400">조작 팁</div>
              <p className="text-xs text-slate-200 leading-relaxed mt-0.5">
                {explanation.operationTip}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
