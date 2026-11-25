import React, { useState } from 'react';
import {
  Activity,
  Bike,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronUp,
  Compass,
  Droplets,
  Eye,
  Flame,
  HelpCircle,
  Lightbulb,
  Magnet,
  Radiation,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Waves,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { PlantKey, SimulationState, STAGES, StageId } from '../types/energy';

type DockTab = 'generate' | 'power' | 'city' | 'observe';

interface BottomControlDockProps {
  state: SimulationState;
  muted: boolean;
  onToggleMute: () => void;
  onToggleEnergyView: () => void;
  onToggleFlowHighlight: (enabled: boolean) => void;
  onSelectStage: (index: number) => void;
  onSelectObservatory: () => void;
  onToggleLight: (id: StageId) => void;
  onToggleEnterSeoul: (enter: boolean) => void;
  onOpenExplanation: (index: number) => void;
  onOpenTutorial: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onShakeMagnet: (dir: number) => void;
  onPedalTap: () => void;
  onToggleBicycleRide: (riding: boolean) => void;
  onSetBicycleGear: (gear: number) => void;
  onSetHydroGate: (val: number) => void;
  onAddCoal: () => void;
  onSetThermalDamper: (val: number) => void;
  onTriggerWave: () => void;
  onSetWaveSensitivity: (val: number) => void;
  onSetNuclearRods: (val: number) => void;
  onOpenCityDashboard: () => void;
}

const PLANT_ITEMS: { key: PlantKey; index: number; label: string }[] = [
  { key: 'coil', index: 0, label: '코일·자석' },
  { key: 'bicycle', index: 1, label: '자전거' },
  { key: 'hydro', index: 2, label: '수력' },
  { key: 'thermal', index: 3, label: '화력' },
  { key: 'wave', index: 4, label: '파력' },
  { key: 'nuclear', index: 5, label: '원자력' },
];

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  state,
  muted,
  onToggleMute,
  onToggleEnergyView,
  onToggleFlowHighlight,
  onSelectStage,
  onSelectObservatory,
  onToggleLight,
  onToggleEnterSeoul,
  onOpenExplanation,
  onOpenTutorial,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onShakeMagnet,
  onPedalTap,
  onToggleBicycleRide,
  onSetBicycleGear,
  onSetHydroGate,
  onAddCoal,
  onSetThermalDamper,
  onTriggerWave,
  onSetWaveSensitivity,
  onSetNuclearRods,
  onOpenCityDashboard,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<DockTab>('generate');

  const currentStage = STAGES[state.currentStageIndex] ?? STAGES[6];
  const isPlantStage = currentStage.id !== 'city';
  const isRoomLit = state.bulbLit[currentStage.id];
  const zoomPercent = Math.round((62 / Math.max(24, state.fov)) * 100);

  const activePlants = PLANT_ITEMS.filter(
    (p) => state.plants[p.key].enabled && state.plants[p.key].currentMw > 0.2
  );

  const handleTabClick = (tab: DockTab) => {
    setActiveTab(tab);
    if (collapsed) setCollapsed(false);
  };

  const renderPlantOperationRow = () => {
    if (!isPlantStage) {
      return (
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <p className="text-xs text-slate-300">
            위 발전소를 선택해 직접 가동하면 전기가 송전선과 변전소를 거쳐 어두운 도시에 전달됩니다.
          </p>
          <button
            onClick={() => onSelectStage(0)}
            className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            첫 발전소로 이동
          </button>
        </div>
      );
    }

    const contextualButtons = (
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onOpenExplanation(currentStage.index)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-sky-300 border border-white/10 cursor-pointer"
          title="이 시설의 발전 원리 보기"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>원리</span>
        </button>
        <button
          onClick={() => onToggleLight(currentStage.id)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border cursor-pointer transition-colors ${
            isRoomLit
              ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-400/30'
              : 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300'
          }`}
          title="시설 작업등 켜기/끄기"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>{isRoomLit ? '조명 끄기' : '조명 켜기'}</span>
        </button>
      </div>
    );

    switch (currentStage.id) {
      case 'coil':
        return (
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <Magnet className="w-4 h-4 text-sky-400 shrink-0" />
              <button
                onClick={() => onShakeMagnet(-1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white border border-white/10 cursor-pointer whitespace-nowrap"
              >
                자석 왼쪽
              </button>
              <button
                onClick={() => onShakeMagnet(1)}
                className="px-3 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-xs font-semibold text-slate-950 cursor-pointer whitespace-nowrap"
              >
                자석 오른쪽
              </button>
              <span className="font-mono-tabular text-xs text-sky-300 ml-1">
                {state.plants.coil.currentMw.toFixed(1)} MW
              </span>
            </div>
            {contextualButtons}
          </div>
        );

      case 'bicycle':
        return (
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <Bike className="w-4 h-4 text-rose-400 shrink-0" />
              <button
                onClick={() => onToggleBicycleRide(!state.bicycleRiding)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer whitespace-nowrap ${
                  state.bicycleRiding
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300'
                }`}
              >
                {state.bicycleRiding ? '자전거 내리기' : '자전거 타기'}
              </button>
              <button
                onPointerDown={onPedalTap}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium border border-white/10 cursor-pointer whitespace-nowrap"
              >
                페달 밟기
              </button>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((g) => (
                  <button
                    key={g}
                    onClick={() => onSetBicycleGear(g)}
                    className={`px-2 py-1 rounded text-xs font-mono-tabular cursor-pointer ${
                      state.bicycleGear === g
                        ? 'bg-sky-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {g}단
                  </button>
                ))}
              </div>
              <span className="font-mono-tabular text-xs text-rose-300">
                {state.plants.bicycle.currentMw.toFixed(1)} MW
              </span>
            </div>
            {contextualButtons}
          </div>
        );

      case 'hydro':
        return (
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[230px]">
              <Droplets className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-xs text-slate-300 whitespace-nowrap">수문</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(state.hydroGateOpen * 100)}
                onChange={(e) => onSetHydroGate(Number(e.target.value) / 100)}
                className="energy-slider flex-1 min-w-[100px] max-w-[170px]"
              />
              <span className="font-mono-tabular text-xs text-sky-300 w-9 text-right">
                {Math.round(state.hydroGateOpen * 100)}%
              </span>
              <button
                onClick={() => onSetHydroGate(state.hydroGateOpen > 0.5 ? 0 : 1)}
                className="px-3 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                {state.hydroGateOpen > 0.5 ? '수문 닫기' : '수문 열기'}
              </button>
              <span className="font-mono-tabular text-xs text-sky-300">
                {state.plants.hydro.currentMw.toFixed(1)} MW
              </span>
            </div>
            {contextualButtons}
          </div>
        );

      case 'thermal':
        return (
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <Flame className="w-4 h-4 text-orange-400 shrink-0" />
              <button
                onClick={onAddCoal}
                className="px-3 py-1.5 rounded-lg bg-orange-400 hover:bg-orange-300 text-slate-950 text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                석탄 투입
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 whitespace-nowrap">송풍</span>
                <input
                  type="range"
                  min={25}
                  max={100}
                  value={Math.round(state.thermalDamper * 100)}
                  onChange={(e) => onSetThermalDamper(Number(e.target.value) / 100)}
                  className="energy-slider w-20"
                />
              </div>
              <span className="font-mono-tabular text-xs text-orange-300">
                연료 {Math.round(state.thermalCoalFuel)}% · 증기{' '}
                {Math.round(state.thermalSteamPressure * 100)}% ·{' '}
                {state.plants.thermal.currentMw.toFixed(1)} MW
              </span>
            </div>
            {contextualButtons}
          </div>
        );

      case 'wave':
        return (
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <Waves className="w-4 h-4 text-cyan-400 shrink-0" />
              <button
                onClick={onTriggerWave}
                className="px-3 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                파도 일으키기
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 whitespace-nowrap">감도</span>
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={Math.round(state.waveSensitivity * 100)}
                  onChange={(e) => onSetWaveSensitivity(Number(e.target.value) / 100)}
                  className="energy-slider w-20"
                />
              </div>
              <span className="font-mono-tabular text-xs text-cyan-300">
                {state.plants.wave.currentMw.toFixed(1)} MW
              </span>
            </div>
            {contextualButtons}
          </div>
        );

      case 'nuclear':
        return (
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[230px]">
              <Radiation className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs text-slate-300 whitespace-nowrap">제어봉 인출</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(state.nuclearRodWithdraw * 100)}
                onChange={(e) => onSetNuclearRods(Number(e.target.value) / 100)}
                className="energy-slider flex-1 min-w-[100px] max-w-[170px]"
              />
              <span className="font-mono-tabular text-xs text-emerald-300 w-9 text-right">
                {Math.round(state.nuclearRodWithdraw * 100)}%
              </span>
              <span className="font-mono-tabular text-xs text-emerald-300">
                증기 {Math.round(state.nuclearSteamPressure * 100)}% ·{' '}
                {state.plants.nuclear.currentMw.toFixed(1)} MW
              </span>
            </div>
            {contextualButtons}
          </div>
        );

      default:
        return null;
    }
  };

  const renderTabBody = () => {
    switch (activeTab) {
      case 'generate':
        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {PLANT_ITEMS.map((item) => {
                const mw = state.plants[item.key].currentMw;
                const active =
                  !state.energyView && state.currentStageIndex === item.index;
                return (
                  <button
                    key={item.key}
                    onClick={() => onSelectStage(item.index)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer border ${
                      active
                        ? 'bg-amber-400 text-slate-950 font-semibold border-amber-300'
                        : 'bg-slate-800/85 text-slate-200 hover:bg-slate-700 border-white/10'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`font-mono-tabular text-[11px] ${
                        active
                          ? 'text-slate-900'
                          : mw > 0.2
                          ? 'text-amber-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {mw.toFixed(1)}
                    </span>
                  </button>
                );
              })}
            </div>
            {renderPlantOperationRow()}
          </div>
        );

      case 'power':
        return (
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200">
              <span>
                {activePlants.length > 0
                  ? `${activePlants.map((p) => p.label).join(' · ')} (${state.totalMw.toFixed(
                      1
                    )} MW) → 중앙 변전소 → 도시 배전 (${Math.round(
                      state.cityPowerRatio * 100
                    )}%)`
                  : '현재 송전 중인 발전소가 없습니다. 발전소를 가동하면 송전선에 에너지가 흐릅니다.'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onToggleFlowHighlight(!state.flowHighlight)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer whitespace-nowrap transition-colors ${
                  state.flowHighlight
                    ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 border-cyan-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-cyan-400/35'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {state.flowHighlight ? '전력 흐름 강조 끄기' : '전력 흐름 강조'}
                </span>
              </button>

              <button
                onClick={onToggleEnergyView}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer whitespace-nowrap transition-colors ${
                  state.energyView
                    ? 'bg-sky-400 hover:bg-sky-300 text-slate-950 border-sky-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border-sky-400/35'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{state.energyView ? '1인칭 체험으로' : 'Energy View'}</span>
              </button>

              <button
                onClick={() => onSelectStage(6)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium border border-white/10 cursor-pointer whitespace-nowrap"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>중앙 변전소 시점</span>
              </button>

              <button
                onClick={onOpenCityDashboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>전력망 관제 · 그래프</span>
              </button>
            </div>
          </div>
        );

      case 'city': {
        const { cityLevels } = state;
        const zoneStatus = [
          { label: '가로등', on: cityLevels.streetlights },
          { label: '교통신호', on: cityLevels.traffic },
          { label: '아파트·학교', on: cityLevels.residential || cityLevels.school },
          { label: '상점', on: cityLevels.shops },
          { label: '공장', on: cityLevels.factory },
          { label: '도시 전체', on: cityLevels.fullCity },
        ];

        return (
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-400 mr-1">도시 반응:</span>
              {zoneStatus.map((z) => (
                <span
                  key={z.label}
                  className={`px-2 py-0.5 rounded border font-medium whitespace-nowrap ${
                    state.cityLit && z.on
                      ? 'bg-amber-400/15 border-amber-400/40 text-amber-300'
                      : 'bg-slate-900/70 border-white/10 text-slate-500'
                  }`}
                >
                  {z.label}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onToggleLight('city')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer whitespace-nowrap ${
                  state.cityLit
                    ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-400/35'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{state.cityLit ? '도시 배전 조명 끄기' : '도시 배전 조명 켜기'}</span>
              </button>

              <button
                onClick={() => onToggleEnterSeoul(!state.inSeoulModel)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer whitespace-nowrap ${
                  state.inSeoulModel
                    ? 'bg-sky-400 hover:bg-sky-300 text-slate-950 border-sky-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-white/10'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{state.inSeoulModel ? '전망대로 복귀' : '도시 안으로 들어가기'}</span>
              </button>

              <button
                onClick={onOpenCityDashboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>전력망 관제 · 그래프</span>
              </button>
            </div>
          </div>
        );
      }

      case 'observe':
      default:
        return (
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onSelectObservatory}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>전체 전경으로</span>
              </button>

              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-800/90 border border-white/10">
                <button
                  onClick={onZoomOut}
                  className="p-1.5 rounded text-slate-200 hover:text-white hover:bg-slate-700 cursor-pointer"
                  aria-label="시점 축소"
                  title="시점 축소"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono-tabular text-xs text-slate-200 px-1.5">
                  {zoomPercent}%
                </span>
                <button
                  onClick={onZoomIn}
                  className="p-1.5 rounded text-slate-200 hover:text-white hover:bg-slate-700 cursor-pointer"
                  aria-label="시점 확대"
                  title="시점 확대"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onResetZoom}
                  className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
                  aria-label="줌 초기화"
                  title="줌 초기화"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onToggleMute}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium border border-white/10 cursor-pointer whitespace-nowrap"
              >
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>{muted ? '소리 켜기' : '소리 끄기'}</span>
              </button>

              <button
                onClick={() => onOpenExplanation(currentStage.index)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-medium border border-white/10 cursor-pointer whitespace-nowrap"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>현재 원리</span>
              </button>

              <button
                onClick={onOpenTutorial}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium border border-white/10 cursor-pointer whitespace-nowrap"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>안내</span>
              </button>
            </div>
          </div>
        );
    }
  };

  const tabs: { id: DockTab; label: string }[] = [
    { id: 'generate', label: '발전' },
    { id: 'power', label: '전력' },
    { id: 'city', label: '도시' },
    { id: 'observe', label: '관찰' },
  ];

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center w-[min(740px,calc(100vw-240px))] max-md:w-[min(420px,calc(100vw-170px))] max-md:left-auto max-md:right-4 max-md:translate-x-0 pointer-events-none">
      <button
        onClick={() => setCollapsed((v) => !v)}
        style={{ backgroundColor: 'rgba(9, 13, 22, 0.86)' }}
        className="pointer-events-auto mb-1.5 px-3 py-1 rounded-lg border border-white/12 text-[11px] font-medium text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
      >
        {collapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" />
            <span>컨트롤 열기</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" />
            <span>컨트롤 숨기기</span>
          </>
        )}
      </button>

      {!collapsed && (
        <div
          style={{ backgroundColor: 'rgba(9, 13, 22, 0.88)' }}
          className="pointer-events-auto w-full rounded-xl border border-white/12 p-3 flex flex-col gap-2.5"
        >
          {/* 4-Category Tab Header */}
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10">
            <div className="flex items-center gap-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-sky-400 text-slate-950'
                        : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 shrink-0">
              <span className="hidden sm:inline truncate max-w-[200px]">
                {state.energyView ? '전체 전력망 조감' : currentStage.shortTitle}
              </span>
              <span className="font-mono-tabular text-amber-300 font-medium whitespace-nowrap">
                {state.totalMw.toFixed(1)} MW
              </span>
            </div>
          </div>

          {/* Active Group Controls */}
          <div>{renderTabBody()}</div>
        </div>
      )}
    </div>
  );
};
