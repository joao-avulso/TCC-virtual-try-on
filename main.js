import * as THREE from "three";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";

let container, camera, scene, renderer, model, mixer, playAnim;

let animations = new Array();

const fps = 60; // Limite de frames por segundo
const fpsInterval = 1000 / fps; // Intervalo de tempo entre os frames em milissegundos

const ossos = {};

const debug_group = [];

const params = {
    bracos: 1,
    pernas: 1,
    tronco: 1,
    cabeca: 1,
    altura: 0.0,
    comprimento_braco: 0.0,
    comprimento_perna: 0.0,
    anim: 0,
};

init();

async function init() {
    container = document.getElementById("container");
    playAnim = false;

    // clock

    const clock = new THREE.Clock();

    // cena

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xedf4ff);
    scene.fog = new THREE.Fog(0xedf4ff, 1, 30);

    // camera

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 100);
    camera.position.z = 4;
    camera.position.y = 1.5;
    scene.add(camera);

    // contrução do modelo

    loadAndAccessModel("models/Ch36_nonPBR.fbx"); // Espera o modelo ser carregado

    // helpers

    const gridHelper = new THREE.GridHelper(1000, 1000);
    scene.add(gridHelper);

    // iluminação

    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 50);
    pointLight.position.set(4, 2, 0);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x4287f5, 100);
    pointLight2.position.set(-4, 0, -2);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0xf5e749, 100);
    pointLight3.position.set(4, 3, -2);
    scene.add(pointLight3);

    // GUI

    initGUI();

    // render

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // controles de camera

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.minPolarAngle = Math.PI / 2;
    controls.maxPolarAngle = Math.PI / 2;
    controls.update();

    // loop de renderização

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
                    // Verificar se o mixer existe
                    mixer.stopAllAction(); // Parar todas as animações
                }
            }

            if (ossos.cabeca_topo) params.altura = getAlturaTotal();

            if (ossos.braco_esq) params.comprimento_braco = getComprimentoBracos();

            if (ossos.coxa_esq) params.comprimento_perna = getComprimentoPernas();

            // atualiza esferas de debug
            let i = 0;
            for (const [key, value] of Object.entries(ossos)) {
                if (value) {
                    debug_group[i].position.copy(value.getWorldPosition(new THREE.Vector3()));
                }
                i++;
            }
        }

        renderer.render(scene, camera);
    });

    container.appendChild(renderer.domElement);
}

// Configurações de GUI
function initGUI() {
    const gui = new GUI({ title: "Membros", width: 400 });

    gui.add(params, "bracos", 0.5, 1.5, 0.01).onChange(function (value) {
        escalarBracos(value);
    });

    gui.add(params, "pernas", 0.5, 1.5, 0.01).onChange(function (value) {
        escalarPernas(value);
    });

    gui.add(params, "tronco", 0.5, 1.5, 0.01).onChange(function (value) {
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

    gui.add(params, "anim", [0, 1, 2]).onChange(function (value) {
        rodaAnimacao(value);
    });
}

function loadAnimation(object, animationURL) {
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

// Função para carregar um modelo FBX na cena
function loadModel(modelURL) {
    return new Promise((resolve, reject) => {
        const loader = new FBXLoader();
        loader.load(
            modelURL,
            function (object) {
                object.scale.setScalar(0.01);
                object.traverse(function (child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
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

// Função assíncrona para carregar o modelo e então acessá-lo
async function loadAndAccessModel(modelURL, animationURL) {
    try {
        model = await loadModel(modelURL, animationURL); // Espera o modelo ser carregado
        console.log("Modelo carregado:", model);

        // Desenhar o esqueleto e acessar skeleton Helper
        const skeletonHelper = new THREE.SkeletonHelper(model);
        // scene.add(skeletonHelper);

        // Definir ossos de interesse
        skeletonHelper.bones.forEach((bone, index) => {
            console.log(`Bone ${index}: ${bone.name}`);

            if (!ossos.quadril && bone.name.includes("Hip")) ossos.quadril = bone;

            if (
                !ossos.tronco &&
                bone.name.includes("Spine") &&
                !bone.name.includes("Spine1") &&
                !bone.name.includes("Spine2")
            )
                ossos.tronco = bone;

            if (!ossos.braco_esq && bone.name.includes("LeftArm")) ossos.braco_esq = bone;

            if (!ossos.mao_esq && bone.name.includes("LeftHand")) ossos.mao_esq = bone;

            if (!ossos.braco_dir && bone.name.includes("RightArm")) ossos.braco_dir = bone;

            if (!ossos.mao_dir && bone.name.includes("RightHand")) ossos.mao_dir = bone;

            if (!ossos.coxa_esq && bone.name.includes("LeftUpLeg")) ossos.coxa_esq = bone;

            if (!ossos.pe_esq && bone.name.includes("LeftFoot")) ossos.pe_esq = bone;

            if (!ossos.coxa_dir && bone.name.includes("RightUpLeg")) ossos.coxa_dir = bone;

            if (!ossos.pe_dir && bone.name.includes("RightFoot")) ossos.pe_dir = bone;

            if (!ossos.cabeca && bone.name.includes("Head")) ossos.cabeca = bone;

            if (!ossos.cabeca_topo && bone.name.includes("HeadTop_End")) ossos.cabeca_topo = bone;
        });

        // Carregar animações
        loadAnimation(model, "anims/Idle.fbx");
        loadAnimation(model, "anims/Rumba_Dancing.fbx");

        // Criar esferas de debug para os ossos
        const sphereGeometry = new THREE.SphereGeometry(0.05);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

        for (const [key, value] of Object.entries(ossos)) {
            if (value) {
                const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                sphere.renderOrder = 999;
                sphere.material.depthTest = false;
                sphere.material.depthWrite = false;
                sphere.onBeforeRender = function (renderer) {
                    renderer.clearDepth();
                };
                sphere.position.copy(value.getWorldPosition(new THREE.Vector3()));
                sphere.name = value.name;
                debug_group.push(sphere);
                scene.add(sphere);
            }
        }

        console.log(debug_group);

        //
    } catch (error) {
        console.error("Erro ao carregar o modelo:", error);
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
    return ossos.braco_esq
        .getWorldPosition(new THREE.Vector3())
        .distanceTo(ossos.mao_esq.getWorldPosition(new THREE.Vector3()));
}

function getComprimentoPernas() {
    const pe_esq = new THREE.Vector3();
    ossos.pe_esq.getWorldPosition(pe_esq);
    const aux = ossos.coxa_esq.getWorldPosition(new THREE.Vector3()).distanceTo(pe_esq);
    return aux + pe_esq.distanceTo(new THREE.Vector3(0, pe_esq.y, 0));
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
    // escalarOsso(ossos.mao_esq, new THREE.Vector3(1, 1 / value, 1));
    // escalarOsso(ossos.mao_dir, new THREE.Vector3(1, 1 / value, 1));
}

// Função para escalar as pernas em comprimento
function escalarPernas(value) {
    escalarOsso(ossos.coxa_esq, new THREE.Vector3(1, value, 1));
    escalarOsso(ossos.coxa_dir, new THREE.Vector3(1, value, 1));
    model.position.y = 0 + (value - 1);
}

// Função para escalar um osso
function escalarOsso(osso, vecEscala) {
    osso.scale.set(1 * vecEscala.x, 1 * vecEscala.y, 1 * vecEscala.z);
    osso.updateMatrixWorld(true);
}

// Função para escalar um osso individualmente
function escalarOssoI(osso, vecEscala) {
    osso.scale.set(vecEscala.x, vecEscala.y, vecEscala.z);
    osso.children.forEach((child, index) => {
        child.scale.set(1 / vecEscala.x, 1 / vecEscala.y, 1 / vecEscala.z);
    });
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
