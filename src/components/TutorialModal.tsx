import React, { useState } from 'react';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  HelpCircle,
  Wrench,
  X,
  Zap,
} from 'lucide-react';

interface TutorialModalProps {
  open: boolean;
  onClose: () => void;
}

const TUTORIAL_STEPS = [
  {
    badge: '1. 어두운 도시 관찰',
    title: '전력이 부족한 도시에서 시작합니다',
    icon: Building2,
    accent: 'text-sky-400',
    bgAccent: 'bg-sky-500/15 border-sky-400/30',
    description:
      '처음 화면에는 가로등, 아파트, 학교, 상점, 공장, 교통신호가 어둡게 대기 중인 도시가 보입니다. 발전소들이 아직 가동되지 않았기 때문입니다.',
    tip: '화면을 드래그해 주변을 둘러보고, 왼쪽 아래 방향 버튼(또는 WASD)으로 발전소 쪽으로 걸어가 보세요.',
  },
  {
    badge: '2. 발전 장치 직접 조작',
    title: '6가지 발전 방식으로 전기를 만듭니다',
    icon: Wrench,
    accent: 'text-amber-400',
    bgAccent: 'bg-amber-500/15 border-amber-400/30',
    description:
      '코일 옆 자석 흔들기, 자전거 페달 돌리기, 수력 댐 수문 열기, 화력 보일러 석탄 투입, 파력 바다 파도 일으키기, 원자력 제어봉 인출을 직접 조작해 보세요.',
    tip: '하단 바의 발전소 이름을 누르면 원하는 발전소로 즉시 이동할 수 있습니다.',
  },
  {
    badge: '3. 전기의 이동과 도시 반응',
    title: '전기가 송전선을 타고 도시를 깨웁니다',
    icon: Zap,
    accent: 'text-emerald-400',
    bgAccent: 'bg-emerald-500/15 border-emerald-400/30',
    description:
      '만들어진 전기는 빛나는 에너지 입자 흐름이 되어 송전탑과 중앙 변전소를 거쳐 도시로 들어갑니다. 전력량에 따라 가로등 → 교통신호 → 아파트·학교 → 상점·공장이 차례로 살아납니다.',
    tip: '반대로 수문을 닫거나 발전기를 끄면 전력이 줄어들며 도시 시설이 다시 어두워집니다.',
  },
  {
    badge: '4. Energy View 한눈에 보기',
    title: '발전 → 송전 → 소비 연결을 위에서 관찰하세요',
    icon: Eye,
    accent: 'text-cyan-400',
    bgAccent: 'bg-cyan-500/15 border-cyan-400/30',
    description:
      '오른쪽 위의 [Energy View] 버튼을 누르면 카메라가 하늘 위로 올라가 6개 발전소, 송전망, 변전소, 그리고 도시 전체의 전기 흐름을 한 화면에서 보여줍니다.',
    tip: '전력망 관제 패널에서 각 발전소를 끄고 켜며 실시간 출력 변화도 확인할 수 있습니다.',
  },
];

export const TutorialModal: React.FC<TutorialModalProps> = ({ open, onClose }) => {
  const [stepIdx, setStepIdx] = useState(0);

  if (!open) return null;

  const step = TUTORIAL_STEPS[stepIdx];
  const Icon = step.icon;
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === TUTORIAL_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div
        style={{ backgroundColor: 'rgba(10, 15, 26, 0.98)' }}
        className="w-full max-w-lg rounded-2xl border border-white/15 p-5 sm:p-6 text-slate-100"
      >
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-sky-400 shrink-0" />
            <h2 className="text-base font-bold text-white">
              에너지 도시 시뮬레이션 안내
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
            aria-label="안내 닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-1.5">
          {TUTORIAL_STEPS.map((s, idx) => (
            <button
              key={s.badge}
              onClick={() => setStepIdx(idx)}
              className={`h-1.5 flex-1 rounded-full transition-colors cursor-pointer ${
                idx === stepIdx
                  ? 'bg-sky-400'
                  : idx < stepIdx
                  ? 'bg-amber-400'
                  : 'bg-slate-800'
              }`}
              aria-label={`${idx + 1}번 안내`}
            />
          ))}
        </div>

        <div className={`mt-4 rounded-xl border p-4 ${step.bgAccent}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-center shrink-0">
              <Icon className={`w-5 h-5 ${step.accent}`} />
            </div>
            <div>
              <div className={`text-xs font-bold ${step.accent}`}>{step.badge}</div>
              <h3 className="text-base font-bold text-white mt-0.5">{step.title}</h3>
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-200 leading-relaxed">
            {step.description}
          </p>

          <div className="mt-3 p-2.5 rounded-lg bg-slate-950/65 border border-white/10 text-xs text-slate-300 leading-relaxed">
            {step.tip}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="font-mono-tabular text-xs text-slate-400">
            {stepIdx + 1} / {TUTORIAL_STEPS.length}
          </span>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>이전</span>
              </button>
            )}

            {isLast ? (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-bold cursor-pointer"
              >
                닫기
              </button>
            ) : (
              <button
                onClick={() =>
                  setStepIdx((i) => Math.min(TUTORIAL_STEPS.length - 1, i + 1))
                }
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                <span>다음</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
