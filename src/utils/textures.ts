import * as THREE from 'three';

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export interface ProceduralTextureSet {
  concreteFloor: THREE.CanvasTexture;
  brushedMetal: THREE.CanvasTexture;
  copperWire: THREE.CanvasTexture;
  hazardStripe: THREE.CanvasTexture;
  coalSurface: THREE.CanvasTexture;
  cityBuildingFacade: THREE.CanvasTexture;
  cityBuildingEmissive: THREE.CanvasTexture;
  asphaltRoad: THREE.CanvasTexture;
  particleGlow: THREE.CanvasTexture;
  waterDroplet: THREE.CanvasTexture;
  galvanometerDial: THREE.CanvasTexture;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  // 1. Concrete industrial floor with grid seams & subtle speckle
  const [floorC, floorCtx] = createCanvas(512, 512);
  floorCtx.fillStyle = '#222834';
  floorCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4000; i++) {
    const v = 26 + Math.floor(Math.random() * 24);
    floorCtx.fillStyle = `rgb(${v},${v + 4},${v + 10})`;
    floorCtx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  floorCtx.strokeStyle = 'rgba(10, 14, 22, 0.75)';
  floorCtx.lineWidth = 4;
  for (let p = 0; p <= 512; p += 128) {
    floorCtx.beginPath();
    floorCtx.moveTo(p, 0);
    floorCtx.lineTo(p, 512);
    floorCtx.stroke();
    floorCtx.beginPath();
    floorCtx.moveTo(0, p);
    floorCtx.lineTo(512, p);
    floorCtx.stroke();
  }
  const concreteFloor = new THREE.CanvasTexture(floorC);
  concreteFloor.wrapS = concreteFloor.wrapT = THREE.RepeatWrapping;
  concreteFloor.repeat.set(8, 28);
  concreteFloor.colorSpace = THREE.SRGBColorSpace;
  concreteFloor.anisotropy = maxAnisotropy;

  // 2. Brushed steel / metal
  const [metalC, metalCtx] = createCanvas(256, 256);
  metalCtx.fillStyle = '#8b95a5';
  metalCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y++) {
    const shade = 120 + Math.floor(Math.random() * 45);
    metalCtx.fillStyle = `rgba(${shade},${shade + 5},${shade + 12},0.35)`;
    metalCtx.fillRect(0, y, 256, 1);
  }
  const brushedMetal = new THREE.CanvasTexture(metalC);
  brushedMetal.wrapS = brushedMetal.wrapT = THREE.RepeatWrapping;
  brushedMetal.colorSpace = THREE.SRGBColorSpace;
  brushedMetal.anisotropy = maxAnisotropy;

  // 3. Copper wire winding texture
  const [copC, copCtx] = createCanvas(256, 256);
  copCtx.fillStyle = '#b45a28';
  copCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 8) {
    const grad = copCtx.createLinearGradient(0, y, 0, y + 8);
    grad.addColorStop(0, '#5a2208');
    grad.addColorStop(0.35, '#e88b50');
    grad.addColorStop(0.6, '#f6b888');
    grad.addColorStop(1, '#4b1c06');
    copCtx.fillStyle = grad;
    copCtx.fillRect(0, y, 256, 8);
  }
  const copperWire = new THREE.CanvasTexture(copC);
  copperWire.wrapS = copperWire.wrapT = THREE.RepeatWrapping;
  copperWire.repeat.set(3, 6);
  copperWire.colorSpace = THREE.SRGBColorSpace;
  copperWire.anisotropy = maxAnisotropy;

  // 4. Industrial hazard stripe
  const [hazC, hazCtx] = createCanvas(256, 64);
  hazCtx.fillStyle = '#eab308';
  hazCtx.fillRect(0, 0, 256, 64);
  hazCtx.fillStyle = '#111827';
  for (let x = -64; x < 320; x += 32) {
    hazCtx.beginPath();
    hazCtx.moveTo(x, 0);
    hazCtx.lineTo(x + 16, 0);
    hazCtx.lineTo(x - 16, 64);
    hazCtx.lineTo(x - 32, 64);
    hazCtx.closePath();
    hazCtx.fill();
  }
  const hazardStripe = new THREE.CanvasTexture(hazC);
  hazardStripe.wrapS = hazardStripe.wrapT = THREE.RepeatWrapping;
  hazardStripe.repeat.set(4, 1);
  hazardStripe.colorSpace = THREE.SRGBColorSpace;
  hazardStripe.anisotropy = maxAnisotropy;

  // 5. Coal rough texture
  const [coalC, coalCtx] = createCanvas(256, 256);
  coalCtx.fillStyle = '#14161a';
  coalCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) {
    const v = 12 + Math.floor(Math.random() * 28);
    coalCtx.fillStyle = `rgb(${v},${v},${v + 2})`;
    coalCtx.fillRect(Math.random() * 256, Math.random() * 256, 4, 4);
  }
  const coalSurface = new THREE.CanvasTexture(coalC);
  coalSurface.wrapS = coalSurface.wrapT = THREE.RepeatWrapping;
  coalSurface.colorSpace = THREE.SRGBColorSpace;

  // 6. Photorealistic Seoul Architectural Facade & Interior Window Emissive Map
  const [bldgC, bldgCtx] = createCanvas(512, 512);
  const [bldgEmC, bldgEmCtx] = createCanvas(512, 512);

  // Subtle vertical concrete/glass cladding gradient
  const wallGrad = bldgCtx.createLinearGradient(0, 0, 0, 512);
  wallGrad.addColorStop(0, '#2a3444');
  wallGrad.addColorStop(0.5, '#1f2836');
  wallGrad.addColorStop(1, '#141a24');
  bldgCtx.fillStyle = wallGrad;
  bldgCtx.fillRect(0, 0, 512, 512);

  bldgEmCtx.fillStyle = '#000000';
  bldgEmCtx.fillRect(0, 0, 512, 512);

  const cols = 16;
  const rows = 32;
  const cw = 512 / cols;
  const rh = 512 / rows;

  // Floor slab spandrel bands
  for (let r = 0; r < rows; r++) {
    bldgCtx.fillStyle = r % 8 === 0 ? '#111620' : '#263142';
    bldgCtx.fillRect(0, r * rh, 512, 3);
  }
  // Vertical structural mullions
  for (let c = 0; c < cols; c++) {
    bldgCtx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    bldgCtx.fillRect(c * cw, 0, 2, 512);
  }

  for (let r = 1; r < rows - 1; r++) {
    const floorActive = Math.random() > 0.15;
    for (let c = 0; c < cols; c++) {
      const wx = c * cw + 3;
      const wy = r * rh + 4;
      const ww = cw - 6;
      const wh = rh - 7;
      bldgCtx.fillStyle = '#0c1320';
      bldgCtx.fillRect(wx, wy, ww, wh);

      if (floorActive && Math.random() > 0.34) {
        const tone = Math.random();
        let col = '#fde68a';
        if (tone > 0.82) col = '#bfdbfe';
        else if (tone > 0.55) col = '#fcd34d';
        else if (tone > 0.28) col = '#fffbeb';
        else col = '#fed7aa';
        bldgEmCtx.fillStyle = col;
        bldgEmCtx.fillRect(wx + 1, wy + 1, ww - 2, wh - 2);
      }
    }
  }
  const cityBuildingFacade = new THREE.CanvasTexture(bldgC);
  cityBuildingFacade.wrapS = cityBuildingFacade.wrapT = THREE.RepeatWrapping;
  cityBuildingFacade.colorSpace = THREE.SRGBColorSpace;
  cityBuildingFacade.anisotropy = maxAnisotropy;

  const cityBuildingEmissive = new THREE.CanvasTexture(bldgEmC);
  cityBuildingEmissive.wrapS = cityBuildingEmissive.wrapT = THREE.RepeatWrapping;
  cityBuildingEmissive.colorSpace = THREE.SRGBColorSpace;
  cityBuildingEmissive.anisotropy = maxAnisotropy;

  // 7. Asphalt road
  const [roadC, roadCtx] = createCanvas(256, 256);
  roadCtx.fillStyle = '#13161d';
  roadCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2000; i++) {
    const v = 16 + Math.floor(Math.random() * 18);
    roadCtx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    roadCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  roadCtx.fillStyle = '#e2e8f0';
  roadCtx.fillRect(124, 16, 8, 96);
  roadCtx.fillRect(124, 144, 8, 96);
  const asphaltRoad = new THREE.CanvasTexture(roadC);
  asphaltRoad.wrapS = asphaltRoad.wrapT = THREE.RepeatWrapping;
  asphaltRoad.colorSpace = THREE.SRGBColorSpace;
  asphaltRoad.anisotropy = maxAnisotropy;

  // 8. Soft radial particle glow
  const [pC, pCtx] = createCanvas(64, 64);
  const pGrad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
  pGrad.addColorStop(0, 'rgba(255,255,255,1)');
  pGrad.addColorStop(0.3, 'rgba(255,255,255,0.85)');
  pGrad.addColorStop(0.7, 'rgba(255,255,255,0.2)');
  pGrad.addColorStop(1, 'rgba(255,255,255,0)');
  pCtx.fillStyle = pGrad;
  pCtx.fillRect(0, 0, 64, 64);
  const particleGlow = new THREE.CanvasTexture(pC);
  particleGlow.colorSpace = THREE.SRGBColorSpace;

  // 9. Soft water / steam droplet
  const [wC, wCtx] = createCanvas(64, 64);
  const wGrad = wCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
  wGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
  wGrad.addColorStop(0.5, 'rgba(210,235,255,0.55)');
  wGrad.addColorStop(1, 'rgba(200,230,255,0)');
  wCtx.fillStyle = wGrad;
  wCtx.fillRect(0, 0, 64, 64);
  const waterDroplet = new THREE.CanvasTexture(wC);
  waterDroplet.colorSpace = THREE.SRGBColorSpace;

  // 10. Analog Galvanometer Dial
  const [dialC, dialCtx] = createCanvas(256, 256);
  dialCtx.fillStyle = '#f8fafc';
  dialCtx.beginPath();
  dialCtx.arc(128, 128, 122, 0, Math.PI * 2);
  dialCtx.fill();
  dialCtx.strokeStyle = '#1e293b';
  dialCtx.lineWidth = 6;
  dialCtx.stroke();
  for (let i = -5; i <= 5; i++) {
    const ang = -Math.PI / 2 + (i / 5) * (Math.PI * 0.38);
    const r1 = 82;
    const r2 = i === 0 ? 105 : 98;
    dialCtx.strokeStyle = Math.abs(i) >= 4 ? '#ef4444' : '#0f172a';
    dialCtx.lineWidth = i === 0 ? 4 : 2.5;
    dialCtx.beginPath();
    dialCtx.moveTo(128 + Math.cos(ang) * r1, 145 + Math.sin(ang) * r1);
    dialCtx.lineTo(128 + Math.cos(ang) * r2, 145 + Math.sin(ang) * r2);
    dialCtx.stroke();
  }
  dialCtx.fillStyle = '#0f172a';
  dialCtx.font = 'bold 26px sans-serif';
  dialCtx.textAlign = 'center';
  dialCtx.fillText('VOLTS', 128, 195);
  const galvanometerDial = new THREE.CanvasTexture(dialC);
  galvanometerDial.colorSpace = THREE.SRGBColorSpace;
  galvanometerDial.anisotropy = maxAnisotropy;

  return {
    concreteFloor,
    brushedMetal,
    copperWire,
    hazardStripe,
    coalSurface,
    cityBuildingFacade,
    cityBuildingEmissive,
    asphaltRoad,
    particleGlow,
    waterDroplet,
    galvanometerDial,
  };
}
