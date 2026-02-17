// =================================================================================
// CONFIGURAÇÃO INICIAL (CENA, CÂMERA, RENDERIZADOR)
// =================================================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const player = new THREE.Group();
player.add(camera);
scene.add(player);

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("gameCanvas"),
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);

// =================================================================================
// ===== CORPO DO JOGADOR ESTILO MINECRAFT (VISÍVEL EM 1ª PESSOA) =====
// Torso parcialmente visível + 2 braços (esquerdo e direito)
// =================================================================================

// ===== Material de pele para braços =====
const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xcc8866 });
// ===== Material da camisa (torso) =====
const shirtMaterial = new THREE.MeshStandardMaterial({ color: 0x4488cc });

// ===== TORSO - visível parcialmente ao olhar para baixo =====
const torsoGeometry = new THREE.BoxGeometry(0.5, 0.7, 0.25);
const torso = new THREE.Mesh(torsoGeometry, shirtMaterial);
torso.position.set(0, -0.55, -0.15); // Abaixo e atrás da câmera
camera.add(torso);

// ===== BRAÇO DIREITO (lado direito da tela) =====
const rightArmGroup = new THREE.Group();
const rightUpperArm = new THREE.Mesh(
  new THREE.BoxGeometry(0.12, 0.35, 0.12),
  skinMaterial
);
rightUpperArm.position.set(0, -0.175, 0);
rightArmGroup.add(rightUpperArm);
// Mão direita (ponta do braço)
const rightHand = new THREE.Mesh(
  new THREE.BoxGeometry(0.13, 0.1, 0.13),
  skinMaterial
);
rightHand.position.set(0, -0.38, 0);
rightArmGroup.add(rightHand);
rightArmGroup.position.set(0.32, -0.2, -0.45); // Posição na tela à direita
camera.add(rightArmGroup);

// ===== BRAÇO ESQUERDO (lado esquerdo da tela) =====
const leftArmGroup = new THREE.Group();
const leftUpperArm = new THREE.Mesh(
  new THREE.BoxGeometry(0.12, 0.35, 0.12),
  skinMaterial
);
leftUpperArm.position.set(0, -0.175, 0);
leftArmGroup.add(leftUpperArm);
// Mão esquerda (ponta do braço)
const leftHand = new THREE.Mesh(
  new THREE.BoxGeometry(0.13, 0.1, 0.13),
  skinMaterial
);
leftHand.position.set(0, -0.38, 0);
leftArmGroup.add(leftHand);
leftArmGroup.position.set(-0.32, -0.2, -0.45); // Posição na tela à esquerda
camera.add(leftArmGroup);

// Configuração da iluminação
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
dirLight.position.set(10, 20, 5);
scene.add(dirLight);

// =================================================================================
// SISTEMA DE ÁUDIO
// =================================================================================
let audioListener = new THREE.AudioListener();
let audioLoader = new THREE.AudioLoader();
let sounds = {};
let audioInitialized = false;

camera.add(audioListener);

// Carregar sons
function loadSounds() {
  const soundFiles = {
    jump: "jump.mp3",
    collect: "collect.mp3",
    bounce: "bounce.mp3",
    footstep: "footstep.mp3",
    ambient: "ambient.mp3",
    win: "win.mp3",
  };

  Object.keys(soundFiles).forEach((name) => {
    audioLoader.load(
      `audio/${soundFiles[name]}`,
      (buffer) => {
        const sound = new THREE.Audio(audioListener);
        sound.setBuffer(buffer);
        sounds[name] = sound;
        console.log(`Som ${name} carregado com sucesso`);
      },
      undefined,
      (error) => {
        console.warn(`Som ${soundFiles[name]} não encontrado:`, error);
        // Criar som silencioso como fallback
        const sound = new THREE.Audio(audioListener);
        sounds[name] = sound;
      }
    );
  });
}

function initAudio() {
  if (!audioInitialized) {
    loadSounds();
    audioInitialized = true;
    console.log("Sistema de áudio inicializado");
  }
}

function playSound(soundName, volume = 0.5) {
  if (!audioInitialized) {
    initAudio();
  }

  if (sounds[soundName]) {
    try {
      if (sounds[soundName].isPlaying) {
        sounds[soundName].stop();
      }
      sounds[soundName].setVolume(volume);
      sounds[soundName].play();
      console.log(`Tocando som: ${soundName}`);
    } catch (error) {
      console.warn(`Erro ao tocar som ${soundName}:`, error);
    }
  } else {
    console.warn(`Som ${soundName} não encontrado`);
  }
}

// Inicializar o sistema de áudio
initAudio();

// =================================================================================
// VARIÁVEIS DO JOGO
// =================================================================================
const wallSize = 4;
const wallHeight = 4;
const floorHeight = 0.2; // Altura dos pisos do 2º andar
const secondFloorElevation = wallHeight * 1.8; // Altura do 2º andar

let currentLevel = 1;
let score = 0;
let gameIsOver = false;
let isPointerLocked = false;

// Arrays do jogo
let walls = [];
let hearts = [];
let trampolines = [];
let floors = [];
let emptySpaces = [];

// Elementos da UI
const scoreElement = document.getElementById("score");
const winMessageElement = document.getElementById("win-message");
const nextLevelButton = document.getElementById("next-level");
const levelDisplay = document.getElementById("level-display");

// =================================================================================
// MAPAS DOS 10 NÍVEIS
// =================================================================================
const levelMaps = {
  1: {
    // Nível 1 - Básico (com pulo e trampolins)
    floors: 1,
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 1, 1, 1, 0, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    // ===== TRAMPOLINS NO NÍVEL 1 - Permitem pulos mais altos =====
    trampolinePositions: [
      { x: 1.5, z: 1.5 },  // Trampolim no canto superior esquerdo
      { x: 5, z: 7.5 },    // Trampolim na área inferior
    ],
  },
  2: {
    // Nível 2 - Trampolim
    floors: 2,
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1],
      [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1],
      [1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    secondFloorAreas: [
      { x: 2, z: 2, width: 2, height: 2 },
      { x: 7, z: 2, width: 2, height: 2 },
      { x: 2, z: 7, width: 2, height: 2 },
      { x: 7, z: 7, width: 2, height: 2 },
    ],
    trampolinePositions: [
      { x: 1.5, z: 1.5 },
      { x: 8.5, z: 1.5 },
      { x: 1.5, z: 8.5 },
      { x: 8.5, z: 8.5 },
    ],
  },
  3: {
    // Nível 3 - Labirinto
    floors: 1,
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
  },
  4: {
    // Nível 4 - Espiral com Trampolim
    floors: 2,
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    secondFloorAreas: [{ x: 3, z: 3, width: 7, height: 7 }],
    trampolinePositions: [
      { x: 1.5, z: 6 },
      { x: 10.5, z: 6 },
      { x: 6, z: 1.5 },
      { x: 6, z: 10.5 },
    ],
  },
  5: {
    // Nível 5 - Cruz
    floors: 1,
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1],
      [1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1],
      [1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // ===== CORRIGIDO: col 5 aberta para acessar centro =====
      [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // ===== CORRIGIDO: col 5 aberta para acessar centro =====
      [1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1],
      [1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1],
      [1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
  },
  6: {
    // Nível 6 - Final
    floors: 1,
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
  },
  7: {
    // Nível 7 - Trampolins
    floors: 2,
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 1, 0, 1], // ===== CORRIGIDO: centro (4,4) aberto =====
      [1, 0, 1, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 0, 1, 1, 0, 1], // ===== CORRIGIDO: passagem (6,4) aberta para acessar interior =====
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    secondFloorAreas: [
      { x: 1, z: 1, width: 7, height: 1 },
      { x: 1, z: 3, width: 7, height: 1 },
      { x: 1, z: 5, width: 7, height: 1 },
      { x: 1, z: 7, width: 7, height: 1 },
    ],
    trampolinePositions: [
      { x: 1.5, z: 2.5 },
      { x: 6.5, z: 2.5 },
      { x: 4, z: 6.5 },
      { x: 4, z: 4 },   // ===== TRAMPOLIM na área central interior para escape =====
    ],
  },
  8: {
    // Nível 8 - Labirinto Vertical com Trampolins
    floors: 2,
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    secondFloorAreas: [
      { x: 1, z: 1, width: 3, height: 3 },
      { x: 7, z: 1, width: 3, height: 3 },
      { x: 1, z: 7, width: 3, height: 3 },
      { x: 7, z: 7, width: 3, height: 3 },
      { x: 4, z: 4, width: 3, height: 3 },
    ],
    trampolinePositions: [
      { x: 1.5, z: 5 },
      { x: 8.5, z: 5 },
      { x: 5, z: 2 },
      { x: 5, z: 8 },
    ],
  },
  9: {
    // Nível 9 - Plataformas Flutuantes
    floors: 2,
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    secondFloorAreas: [
      { x: 1, z: 1, width: 2, height: 2 },
      { x: 5, z: 1, width: 2, height: 2 },
      { x: 9, z: 1, width: 2, height: 2 },
      { x: 3, z: 3, width: 2, height: 2 },
      { x: 7, z: 3, width: 2, height: 2 },
      { x: 1, z: 5, width: 2, height: 2 },
      { x: 5, z: 5, width: 2, height: 2 },
      { x: 9, z: 5, width: 2, height: 2 },
      { x: 3, z: 7, width: 2, height: 2 },
      { x: 7, z: 7, width: 2, height: 2 },
      { x: 1, z: 9, width: 2, height: 2 },
      { x: 5, z: 9, width: 2, height: 2 },
      { x: 9, z: 9, width: 2, height: 2 },
    ],
    trampolinePositions: [
      { x: 4, z: 6 },
      { x: 8, z: 6 },
      { x: 6, z: 8 },
    ],
  },
  10: {
    // Nível 10 - O Desafio Final
    floors: 3, // Agora tem 3 andares
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    secondFloorAreas: [
      { x: 1, z: 1, width: 5, height: 1 },
      { x: 9, z: 1, width: 5, height: 1 },
      { x: 1, z: 13, width: 5, height: 1 },
      { x: 9, z: 13, width: 5, height: 1 },
      { x: 1, z: 7, width: 1, height: 5 },
      { x: 13, z: 7, width: 1, height: 5 },
    ],
    thirdFloorAreas: [
      // Nova plataforma do terceiro andar
      { x: 6, z: 6, width: 3, height: 3 },
    ],
    stairPositions: [
      { x: 7, z: 1.5, direction: "up" },
      { x: 7, z: 12.5, direction: "up" },
    ],
    trampolinePositions: [
      { x: 3, z: 7 }, // Trampolim para subir para o 2º andar
      { x: 11, z: 7 }, // Trampolim para subir para o 2º andar
      { x: 5, z: 5 }, // Trampolim no 2º andar para 3º andar
      { x: 9, z: 5 }, // Trampolim no 2º andar para 3º andar
    ],
  },
};

// =================================================================================
// CRIAÇÃO DE OBJETOS (TRAMPOLINS, ESCADAS)
// =================================================================================
function createTrampoline(x, z, bounceStrength = 1.0) {
  // Base do trampolim
  const baseGeometry = new THREE.CylinderGeometry(1.2, 1.4, 0.3, 16);
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.8,
    roughness: 0.2,
  });
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.position.set(0, 0.15, 0);

  // Superfície elástica
  const surfaceGeometry = new THREE.CylinderGeometry(1.0, 1.0, 0.2, 16);
  const surfaceMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ff44,
    emissive: 0x008800,
    metalness: 0.1,
    roughness: 0.6,
  });
  const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
  surface.position.set(0, 0.35, 0);

  // Molas decorativas
  const springGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.25, 8);
  const springMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });

  for (let i = 0; i < 4; i++) {
    const spring = new THREE.Mesh(springGeometry, springMaterial);
    const angle = (i / 4) * Math.PI * 2;
    spring.position.set(Math.cos(angle) * 0.7, 0.125, Math.sin(angle) * 0.7);
    base.add(spring);
  }

  const trampolineGroup = new THREE.Group();
  trampolineGroup.add(base);
  trampolineGroup.add(surface);
  trampolineGroup.position.set(x * wallSize, 0, z * wallSize);

  trampolineGroup.userData = {
    isTrampoline: true,
    bounceStrength: bounceStrength,
    surface: surface,
  };

  scene.add(trampolineGroup);
  trampolines.push(trampolineGroup);

  return trampolineGroup;
}

function createStairs(x, z, direction = "up") {
  const stairGroup = new THREE.Group();
  const numSteps = 8;
  const stepWidth = wallSize * 0.8;
  const stepHeight = (secondFloorElevation + floorHeight) / numSteps;
  const stepDepth = wallSize / numSteps;

  for (let i = 0; i < numSteps; i++) {
    const stepGeometry = new THREE.BoxGeometry(
      stepWidth,
      stepHeight,
      stepDepth
    );
    const stepMaterial = new THREE.MeshStandardMaterial({ color: 0x777777 });
    const step = new THREE.Mesh(stepGeometry, stepMaterial);

    const y = stepHeight * (i + 0.5);
    const zPos =
      (direction === "up" ? -1 : 1) *
      (stepDepth * i - (stepDepth * numSteps) / 2);

    step.position.set(0, y, zPos);
    stairGroup.add(step);
  }

  stairGroup.position.set(x * wallSize, 0, z * wallSize);
  stairGroup.userData = { isStairs: true };
  scene.add(stairGroup);
  walls.push(stairGroup); // Adiciona ao array de colisão
  return stairGroup;
}

// =================================================================================
// TEXTURAS E MATERIAIS REALISTAS
// =================================================================================
function createProceduralTextures() {
  // Textura de tijolo para paredes
  const brickCanvas = document.createElement("canvas");
  brickCanvas.width = 256;
  brickCanvas.height = 256;
  const brickContext = brickCanvas.getContext("2d");

  // Fundo da parede
  brickContext.fillStyle = "#2E4BC7";
  brickContext.fillRect(0, 0, 256, 256);

  // Desenhar tijolos
  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 64) {
      const offsetX = (y / 32) % 2 === 0 ? 0 : 32;

      // Tijolo
      brickContext.fillStyle = "#4169E1";
      brickContext.fillRect(x + offsetX, y, 60, 28);

      // Linha de argamassa
      brickContext.strokeStyle = "#1E3A8A";
      brickContext.lineWidth = 2;
      brickContext.strokeRect(x + offsetX, y, 60, 28);
    }
  }

  const brickTexture = new THREE.CanvasTexture(brickCanvas);
  brickTexture.wrapS = THREE.RepeatWrapping;
  brickTexture.wrapT = THREE.RepeatWrapping;
  brickTexture.repeat.set(2, 2);

  // Textura de concreto para chão
  const concreteCanvas = document.createElement("canvas");
  concreteCanvas.width = 256;
  concreteCanvas.height = 256;
  const concreteContext = concreteCanvas.getContext("2d");

  // Fundo do concreto
  concreteContext.fillStyle = "#555555";
  concreteContext.fillRect(0, 0, 256, 256);

  // Adicionar ruído para textura de concreto
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const size = Math.random() * 3 + 1;

    concreteContext.fillStyle = `rgba(${100 + Math.random() * 100}, ${
      100 + Math.random() * 100
    }, ${100 + Math.random() * 100}, 0.3)`;
    concreteContext.fillRect(x, y, size, size);
  }

  const concreteTexture = new THREE.CanvasTexture(concreteCanvas);
  concreteTexture.wrapS = THREE.RepeatWrapping;
  concreteTexture.wrapT = THREE.RepeatWrapping;
  concreteTexture.repeat.set(4, 4);

  // Textura de madeira para segundo andar
  const woodCanvas = document.createElement("canvas");
  woodCanvas.width = 256;
  woodCanvas.height = 256;
  const woodContext = woodCanvas.getContext("2d");

  // Fundo de madeira
  woodContext.fillStyle = "#8B4513";
  woodContext.fillRect(0, 0, 256, 256);

  // Desenhar veios da madeira
  for (let i = 0; i < 20; i++) {
    const y = Math.random() * 256;
    woodContext.strokeStyle = `rgba(${139 + Math.random() * 40 - 20}, ${
      69 + Math.random() * 20 - 10
    }, ${19 + Math.random() * 10 - 5}, 0.5)`;
    woodContext.lineWidth = Math.random() * 3 + 1;
    woodContext.beginPath();
    woodContext.moveTo(0, y);
    woodContext.quadraticCurveTo(128, y + Math.random() * 10 - 5, 256, y);
    woodContext.stroke();
  }

  const woodTexture = new THREE.CanvasTexture(woodCanvas);
  woodTexture.wrapS = THREE.RepeatWrapping;
  woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.repeat.set(3, 3);

  return { brickTexture, concreteTexture, woodTexture };
}

// =================================================================================
// CRIAÇÃO DO LABIRINTO
// =================================================================================
function setupMaze(levelData) {
  // Limpar objetos existentes
  walls.forEach((wall) => scene.remove(wall));
  floors.forEach((floor) => scene.remove(floor));
  trampolines.forEach((trampoline) => scene.remove(trampoline));

  walls = [];
  floors = [];
  trampolines = [];
  emptySpaces = [];

  const map = levelData.map;
  const mapWidth = map[0].length * wallSize;
  const mapHeight = map.length * wallSize;

  // Criar texturas procedurais
  const textures = createProceduralTextures();

  // Materiais com texturas realistas
  const wallMaterial = new THREE.MeshStandardMaterial({
    map: textures.brickTexture,
    color: 0xffffff,
    roughness: 0.8,
    metalness: 0.1,
    normalScale: new THREE.Vector2(0.5, 0.5),
  });

  const floorMaterial = new THREE.MeshStandardMaterial({
    map: textures.concreteTexture,
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.05,
    normalScale: new THREE.Vector2(0.3, 0.3),
  });

  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.8,
    metalness: 0.1,
    normalScale: new THREE.Vector2(0.3, 0.3),
  });

  const secondFloorMaterial = new THREE.MeshStandardMaterial({
    map: textures.woodTexture,
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.02,
    normalScale: new THREE.Vector2(0.4, 0.4),
  });

  // ===== ALTURA DAS PAREDES - NÃO AUMENTAR (manter visual original) =====
  // Paredes mantêm uma altura razoável e proporcional ao nível
  let actualWallHeight;
  if (levelData.floors === 1) {
    actualWallHeight = wallHeight; // 4 unidades - altura original
  } else if (levelData.floors === 2) {
    actualWallHeight = secondFloorElevation + wallHeight; // ~11.2 unidades
  } else if (levelData.floors === 3) {
    actualWallHeight = secondFloorElevation * 1.8 + wallHeight; // ~16.96 unidades
  } else {
    actualWallHeight = wallHeight; // Fallback
  }

  // ===== ALTURA DO TETO - SEPARADA DAS PAREDES (espaço extra para pulo) =====
  // O teto é mais alto que as paredes para permitir pulo sem bater a cabeça
  // Para 1 andar: teto a 3x wallHeight (12u) acima das paredes de 4u
  // Para 2+ andares: teto 4u acima do topo das paredes
  let ceilingOffset;
  if (levelData.floors === 1) {
    ceilingOffset = wallHeight * 3; // Teto a 12 unidades do chão
  } else {
    ceilingOffset = actualWallHeight + wallHeight; // 4u extra acima das paredes
  }

  // ===== CORREÇÃO: Paredes sem espaços entre blocos =====
  // Antes: wallSize * 0.95 (deixava gaps de 5%). Agora: wallSize completo (sem gaps)
  // Altura agora usa actualWallHeight (corrigida por nível)
  const wallGeometry = new THREE.BoxGeometry(
    wallSize,           // Largura completa - sem gaps entre blocos
    actualWallHeight,   // Altura corrigida por nível
    wallSize            // Profundidade completa - sem gaps entre blocos
  );

  for (let i = 0; i < map.length; i++) {
    for (let j = 0; j < map[i].length; j++) {
      if (map[i][j] === 1) {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        // ===== Parede posicionada no centro vertical da sua altura =====
        wall.position.set(j * wallSize, actualWallHeight / 2, i * wallSize);
        wall.userData = { isWall: true, isSolid: true };
        scene.add(wall);
        walls.push(wall);
      } else {
        emptySpaces.push({ x: j, z: i, level: 1 });
      }
    }
  }

  // Chão principal
  const floorGeometry = new THREE.BoxGeometry(mapWidth, 0.5, mapHeight); // Usar BoxGeometry em vez de PlaneGeometry
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.position.set(
    mapWidth / 2 - wallSize / 2,
    -0.25, // Metade da altura do chão
    mapHeight / 2 - wallSize / 2
  );
  floor.userData = { isFloor: true, isSolid: true };
  scene.add(floor);
  walls.push(floor);

  // ===== TETO - Posicionado com espaço extra acima das paredes =====
  // Teto usa ceilingOffset (mais alto) enquanto paredes usam actualWallHeight
  const ceiling = new THREE.BoxGeometry(mapWidth, 0.5, mapHeight);
  const ceilingMesh = new THREE.Mesh(ceiling, ceilingMaterial);

  // Teto no ceilingOffset (acima das paredes para dar espaço ao pulo)
  let ceilingHeight = ceilingOffset + 0.25;

  ceilingMesh.position.set(
    mapWidth / 2 - wallSize / 2,
    ceilingHeight,
    mapHeight / 2 - wallSize / 2
  );
  ceilingMesh.userData = { isCeiling: true, isSolid: true };
  scene.add(ceilingMesh);
  walls.push(ceilingMesh);

  // Criar 2º andar se necessário
  if (
    (levelData.floors === 2 || levelData.floors === 3) &&
    levelData.secondFloorAreas
  ) {
    levelData.secondFloorAreas.forEach((area) => {
      // Usar uma abordagem mais sólida para plataformas do segundo andar
      const platformWidth = area.width * wallSize;
      const platformHeight = area.height * wallSize;
      const platformThickness = 0.4; // Espessura reduzida mas ainda sólida

      const floorPlatformGeometry = new THREE.BoxGeometry(
        platformWidth,
        platformThickness,
        platformHeight
      );

      const floorPlatform = new THREE.Mesh(
        floorPlatformGeometry,
        secondFloorMaterial
      );

      floorPlatform.position.set(
        (area.x + area.width / 2 - 0.5) * wallSize,
        secondFloorElevation - platformThickness / 2,
        (area.z + area.height / 2 - 0.5) * wallSize
      );

      floorPlatform.userData = {
        isSecondFloor: true,
        isSolid: true,
      };

      scene.add(floorPlatform);
      walls.push(floorPlatform);
      floors.push(floorPlatform);

      // ===== ESPAÇOS VAZIOS DO 2º ANDAR (filtrados por paredes do mapa) =====
      // Só adiciona posição se NÃO for parede no mapa do chão (evita corações dentro de paredes)
      for (let i = 0; i < area.height; i++) {
        for (let j = 0; j < area.width; j++) {
          const mz = area.z + i;
          const mx = area.x + j;
          if (map[mz] && map[mz][mx] === 0) {
            emptySpaces.push({
              x: mx,
              z: mz,
              level: 2,
              y: secondFloorElevation + 0.5,
            });
          }
        }
      }
    });

    // Criar terceiro andar se existir
    if (levelData.floors === 3 && levelData.thirdFloorAreas) {
      const thirdFloorElevation = secondFloorElevation * 1.8; // Altura do 3º andar

      levelData.thirdFloorAreas.forEach((area) => {
        const platformWidth = area.width * wallSize;
        const platformHeight = area.height * wallSize;
        const platformThickness = 0.4;

        const floorPlatformGeometry = new THREE.BoxGeometry(
          platformWidth,
          platformThickness,
          platformHeight
        );

        const floorPlatform = new THREE.Mesh(
          floorPlatformGeometry,
          new THREE.MeshStandardMaterial({
            color: 0x8b4513, // Mesma cor do segundo andar
            roughness: 0.8,
            metalness: 0.1,
          })
        );

        floorPlatform.position.set(
          (area.x + area.width / 2 - 0.5) * wallSize,
          thirdFloorElevation - platformThickness / 2,
          (area.z + area.height / 2 - 0.5) * wallSize
        );

        floorPlatform.userData = {
          isThirdFloor: true,
          isSolid: true,
        };

        scene.add(floorPlatform);
        walls.push(floorPlatform);
        floors.push(floorPlatform);

        // ===== ESPAÇOS VAZIOS DO 3º ANDAR (filtrados por paredes do mapa) =====
        for (let i = 0; i < area.height; i++) {
          for (let j = 0; j < area.width; j++) {
            const mz = area.z + i;
            const mx = area.x + j;
            if (map[mz] && map[mz][mx] === 0) {
              emptySpaces.push({
                x: mx,
                z: mz,
                level: 3,
                y: thirdFloorElevation + 0.5,
              });
            }
          }
        }
      });
    }

    // Criar trampolins
    if (levelData.trampolinePositions) {
      levelData.trampolinePositions.forEach((pos) => {
        createTrampoline(pos.x, pos.z, 1.4); // Força de impulso controlada
      });
    }

    // Criar escadas (somente se existirem no levelData)
    if (levelData.stairPositions) {
      levelData.stairPositions.forEach((pos) => {
        createStairs(pos.x, pos.z, pos.direction);
      });
    }
  }

  // Trampolins em níveis de 1 andar
  if (levelData.floors === 1 && levelData.trampolinePositions) {
    levelData.trampolinePositions.forEach((pos) => {
      createTrampoline(pos.x, pos.z, 1.0);
    });
  }
}

// =================================================================================
// CORAÇÕES
// =================================================================================
const heartShape = new THREE.Shape();
heartShape.moveTo(0.25, 0.25);
heartShape.bezierCurveTo(0.25, 0.25, 0.2, 0, 0, 0);
heartShape.bezierCurveTo(-0.3, 0, -0.3, 0.35, -0.3, 0.35);
heartShape.bezierCurveTo(-0.3, 0.55, -0.1, 0.77, 0.25, 0.95);
heartShape.bezierCurveTo(0.6, 0.77, 0.8, 0.55, 0.8, 0.35);
heartShape.bezierCurveTo(0.8, 0.35, 0.8, 0, 0.5, 0);
heartShape.bezierCurveTo(0.35, 0, 0.25, 0.25, 0.25, 0.25);

const heartGeometry = new THREE.ExtrudeGeometry(heartShape, {
  depth: 0.1,
  bevelEnabled: true,
  bevelSegments: 2,
  steps: 2,
  bevelSize: 0.1,
  bevelThickness: 0.1,
});

const heartMaterial = new THREE.MeshStandardMaterial({
  color: 0xff0000,
  emissive: 0x440000,
});

function createHearts() {
  hearts.forEach((heart) => scene.remove(heart));
  hearts = [];

  // ===== QUANTIDADE DE CORAÇÕES POR NÍVEL (ordem crescente) =====
  const heartsPerLevel = {
    1: 6, 2: 7, 3: 7, 4: 8, 5: 8,
    6: 9, 7: 9, 8: 10, 9: 10, 10: 12
  };
  const numHearts = heartsPerLevel[currentLevel] || 6;

  // ===== Separar espaços por andar =====
  const level1Spaces = emptySpaces.filter((s) => s.level === 1);
  const level2Spaces = emptySpaces.filter((s) => s.level === 2);
  const level3Spaces = emptySpaces.filter((s) => s.level === 3);

  let spacesToUse = [];
  const upperSpaces = [...level2Spaces, ...level3Spaces];

  if (upperSpaces.length > 0) {
    // ===== Distribuir corações entre andares de forma proporcional =====
    const upperCount = Math.max(1, Math.min(
      Math.floor(numHearts * 0.4),
      upperSpaces.length
    ));
    const groundCount = numHearts - upperCount;

    const shuffledGround = [...level1Spaces].sort(() => 0.5 - Math.random());
    const shuffledUpper = [...upperSpaces].sort(() => 0.5 - Math.random());

    for (let i = 0; i < groundCount && i < shuffledGround.length; i++) {
      spacesToUse.push(shuffledGround[i]);
    }
    for (let i = 0; i < upperCount && i < shuffledUpper.length; i++) {
      spacesToUse.push(shuffledUpper[i]);
    }
    // ===== Se faltaram corações, completar com espaços do chão =====
    if (spacesToUse.length < numHearts) {
      const remaining = numHearts - spacesToUse.length;
      const usedPositions = new Set(spacesToUse.map(s => `${s.x},${s.z},${s.level}`));
      const extraSpaces = shuffledGround.filter(s => !usedPositions.has(`${s.x},${s.z},${s.level}`));
      for (let i = 0; i < remaining && i < extraSpaces.length; i++) {
        spacesToUse.push(extraSpaces[i]);
      }
    }
  } else {
    // ===== Apenas 1º andar =====
    const shuffled = [...level1Spaces].sort(() => 0.5 - Math.random());
    spacesToUse = shuffled.slice(0, numHearts);
  }

  // ===== Criar corações nas posições escolhidas =====
  spacesToUse.forEach((space) => {
    const heart = new THREE.Mesh(heartGeometry, heartMaterial);
    let heartY;
    if (space.level >= 2 && space.y) {
      heartY = space.y + 1.0; // Acima da plataforma do andar superior
    } else {
      heartY = wallHeight / 2 - 0.5; // Altura do chão
    }

    heart.position.set(space.x * wallSize, heartY, space.z * wallSize);
    heart.rotation.z = Math.PI;
    heart.name = "heart";
    heart.userData = {
      baseY: heartY,
      level: space.level,
    };
    scene.add(heart);
    hearts.push(heart);
  });
}

// =================================================================================
// FÍSICA E CONTROLES
// =================================================================================
const keys = { w: false, a: false, s: false, d: false, " ": false };
// ===== VELOCIDADE DO JOGADOR - Levemente maior para compensar pulo mais fluido =====
const playerSpeed = 0.14;
const mouseSensitivity = 0.0015;
// ===== GRAVIDADE REDUZIDA - Pulo e trampolim mais lentos e fluidos =====
const gravity = 0.005;
// ===== FORÇA DO PULO - Metade do anterior, mais lento =====
// Antes: 0.27. Agora: 0.13 (metade). Com gravidade 0.005:
// maxHeight = 0.13² / (2*0.005) = 1.69 unidades
const jumpStrength = 0.13;

// ===== VARIÁVEIS DE ANIMAÇÃO DOS BRAÇOS =====
let armCollectAnimation = false;  // Animação de coleta com 2 braços
let armCollectTime = 0;           // Timer da animação de coleta
let armIdleTime = 0;              // Timer para animação idle

// ===== EVENTOS DE TECLADO E ATALHOS =====
document.addEventListener("keydown", (event) => {
  keys[event.key.toLowerCase()] = true;

  // ===== TECLA TAB - ALTERNAR BLOQUEIO/DESBLOQUEIO DO CURSOR =====
  // Pressionar Tab alterna entre cursor bloqueado e livre dentro do jogo
  if (event.key === "Tab") {
    event.preventDefault(); // Previne comportamento padrão do Tab
    if (isPointerLocked) {
      // Desbloqueia o cursor
      document.exitPointerLock();
    } else if (typeof gameData !== 'undefined' && gameData.isInGame && !gameIsOver) {
      // Bloqueia o cursor (só funciona dentro do jogo)
      document.body.requestPointerLock();
    }
  }

  // ===== ATALHO DEV: SHIFT + NÚMERO - Pula direto para qualquer nível =====
  // Usa event.code ("Digit1"-"Digit0") para funcionar em qualquer layout de teclado
  // Shift+1 = Nível 1, Shift+2 = Nível 2, ..., Shift+0 = Nível 10
  if (event.shiftKey && !event.altKey && !event.ctrlKey) {
    const digitMatch = event.code.match(/^Digit(\d)$/);
    if (digitMatch) {
      const num = parseInt(digitMatch[1], 10);
      const targetLevel = num === 0 ? 10 : num; // Shift+0 = nível 10
      if (levelMaps[targetLevel]) {
        event.preventDefault();
        console.log(`DEV (Shift+${num}): Pulando para o nível ${targetLevel}`);
        // Usa startGame se disponível (mostra canvas/UI), senão startLevel direto
        if (typeof startGame === 'function') {
          startGame(targetLevel);
        } else {
          startLevel(targetLevel);
        }
      }
    }
  }

  // Atalho DEV alternativo: Alt + número (funciona dentro do jogo)
  if (event.altKey && !isNaN(event.key)) {
    const level = parseInt(event.key, 10);
    if (levelMaps[level]) {
      console.log(`DEV (Alt): Mudando para o nível ${level}`);
      startLevel(level);
    }
  }
});

document.addEventListener("keyup", (event) => {
  keys[event.key.toLowerCase()] = false;
});

// ===== CONTROLE DO CURSOR - BLOQUEIO APENAS DENTRO DO JOGO =====
// O cursor permanece livre por padrão. O ponteiro só é bloqueado
// quando o jogador clica no canvas durante o jogo ativo.
document.getElementById("gameCanvas").addEventListener("click", () => {
  if (typeof gameData !== 'undefined' && gameData.isInGame && !gameIsOver) {
    if (!audioInitialized) {
      initAudio();
    }
    document.body.requestPointerLock();
  }
});

// ===== DETECÇÃO DE MUDANÇA NO BLOQUEIO DO CURSOR =====
// Atualiza o estado isPointerLocked quando o cursor é bloqueado/desbloqueado
document.addEventListener("pointerlockchange", () => {
  isPointerLocked = document.pointerLockElement === document.body;
});

// ===== CONTROLE DE VISÃO COM MOUSE =====
// Só move a câmera quando o cursor está bloqueado (dentro do jogo)
document.addEventListener("mousemove", (event) => {
  if (isPointerLocked) {
    player.rotation.y -= event.movementX * mouseSensitivity;
    camera.rotation.x -= event.movementY * mouseSensitivity;
    camera.rotation.x = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, camera.rotation.x)
    );
  }
});

// Movimento do jogador
let playerVelocityY = 0;
let isGrounded = false;
let isJumping = false;
let isMoving = false;
// ===== ESTADO DE BOOST DO TRAMPOLIM - Para física fluida no ar =====
let isTrampolineBoosted = false;
function updatePlayerPosition() {
  if (gameIsOver) return;

  // Definir direções de movimento
  const moveDirection = new THREE.Vector3();
  player.getWorldDirection(moveDirection);
  moveDirection.y = 0;
  moveDirection.normalize();

  const rightDirection = new THREE.Vector3()
    .crossVectors(player.up, moveDirection)
    .normalize();

  // Calcular velocidade de movimento
  const velocity = new THREE.Vector3();
  if (keys.w) velocity.sub(moveDirection);
  if (keys.s) velocity.add(moveDirection);
  if (keys.a) velocity.sub(rightDirection);
  if (keys.d) velocity.add(rightDirection);

  // Verificar se está em movimento para som de passos
  const wasMoving = isMoving;
  isMoving = velocity.length() > 0.01;

  if (isMoving) {
    velocity.normalize().multiplyScalar(playerSpeed);
    if (isGrounded && !sounds.footstep?.isPlaying) {
      sounds.footstep.play();
    }
  }

  if (!isMoving && wasMoving && sounds.footstep?.isPlaying) {
    sounds.footstep.stop();
  }

  if (!isGrounded && sounds.footstep?.isPlaying) {
    sounds.footstep.stop();
  }

  // ===== PULO NORMAL (FUNCIONA EM TODOS OS NÍVEIS, INCLUINDO NÍVEL 1) =====
  // Tecla Espaço para pular quando estiver no chão
  if (isGrounded && keys[" "] && !isJumping) {
    playerVelocityY = jumpStrength;
    isGrounded = false;
    isJumping = true;
    playSound("jump", 0.4);
  }

  if (!keys[" "]) isJumping = false;

  // ===== VERIFICAR TRAMPOLINS - Física fluida e lenta =====
  let onTrampoline = false;

  trampolines.forEach((trampoline) => {
    const trampolinePos = trampoline.position;
    const playerPos = player.position;

    // Verificar distância horizontal ao trampolim
    const horizontalDistance = Math.sqrt(
      Math.pow(playerPos.x - trampolinePos.x, 2) +
        Math.pow(playerPos.z - trampolinePos.z, 2)
    );

    // ===== Detectar contato com trampolim =====
    if (
      horizontalDistance < 1.5 &&
      playerPos.y <= wallHeight / 2 + 1.0 &&
      playerPos.y >= 0
    ) {
      onTrampoline = true;

      // ===== IMPULSO TRAMPOLIM: Mais lento e controlável =====
      // bounceStrength * 0.35 em vez de * 0.8 → subida gradual, não instantânea
      if (playerVelocityY <= 0.05) {
        playerVelocityY = trampoline.userData.bounceStrength * 0.35;
        isGrounded = false;
        isTrampolineBoosted = true;

        playSound("bounce", 0.6);

        // Animação visual do trampolim (comprime e volta)
        const surface = trampoline.userData.surface;
        if (surface) {
          surface.scale.y = 0.6;
          setTimeout(() => {
            if (surface) surface.scale.y = 1;
          }, 300);
        }
      }
    }
  });

  // ===== GRAVIDADE VARIÁVEL: Mais leve durante voo de trampolim =====
  // Trampolim: 40% da gravidade normal → voo longo e fluido
  // Normal no ar: gravidade normal
  if (!isGrounded && !onTrampoline) {
    const currentGravity = isTrampolineBoosted ? gravity * 0.4 : gravity;
    playerVelocityY -= currentGravity;
    
    // ===== Desativar boost de trampolim quando começa a descer =====
    if (isTrampolineBoosted && playerVelocityY < -0.02) {
      isTrampolineBoosted = false;
    }
  }

  // Guardar posição original para caso precise reverter
  const originalPosition = player.position.clone();

  // =================================================================================
  // ===== SISTEMA DE COLISÃO SEPARADO POR EIXO (ELIMINA TREMULAÇÃO) =====
  // Testa cada eixo independentemente: se mover causaria colisão, cancela o eixo
  // =================================================================================

  // ===== PASSO 1: Calcular deslocamentos desejados =====
  let dx = 0, dz = 0;
  if (velocity.length() > 0) {
    const airMult = isGrounded ? 1.0 : (isTrampolineBoosted ? 1.5 : 0.9);
    dx = velocity.x * airMult;
    dz = velocity.z * airMult;
  }

  // ===== PASSO 2: Aplicar movimento vertical =====
  player.position.y += playerVelocityY;

  // ===== PASSO 3: Tamanho do colisor do jogador =====
  const playerHeight = wallHeight * 0.9;
  const playerSize = new THREE.Vector3(0.5, playerHeight, 0.5);

  // ===== PASSO 4: Resolver colisões VERTICAIS (aterrissagem / teto) =====
  isGrounded = false;
  for (const wall of walls) {
    const collider = new THREE.Box3().setFromCenterAndSize(player.position, playerSize);
    const wallBox = new THREE.Box3().setFromObject(wall);
    if (!collider.intersectsBox(wallBox)) continue;

    // Calcular penetrações em cada direção
    const bottomPen = Math.abs(collider.min.y - wallBox.max.y);
    const topPen = Math.abs(collider.max.y - wallBox.min.y);
    const minSidePen = Math.min(
      Math.abs(collider.min.x - wallBox.max.x),
      Math.abs(collider.max.x - wallBox.min.x),
      Math.abs(collider.min.z - wallBox.max.z),
      Math.abs(collider.max.z - wallBox.min.z)
    );

    // ===== Aterrissagem: pousa no topo do objeto =====
    if (bottomPen <= minSidePen && playerVelocityY <= 0) {
      player.position.y = wallBox.max.y + playerSize.y / 2;
      playerVelocityY = 0;
      isGrounded = true;
      isTrampolineBoosted = false;
    }
    // ===== Bateu no teto: empurra para baixo =====
    else if (topPen <= minSidePen && playerVelocityY > 0) {
      player.position.y = wallBox.min.y - playerSize.y / 2;
      playerVelocityY = 0;
    }
  }

  // ===== PASSO 5: Failsafe de altura mínima do chão =====
  if (player.position.y < wallHeight / 2 && !isGrounded) {
    player.position.y = wallHeight / 2;
    playerVelocityY = 0;
    isGrounded = true;
    isTrampolineBoosted = false;
  }

  // ===== PASSO 6: Movimento horizontal X (pré-teste antes de aplicar) =====
  // Testa se mover em X causaria colisão com alguma parede. Se sim, NÃO move.
  // Isso elimina a tremulação pois não há empurra-puxa, apenas "move ou não move".
  if (dx !== 0) {
    const testPos = new THREE.Vector3(player.position.x + dx, player.position.y, player.position.z);
    const testCol = new THREE.Box3().setFromCenterAndSize(testPos, playerSize);
    let blocked = false;
    for (const wall of walls) {
      if (wall.userData.isFloor || wall.userData.isCeiling) continue;
      if (wall.userData.isSecondFloor || wall.userData.isThirdFloor) continue;
      const wb = new THREE.Box3().setFromObject(wall);
      if (testCol.intersectsBox(wb)) {
        // Verificar sobreposição vertical real (ignorar se não há overlap em Y)
        const overlapY = Math.min(testCol.max.y, wb.max.y) - Math.max(testCol.min.y, wb.min.y);
        if (overlapY > 0.2) { blocked = true; break; }
      }
    }
    if (!blocked) player.position.x += dx;
  }

  // ===== PASSO 7: Movimento horizontal Z (pré-teste antes de aplicar) =====
  if (dz !== 0) {
    const testPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z + dz);
    const testCol = new THREE.Box3().setFromCenterAndSize(testPos, playerSize);
    let blocked = false;
    for (const wall of walls) {
      if (wall.userData.isFloor || wall.userData.isCeiling) continue;
      if (wall.userData.isSecondFloor || wall.userData.isThirdFloor) continue;
      const wb = new THREE.Box3().setFromObject(wall);
      if (testCol.intersectsBox(wb)) {
        const overlapY = Math.min(testCol.max.y, wb.max.y) - Math.max(testCol.min.y, wb.min.y);
        if (overlapY > 0.2) { blocked = true; break; }
      }
    }
    if (!blocked) player.position.z += dz;
  }

  // ===== PASSO 8: Limites rígidos do mapa (impede sair da sala de jogo) =====
  // Calcula as faces internas das paredes de borda para clamping exato
  const mapCols = levelMaps[currentLevel].map[0].length;
  const mapRows = levelMaps[currentLevel].map.length;
  const halfWall = wallSize / 2;
  const halfPlayer = playerSize.x / 2;
  const minX = halfWall + halfPlayer;
  const maxX = (mapCols - 1) * wallSize - halfWall - halfPlayer;
  const minZ = halfWall + halfPlayer;
  const maxZ = (mapRows - 1) * wallSize - halfWall - halfPlayer;
  player.position.x = Math.max(minX, Math.min(maxX, player.position.x));
  player.position.z = Math.max(minZ, Math.min(maxZ, player.position.z));

  // ===== PASSO 9: Reset se caiu do mapa =====
  if (player.position.y < -10) {
    player.position.y = wallHeight / 2;
    playerVelocityY = 0;
    isGrounded = true;
    isTrampolineBoosted = false;
  }
}

// =================================================================================
// SISTEMA DE JOGO
// =================================================================================
function startLevel(level) {
  gameIsOver = false;
  winMessageElement.classList.add("hidden");

  score = 0;
  scoreElement.textContent = "Corações: 0";
  currentLevel = level;
  levelDisplay.textContent = `Nível ${level}`;

  const levelData = levelMaps[level];
  if (!levelData) {
    console.error(`Nível ${level} não encontrado!`);
    return;
  }

  setupMaze(levelData);
  createHearts();

  // Posicionar jogador
  const startSpace =
    emptySpaces.find((space) => space.level === 1) || emptySpaces[0];
  player.position.set(
    startSpace.x * wallSize,
    wallHeight / 2,
    startSpace.z * wallSize
  );
  player.rotation.set(0, 0, 0);
  camera.rotation.set(0, 0, 0);
  playerVelocityY = 0;
  isGrounded = true;

  if (sounds.ambient && !sounds.ambient.isPlaying) {
    sounds.ambient.setLoop(true);
    sounds.ambient.setVolume(0.3);
    sounds.ambient.play();
  }
}

// Coleta de corações
const raycaster = new THREE.Raycaster();
document.addEventListener("mousedown", () => {
  if (!isPointerLocked || gameIsOver) return;

  // ===== ANIMAÇÃO DE COLETA COM 2 BRAÇOS =====
  // Ativa a animação onde ambos os braços alcançam e puxam o coração
  armCollectAnimation = true;
  armCollectTime = 0;

  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const intersects = raycaster.intersectObjects(hearts);

  if (intersects.length > 0 && intersects[0].distance < 6) {
    const heart = intersects[0].object;
    scene.remove(heart);
    hearts.splice(hearts.indexOf(heart), 1);
    score++;
    scoreElement.textContent = `Corações: ${score}`;
    playSound("collect", 0.7);

    if (hearts.length === 0) {
      gameIsOver = true;
      winMessageElement.classList.remove("hidden");
      document.exitPointerLock();
      playSound("win", 0.8);

      if (currentLevel < Object.keys(levelMaps).length) {
        nextLevelButton.style.display = "block";
        document.querySelector(
          "#win-message p"
        ).textContent = `Você concluiu o nível ${currentLevel}!`;
      } else {
        document.querySelector("#win-message h1").textContent = "Parabéns!";
        document.querySelector("#win-message p").textContent =
          "Você completou todos os níveis!";
        nextLevelButton.style.display = "none";
      }
    }
  }
});

// Botão próximo nível
nextLevelButton.addEventListener("click", () => {
  if (currentLevel < Object.keys(levelMaps).length) {
    winMessageElement.classList.add("hidden");
    setTimeout(() => {
      startLevel(currentLevel + 1);
      document.body.requestPointerLock();
    }, 100);
  }
});

// =================================================================================
// CONTROLES MOBILE
// =================================================================================
function setupMobileControls() {
  // Elementos já criados no HTML
  const joystick = document.getElementById("joystick");
  const stick = document.getElementById("stick");
  const lookArea = document.getElementById("lookArea");
  const jumpButton = document.getElementById("jumpButton");

  let touchStartX = 0;
  let touchStartY = 0;
  let lastLookX = 0;
  let lastLookY = 0;

  // Joystick de movimento
  joystick.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    },
    { passive: false }
  );

  joystick.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const angle = Math.atan2(deltaY, deltaX);
      const distance = Math.min(50, Math.hypot(deltaX, deltaY));

      stick.style.transform = `translate(${Math.cos(angle) * distance}px, ${
        Math.sin(angle) * distance
      }px)`;

      keys.w = deltaY < -10;
      keys.s = deltaY > 10;
      keys.a = deltaX < -10;
      keys.d = deltaX > 10;
    },
    { passive: false }
  );

  joystick.addEventListener("touchend", () => {
    stick.style.transform = "translate(0, 0)";
    keys.w = keys.s = keys.a = keys.d = false;
  });

  // Área de visão
  lookArea.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      lastLookX = touch.clientX;
      lastLookY = touch.clientY;
    },
    { passive: false }
  );

  lookArea.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const deltaX = touch.clientX - lastLookX;
      const deltaY = touch.clientY - lastLookY;
      lastLookX = touch.clientX;
      lastLookY = touch.clientY;

      player.rotation.y -= deltaX * mouseSensitivity * 2;
      camera.rotation.x -= deltaY * mouseSensitivity * 2;
      camera.rotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, camera.rotation.x)
      );
    },
    { passive: false }
  );

  // Botão de pulo
  jumpButton.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      keys[" "] = true;
    },
    { passive: false }
  );

  jumpButton.addEventListener("touchend", () => {
    keys[" "] = false;
  });

  // Inicializar o áudio ao primeiro toque na tela
  document.addEventListener(
    "touchstart",
    () => {
      if (!audioInitialized) {
        initAudio();
      }
    },
    { once: true }
  );
}

// =================================================================================
// LOOP DE ANIMAÇÃO
// =================================================================================
function animate() {
  requestAnimationFrame(animate);

  const time = Date.now() * 0.001;

  // Animação dos corações (apenas rotação)
  hearts.forEach((heart) => {
    heart.rotation.y += 0.02;
    // Manter altura fixa
    heart.position.y = heart.userData.baseY;
  });

  // =================================================================================
  // ===== ANIMAÇÃO DOS 2 BRAÇOS ESTILO MINECRAFT =====
  // =================================================================================
  
  // ===== ANIMAÇÃO DE COLETA DE CORAÇÃO (ambos os braços) =====
  // Fase 1: Braços vão para frente para "pegar" o coração
  // Fase 2: Braços trazem para perto do corpo
  // Fase 3: Braços retornam à posição normal (coração "coletado")
  if (armCollectAnimation) {
    armCollectTime += 0.03; // Velocidade da animação de coleta
    
    if (armCollectTime < 0.3) {
      // Fase 1: Braços esticam para frente para pegar
      const reach = armCollectTime / 0.3; // 0 → 1
      rightArmGroup.position.z = -0.45 - reach * 0.4;
      leftArmGroup.position.z = -0.45 - reach * 0.4;
      rightArmGroup.rotation.x = -reach * 0.6;
      leftArmGroup.rotation.x = -reach * 0.6;
      // Braços se aproximam no centro ("agarrando")
      rightArmGroup.position.x = 0.32 - reach * 0.12;
      leftArmGroup.position.x = -0.32 + reach * 0.12;
    } else if (armCollectTime < 0.6) {
      // Fase 2: Braços trazem para o corpo (segurando coração)
      const retract = (armCollectTime - 0.3) / 0.3; // 0 → 1
      rightArmGroup.position.z = -0.85 + retract * 0.25;
      leftArmGroup.position.z = -0.85 + retract * 0.25;
      rightArmGroup.rotation.x = -0.6 + retract * 0.4;
      leftArmGroup.rotation.x = -0.6 + retract * 0.4;
      rightArmGroup.position.x = 0.20 + retract * 0.02;
      leftArmGroup.position.x = -0.20 - retract * 0.02;
    } else if (armCollectTime < 0.9) {
      // Fase 3: Retorno suave à posição normal
      const restore = (armCollectTime - 0.6) / 0.3; // 0 → 1
      rightArmGroup.position.set(
        0.32,
        -0.2,
        -0.60 + restore * 0.15
      );
      leftArmGroup.position.set(
        -0.32,
        -0.2,
        -0.60 + restore * 0.15
      );
      rightArmGroup.rotation.x = -0.2 * (1 - restore);
      leftArmGroup.rotation.x = -0.2 * (1 - restore);
    } else {
      // Animação terminada - resetar posições
      rightArmGroup.position.set(0.32, -0.2, -0.45);
      leftArmGroup.position.set(-0.32, -0.2, -0.45);
      rightArmGroup.rotation.set(0, 0, 0);
      leftArmGroup.rotation.set(0, 0, 0);
      armCollectAnimation = false;
      armCollectTime = 0;
    }
  } else {
    // ===== ANIMAÇÃO NORMAL DOS BRAÇOS (idle + movimento) =====
    const isMovingArm = keys.w || keys.s || keys.a || keys.d;
    
    if (isMovingArm) {
      // ===== Braços balançam alternadamente ao andar (estilo Minecraft) =====
      const swingSpeed = 6; // Velocidade do balanço
      const swingAmount = 0.35; // Amplitude do balanço
      
      // Braço direito e esquerdo balançam em direções opostas
      rightArmGroup.rotation.x = Math.sin(time * swingSpeed) * swingAmount;
      leftArmGroup.rotation.x = -Math.sin(time * swingSpeed) * swingAmount;
      
      // Leve balanço lateral ao mover para os lados
      if (keys.a || keys.d) {
        const sideSwing = keys.a ? 0.1 : -0.1;
        rightArmGroup.rotation.z = sideSwing * Math.sin(time * swingSpeed * 0.5);
        leftArmGroup.rotation.z = sideSwing * Math.sin(time * swingSpeed * 0.5);
      } else {
        rightArmGroup.rotation.z *= 0.85;
        leftArmGroup.rotation.z *= 0.85;
      }
    } else {
      // ===== Animação idle: leve balanço respirando =====
      armIdleTime += 0.016;
      const idleBreath = Math.sin(armIdleTime * 1.5) * 0.03;
      rightArmGroup.rotation.x = rightArmGroup.rotation.x * 0.9 + idleBreath;
      leftArmGroup.rotation.x = leftArmGroup.rotation.x * 0.9 + idleBreath;
      rightArmGroup.rotation.z *= 0.9;
      leftArmGroup.rotation.z *= 0.9;
    }
  }

  // Animação dos trampolins
  trampolines.forEach((trampoline) => {
    const surface = trampoline.userData.surface;
    if (surface) {
      const intensity = (Math.sin(time * 2) + 1) * 0.5;
      surface.material.emissive.setHex(
        0x004400 + parseInt(intensity * 50) * 0x100
      );
    }
  });

  if (isPointerLocked || "ontouchstart" in window) {
    updatePlayerPosition();
  }

  renderer.render(scene, camera);
}

// Redimensionar
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Inicializar
if ("ontouchstart" in window) {
  setupMobileControls();
}
startLevel(1);
animate();
