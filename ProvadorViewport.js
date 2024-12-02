import * as THREE from "three";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ObjectControls } from "./ObjectControls.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import * as ObjectUtils from "./ObjectUtils.js";

let carregamento1 = 0;

/**
 * Instancia um novo viewport do provador virtual no elemento definido por containerId.
 * @param {String} containerId - Id do elemento html que conterá o viewport
 * @param {Boolean} autoLoad - Define se o modelo deve ser carregado automaticamente
 * @example
 * const Provador = new ProvadorViewport("container");
 */
export class ProvadorViewport {
    /** Elemento html que conterá o viewport */
    #container;

    /** Limite de frames por segundo */
    #fps = 500;

    /** Intervalo de tempo entre frames */
    #fpsInterval = 1000 / this.#fps;

    /** Cena 3D do viewport */
    #scene = new THREE.Scene();

    /** Renderizador do viewport */
    #renderer = new THREE.WebGLRenderer({ antialias: true });

    #rotate = false;

    #countStats = false;

    #stats = [];

    #timestamps = [];

    /** Instância do modelo de manequim */
    modelo = new Modelo(this, this.#scene, this.#renderer, "models/f_padrao.fbx");

    constructor(containerId, autoLoad = true) {
        // Obter o elemento html que conterá o viewport
        this.#container = document.getElementById(containerId);

        // Cor de fundo da cena
        this.#scene.background = new THREE.Color(0xa3b1c7);

        // Inicialização da câmera
        const camera = new THREE.PerspectiveCamera(45, this.#container.clientWidth / this.#container.clientHeight, 1, 100);
        camera.position.z = 2.5;
        camera.position.y = 1;
        camera.position.x = 2;

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
        this.#renderer.setSize(this.#container.clientWidth, this.#container.clientHeight);

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
        if (autoLoad) this.modelo.initModelo();

        this.#renderer.localClippingEnabled = true;

        // Loop de renderização
        let lastFrameTime = Date.now(); // Tempo do último frame
        let lastCount = Date.now(); // Tempo do último frame
        const countInterval = 1000 / 30;

        const clock = new THREE.Clock();

        this.#renderer.setAnimationLoop(() => {
            const now = Date.now();
            const elapsed = now - lastFrameTime;
            const elapsedCount = now - lastCount;

            if (elapsed > this.#fpsInterval) {
                lastFrameTime = now - (elapsed % this.#fpsInterval); // Ajustar o tempo para o tempo restante

                if (this.#countStats && elapsedCount > countInterval) {
                    lastCount = now - (elapsedCount % countInterval);
                    this.#stats.push(elapsed);
                    this.#timestamps.push(performance.now());
                }

                if (this.#rotate) {
                    if (this.modelo.ossos.quadril)
                        this.modelo.ossos.quadril.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), 2 * elapsed/1000);
                }

                // Atualizar informações de altura e comprimento dos membros
                if (this.modelo.ossos.cabeca_topo) this.modelo.params.altura_m = this.modelo.getAlturaTotal();

                // Resetar a rotação do modelo
                if (this.modelo.objectControls && !this.#rotate) this.modelo.objectControls.resetRotation();

                this.#renderer.render(this.#scene, camera);
            }
        });

        // Atualizar a câmera ao redimensionar a janela
        window.addEventListener(
            "resize",
            () => {
                camera.aspect = this.#container.clientWidth / this.#container.clientHeight;
                camera.updateProjectionMatrix();
                this.#renderer.setSize(this.#container.clientWidth, this.#container.clientHeight);
            },
            false
        );

        this.#container.appendChild(this.#renderer.domElement);

    }

    /** Inicializa uma interface gráfica simples para customização do manequim */
    initGUI() {
        // ----------------------------------- Janela de customização ----------------------------------- //
        this.gui = new GUI({ title: "Manequim", width: 400 });
        this.gui.domElement.style.right = "25px";
        this.gui.domElement.style.top = "25px";

        this.folderCustom = this.gui.addFolder("Customização");

        this.folderCustom
            .add(this.modelo.params, "cintura", 0, 3, 1)
            .name("Cintura")
            .onChange((value) => {
                this.modelo.setCintura(value);
            });

        this.folderCustom
            .add(this.modelo.params, "busto", 1 / 4, 1, 1 / 4)
            .name("Busto")
            .onChange(() => {
                this.modelo.updateMorphs();
                this.modelo.updateCircunferencias();
            });

        this.folderCustom
            .add(this.modelo.params, "tipo_corpo", 0, 1, 1)
            .name("Tipo de Corpo")
            .onChange((value) => {
                this.modelo.setTipoCorpo(value);
            });

        this.folderCustom
            .add(this.modelo.params, "altura", 0, 3, 1)
            .name("Altura")
            .onChange((value) => {
                this.modelo.setAltura(value);
            });

        this.folderCustom.add(this.modelo.params, "aplicar").name("Aplicar");

        // ----------------------------------- Campos de roupas ----------------------------------- //
        const roupasId = Array(3)
            .fill()
            .map((_, index) => index);
        const paramsRoupas = {
            roupaCima: 0,
            tamCima: "P",
            roupaBaixo: 0,
            tamBaixo: "P",
            removerRoupaCima: () => {
                if (this.roupaCima) {
                    this.roupaCima.removerRoupa();
                    this.roupaCima = undefined;
                }
            },
            removerRoupaBaixo: () => {
                if (this.roupaBaixo) {
                    if (this.roupaCima) this.roupaCima.unsetNoTopo();
                    this.roupaBaixo.removerRoupa();
                    this.roupaBaixo = undefined;
                }
            },
        };

        // ----------------------------------- Campos de roupa de cima ----------------------------------- //
        this.folderRoupaCima = this.gui.addFolder("Roupa Cima");

        this.folderRoupaCima
            .add(paramsRoupas, "roupaCima", roupasId)
            .name("Id")
            .onChange((value) => {
                if (value == 0) {
                    paramsRoupas.removerRoupaCima();
                } else {
                    this.carregaRoupa(value, "cima");
                    if (ddTamCima) ddTamCima.setValue(this.roupaCima.getTamanhosValidos()[0]);
                }
            });
        let ddTamCima = this.folderRoupaCima
            .add(paramsRoupas, "tamCima", ["P", "M", "G", "GG"])
            .name("Tamanho")
            .onChange((value) => {
                if (this.roupaCima) this.roupaCima.mudarTamanho(value);
            });

        this.folderRoupaCima.add(paramsRoupas, "removerRoupaCima").name("Remover");
        this.folderRoupaCima.hide();

        // ----------------------------------- Campos de roupa de baixo ----------------------------------- //
        this.folderRoupaBaixo = this.gui.addFolder("Roupa Baixo");

        this.folderRoupaBaixo
            .add(paramsRoupas, "roupaBaixo", roupasId)
            .name("Id")
            .onChange((value) => {
                if (value == 0) {
                    paramsRoupas.removerRoupaBaixo();
                } else {
                    this.carregaRoupa(value, "baixo");
                    if (ddTamBaixo) ddTamBaixo.setValue(this.roupaBaixo.getTamanhosValidos()[0]);
                } 
            });
        let ddTamBaixo = this.folderRoupaBaixo
            .add(paramsRoupas, "tamBaixo", ["P", "M", "G", "GG"])
            .name("Tamanho")
            .onChange((value) => {
                if (this.roupaBaixo) this.roupaBaixo.mudarTamanho(value);
            }
        );

        this.folderRoupaBaixo.add(paramsRoupas, "removerRoupaBaixo").name("Remover");
        this.folderRoupaBaixo.hide();

        // ----------------------------------- Janela de medidas ----------------------------------- //
        const guiMedidas = new GUI({ title: "Medidas", width: 200 });
        guiMedidas.domElement.style.left = "25px";
        guiMedidas.domElement.style.top = "25px";

        const alturaController = guiMedidas.add(this.modelo.params, "altura_m").name("Altura").decimals(2).listen();
        alturaController.domElement.querySelector("input").disabled = true;

        const bustoController = guiMedidas.add(this.modelo.params, "circ_busto").name("Busto").decimals(0).listen();
        bustoController.domElement.querySelector("input").disabled = true;

        const cinturaController = guiMedidas
            .add(this.modelo.params, "circ_cintura")
            .name("Cintura")
            .decimals(0)
            .listen();
        cinturaController.domElement.querySelector("input").disabled = true;

        const quadrilController = guiMedidas
            .add(this.modelo.params, "circ_quadril")
            .name("Quadril")
            .decimals(0)
            .listen();
        quadrilController.domElement.querySelector("input").disabled = true;
    }

    /** Carrega uma peça de roupa no modelo
     * @param {String} id - Id da peça de roupa
     * @param {String} tipo - Tipo da peça de roupa (cima ou baixo)
     * @returns {Array} Retorna um array contendo os tamanhos disponíveis da peça de roupa
     */
    async carregaRoupa(id, tipo) {
        const url = "models/roupas/" + id;

        try {
            const request = new XMLHttpRequest();
            request.open("GET", url + "/info.json", false);
            request.send(null);
            const info = JSON.parse(request.responseText);

            if (info.tipo == tipo) {
                if (tipo == "cima") {
                    if (this.roupaCima) {
                        this.roupaCima.removerRoupa();
                        this.roupaCima = undefined;
                    }

                    this.roupaCima = new RoupaCima(this.#scene, url + "/" + id + ".glb", this.modelo);
                    // await this.roupaCima.initRoupa();

                    // if (this.roupaBaixo) {
                    //     this.roupaCima.setNoTopo();
                    // }
                }
                else {
                    if (this.roupaBaixo) {
                        this.roupaBaixo.removerRoupa();
                        this.roupaBaixo = undefined;
                    }

                    this.roupaBaixo = new RoupaBaixo(this.#scene, url + "/" + id + ".glb", this.modelo);
                    // await this.roupaBaixo.initRoupa();
                    
                    // if (this.roupaCima) {
                    //     this.roupaCima.setNoTopo();
                    // }
                }
            }

            return info.tamanhos;
        } catch (error) {
            alert("Erro ao carregar a peça de roupa: " + error);
        }
    }

    getHardwareDetails() {
        const extractValue = (str, reg) => {
            if (typeof str !== "string") return null; // Verificar se `str` é uma string
            const matches = str.match(reg);
            return matches && matches[0];
        }

        const getCPUFromUserAgent = () => {
            const userAgent = navigator.userAgent.toLowerCase();
            if (userAgent.includes('arm')) return 'Arquitetura: ARM';
            if (userAgent.includes('x86') || userAgent.includes('wow64') || userAgent.includes('win64')) return 'Arquitetura: x86-64';
            return 'Arquitetura: Desconhecida';
        };

        const estimateCPUClockSpeed = () => {
            const runs = 150000000;
            const start = performance.now();
            for (let i = runs; i>0; i--) {}
            const end = performance.now();
            const ms = end - start;
            const cyclesPerRun = 2;
            const speed = (runs / ms / 1000000) * cyclesPerRun;
            return `Clock estimado: ${Math.round(speed*10)/10} GHz`;
        }
    
        // Configuração do WebGL Context
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    
        if (!debugInfo) {
            console.warn("WEBGL_debug_renderer_info não está disponível neste dispositivo.");
            return "Informações do hardware não disponíveis.";
        }
    
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "Desconhecido";
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "Desconhecido";
    
        // Obter informações do hardware
        const layer = extractValue(renderer, /(ANGLE)/g) || "N/A";
        const card = extractValue(renderer, /((NVIDIA|AMD|Intel)[^\d]*[^\s]+)/) || "Desconhecida";
    
        const tokens = card.split(' ');
        tokens.shift();
    
        const manufacturer = extractValue(card, /(NVIDIA|AMD|Intel)/g) || "Desconhecido";
        const integrated = manufacturer === 'Intel';

        const logicalProcessors = navigator.hardwareConcurrency || "Desconhecido";
    
        return `GPU:\n${card}\nIntegrado: ${integrated}\n${renderer}\n\nCPU:\nProcessadores Logicos: ${logicalProcessors}\n${getCPUFromUserAgent()}\n${estimateCPUClockSpeed()}`;
    }
    
    async teste_desempenho() {
        const delay = (ms) => new Promise((res) => setTimeout(res, ms));

        const calcularMedia = (lista) => {
            if (!Array.isArray(lista) || lista.length === 0) {
                throw new Error("A lista deve ser um array não vazio.");
            }
            // Filtrar apenas os números menores que 200
            const numerosValidos = lista.filter(num => num < 200);

            if (numerosValidos.length === 0) {
                throw new Error("Nenhum número na lista é menor que 200.");
            }

            // Somar os números e calcular a média
            const soma = numerosValidos.reduce((acc, val) => acc + val, 0);
            return soma / numerosValidos.length;
        }

        let inicio;
        let fim;

        while(this.modelo.objectControls == undefined) {
            await delay(1000);
        }

        this.#countStats = true;
        this.#rotate = true;

        await delay(1666);
        inicio = performance.now();
        this.modelo.setCintura(1);
        this.modelo.setTipoCorpo(1);
        this.modelo.setBusto(2);
        this.modelo.setAltura(1);
        fim = performance.now();
        const carregamento2 = fim - inicio;
        await delay(1666);

        this.#rotate = false;
        await delay(833);
        this.#countStats = false;
        inicio = performance.now();
        this.modelo.aplicarAlteracoes();
        fim = performance.now();
        const carregamento3 = fim - inicio;
        this.#countStats = true;
        await delay(833);

        this.#countStats = false;
        inicio = performance.now();
        this.carregaRoupa("2", "baixo");
        await this.roupaBaixo.initRoupa();
        fim = performance.now();
        const carregamento4 = fim - inicio;
        this.#countStats = true;
        await delay(1666);

        this.#countStats = false;
        inicio = performance.now();
        this.carregaRoupa("1", "cima");
        await this.roupaCima.initRoupa();
        this.roupaCima.setNoTopo();
        fim = performance.now();
        const carregamento5 = fim - inicio;
        this.#countStats = true;
        
        this.#rotate = true;
        await delay(10000);
        this.#rotate = false;

        this.#countStats = false;

        const myChart = new Chart("fps", {
            type: "line",
            data: {
                labels: this.#timestamps,
                datasets: [
                    {
                        label: "Tempo por Frame",
                        pointRadius: 0,
                        borderColor: "rgba(0,0,255,1.0)",
                        borderWidth: 1.5,
                        tension: 0.4,
                        data: this.#stats,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "Frames",
                        },
                        ticks: {
                            display: false, // Desativa os valores do eixo X
                        },
                        grid: {
                            display: false, // Desativa a grade do eixo X
                        },
                    },
                    y: {
                        title: {
                            display: true,
                            text: "Tempo (ms)",
                        },
                        grid: {
                            display: false, // Desativa a grade do eixo X
                        },
                        beginAtZero: true,
                    },
                },
            },
        });

        const text = this.getHardwareDetails() +
         "\n\nTempo de carregamento do modelo: " + carregamento1.toFixed(0) + "ms" +
         "\nTempo de carregamento para a mudança da morfologia: " + carregamento2.toFixed(0) + "ms" +
         "\nTempo de carregamento para a aplicação da morfologia: " + carregamento3.toFixed(0) + "ms" +
         "\nTempo de carregamento da roupa de baixo: " + carregamento4.toFixed(0) + "ms" +
         "\nTempo de carregamento da roupa de cima: " + carregamento5.toFixed(0) + "ms" +
         "\n\nMédia de tempo por frame: " + calcularMedia(this.#stats).toFixed(0) + "ms";	

        // Criar um blob com o conteúdo do texto
        const blob = new Blob([text], { type: "text/plain" });

        // Criar um link para download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = "info.txt"; // Nome do arquivo
        link.click(); // Acionar o download

        var a = document.createElement("a");
        a.href = myChart.toBase64Image();
        a.download = "teste_perf.png";

        // Trigger the download
        a.click();
    }
}

/**
 * Instanciar um novo modelo para exibição no provador virtual.
 * @param {ProvadorViewport} provador - Instância do provador
 * @param {THREE.Scene} scene - Cena 3D do viewport
 * @param {THREE.WebGLRenderer} renderer - Renderizador do viewport
 * @param {String} url - URL do arquivo do modelo 3D
 */
class Modelo {
    /** Instância da cena 3D */
    #scene;

    /** Instância do renderizador */
    #renderer;

    /** Instância do provador virtual */
    #provador;

    /** URL do arquivo do modelo 3D */
    #url = new String();

    /** Objeto 3D do modelo */
    #model = new THREE.Object3D();

    /** Malha 3D do modelo */
    #malha = new THREE.Mesh();

    /** Vértices do busto do modelo */
    #vertsBusto = [];

    /** Vértices da cintura do modelo */
    #vertsCintura = [];

    /** Vértices do quadril do modelo */
    #vertsQuadril = [];

    /** Objeto contendo os ossos do modelo */
    ossos = new Object();

    /** Controlador de rotação do modelo */
    objectControls;

    /** True se alterações de morfologias foram aplicadas */
    aplicado = false;

    /** Parâmetros para customização do modelo 3D */
    params = {
        altura_m: 0.0,
        circ_busto: 0.0,
        circ_cintura: 0.0,
        circ_quadril: 0.0,
        comprimento_braco: 0.0,
        comprimento_perna: 0.0,
        altura: 0,
        musculatura: 0.5,
        cintura: 0,
        tipo_corpo: 0,
        peso: 0,
        busto: 0.25,
        ampulheta: 0.5,
        maça: 0,
        diamante: 0,
        triangulo: 0,
        triangulo_invertido: 0,
        retangulo: 0,
        coluna: 0,
        aplicar: () => {
            this.aplicarAlteracoes();
        },
    };

    constructor(provador, scene = null, renderer = null, url = null) {
        this.#provador = provador;
        this.#scene = scene;
        this.#renderer = renderer;
        this.#url = url;
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

                            this.updateMorphs();
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
        const inicio = performance.now();
        showLoadingGif();
        try {
            this.#model = await this.#carregaModelo(); // Espera o modelo ser carregado
            //console.log("Modelo carregado:", this.#model);

            const skeletonHelper = new THREE.SkeletonHelper(this.#model);

            // Definir ossos de interesse
            skeletonHelper.bones.forEach((bone, index) => {
                // //console.log(`Bone ${index}: ${bone.name}`);

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

            // Achar os vértices do busto e quadril
            const positions = BufferGeometryUtils.computeMorphedAttributes(this.#malha).morphedPositionAttribute.array;
            this.#vertsBusto = ObjectUtils.sortVerticesByAngle(
                ObjectUtils.filterVerticesByHeight(positions, 9.3, 9.33, -1.2, 1.2)
            );
            this.#vertsCintura = ObjectUtils.sortVerticesByAngle(
                ObjectUtils.filterVerticesByHeight(positions, 8.0, 8.03, -2.2, 2.2)
            );
            this.#vertsQuadril = ObjectUtils.sortVerticesByAngle(
                ObjectUtils.filterVerticesByHeight(positions, 6.5, 6.555, -4.2, 4.2)
            );
            this.updateCircunferencias();

            this.objectControls = new ObjectControls(this.ossos.quadril, this.#renderer.domElement);
        } catch (error) {
            console.error("Erro ao carregar o modelo:", error);
        }
        hideLoadingGif();
        const fim = performance.now();
        carregamento1 = fim - inicio;
    }

    /** Aplica as alterações realizadas na malha e refaz o cálculo do sombreamento */
    aplicarAlteracoes() {
        if (this.#malha) {
            // Modelo deve estar na posição original para aplicar as alterações
            this.resetarEscalas();

            // Aplicar as alterações feitas na GPU
            this.#malha.geometry.setAttribute(
                "position",
                BufferGeometryUtils.computeMorphedAttributes(this.#malha).morphedPositionAttribute
            );

            // Resetar as alterações de escala e morfologia
            this.#malha.updateMorphTargets();
            this.setAltura(this.getAltura());

            // Recalcular os vetores normais
            this.#malha.geometry.computeVertexNormals();

            // Atualizar a GUI
            if (this.#provador.folderCustom && this.#provador.folderRoupaCima && this.#provador.folderRoupaBaixo) {
                this.#provador.folderCustom.hide();
                this.#provador.folderRoupaCima.show();
                this.#provador.folderRoupaBaixo.show();
            }

            this.aplicado = true;
        }
    }

    /** Atualiza a morfologia do modelo */
    updateMorphs = () => {
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

    /** Atualiza as circunferências do busto, cintura e quadril do modelo */
    updateCircunferencias() {
        if (this.#vertsBusto.length > 0 && this.#vertsQuadril.length > 0) {
            const positions = BufferGeometryUtils.computeMorphedAttributes(this.#malha).morphedPositionAttribute.array;
            this.#vertsBusto = ObjectUtils.getVertexFromIndex(this.#vertsBusto, positions);
            this.#vertsQuadril = ObjectUtils.getVertexFromIndex(this.#vertsQuadril, positions);
            this.#vertsCintura = ObjectUtils.getVertexFromIndex(this.#vertsCintura, positions);
            this.params.circ_busto = ObjectUtils.calculateCircumference(this.#malha, this.#vertsBusto) * 100;
            this.params.circ_quadril = ObjectUtils.calculateCircumference(this.#malha, this.#vertsQuadril) * 100;
            this.params.circ_cintura = ObjectUtils.calculateCircumference(this.#malha, this.#vertsCintura) * 100;
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

    /** @returns {Number} Retorna a altura escolhida do modelo */
    getAltura() {
        return this.params.altura;
    }

    /** Reseta as alterações de escala realizadas no modelo */
    resetarEscalas() {
        this.escalarTamanho(1, false);
        this.escalarBracos(1);
        this.escalarPernas(1, false);
        this.escalarTronco(1);
        this.escalarCabeca(1);
    }

    /** Reseta o tipo de corpo do modelo */
    resetarTipoCorpo() {
        this.params.ampulheta = 0;
        this.params.triangulo_invertido = 0;
        this.params.retangulo = 0;
    }

    /** Define a opção de cintura do modelo
     * @param {Number} selecao - Valor de seleção, 0 para cintura P, 1 para cintura M, 2 para cintura G e 3 para cintura GG
     */
    setCintura(selecao) {
        if (selecao == 0 || selecao == 1) {
            this.params.musculatura = 0.5 + selecao * 0.5;
            this.params.peso = 0;
        } else {
            this.params.musculatura = 0;
            this.params.peso = (1 / 4) * (selecao + 1);
        }

        this.params.cintura = selecao;

        this.updateMorphs();
        this.updateCircunferencias();
    }

    /** Define o tamanho do busto do modelo
     * @param {Number} selecao - Valor de seleção, 0 para busto P, 1 para busto M, 2 para busto G e 3 para busto GG
     */
    setBusto(selecao) {
        this.params.busto = 0.25 + (selecao * 0.25);
        this.updateMorphs();
        this.updateCircunferencias();
    }

    /** Define o tipo de corpo do modelo
     * @param {Number} selecao - Valor de seleção, 0 para ampulheta, 1 para triângulo invertido e 2 para retângulo
     */
    setTipoCorpo(selecao) {
        this.resetarTipoCorpo();

        if (selecao == 0) {
            this.params.ampulheta = 0.5;
        } else {
            this.params.retangulo = 0.5;
        }

        this.params.tipo_corpo = selecao;

        this.updateMorphs();
        this.updateCircunferencias();
    }

    setAltura(selecao) {
        this.escalarTamanho(1 + (selecao * 0.060));
        this.params.altura = selecao;
        this.updateCircunferencias();
    }

    /** Realiza a escala em todos os ossos do modelo
     * @param {Number} valor - Valor de escala
     * @param {Boolean} mover - Decide se o modelo deve ser reposicionado ao escalar
     */
    escalarTamanho(valor, mover = true) {
        this.escalarOsso(this.ossos.quadril, new THREE.Vector3(valor, valor, valor));
        if (mover) this.#model.position.y = 0 + (valor - 1);
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

class Roupa {
    /** Instância da cena 3D */
    #scene;

    /** URL do arquivo do modelo 3D */
    #url = new String();

    /** Tipo de roupa */
    #tipo = new String();

    /** Objeto 3D do modelo */
    #model = new THREE.Object3D();

    /** Malha 3D do modelo */
    #malha = new THREE.Mesh();

    /** Instância do manequim */
    #modelo = new Modelo();

    /** Morphs do modelo */
    #morphs = {
        altura: 0,
        busto: 0,
        tipo_corpo: 0,
        cintura: 0,
        tamanho: 0,
    };

    constructor(scene, url, modelo, tipo) {
        this.#scene = scene;
        this.#url = url;
        this.#modelo = modelo;
        this.#tipo = tipo
    }

    /** Carrega o arquivo 3D armazenado em url
     * @returns {Promise} Retorna uma promessa que resolve o objeto 3D do modelo carregado
     */
    #carregaModelo() {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            loader.load(
                this.#url,
                (gltf) => {
                    const objeto = gltf.scene;

                    objeto.scale.setScalar(1 / 8);

                    objeto.traverse((malha) => {
                        if (malha.isMesh) {
                            malha.geometry = BufferGeometryUtils.mergeVertices(malha.geometry);
                            malha.geometry.morphTargetsRelative = true;
                            this.#malha = malha;
                        }
                    });

                    this.#scene.add(objeto);

                    //console.log("Modelo carregado:", objeto);
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

    /** Inicializa o modelo 3D da peça de roupa*/
    async initRoupa() {
        showLoadingGif();
        this.#morphs.altura = this.#modelo.params.altura;
        this.#morphs.busto = this.#modelo.params.busto * 4 - 1;
        this.#morphs.tipo_corpo = this.#modelo.params.tipo_corpo;
        this.#morphs.cintura = this.#modelo.params.cintura;

        try {
            this.#model = await this.#carregaModelo(); // Espera o modelo ser carregado

            this.#malha.updateMorphTargets();

            //console.log("Morphs:", this.#morphs);

            if (this.#tipo == "cima") {
                this.#malha.morphTargetInfluences[
                    this.#getIndiceMorph5D(
                        this.#morphs.altura,
                        this.#morphs.busto,
                        this.#morphs.tipo_corpo,
                        this.#morphs.cintura,
                        this.#morphs.tamanho,
                        [2, 2, 2, 1]
                    )
                ] = 1;
            }
            else {
                this.#malha.morphTargetInfluences[
                    this.#getIndiceMorph4D(
                        this.#morphs.altura,
                        this.#morphs.tipo_corpo,
                        this.#morphs.cintura,
                        this.#morphs.tamanho,
                        [2, 2, 2, 1]
                    )
                ] = 1;
                //console.log("Morph:", this.#getIndiceMorph4D(this.#morphs.altura, this.#morphs.tipo_corpo, this.#morphs.cintura, this.#morphs.tamanho, [2, 2, 2, 1]));
            }

            this.aplicarAlteracoes();

            if (this.#tipo == "cima") this.#model.position.y += 0.09 * this.#morphs.altura; // Ajusta a posição da roupa de acordo com a altura
            else this.#model.position.y += 0.057 * this.#morphs.altura;
            
            this.#modelo.ossos.quadril.attach(this.#model); // Anexa a roupa ao manequim


            //
        } catch (error) {
            console.error("Erro ao carregar o modelo:", error);
        }
        hideLoadingGif();
    }

    /** Aplica as alterações realizadas na malha e refaz o cálculo do sombreamento */
    aplicarAlteracoes() {
        if (this.#malha) {
            this.originalPositions = this.#malha.geometry.attributes.position.clone();
            this.#malha.geometry.setAttribute(
                "position",
                BufferGeometryUtils.computeMorphedAttributes(this.#malha).morphedPositionAttribute
            );
            this.#malha.updateMorphTargets();
            this.#malha.geometry.computeVertexNormals();
        }
    }

    // Função para converter índices de um array 5D em um índice 1D, levando em conta a última dimensão variável
    #getIndiceMorph5D(i, j, k, l, m, dim5_sizes) {
        let index1D = 0;

        // Primeira dimensão (tamanho fixo 4)
        for (let ii = 0; ii < i; ii++) {
            for (let jj = 0; jj < 4; jj++) {  // Segunda dimensão (tamanho fixo 4)
                for (let kk = 0; kk < 2; kk++) {  // Terceira dimensão (tamanho fixo 2)
                    for (let ll = 0; ll < 4; ll++) {  // Quarta dimensão (tamanho fixo 4)
                        index1D += dim5_sizes[ll]; // Acumulando o salto com base na quinta dimensão variável
                    }
                }
            }
        }

        // Segunda dimensão (tamanho fixo 4) para o valor atual de i
        for (let jj = 0; jj < j; jj++) {
            for (let kk = 0; kk < 2; kk++) {
                for (let ll = 0; ll < 4; ll++) {
                    index1D += dim5_sizes[ll];
                }
            }
        }

        // Terceira dimensão (tamanho fixo 2) para os valores atuais de i e j
        for (let kk = 0; kk < k; kk++) {
            for (let ll = 0; ll < 4; ll++) {
                index1D += dim5_sizes[ll];
            }
        }

        // Quarta dimensão (tamanho fixo 4) para os valores atuais de i, j e k
        for (let ll = 0; ll < l; ll++) {
            index1D += dim5_sizes[ll];
        }

        // Finalmente, adiciona o índice para a quinta dimensão variável (m)
        index1D += m;

        //console.log("Índice 1D:", index1D);

        return index1D;
    }

    /** Função para converter índices de um array 4D em um índice 1D, levando em conta a última dimensão variável */
    #getIndiceMorph4D(i, j, k, l, dim4_sizes) {
        let index1D = 0;

        // Primeiro, acumule os saltos das camadas anteriores (i, j)
        // Vamos supor que as dimensões anteriores (i, j) sejam fixas com 4 e 2
        for (let ii = 0; ii < i; ii++) {
            for (let jj = 0; jj < 2; jj++) {
                // Assumindo que a segunda dimensão (j) tem sempre tamanho 2
                for (let kk = 0; kk < 4; kk++) {
                    // Agora k varia de 0 a 3, então usamos 4 como limite
                    index1D += dim4_sizes[kk]; // Acumular o salto de acordo com k
                }
            }
        }

        // Acumular o salto das camadas anteriores de j para o i atual
        for (let jj = 0; jj < j; jj++) {
            for (let kk = 0; kk < 4; kk++) {
                index1D += dim4_sizes[kk]; // Acumular o salto de acordo com k
            }
        }

        // Acumular o salto das camadas anteriores de k para os valores de i e j atuais
        for (let kk = 0; kk < k; kk++) {
            index1D += dim4_sizes[kk]; // Acumular o salto de acordo com k
        }

        // Finalmente, adicionar o índice da quarta dimensão (l) considerando o valor de k
        index1D += l;

        return index1D;
    }

    getTamanhosValidos() {
        const tamanhos = ["P", "M", "G", "GG"];
        const idx = this.#morphs.cintura;
        //console.log("Tamanhos válidos:", tamanhos.slice(idx, idx + 2));
        return tamanhos.slice(idx, idx + 2);
    }

    getMalha() {
        return this.#malha;
    }

    /** Muda o tamanho da peça de roupa
     * @param {String} tamanho - Tamanho da peça de roupa (P, M, G, GG)
     */
    mudarTamanho(tamanho) {
        const tamValidos = this.getTamanhosValidos();

        if (!tamValidos.includes(tamanho)) return;

        this.#morphs.tamanho = tamValidos.indexOf(tamanho);

        if (this.originalPositions) {
            this.#malha.geometry.setAttribute("position", this.originalPositions.clone());

            this.#malha.updateMorphTargets();

            //console.log("Morphs:", this.#morphs);

            if (this.#tipo == "cima") {
                this.#malha.morphTargetInfluences[
                    this.#getIndiceMorph5D(
                        this.#morphs.altura,
                        this.#morphs.busto,
                        this.#morphs.tipo_corpo,
                        this.#morphs.cintura,
                        this.#morphs.tamanho,
                        [2, 2, 2, 1]
                    )
                ] = 1;
            }
            else {
                this.#malha.morphTargetInfluences[
                    this.#getIndiceMorph4D(
                        this.#morphs.altura,
                        this.#morphs.tipo_corpo,
                        this.#morphs.cintura,
                        this.#morphs.tamanho,
                        [2, 2, 2, 1]
                    )
                ] = 1;
                //console.log("Morph:", this.#getIndiceMorph4D(this.#morphs.altura, this.#morphs.tipo_corpo, this.#morphs.cintura, this.#morphs.tamanho, [2, 2, 2, 1]));
            }

            this.aplicarAlteracoes();
        }
    }

    setNoTopo() {
        this.#malha.scale.set(1.05, 1, 1.05);
    }

    unsetNoTopo() {
        this.#malha.scale.set(1, 1, 1);
    }
    
    /** Remove a roupa da cena */
    removerRoupa() {
        this.#model.removeFromParent();
        ObjectUtils.deepDispose(this.#malha);
        this.#scene.remove(this.#malha);
        this.#scene.remove(this.#model);
        this.#malha = undefined;
        this.#model = undefined;
    }
}

class RoupaCima extends Roupa {
    constructor(scene, url, modelo) {
        super(scene, url, modelo, "cima");
    }
}

class RoupaBaixo extends Roupa {
    constructor(scene, url, modelo) {
        super(scene, url, modelo, "baixo");
    }
}

// Função para criar e exibir o GIF de loading
async function showLoadingGif() {
    const loadingDiv = document.createElement("div");
    loadingDiv.id = "loading";
    loadingDiv.style.position = "fixed";
    loadingDiv.style.width = "50px";
    loadingDiv.style.height = "50px";
    loadingDiv.style.top = "50%";
    loadingDiv.style.left = "50%";
    loadingDiv.style.fontFamily = "Cascadia Code";
    loadingDiv.style.transform = "translate(-50%, -50%)";
    loadingDiv.style.zIndex = "9999"; // Para garantir que esteja na frente de tudo

    const loadingGif = document.createElement("img");
    loadingGif.src = "textures/load.gif";
    loadingGif.alt = "CARREGANDO...";

    loadingDiv.appendChild(loadingGif);
    document.body.appendChild(loadingDiv);
}

// Função para remover o GIF de loading
function hideLoadingGif() {
    const loadingDiv = document.getElementById("loading");
    if (loadingDiv) {
        document.body.removeChild(loadingDiv);
    }
}
