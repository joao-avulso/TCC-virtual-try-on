import * as THREE from "three";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ObjectControls } from "./ObjectControls.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

/**
 * Instancia um novo viewport do provador virtual no elemento definido por containerId.
 * @param {String} containerId - Id do elemento html que conterá o viewport
 * @example
 * const Provador = new ProvadorViewport("container");
 */
export class ProvadorViewport {
    /** Elemento html que conterá o viewport */
    #container;

    /** Limite de frames por segundo */
    #fps = 60;

    /** Intervalo de tempo entre frames */
    #fpsInterval = 1000 / this.#fps;

    /** Cena 3D do viewport */
    #scene = new THREE.Scene();

    /** Renderizador do viewport */
    #renderer = new THREE.WebGLRenderer({ antialias: true });

    /** Instância do modelo de manequim */
    #modelo = new Modelo(this.#scene, this.#renderer, "models/f_padrao2.fbx");

    constructor(containerId) {
        // Obter o elemento html que conterá o viewport
        this.#container = document.getElementById(containerId);

        // Cor de fundo da cena
        this.#scene.background = new THREE.Color(0xb8c5d9);

        // Inicialização da câmera
        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 100);
        camera.position.z = 3;
        camera.position.y = 1;

        // Iluminação da cena
        const ambientLight = new THREE.AmbientLight(0xffffff, 3.5);
        const pointLight = new THREE.PointLight(0xffffff, 50);
        pointLight.position.set(2, 2, 2);
        const pointLight2 = new THREE.PointLight(0x4287f5, 100);
        pointLight2.position.set(-4, 0, -2);
        const pointLight3 = new THREE.PointLight(0xffffff, 150);
        pointLight3.position.set(4, 3, -2);
        const pointLight4 = new THREE.PointLight(0xffffff, 20);
        pointLight4.position.set(-2, 2, 2);

        // Configuração do renderizador
        this.#renderer.setPixelRatio(window.devicePixelRatio);
        this.#renderer.setSize(window.innerWidth, window.innerHeight);

        // Controlador de câmera
        const cameraControls = new OrbitControls(camera, this.#renderer.domElement);
        cameraControls.target.set(0, 1, 0);
        cameraControls.enablePan = false;
        cameraControls.enableRotate = false;
        cameraControls.maxDistance = 4;
        cameraControls.minDistance = 2;
        cameraControls.update();

        // Adicionando elementos à cena
        this.#scene.add(camera);
        this.#scene.add(ambientLight);
        this.#scene.add(pointLight);
        this.#scene.add(pointLight2);
        this.#scene.add(pointLight3);
        this.#scene.add(pointLight4);

        // Inicializando o modelo
        this.#modelo.initModelo().then(() => {
            // this.carregaModelo("models/camiseta.fbx").then((roupa) => {
            //     this.#modelo.ossos.quadril.attach(roupa);
            // });
        });

        // Loop de renderização
        let lastFrameTime = Date.now(); // Tempo do último frame

        const clock = new THREE.Clock();

        this.#renderer.setAnimationLoop(() => {
            const now = Date.now();
            const elapsed = now - lastFrameTime;

            if (elapsed > this.#fpsInterval) {
                lastFrameTime = now - (elapsed % this.#fpsInterval); // Ajustar o tempo para o tempo restante

                /*
                const delta = clock.getDelta(); // Obter o tempo desde o último frame

                // Verificar se a animação deve ser reproduzida
                if (this.#playAnim == true) {
                    if (this.#mixer) {
                        // Verificar se o mixer existe
                        this.#mixer.update(delta); // Atualizar o mixer
                    }
                } else {
                    if (this.#mixer) {
                        this.#mixer.stopAllAction(); // Parar todas as animações
                    }
                }
                */

                // Atualizar informações de altura e comprimento dos membros
                if (this.#modelo.ossos.cabeca_topo) this.#modelo.params.altura = this.#modelo.getAlturaTotal();

                if (this.#modelo.ossos.braco_esq)
                    this.#modelo.params.comprimento_braco = this.#modelo.getComprimentoBracos();

                if (this.#modelo.ossos.coxa_esq)
                    this.#modelo.params.comprimento_perna = this.#modelo.getComprimentoPernas();
            }

            this.#renderer.render(this.#scene, camera);
        });

        // Atualizar a câmera ao redimensionar a janela
        window.addEventListener(
            "resize",
            () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                this.#renderer.setSize(window.innerWidth, window.innerHeight);
            },
            false
        );

        this.#container.appendChild(this.#renderer.domElement);
    }

    /** Carrega o arquivo 3D em armazenado em url
     * @returns {Promise} Retorna uma promessa que resolve o objeto 3D do modelo carregado
     */
    carregaModelo(url) {
        return new Promise((resolve, reject) => {
            const loader = new FBXLoader();
            loader.load(
                url,
                (objeto) => {
                    objeto.scale.setScalar(1 / 100);

                    objeto.traverse((malha) => {
                        if (malha.isMesh) {
                            malha.geometry = BufferGeometryUtils.mergeVertices(malha.geometry);
                            malha.geometry.morphTargetsRelative = true;
                            malha.morphTargetInfluences[0] = 1;
                        }
                    });

                    objeto.name = "roupa";

                    this.#scene.add(objeto);

                    console.log("Modelo carregado:", objeto);
                    resolve(objeto);
                },
                undefined,
                function (error) {
                    console.error("Erro ao carregar o modelo:", error);
                    reject(error); // Rejeita a promessa se houver um erro ao carregar o modelo
                }
            );
        });
    }

    /** Inicializa uma interface gráfica simples para customização do manequim */
    initGUI() {
        const gui = new GUI({ title: "Customização de manequim", width: 400 });

        this.#modelo.setGui(gui);

        const alturaController = gui.add(this.#modelo.params, "altura").decimals(2).listen();
        alturaController.domElement.querySelector("input").disabled = true;

        const comprimentoBracosController = gui.add(this.#modelo.params, "comprimento_braco").decimals(2).listen();
        comprimentoBracosController.domElement.querySelector("input").disabled = true;

        const comprimentoPernasController = gui.add(this.#modelo.params, "comprimento_perna").decimals(2).listen();
        comprimentoPernasController.domElement.querySelector("input").disabled = true;

        gui.add(this.#modelo.params, "tamanho", 0.85, 1.15, 0.01).onChange((value) => {
            this.#modelo.escalarTamanho(value);
        });

        gui.add(this.#modelo.params, "bracos", 0.85, 1.15, 0.01).onChange((value) => {
            this.#modelo.escalarBracos(value);
        });

        gui.add(this.#modelo.params, "pernas", 0.75, 1.25, 0.01).onChange((value) => {
            this.#modelo.escalarPernas(value);
        });

        gui.add(this.#modelo.params, "tronco", 0.85, 1.15, 0.01).onChange((value) => {
            this.#modelo.escalarTronco(value);
        });

        gui.add(this.#modelo.params, "cabeca", 0.9, 1.1, 0.01).onChange((value) => {
            this.#modelo.escalarCabeca(value);
        });

        gui.add(this.#modelo.params, "musculatura", 0, 1, 0.05).onChange(this.#modelo.atualizaMorphs);
        gui.add(this.#modelo.params, "peso", 0, 1, 0.05).onChange(this.#modelo.atualizaMorphs);
        gui.add(this.#modelo.params, "busto", 0, 1, 0.05).onChange(this.#modelo.atualizaMorphs);
        gui.add(this.#modelo.params, "ampulheta", 0, 1, 0.05).onChange(this.#modelo.atualizaMorphs);
        gui.add(this.#modelo.params, "maça", 0, 1, 0.05).onChange(this.#modelo.atualizaMorphs);
        gui.add(this.#modelo.params, "diamante", 0, 1, 0.05).onChange(this.#modelo.atualizaMorphs);
        gui.add(this.#modelo.params, "triangulo", 0, 1, 0.05).onChange(this.#modelo.atualizaMorphs);
        gui.add(this.#modelo.params, "triangulo_invertido", 0, 1, 0.05).onChange(this.#modelo.atualizaMorphs);
        gui.add(this.#modelo.params, "retangulo", 0, 1, 0.05).onChange(this.#modelo.atualizaMorphs);
        gui.add(this.#modelo.params, "coluna", 0, 1, 0.05).onChange(this.#modelo.atualizaMorphs);

        gui.add(this.#modelo.params, "aplicar");
    }
}

/**
 * Instanciar um novo modelo para exibição no provador virtual.
 * @param {THREE.Scene} scene - Cena 3D do viewport
 * @param {THREE.WebGLRenderer} renderer - Renderizador do viewport
 * @param {String} url - URL do arquivo do modelo 3D
 */
class Modelo {
    /** Instância da cena 3D */
    #scene;

    /** Instância da interface gráfica */
    #gui;

    /** Instância do renderizador */
    #renderer;

    /** URL do arquivo do modelo 3D */
    #url = new String();

    /** Objeto 3D do modelo */
    #model = new THREE.Object3D();

    /** Malha 3D do modelo */
    #malha = new THREE.Mesh();

    /** Objeto contendo os ossos do modelo */
    ossos = new Object();

    /** Parâmetros para customização do modelo 3D */
    params = {
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
        busto: 0.25,
        ampulheta: 0,
        maça: 0,
        diamante: 0,
        triangulo: 0,
        triangulo_invertido: 0,
        retangulo: 0,
        coluna: 0,
        aplicar: () => {
            this.aplicarAlteracoes();
            for (let i = 0; i < this.#gui.controllers.length; i++) {
                if (
                    this.#gui.controllers[i].property != "altura" &&
                    this.#gui.controllers[i].property != "comprimento_braco" &&
                    this.#gui.controllers[i].property != "comprimento_perna"
                ) {
                    this.#gui.controllers[i].disable();
                    this.#gui.controllers[i].hide();
                }
            }
        },
    };

    /** Atualiza a morfologia do modelo */
    atualizaMorphs = () => {
        if (this.#malha) {
            this.#malha.morphTargetInfluences[9] = this.params.coluna;
            this.#malha.morphTargetInfluences[8] = this.params.retangulo;
            this.#malha.morphTargetInfluences[7] = this.params.triangulo_invertido;
            this.#malha.morphTargetInfluences[6] = this.params.triangulo;
            this.#malha.morphTargetInfluences[5] = this.params.diamante;
            this.#malha.morphTargetInfluences[4] = this.params.maça;
            this.#malha.morphTargetInfluences[3] = this.params.ampulheta;
            this.#malha.morphTargetInfluences[2] = this.params.busto;
            this.#malha.morphTargetInfluences[1] = this.params.peso;
            this.#malha.morphTargetInfluences[0] = this.params.musculatura;
        }
    };

    constructor(scene, renderer, url) {
        this.#scene = scene;
        this.#renderer = renderer;
        this.#url = url;
    }

    setGui(gui) {
        this.#gui = gui;
    }

    /** Carrega o arquivo 3D em armazenado em this.url
     * @returns {Promise} Retorna uma promessa que resolve o objeto 3D do modelo carregado
     */
    #carregaModelo() {
        return new Promise((resolve, reject) => {
            const loader = new FBXLoader();
            loader.load(
                this.#url,
                (objeto) => {
                    objeto.scale.setScalar(1 / 100);

                    objeto.traverse((malha) => {
                        if (malha.isMesh) {
                            malha.geometry = BufferGeometryUtils.mergeVertices(malha.geometry);

                            malha.geometry.morphTargetsRelative = true;
                            this.#malha = malha;

                            this.atualizaMorphs();
                        }
                    });

                    objeto.name = "modelo";

                    this.#scene.add(objeto);

                    resolve(objeto);
                },
                undefined,
                function (error) {
                    console.error("Erro ao carregar o modelo:", error);
                    reject(error); // Rejeita a promessa se houver um erro ao carregar o modelo
                }
            );
        });
    }

    /** Inicializa o modelo 3D */
    async initModelo() {
        try {
            this.#model = await this.#carregaModelo(); // Espera o modelo ser carregado
            console.log("Modelo carregado:", this.#model);

            const skeletonHelper = new THREE.SkeletonHelper(this.#model);

            // Definir ossos de interesse
            skeletonHelper.bones.forEach((bone, index) => {
                console.log(`Bone ${index}: ${bone.name}`);

                if (!this.ossos.quadril && bone.name.includes("Hips")) this.ossos.quadril = bone;

                if (!this.ossos.tronco && bone.name.includes("LowerBack")) this.ossos.tronco = bone;

                if (!this.ossos.braco_esq && bone.name.includes("LeftArm")) this.ossos.braco_esq = bone;

                if (!this.ossos.mao_esq && bone.name.includes("LeftHand")) this.ossos.mao_esq = bone;

                if (!this.ossos.ant_braco_esq && bone.name.includes("LeftForeArm")) this.ossos.ant_braco_esq = bone;

                if (!this.ossos.braco_dir && bone.name.includes("RightArm")) this.ossos.braco_dir = bone;

                if (!this.ossos.ant_braco_dir && bone.name.includes("RightForeArm")) this.ossos.ant_braco_dir = bone;

                if (!this.ossos.mao_dir && bone.name.includes("RightHand")) this.ossos.mao_dir = bone;

                if (!this.ossos.coxa_esq && bone.name.includes("LeftUpLeg")) this.ossos.coxa_esq = bone;

                if (!this.ossos.pe_esq && bone.name.includes("LeftFoot")) this.ossos.pe_esq = bone;

                if (!this.ossos.coxa_dir && bone.name.includes("RightUpLeg")) this.ossos.coxa_dir = bone;

                if (!this.ossos.pe_dir && bone.name.includes("RightFoot")) this.ossos.pe_dir = bone;

                if (!this.ossos.cabeca && bone.name.includes("Head")) this.ossos.cabeca = bone;

                if (!this.ossos.cabeca_topo && bone.name.includes("Head_end")) this.ossos.cabeca_topo = bone;
            });

            // Controlador de rotação da malha
            const objectControls = new ObjectControls(this.ossos.quadril, this.#renderer.domElement);
        } catch (error) {
            console.error("Erro ao carregar o modelo:", error);
        }
    }

    /** Aplica as alterações realizadas na malha e refaz o cálculo do sombreamento */
    aplicarAlteracoes() {
        if (this.#malha) {
            this.#malha.geometry.setAttribute(
                "position",
                BufferGeometryUtils.computeMorphedAttributes(this.#malha).morphedPositionAttribute
            );
            this.#malha.updateMorphTargets();
            this.resetarEscalas();
            this.#malha.geometry.computeVertexNormals();
        }
    }

    /** @returns {Number} Retorna a altura total do modelo */
    getAlturaTotal() {
        return this.ossos.cabeca_topo.getWorldPosition(new THREE.Vector3()).y;
    }

    /** @returns {Number} Retorna o comprimento dos braços do modelo */
    getComprimentoBracos() {
        const braco = this.ossos.braco_esq.getWorldPosition(new THREE.Vector3());
        const ant_braco = this.ossos.ant_braco_esq.getWorldPosition(new THREE.Vector3());
        const mao = this.ossos.mao_esq.getWorldPosition(new THREE.Vector3());
        return braco.distanceTo(ant_braco) + ant_braco.distanceTo(mao);
    }

    /** @returns {Number} Retorna a o comprimento das pernas do modelo */
    getComprimentoPernas() {
        return this.ossos.quadril.getWorldPosition(new THREE.Vector3()).y;
    }

    /** Reseta as alterações de escala realizadas no modelo */
    resetarEscalas() {
        this.escalarTamanho(1, false);
        this.escalarBracos(1);
        this.escalarPernas(1, false);
        this.escalarTronco(1);
        this.escalarCabeca(1);
    }

    /** Realiza a escala em todos os ossos do modelo
     * @param {Number} valor - Valor de escala
     * @param {Boolean} mover - Decide se o modelo deve ser reposicionado ao escalar
     */
    escalarTamanho(valor, mover = true) {
        this.escalarOsso(this.ossos.quadril, new THREE.Vector3(valor, valor, valor));
        if (mover) this.#model.position.y = 0 + (valor - 1) + (this.params.pernas - 1);
    }

    /** Realiza a escala do tamanho da cabeça do modelo
     * @param {Number} valor - Valor de escala
     */
    escalarCabeca(valor) {
        this.escalarOssoI(this.ossos.cabeca, new THREE.Vector3(valor, valor, valor));
    }

    /** Realiza a escala do comprimento do tronco do modelo
     * @param {Number} valor - Valor de escala
     */
    escalarTronco(valor) {
        this.escalarOssoI(this.ossos.tronco, new THREE.Vector3(1, valor, 1));
    }

    /** Realiza a escala do comprimento dos braços do modelo
     * @param {Number} valor - Valor de escala
     */
    escalarBracos(valor) {
        this.escalarOsso(this.ossos.braco_esq, new THREE.Vector3(1, valor, 1));
        this.escalarOsso(this.ossos.braco_dir, new THREE.Vector3(1, valor, 1));
    }

    /** Realiza a escala do comprimento das pernas do modelo
     * @param {Number} valor - Valor de escala
     * @param {Boolean} mover - Decide se o modelo deve ser reposicionado ao escalar
     */
    escalarPernas(valor, mover = true) {
        this.escalarOsso(this.ossos.coxa_esq, new THREE.Vector3(1, valor, 1));
        this.escalarOsso(this.ossos.coxa_dir, new THREE.Vector3(1, valor, 1));
        if (mover) this.#model.position.y = 0 + (valor - 1) + (this.params.tamanho - 1);
    }

    /** Realiza a escala do tamanho de um osso do modelo, juntamente com todos os seus filhos
     * @param {THREE.Object3D} osso - Object3D do osso a ser escalado
     * @param {Number} valor - Valor de escala
     */
    escalarOsso(osso, valor) {
        osso.scale.set(1 * valor.x, 1 * valor.y, 1 * valor.z);
        osso.updateMatrixWorld(true);
    }

    /** Realiza a escala do tamanho de um osso individual do modelo
     * @param {THREE.Object3D} osso - Object3D do osso a ser escalado
     * @param {Number} valor - Valor de escala
     */
    escalarOssoI(osso, valor) {
        osso.children.forEach((child, index) => {
            child.scale.set(1 / valor.x, 1 / valor.y, 1 / valor.z);
        });
        osso.scale.set(valor.x, valor.y, valor.z);
        osso.updateMatrixWorld(true);
    }
}
