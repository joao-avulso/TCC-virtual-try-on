import * as THREE from "three";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ObjectControls } from './ObjectControls.js';
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { VertexNormalsHelper } from 'three/addons/helpers/VertexNormalsHelper.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

let container, camera, scene, renderer, model, mixer, playAnim, mesh;

let animations = new Array();

const fps = 60; // Limite de frames por segundo
const fpsInterval = 1000 / fps; // Intervalo de tempo entre os frames em milissegundos

const ossos = {};

const gui = new GUI({ title: "Membros", width: 400 });

const params = {
    tamanho: 1,
    bracos: 1,
    pernas: 1,
    tronco: 1,
    cabeca: 1,
    altura: 0.0,
    comprimento_braco: 0.0,
    comprimento_perna: 0.0,
    anim: 0,
    musculatura: 0.5,
    peso: 0,
    busto: 0.5,
    ampulheta: 0,
    maça: 0,
    diamante: 0,
    triangulo: 0,
    triangulo_invertido: 0,
    retangulo: 0,
    coluna: 0,
    aplicar: function () {
        aplicarAlteracoes();
        for (let i = 0; i < gui.controllers.length; i++) {
            if (gui.controllers[i].property != "altura" && gui.controllers[i].property != "comprimento_braco" && gui.controllers[i].property != "comprimento_perna"){
                gui.controllers[i].disable();
                gui.controllers[i].hide();

            }
        }
    }
};


init();

async function init() {
    container = document.getElementById("container");
    playAnim = false;

    // Clock

    const clock = new THREE.Clock();

    // Cena

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb8c5d9);

    // Camera

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 100);
    camera.position.z = 3;
    camera.position.y = 1;
    scene.add(camera);

    // Construção do modelo

    initModelo("models/f_padrao.fbx");

    // Iluminação

    const ambientLight = new THREE.AmbientLight(0xffffff, 3.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 50);
    pointLight.position.set(2, 2, 2);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x4287f5, 100);
    pointLight2.position.set(-4, 0, -2);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0xffffff, 150);
    pointLight3.position.set(4, 3, -2);
    scene.add(pointLight3);

    const pointLight5 = new THREE.PointLight(0xffffff, 20);
    pointLight5.position.set(-2, 2, 2);
    scene.add(pointLight5);

    // GUI

    initGUI();

    // Render

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Controles de camera

    const cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 1, 0);
    cameraControls.enablePan = false;
    cameraControls.enableRotate = false;
    cameraControls.maxDistance = 4;
    cameraControls.minDistance = 2;
    cameraControls.update();
    while (mesh === undefined) {await new Promise((resolve) => setTimeout(resolve, 100));}
    const objectControls = new ObjectControls(ossos.quadril, renderer.domElement);

    // Loop de renderização

    let lastFrameTime = Date.now(); // Tempo do último frame

    renderer.setAnimationLoop(function () {
        const now = Date.now();
        const elapsed = now - lastFrameTime;

        if (elapsed > fpsInterval) {
            lastFrameTime = now - (elapsed % fpsInterval); // Ajustar o tempo para o tempo restante

            const delta = clock.getDelta(); // Obter o tempo desde o último frame

            // Verificar se a animação deve ser reproduzida
            if (playAnim == true) {
                if (mixer) {
                    // Verificar se o mixer existe
                    mixer.update(delta); // Atualizar o mixer
                }
            } else {
                if (mixer) {
                    mixer.stopAllAction(); // Parar todas as animações
                }
            }

            if (ossos.cabeca_topo) params.altura = getAlturaTotal();

            if (ossos.braco_esq) params.comprimento_braco = getComprimentoBracos();

            if (ossos.coxa_esq) params.comprimento_perna = getComprimentoPernas();
        }

        renderer.render(scene, camera);
    });

    container.appendChild(renderer.domElement);
}

// Configurações de GUI
function initGUI() {
    gui.add(params, "tamanho", 0.85, 1.15, 0.01).onChange(function (value) {
        escalarTamanho(value);
    });

    gui.add(params, "bracos", 0.85, 1.15, 0.01).onChange(function (value) {
        escalarBracos(value);
    });

    gui.add(params, "pernas", 0.75, 1.25, 0.01).onChange(function (value) {
        escalarPernas(value);
    });

    gui.add(params, "tronco", 0.85, 1.15, 0.01).onChange(function (value) {
        escalarTronco(value);
    });

    gui.add(params, "cabeca", 0.9, 1.1, 0.01).onChange(function (value) {
        escalarCabeca(value);
    });

    const alturaController = gui.add(params, "altura").decimals(2).listen();
    alturaController.domElement.querySelector("input").disabled = true;

    const comprimentoBracosController = gui.add(params, "comprimento_braco").decimals(2).listen();
    comprimentoBracosController.domElement.querySelector("input").disabled = true;

    const comprimentoPernasController = gui.add(params, "comprimento_perna").decimals(2).listen();
    comprimentoPernasController.domElement.querySelector("input").disabled = true;

    gui.add(params, "anim", [0, 1, 2, 3]).onChange(function (value) {
        rodaAnimacao(value);
    });

    gui.add(params, "aplicar");
}

function carregaAnimacao(object, animationURL) {
    const loader = new FBXLoader();
    // Carregar animação
    loader.load(
        animationURL,
        function (animation) {
            mixer = new THREE.AnimationMixer(object);
            animations.push(animation.animations[0]);

            // Armazenar o mixer para atualizar na função de renderização
            object.mixer = mixer;
        },
        undefined,
        function (error) {
            console.error("Erro ao carregar a animação:", error);
        }
    );
}

function atualizaMorphs() {
    if (mesh) {
        mesh.morphTargetInfluences[9] = params.coluna;
        mesh.morphTargetInfluences[8] = params.retangulo;
        mesh.morphTargetInfluences[7] = params.triangulo_invertido;
        mesh.morphTargetInfluences[6] = params.triangulo;
        mesh.morphTargetInfluences[5] = params.diamante;
        mesh.morphTargetInfluences[4] = params.maça;
        mesh.morphTargetInfluences[3] = params.ampulheta;
        mesh.morphTargetInfluences[2] = params.busto;
        mesh.morphTargetInfluences[1] = params.peso;
        mesh.morphTargetInfluences[0] = params.musculatura;
    }
};

// Função para carregar um modelo FBX na cena
function carregaModelo(modelURL) {
    return new Promise((resolve, reject) => {
        const loader = new FBXLoader();
        loader.load(
            modelURL,
            function (object) {
                object.scale.setScalar(0.0011);
                object.traverse(function (child) {
                    if (child.isMesh) {
                        child.geometry = BufferGeometryUtils.mergeVertices(child.geometry);
                        gui.add(params, "musculatura", 0, 1, 0.05).onChange(atualizaMorphs);
                        gui.add(params, "peso", 0, 1, 0.05).onChange(atualizaMorphs);
                        gui.add(params, "busto", 0, 1, 0.05).onChange(atualizaMorphs);
                        gui.add(params, "ampulheta", 0, 1, 0.05).onChange(atualizaMorphs);
                        gui.add(params, "maça", 0, 1, 0.05).onChange(atualizaMorphs);
                        gui.add(params, "diamante", 0, 1, 0.05).onChange(atualizaMorphs);
                        gui.add(params, "triangulo", 0, 1, 0.05).onChange(atualizaMorphs);
                        gui.add(params, "triangulo_invertido", 0, 1, 0.05).onChange(atualizaMorphs);
                        gui.add(params, "retangulo", 0, 1, 0.05).onChange(atualizaMorphs);
                        gui.add(params, "coluna", 0, 1, 0.05).onChange(atualizaMorphs);
                        child.geometry.morphTargetsRelative = true;
                        mesh = child;
                        atualizaMorphs();
                    }
                });
                object.name = "model";
                scene.add(object);
                resolve(object);
            },
            undefined,
            function (error) {
                console.error("Erro ao carregar o modelo:", error);
                reject(error); // Rejeita a promessa se houver um erro ao carregar o modelo
            }
        );
    });
}

// Função assíncrona para inicializar modelo e animação
async function initModelo(modelURL, animationURL) {
    try {
        model = await carregaModelo(modelURL, animationURL); // Espera o modelo ser carregado
        console.log("Modelo carregado:", model);

        // Desenhar o esqueleto e acessar skeleton Helper
        const skeletonHelper = new THREE.SkeletonHelper(model);
        // scene.add(skeletonHelper);

        // Definir ossos de interesse
        skeletonHelper.bones.forEach((bone, index) => {
            console.log(`Bone ${index}: ${bone.name}`);

            if (!ossos.quadril && bone.name.includes("Hips")) ossos.quadril = bone;

            if (!ossos.tronco && bone.name.includes("LowerBack")) ossos.tronco = bone;

            if (!ossos.braco_esq && bone.name.includes("LeftArm")) ossos.braco_esq = bone;

            if (!ossos.mao_esq && bone.name.includes("LeftHand")) ossos.mao_esq = bone;

            if (!ossos.ant_braco_esq && bone.name.includes("LeftForeArm")) ossos.ant_braco_esq = bone

            if (!ossos.braco_dir && bone.name.includes("RightArm")) ossos.braco_dir = bone;

            if (!ossos.ant_braco_dir && bone.name.includes("RightForeArm")) ossos.ant_braco_dir = bone;

            if (!ossos.mao_dir && bone.name.includes("RightHand")) ossos.mao_dir = bone;

            if (!ossos.coxa_esq && bone.name.includes("LeftUpLeg")) ossos.coxa_esq = bone;

            if (!ossos.pe_esq && bone.name.includes("LeftFoot")) ossos.pe_esq = bone;

            if (!ossos.coxa_dir && bone.name.includes("RightUpLeg")) ossos.coxa_dir = bone;

            if (!ossos.pe_dir && bone.name.includes("RightFoot")) ossos.pe_dir = bone;

            if (!ossos.cabeca && bone.name.includes("Head")) ossos.cabeca = bone;

            if (!ossos.cabeca_topo && bone.name.includes("Head_end")) ossos.cabeca_topo = bone;
        });

    } catch (error) {
        console.error("Erro ao carregar o modelo:", error);
    }
}

function aplicarAlteracoes() {
    if (mesh) {
        mesh.geometry.setAttribute('position', BufferGeometryUtils.computeMorphedAttributes(mesh).morphedPositionAttribute);
        mesh.updateMorphTargets();
        resetarEscalas();
        mesh.geometry.computeVertexNormals();
    }
}

function rodaAnimacao(index) {
    if (index == 0) playAnim = false;
    else {
        playAnim = true;
        mixer.stopAllAction();
        const action = mixer.clipAction(animations[index - 1]);
        action.play();
    }
}

function getAlturaTotal() {
    return ossos.cabeca_topo.getWorldPosition(new THREE.Vector3()).y;
}

function getComprimentoBracos() {
    const braco = ossos.braco_esq.getWorldPosition(new THREE.Vector3());
    const ant_braco = ossos.ant_braco_esq.getWorldPosition(new THREE.Vector3());
    const mao = ossos.mao_esq.getWorldPosition(new THREE.Vector3());
    return braco.distanceTo(ant_braco) + ant_braco.distanceTo(mao);
}

function getComprimentoPernas() {
    return ossos.quadril.getWorldPosition(new THREE.Vector3()).y;
}

// Função para resetar todas as escalas
function resetarEscalas() {
    escalarTamanho(1, false);
    escalarBracos(1);
    escalarPernas(1, false);
    escalarTronco(1);
    escalarCabeca(1);
}

// Função para escalar as dimensões totais do modelo
function escalarTamanho(value, mover = true) {
    escalarOsso(ossos.quadril, new THREE.Vector3(value, value, value));
    if (mover) model.position.y = 0 + (value - 1) + (params.pernas - 1);
}

// Função para escalar a cabeça em tamanho
function escalarCabeca(value) {
    escalarOssoI(ossos.cabeca, new THREE.Vector3(value, value, value));
}

// Função para escalar o tronco em comprimento
function escalarTronco(value) {
    escalarOssoI(ossos.tronco, new THREE.Vector3(1, value, 1));
}

// Função para escalar os braços em comprimento
function escalarBracos(value) {
    escalarOsso(ossos.braco_esq, new THREE.Vector3(1, value, 1));
    escalarOsso(ossos.braco_dir, new THREE.Vector3(1, value, 1));
}

// Função para escalar as pernas em comprimento
function escalarPernas(value, mover = true) {
    escalarOsso(ossos.coxa_esq, new THREE.Vector3(1, value, 1));
    escalarOsso(ossos.coxa_dir, new THREE.Vector3(1, value, 1));
    if (mover) model.position.y = 0 + (value - 1) + (params.tamanho - 1);
}

// Função para escalar um osso
function escalarOsso(osso, vecEscala) {
    osso.scale.set(1 * vecEscala.x, 1 * vecEscala.y, 1 * vecEscala.z);
    osso.updateMatrixWorld(true);
}

// Função para escalar um osso individualmente
function escalarOssoI(osso, vecEscala) {
    osso.children.forEach((child, index) => {
        child.scale.set(1 / vecEscala.x, 1 / vecEscala.y, 1 / vecEscala.z);
    });
    osso.scale.set(vecEscala.x, vecEscala.y, vecEscala.z);
    osso.updateMatrixWorld(true);
}

// Atualiza tamanho do viewport
window.addEventListener(
    "resize",
    function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    },
    false
);
