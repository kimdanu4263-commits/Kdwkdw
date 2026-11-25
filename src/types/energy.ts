export type StageId =
  | 'coil'
  | 'bicycle'
  | 'hydro'
  | 'thermal'
  | 'wave'
  | 'nuclear'
  | 'city';

export type PlantKey = 'coil' | 'bicycle' | 'hydro' | 'thermal' | 'wave' | 'nuclear';

export interface ExplanationStep {
  stepNum: number;
  title: string;
  desc: string;
}

export interface PlantExplanation {
  title: string;
  kidSummary: string;
  steps: ExplanationStep[];
  operationTip: string;
}

export interface StageMeta {
  id: StageId;
  index: number;
  title: string;
  shortTitle: string;
  subtitle: string;
  centerPos: [number, number, number];
  spawnPos: [number, number, number];
  spawnYaw: number;
  terminalOffset: [number, number, number];
  explanation: PlantExplanation;
}

// Unified Energy Valley & City Panorama:
// All 6 power plants form an open amphitheater facing North toward the Central Substation (0,0,-54)
// and the Energy City Basin (z = -62 .. -114), so generated electricity visibly flows into the city.
export const STAGES: StageMeta[] = [
  {
    id: 'coil',
    index: 0,
    title: '01. 전자기 유도 발전대',
    shortTitle: '코일·자석',
    subtitle: '자석을 잡고 코일 옆에서 흔들면 유도 전류가 송전선을 타고 도시 가로등을 밝힙니다',
    centerPos: [-13, 0, -14],
    spawnPos: [-13, 1.7, -8.5],
    spawnYaw: 0,
    terminalOffset: [0.55, 1.85, -1.65],
    explanation: {
      title: '코일과 자석으로 전기가 만들어져 도시로 가는 과정',
      kidSummary: '자석이 코일 근처에서 움직이면 전기가 생기고, 이 전기가 송전선을 타고 도시의 가로등에 전달돼요!',
      steps: [
        { stepNum: 1, title: '자석 흔들기', desc: '자석을 손으로 잡고 코일 옆에서 좌우로 빠르게 왕복시킵니다.' },
        { stepNum: 2, title: '자기장 변화 · 유도 전류', desc: '코일을 통과하는 자기장이 변하면서 구리선 속에 전류가 흐르기 시작합니다.' },
        { stepNum: 3, title: '송전선 이동', desc: '만들어진 전기가 빛나는 에너지 입자가 되어 중앙 변전소로 흘러갑니다.' },
        { stepNum: 4, title: '가로등 점등', desc: '변전소를 거친 전기가 도시의 가로등 불빛을 하나씩 켭니다.' },
      ],
      operationTip: '자석을 빠르게 흔들수록 빛나는 전기 흐름이 굵어지며 도시 앞쪽 가로등이 켜집니다.',
    },
  },
  {
    id: 'bicycle',
    index: 1,
    title: '02. 자전거 발전기',
    shortTitle: '자전거',
    subtitle: '자전거에 올라타 페달을 돌리면 바퀴의 회전 에너지가 전기가 되어 도시로 흘러갑니다',
    centerPos: [13, 0, -14],
    spawnPos: [13, 1.7, -8.5],
    spawnYaw: 0,
    terminalOffset: [1.15, 1.85, 0.15],
    explanation: {
      title: '자전거 페달로 전기를 만들어 보내는 과정',
      kidSummary: '페달을 밟아 바퀴를 돌리면 뒷바퀴 발전기가 전기를 만들어 송전선을 통해 도시로 보내요!',
      steps: [
        { stepNum: 1, title: '페달 회전', desc: '자전거에 타서 크랭크 핸들이나 스페이스바로 페달을 돌립니다.' },
        { stepNum: 2, title: '발전기(다이나모) 작동', desc: '뒷바퀴 회전이 소형 발전기 속 자석을 돌려 전기를 생산합니다.' },
        { stepNum: 3, title: '전력망 합류', desc: '생산된 전기가 송전탑을 타고 중앙 변전소로 이동합니다.' },
        { stepNum: 4, title: '도시 신호 · 조명 반응', desc: '공급된 전력이 도시의 가로등과 교통신호를 깨웁니다.' },
      ],
      operationTip: '자전거를 클릭해 탑승한 뒤 왼쪽 원형 페달을 빠르게 돌려보세요.',
    },
  },
  {
    id: 'hydro',
    index: 2,
    title: '03. 수력 발전소',
    shortTitle: '수력',
    subtitle: '댐 수문을 열면 높은 곳의 물이 터빈을 돌리고, 생산된 전력이 변전소를 통해 도시에 공급됩니다',
    centerPos: [-30, 0, -28],
    spawnPos: [-30, 1.7, -20.5],
    spawnYaw: -0.18,
    terminalOffset: [3.25, 1.95, -0.15],
    explanation: {
      title: '물의 힘으로 전기를 만들어 도시를 밝히는 과정',
      kidSummary: '높은 댐의 물이 떨어지며 터빈을 돌리면, 강한 전기가 송전선을 타고 도시로 흘러가요!',
      steps: [
        { stepNum: 1, title: '수문 개방', desc: '수문을 열면 위쪽 저수지의 물이 아래로 세차게 쏟아집니다.' },
        { stepNum: 2, title: '터빈 회전', desc: '떨어지는 물의 힘이 수차 터빈 날개를 빠르게 회전시킵니다.' },
        { stepNum: 3, title: '발전 · 송전', desc: '발전기에서 만든 전기가 고압 송전선을 따라 변전소로 이동합니다.' },
        { stepNum: 4, title: '도시 주거·신호 가동', desc: '전력을 받은 도시의 교통신호와 아파트·학교 조명이 켜집니다.' },
      ],
      operationTip: '수문 개방률을 높일수록 물줄기와 에너지 흐름이 강해지며 도시가 더 환해집니다.',
    },
  },
  {
    id: 'thermal',
    index: 3,
    title: '04. 화력 발전소',
    shortTitle: '화력',
    subtitle: '석탄을 화로에 넣어 물을 끓이면 강한 증기압이 터빈을 돌려 도시에 대량 전력을 보냅니다',
    centerPos: [30, 0, -28],
    spawnPos: [30, 1.7, -20.5],
    spawnYaw: 0.18,
    terminalOffset: [2.95, 2.1, -1.0],
    explanation: {
      title: '열과 증기로 전기를 만들어 도시를 움직이는 과정',
      kidSummary: '석탄 불로 끓인 뜨거운 수증기가 터빈을 돌리면, 큰 전기가 도시 상점과 공장까지 밝혀줘요!',
      steps: [
        { stepNum: 1, title: '석탄 연소', desc: '석탄을 화로에 넣으면 뜨거운 불꽃과 열기가 발생합니다.' },
        { stepNum: 2, title: '보일러 증기 발생', desc: '보일러 속 물이 끓어 고압 수증기가 파이프를 타고 분출됩니다.' },
        { stepNum: 3, title: '터빈 · 발전기 회전', desc: '증기압이 터빈을 돌려 전기를 만들고 송전선으로 내보냅니다.' },
        { stepNum: 4, title: '도시 상업 · 공장 가동', desc: '변전소에서 분배된 전력이 아파트, 상점, 공장을 깨웁니다.' },
      ],
      operationTip: '석탄을 여러 번 넣고 송풍을 높이면 증기압이 올라 도시 전력 공급이 크게 늘어납니다.',
    },
  },
  {
    id: 'wave',
    index: 4,
    title: '05. 파력 발전소',
    shortTitle: '파력',
    subtitle: '바다 수면을 건드려 파도를 일으키면 부표가 발전기를 움직여 청정 전기를 송전합니다',
    centerPos: [-21, 0, -43],
    spawnPos: [-21, 1.7, -35.5],
    spawnYaw: -0.14,
    terminalOffset: [2.8, 3.25, -1.2],
    explanation: {
      title: '바다 파도로 전기를 만들어 보내는 과정',
      kidSummary: '출렁이는 파도가 부표를 위아래로 움직이면, 그 힘이 전기로 바뀌어 도시로 전달돼요!',
      steps: [
        { stepNum: 1, title: '파도 일으키기', desc: '바다 수면을 클릭하거나 드래그해 물결 파동을 만듭니다.' },
        { stepNum: 2, title: '부표 피스톤 작동', desc: '파도를 탄 부표가 위아래로 흔들리며 발전 피스톤을 펌프질합니다.' },
        { stepNum: 3, title: '송전망 에너지 전달', desc: '파도 에너지로 만든 전기가 빛나는 입자 흐름으로 변전소에 들어갑니다.' },
        { stepNum: 4, title: '도시 전력 보강', desc: '청정 파력 전기가 도시 전력망의 부하를 분담해 시설을 유지합니다.' },
      ],
      operationTip: '수면을 여러 곳에 건드리면 연속적인 파도가 만들어져 발전 흐름이 이어집니다.',
    },
  },
  {
    id: 'nuclear',
    index: 5,
    title: '06. 원자력 발전소',
    shortTitle: '원자력',
    subtitle: '제어봉을 인출하면 핵분열 열기가 증기 터빈을 돌려 도시 전체를 밝힐 강력한 전력을 보냅니다',
    centerPos: [21, 0, -43],
    spawnPos: [21, 1.7, -35.5],
    spawnYaw: 0.14,
    terminalOffset: [3.65, 2.15, -1.1],
    explanation: {
      title: '핵분열 열로 도시 전체의 전기를 만드는 과정',
      kidSummary: '제어봉을 올리면 원자로의 큰 열이 물을 끓여 강력한 증기 터빈을 돌리고, 도시 전체가 환하게 살아나요!',
      steps: [
        { stepNum: 1, title: '제어봉 인출', desc: '제어봉을 위로 올리면 중성자가 우라늄 핵분열 반응을 일으킵니다.' },
        { stepNum: 2, title: '열교환 · 고압 증기', desc: '뜨거운 냉각수가 증기 발생기의 물을 끓여 고압 수증기를 만듭니다.' },
        { stepNum: 3, title: '대용량 발전 · 송전', desc: '대형 터빈과 발전기가 거대한 전력을 생산해 변전소로 보냅니다.' },
        { stepNum: 4, title: '도시 전체 활성화', desc: '충분한 전력이 도시에 공급되어 공장·상점·고층빌딩·다리까지 모두 켜집니다.' },
      ],
      operationTip: '제어봉 인출 비율을 조절하면서 도시 건물이 단계적으로 켜지고 꺼지는 변화를 관찰하세요.',
    },
  },
  {
    id: 'city',
    index: 6,
    title: '07. 중앙 변전소 · 에너지 도시',
    shortTitle: '도시·변전소',
    subtitle: '6개 발전소에서 모인 전기가 중앙 변전소를 거쳐 가로등·학교·아파트·상점·공장을 움직입니다',
    centerPos: [0, 0, -86],
    spawnPos: [0, 4.2, -55.0],
    spawnYaw: 0,
    terminalOffset: [0, 2.5, -54.0],
    explanation: {
      title: '전기가 변전소를 거쳐 도시를 움직이는 과정',
      kidSummary: '발전소에서 온 전기가 중앙 변전소에 모인 뒤, 가로등·신호등·아파트·학교·상점·공장으로 나뉘어 전달돼요!',
      steps: [
        { stepNum: 1, title: '발전소 전력 집결', desc: '여러 발전소에서 생산된 전기가 송전선을 타고 중앙 변전소로 모입니다.' },
        { stepNum: 2, title: '변전소 배전', desc: '변전소가 도시에서 사용할 수 있는 전압으로 바꾸어 각 구역으로 보냅니다.' },
        { stepNum: 3, title: '단계적 도시 반응', desc: '전력이 늘어날수록 가로등 → 교통신호 → 아파트·학교 → 상점·공장이 차례로 작동합니다.' },
        { stepNum: 4, title: '수급 균형 관찰', desc: '발전량을 줄이면 전력이 부족해져 일부 도시 시설의 불이 다시 꺼집니다.' },
      ],
      operationTip: 'Energy View를 누르면 발전소 → 송전선 → 변전소 → 도시 전체 흐름을 한눈에 볼 수 있습니다.',
    },
  },
];

export interface PlantControlState {
  enabled: boolean;
  throttle: number;
  currentMw: number;
}

export interface TelemetryPoint {
  time: number;
  totalMw: number;
  demandMw: number;
  coil: number;
  bicycle: number;
  hydro: number;
  thermal: number;
  wave: number;
  nuclear: number;
}

export interface CityStatusLevels {
  streetlights: boolean;
  traffic: boolean;
  residential: boolean;
  school: boolean;
  shops: boolean;
  factory: boolean;
  fullCity: boolean;
}

export interface SimulationState {
  currentStageIndex: number;
  unlockedStageIndex: number;
  energyView: boolean;
  flowHighlight: boolean;
  inSeoulModel: boolean;
  totalMw: number;
  totalGenerated: number;
  bulbLit: Record<StageId, boolean>;
  cityLit: boolean;
  fov: number;

  magnetFlux: number;
  bicycleRiding: boolean;
  bicycleRpm: number;
  bicycleGear: number;
  hydroGateOpen: number;
  hydroTurbulence: number;
  thermalCoalFuel: number;
  thermalTempC: number;
  thermalSteamPressure: number;
  thermalDamper: number;
  waveEnergyLevel: number;
  waveSensitivity: number;
  nuclearRodWithdraw: number;
  nuclearCoreTempC: number;
  nuclearSteamPressure: number;

  plants: Record<PlantKey, PlantControlState>;
  cityDemandMw: number;
  cityPowerRatio: number;
  cityLevels: CityStatusLevels;

  nearbyHint: string | null;
}
