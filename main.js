import * as THREE from "three";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";

let container, camera, scene, renderer, mesh, model;

const ossos = {};
// ossos
// let braco_esq = new THREE.Bone();
// let antebraco_esq = new THREE.Bone();
// let braco_dir = new THREE.Bone();
// let antebraco_dir = new THREE.Bone();
// let coxa_esq = new THREE.Bone();
// let perna_esq = new THREE.Bone();
// let coxa_dir = new THREE.Bone();
// let perna_dir = new THREE.Bone();

init();

async function init() {
    container = document.getElementById("container");

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

    loadAndAccessModel("models/X_Bot.fbx"); // Espera o modelo ser carregado

    // helpers

    const gridHelper = new THREE.GridHelper(1000, 1000);
    scene.add(gridHelper);

    // luzes

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

    // orbit controls

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.minPolarAngle = Math.PI / 2;
    controls.maxPolarAngle = Math.PI / 2;
    controls.update();

    // render loop

    renderer.setAnimationLoop(function () {
        renderer.render(scene, camera);
    });
    container.appendChild(renderer.domElement);
}

function createObject() {
    const geometry = new THREE.BoxGeometry(2, 2, 2, 32, 32, 32);

    // cria um vetor de morph targets
    geometry.morphAttributes.position = [];

    // posições originais dos vértices do cubo
    const positionAttribute = geometry.attributes.position;

    // mover os vértices do cubo para as posições dos vértices de uma esfera
    const spherePositions = [];

    for (let i = 0; i < positionAttribute.count; i++) {
        const x = positionAttribute.getX(i);
        const y = positionAttribute.getY(i);
        const z = positionAttribute.getZ(i);

        spherePositions.push(
            x * Math.sqrt(1 - (y * y) / 2 - (z * z) / 2 + (y * y * z * z) / 3),
            y * Math.sqrt(1 - (z * z) / 2 - (x * x) / 2 + (z * z * x * x) / 3),
            z * Math.sqrt(1 - (x * x) / 2 - (y * y) / 2 + (x * x * y * y) / 3)
        );
    }

    // adicionar posições da esfera ao primeiro morph target
    geometry.morphAttributes.position[0] = new THREE.Float32BufferAttribute(spherePositions, 3);

    return geometry;
}

// Configurações de GUI
function initGUI() {
    const params = {
        bracos: 1,
        braco_dir: 1,
        braco_esq: 1,
        antebraco_dir: 1,
        antebraco_esq: 1,
    };

    const gui = new GUI({ title: "Membros" });

    gui.add(params, "bracos", 0.5, 2, 0.01).onChange(function (value) {
        ossos.braco_esq.scale.set(ossos.braco_dir.scale.x, ossos.braco_dir.scale.y, ossos.braco_dir.scale.z);
        escalarOsso(ossos.braco_dir, new THREE.Vector3(1, value, 1));
        escalarOsso(ossos.braco_esq, new THREE.Vector3(1, value, 1));
    });

    gui.add(params, "braco_dir", 0.5, 2, 0.01).onChange(function (value) {
        escalarOssoI(ossos.braco_dir, new THREE.Vector3(1, value, 1));
    });

    gui.add(params, "braco_esq", 0.5, 2, 0.01).onChange(function (value) {
        escalarOssoI(ossos.braco_esq, new THREE.Vector3(1, value, 1));
    });

    gui.add(params, "antebraco_esq", 0.5, 2, 0.01).onChange(function (value) {
        escalarOssoI(ossos.antebraco_esq, new THREE.Vector3(1, value, 1));
    });

    gui.add(params, "antebraco_dir", 0.5, 2, 0.01).onChange(function (value) {
        escalarOssoI(ossos.antebraco_dir, new THREE.Vector3(1, value, 1));
    });
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
                resolve(object); // Resolve a promessa com o objeto carregado
            },
            undefined,
            function (error) {
                reject(error); // Rejeita a promessa se houver um erro
            }
        );
    });
}

// Função assíncrona para carregar o modelo e então acessá-lo
async function loadAndAccessModel(modelURL) {
    try {
        model = await loadModel(modelURL); // Espera o modelo ser carregado
        console.log("Modelo carregado:", model);

        // Desenhar o esqueleto e acessar skeleton Helper
        const skeletonHelper = new THREE.SkeletonHelper(model);
        scene.add(skeletonHelper);

        // Liste todos os ossos
        skeletonHelper.bones.forEach((bone, index) => {
            console.log(`Bone ${index}: ${bone.name}`);
            switch (index) {
                case 0:
                    ossos.quadril = bone;
                    break;

                case 63:
                    ossos.braco_esq = bone;
                    break;

                case 65:
                    ossos.antebraco_esq = bone;
                    break;

                case 10:
                    ossos.braco_dir = bone;
                    break;

                case 12:
                    ossos.antebraco_dir = bone;
                    break;

                case 119:
                    ossos.coxa_esq = bone;
                    break;

                case 121:
                    ossos.perna_esq = bone;
                    break;

                case 109:
                    ossos.coxa_dir = bone;
                    break;

                case 111:
                    ossos.perna_dir = bone;
                    break;

                default:
                    break;
            }
        });

        // Escala o braço esquerdo
        // escalarOssoI(ossos.quadril, new THREE.Vector3(1.7, 1, 1));
        // escalarOsso(ossos.braco_esq, new THREE.Vector3(1, 1.7, 1));
        // escalarOsso(ossos.braco_dir, new THREE.Vector3(1, 1.7, 1));
        // escalarOssoI(ossos.coxa_dir, new THREE.Vector3(1, 1.7, 1));
        // escalarOssoI(ossos.coxa_esq, new THREE.Vector3(1, 1.7, 1));

        //
    } catch (error) {
        console.error("Erro ao carregar o modelo:", error);
    }
}

// Função para escalar um osso
function escalarOsso(osso, vecEscala) {
    osso.scale.set(1 * vecEscala.x, 1 * vecEscala.y, 1 * vecEscala.z);
    osso.updateMatrixWorld(true);
}

// Função para escalar um osso individualmente
function escalarOssoI(osso, vecEscala) {
    osso.scale.set(1 * vecEscala.x, 1 * vecEscala.y, 1 * vecEscala.z);
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
