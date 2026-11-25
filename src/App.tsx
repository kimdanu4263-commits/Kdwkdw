import { useCallback, useEffect, useRef, useState } from 'react';
import { EnergyWorldEngine } from './three/EnergyWorldEngine';
import { PlantKey, SimulationState, StageId, TelemetryPoint } from './types/energy';
import { DPadControls } from './components/DPadControls';
import { BicycleCrankControl } from './components/BicycleCrankControl';
import { TopHud } from './components/TopHud';
import { BottomControlDock } from './components/BottomControlDock';
import { CityDashboardModal } from './components/CityDashboardModal';
import { PrincipleModal } from './components/PrincipleModal';
import { TutorialModal } from './components/TutorialModal';
import { soundEngine } from './utils/audio';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<EnergyWorldEngine | null>(null);

  const [simState, setSimState] = useState<SimulationState | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);
  const [muted, setMuted] = useState(false);
  const [cityDashboardOpen, setCityDashboardOpen] = useState(false);
  const [explanationStageIdx, setExplanationStageIdx] = useState<number | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new EnergyWorldEngine(
      container,
      (nextState, nextTelemetry) => {
        setSimState(nextState);
        setTelemetry(nextTelemetry);
      },
      (stageIndex) => {
        setExplanationStageIdx(stageIndex);
      },
      () => {
        setCityDashboardOpen(true);
      }
    );
    engineRef.current = engine;

    const canvas = container.querySelector('canvas');
    const onLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onRestored = () => {
      setContextLost(false);
    };
    canvas?.addEventListener('webglcontextlost', onLost);
    canvas?.addEventListener('webglcontextrestored', onRestored);

    return () => {
      canvas?.removeEventListener('webglcontextlost', onLost);
      canvas?.removeEventListener('webglcontextrestored', onRestored);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleMoveChange = useCallback((x: number, y: number) => {
    engineRef.current?.setMoveInput(x, y);
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleSelectStage = useCallback((index: number) => {
    engineRef.current?.teleportToStage(index);
  }, []);

  const handleSelectObservatory = useCallback(() => {
    engineRef.current?.teleportToObservatory();
  }, []);

  const handleToggleLight = useCallback((id: StageId) => {
    engineRef.current?.toggleRoomLight(id);
  }, []);

  const handleToggleEnterSeoul = useCallback((enter: boolean) => {
    engineRef.current?.toggleEnterSeoul(enter);
  }, []);

  const handleToggleEnergyView = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.setEnergyView(!engineRef.current.state.energyView);
  }, []);

  const handleToggleFlowHighlight = useCallback((enabled: boolean) => {
    engineRef.current?.setFlowHighlight(enabled);
  }, []);

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#03060c]">
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {contextLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#03060c] text-slate-200 text-sm">
          3D 그래픽 컨텍스트를 복구하는 중입니다...
        </div>
      )}

      {simState && (
        <>
          <TopHud
            state={simState}
            onToggleEnergyView={handleToggleEnergyView}
            onOpenDashboard={() => setCityDashboardOpen(true)}
            onOpenTutorial={() => setTutorialOpen(true)}
          />

          {simState.bicycleRiding ? (
            <BicycleCrankControl
              rpm={simState.bicycleRpm}
              onCrankSpin={(delta) => engineRef.current?.applyCrankDelta(delta)}
              onExitBicycle={() => engineRef.current?.setBicycleRiding(false)}
            />
          ) : (
            <DPadControls onMoveChange={handleMoveChange} />
          )}

          <BottomControlDock
            state={simState}
            muted={muted}
            onToggleMute={handleToggleMute}
            onToggleEnergyView={handleToggleEnergyView}
            onToggleFlowHighlight={handleToggleFlowHighlight}
            onSelectStage={handleSelectStage}
            onSelectObservatory={handleSelectObservatory}
            onToggleLight={handleToggleLight}
            onToggleEnterSeoul={handleToggleEnterSeoul}
            onOpenExplanation={(idx) => setExplanationStageIdx(idx)}
            onOpenTutorial={() => setTutorialOpen(true)}
            onZoomIn={() => engineRef.current?.zoomIn()}
            onZoomOut={() => engineRef.current?.zoomOut()}
            onResetZoom={() => engineRef.current?.resetZoom()}
            onShakeMagnet={(dir) => engineRef.current?.shakeMagnetStep(dir)}
            onPedalTap={() => engineRef.current?.pedalBicycleImpulse()}
            onToggleBicycleRide={(riding) =>
              engineRef.current?.setBicycleRiding(riding)
            }
            onSetBicycleGear={(gear) => engineRef.current?.setBicycleGear(gear)}
            onSetHydroGate={(val) => engineRef.current?.setHydroGate(val)}
            onAddCoal={() => engineRef.current?.addCoal(28)}
            onSetThermalDamper={(val) => engineRef.current?.setThermalDamper(val)}
            onTriggerWave={() => engineRef.current?.triggerManualWave()}
            onSetWaveSensitivity={(val) =>
              engineRef.current?.setWaveSensitivity(val)
            }
            onSetNuclearRods={(val) => engineRef.current?.setNuclearRods(val)}
            onOpenCityDashboard={() => setCityDashboardOpen(true)}
          />

          <CityDashboardModal
            open={cityDashboardOpen}
            state={simState}
            telemetry={telemetry}
            onClose={() => setCityDashboardOpen(false)}
            onTogglePlant={(plant: PlantKey, enabled: boolean) =>
              engineRef.current?.setPlantEnabled(plant, enabled)
            }
            onChangeThrottle={(plant: PlantKey, throttle: number) =>
              engineRef.current?.setPlantThrottle(plant, throttle)
            }
          />

          <PrincipleModal
            stageIndex={explanationStageIdx}
            onClose={() => setExplanationStageIdx(null)}
          />

          <TutorialModal
            open={tutorialOpen}
            onClose={() => setTutorialOpen(false)}
          />
        </>
      )}
    </main>
  );
}
