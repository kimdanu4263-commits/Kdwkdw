import React from 'react';
import { Power, X } from 'lucide-react';
import { PlantKey, SimulationState, TelemetryPoint } from '../types/energy';

interface CityDashboardModalProps {
  open: boolean;
  state: SimulationState;
  telemetry: TelemetryPoint[];
  onClose: () => void;
  onTogglePlant: (plant: PlantKey, enabled: boolean) => void;
  onChangeThrottle: (plant: PlantKey, throttle: number) => void;
}

const PLANT_META: { key: PlantKey; label: string; color: string }[] = [
  { key: 'coil', label: '01. 코일·자석 유도', color: '#38bdf8' },
  { key: 'bicycle', label: '02. 자전거 발전기', color: '#fb7185' },
  { key: 'hydro', label: '03. 수력 발전소', color: '#60a5fa' },
  { key: 'thermal', label: '04. 화력 발전소', color: '#fb923c' },
  { key: 'wave', label: '05. 파력 발전소', color: '#22d3ee' },
  { key: 'nuclear', label: '06. 원자력 발전소', color: '#34d399' },
];

export const CityDashboardModal: React.FC<CityDashboardModalProps> = ({
  open,
  state,
  telemetry,
  onClose,
  onTogglePlant,
  onChangeThrottle,
}) => {
  if (!open) return null;

  const totalMw = PLANT_META.reduce(
    (sum, item) => sum + state.plants[item.key].currentMw,
    0
  );
  const demandMw = state.cityDemandMw;
  const { cityLevels } = state;

  const citySummary = cityLevels.fullCity
    ? '도시 전체 활성화 (공장 · 상업 · 주거 · 교통 · 가로등)'
    : cityLevels.factory
    ? '공장 및 상업시설 가동 중'
    : cityLevels.shops
    ? '상점 간판 및 주거 단지 점등 중'
    : cityLevels.residential
    ? '아파트 및 학교 조명 활성화'
    : cityLevels.traffic
    ? '교통신호 및 주요 가로등 작동 중'
    : cityLevels.streetlights
    ? '일부 가로등만 점등 (전력 부족)'
    : '도시 전력 부족 — 발전소를 가동하세요';

  // SVG Chart Geometry
  const chartW = 540;
  const chartH = 210;
  const padL = 40;
  const padR = 14;
  const padT = 16;
  const padB = 26;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;
  const maxY = 140;

  const buildPath = (accessor: (pt: TelemetryPoint) => number) => {
    if (telemetry.length === 0) return '';
    return telemetry
      .map((pt, i) => {
        const x =
          padL +
          (telemetry.length === 1
            ? innerW
            : (i / (telemetry.length - 1)) * innerW);
        const y = padT + innerH - (Math.min(maxY, accessor(pt)) / maxY) * innerH;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const totalPath = buildPath((p) => p.totalMw);
  const demandY = padT + innerH - (demandMw / maxY) * innerH;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/55">
      <div
        style={{ backgroundColor: 'rgba(11, 16, 28, 0.96)' }}
        className="w-full max-w-5xl max-h-[88vh] overflow-y-auto rounded-2xl border border-white/15 p-6 text-slate-100"
      >
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-white">
              에너지 도시 전력망 관제 · 발전량 텔레메트리
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              발전소 출력을 조절하면 송전선 에너지 흐름과 도시 소비 시설이 즉시 반응합니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
            aria-label="대시보드 닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-5">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10">
            <div className="text-xs text-slate-400">총 발전 출력</div>
            <div className="text-2xl font-bold font-mono-tabular text-amber-400 mt-1">
              {totalMw.toFixed(1)} MW
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10">
            <div className="text-xs text-slate-400">도시 기준 수요</div>
            <div className="text-2xl font-bold font-mono-tabular text-slate-100 mt-1">
              {demandMw.toFixed(1)} MW
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10">
            <div className="text-xs text-slate-400">도시 반응 상태</div>
            <div className="text-sm font-semibold text-sky-300 mt-2 leading-snug">
              {citySummary}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-5 flex flex-col gap-2.5">
            <h3 className="text-sm font-semibold text-slate-200 mb-1">
              발전소 개별 제어
            </h3>
            {PLANT_META.map((item) => {
              const pState = state.plants[item.key];
              return (
                <div
                  key={item.key}
                  className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs font-medium text-white">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono-tabular text-xs font-semibold text-slate-200">
                        {pState.currentMw.toFixed(1)} MW
                      </span>
                      <button
                        onClick={() => onTogglePlant(item.key, !pState.enabled)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                          pState.enabled
                            ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{pState.enabled ? '연결' : '차단'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      출력 배율
                    </span>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      disabled={!pState.enabled}
                      value={Math.round(pState.throttle * 100)}
                      onChange={(e) =>
                        onChangeThrottle(item.key, Number(e.target.value) / 100)
                      }
                      className="energy-slider w-full disabled:opacity-40"
                    />
                    <span className="font-mono-tabular text-[11px] text-slate-300 w-9 text-right">
                      {Math.round(pState.throttle * 100)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-7 p-4 rounded-xl bg-slate-900/80 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-200">
                실시간 발전량 변화 (MW)
              </h3>
              <span className="text-[11px] text-slate-400 font-mono-tabular">
                최근 {Math.round(telemetry.length * 0.5)}초 추이
              </span>
            </div>

            <div className="w-full overflow-hidden">
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                className="w-full h-auto block"
                role="img"
                aria-label="실시간 발전량 그래프"
              >
                {[0, 35, 70, 105, 140].map((val) => {
                  const y = padT + innerH - (val / maxY) * innerH;
                  return (
                    <g key={val}>
                      <line
                        x1={padL}
                        y1={y}
                        x2={chartW - padR}
                        y2={y}
                        stroke="rgba(148,163,184,0.16)"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={padL - 6}
                        y={y + 4}
                        textAnchor="end"
                        fill="#94a3b8"
                        fontSize="10"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                <line
                  x1={padL}
                  y1={demandY}
                  x2={chartW - padR}
                  y2={demandY}
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                />
                <text
                  x={chartW - padR - 4}
                  y={demandY - 5}
                  textAnchor="end"
                  fill="#fb7185"
                  fontSize="10"
                >
                  도시 기준 수요 ({demandMw} MW)
                </text>

                {PLANT_META.map((item) => (
                  <path
                    key={item.key}
                    d={buildPath((pt) => pt[item.key])}
                    fill="none"
                    stroke={item.color}
                    strokeWidth="1.5"
                    strokeOpacity={0.75}
                  />
                ))}

                {totalPath && (
                  <path
                    d={totalPath}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2.8"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-white/10 text-[11px] text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-amber-400 inline-block" />
                <span className="font-semibold text-amber-300">총 발전량</span>
              </div>
              {PLANT_META.map((item) => (
                <div key={item.key} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-0.5 inline-block"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.label.split('. ')[1]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
