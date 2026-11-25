import React from 'react';
import { Activity, Eye, HelpCircle } from 'lucide-react';
import { SimulationState, STAGES } from '../types/energy';

interface TopHudProps {
  state: SimulationState;
  onToggleEnergyView: () => void;
  onOpenDashboard: () => void;
  onOpenTutorial: () => void;
}

export const TopHud: React.FC<TopHudProps> = ({
  state,
  onToggleEnergyView,
  onOpenDashboard,
  onOpenTutorial,
}) => {
  const stage = STAGES[state.currentStageIndex] ?? STAGES[6];
  const { cityLevels, totalMw, cityDemandMw } = state;

  const statusText = !state.cityLit
    ? '도시 배전 대기 중'
    : cityLevels.fullCity
    ? '도시 전력망 전체 가동 중'
    : cityLevels.factory
    ? '공장·상업시설까지 전력 공급 중'
    : cityLevels.shops
    ? '상점·주거·학교 점등 중'
    : cityLevels.residential
    ? '아파트·학교 조명 공급 중'
    : cityLevels.traffic
    ? '가로등 · 교통신호 작동 중'
    : cityLevels.streetlights
    ? '일부 가로등 점등 시작'
    : '전력 공급 부족 — 발전소를 가동하세요';

  const tiers = [
    { label: '가로등', active: cityLevels.streetlights },
    { label: '신호등', active: cityLevels.traffic },
    { label: '아파트·학교', active: cityLevels.residential || cityLevels.school },
    { label: '상점·공장', active: cityLevels.shops || cityLevels.factory },
    { label: '도시 전체', active: cityLevels.fullCity },
  ];

  return (
    <header className="fixed top-4 left-4 right-4 z-20 flex flex-wrap items-start justify-between gap-3 pointer-events-none">
      {/* Top-Left: Restrained City Power Response & Current Context */}
      <div
        style={{ backgroundColor: 'rgba(9, 13, 22, 0.80)' }}
        className="pointer-events-auto border border-white/12 rounded-xl px-4 py-2.5 max-w-md"
      >
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">
            {state.energyView ? '전체 전력망 조감 (Energy View)' : stage.title}
          </h1>
          <span className="font-mono-tabular text-xs text-amber-300 whitespace-nowrap">
            {totalMw.toFixed(1)} / {cityDemandMw} MW
          </span>
        </div>

        <p className="mt-0.5 text-xs text-slate-300 leading-snug">{statusText}</p>

        {/* Qualitative City Consumption Response Strip */}
        <div className="mt-2 flex items-center gap-1.5 text-[11px] overflow-x-auto">
          {tiers.map((t, i) => (
            <React.Fragment key={t.label}>
              <span
                className={`whitespace-nowrap font-medium transition-colors ${
                  state.cityLit && t.active ? 'text-amber-300' : 'text-slate-500'
                }`}
              >
                {t.label}
              </span>
              {i < tiers.length - 1 && (
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Top-Right: Minimalist Primary Actions */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          onClick={onToggleEnergyView}
          style={
            state.energyView
              ? undefined
              : { backgroundColor: 'rgba(9, 13, 22, 0.86)' }
          }
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            state.energyView
              ? 'bg-sky-400 hover:bg-sky-300 text-slate-950 border-sky-300'
              : 'text-sky-300 hover:text-white border-sky-400/35 hover:border-sky-300'
          }`}
          title="발전소에서 도시로 흐르는 전체 전력망 조감 시점 전환"
        >
          <Eye className="w-4 h-4" />
          <span>{state.energyView ? '1인칭 체험으로' : 'Energy View'}</span>
        </button>

        <button
          onClick={onOpenDashboard}
          style={{ backgroundColor: 'rgba(9, 13, 22, 0.86)' }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/12 text-xs font-medium text-slate-200 hover:text-white hover:border-white/25 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          title="발전소 제어 및 실시간 출력 그래프"
        >
          <Activity className="w-4 h-4 text-amber-400" />
          <span>전력망 관제</span>
        </button>

        <button
          onClick={onOpenTutorial}
          style={{ backgroundColor: 'rgba(9, 13, 22, 0.86)' }}
          className="p-2 rounded-xl border border-white/12 text-slate-200 hover:text-white hover:border-white/25 transition-colors cursor-pointer"
          aria-label="시뮬레이션 안내"
          title="사용 안내"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
