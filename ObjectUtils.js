import * as THREE from "three";

// Função para obter as posições dos vértices a partir dos indices
export function getVertexFromIndex(indices, positions) {
    const vertices = [];
    indices.forEach(item => {
        const index = item.index;
        const x = positions[index * 3];
        const y = positions[index * 3 + 1];
        const z = positions[index * 3 + 2];
        vertices.push({ x, y, z, index });
    });
    return vertices;
}

// Função para calcular o centro de massa dos vértices no plano XY
export function calculateCentroid(vertices) {
    let centroid = new THREE.Vector2(0, 0);
    vertices.forEach(vertex => {
        centroid.x += vertex.x;
        centroid.y += vertex.y;  // Usamos X e Y no plano XY
    });
    centroid.x /= vertices.length;
    centroid.y /= vertices.length;
    return centroid;
}

// Função para calcular o ângulo polar de um ponto em relação ao centro no plano XY
export function calculatePolarAngle(vertex, centroid) {
    return Math.atan2(vertex.y - centroid.y, vertex.x - centroid.x);
}

// Função para ordenar os vértices pelo ângulo polar
export function sortVerticesByAngle(vertices) {
    const centroid = calculateCentroid(vertices);
    
    return vertices.slice().sort((v1, v2) => {
        const angle1 = calculatePolarAngle(v1, centroid);
        const angle2 = calculatePolarAngle(v2, centroid);
        return angle1 - angle2;
    });
};

// Filtrar vértices em uma faixa de altura
export function filterVerticesByHeight(positions, minZ, maxZ, minX, maxX) {
    const filteredVertices = [];
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        // Verifique se o vértice está dentro da faixa de altura
        if (z >= minZ && z <= maxZ && x >= minX && x <= maxX) {
            filteredVertices.push({ x, y, z, index: i / 3 });
        }
    }
    return filteredVertices;
}

// Função para adicionar esferas nos vértices
export function addSphereAtVertex(vertices, malha, scene, bone = null, radius = 0.02, color = 0xff0000) {
    const sphereGeometry = new THREE.SphereGeometry(radius, 4, 4); // Pequena esfera

    vertices.forEach(vertex => {
        // Criar material para a esfera
        const sphereMaterial = new THREE.MeshBasicMaterial({ color });
1
        // Criar a esfera
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

        sphere.renderOrder = 999;
        sphere.material.depthTest = false;
        sphere.material.depthWrite = false;
        sphere.onBeforeRender = function (renderer) { renderer.clearDepth(); };

        // Posicionar a esfera no vértice após aplicar a transformação do objeto
        const vertexPosition = new THREE.Vector3(vertex.x, vertex.y, vertex.z);
        
        // Converte a posição local do vértice para a posição no mundo (world space)
        malha.localToWorld(vertexPosition);

        // Posicionar a esfera nas coordenadas convertidas
        sphere.position.copy(vertexPosition);

        // Adicionar esfera à cena
        scene.add(sphere);

        if (bone) {
            bone.attach(sphere);
        }
    });
}

export function drawLinesBetweenVertices(malha, scene, vertices, bone = null, color = 0xff0000) {
    const material = new THREE.LineBasicMaterial({ color });

    // Para cada par de vértices, criar uma linha
    for (let i = 0; i < vertices.length - 1; i++) {
        // Pegar dois vértices consecutivos
        const vertex1 = new THREE.Vector3(vertices[i].x, vertices[i].y, vertices[i].z);
        const vertex2 = new THREE.Vector3(vertices[i + 1].x, vertices[i + 1].y, vertices[i + 1].z);
        
        // Converter as coordenadas locais dos vértices para coordenadas globais
        malha.localToWorld(vertex1);
        malha.localToWorld(vertex2);
        
        // Criar uma geometria de linha conectando os dois vértices
        const geometry = new THREE.BufferGeometry().setFromPoints([vertex1, vertex2]);

        // Criar a linha e adicionar à cena
        const line = new THREE.Line(geometry, material);

        line.renderOrder = 999;
        line.material.depthTest = false;
        line.material.depthWrite = false;
        line.onBeforeRender = function (renderer) { renderer.clearDepth(); };

        scene.add(line);

        if (bone) {
            bone.attach(line);
        }
    }

    // Fechar o loop, conectando o último vértice ao primeiro (opcional)
    const vertexStart = new THREE.Vector3(vertices[0].x, vertices[0].y, vertices[0].z);
    const vertexEnd = new THREE.Vector3(vertices[vertices.length - 1].x, vertices[vertices.length - 1].y, vertices[vertices.length - 1].z);

    // Converter as coordenadas locais para coordenadas globais
    malha.localToWorld(vertexStart);
    malha.localToWorld(vertexEnd);

    // Criar a geometria e a linha para fechar o loop
    const closingGeometry = new THREE.BufferGeometry().setFromPoints([vertexEnd, vertexStart]);
    const closingLine = new THREE.Line(closingGeometry, material);

    closingLine.renderOrder = 999;
    closingLine.material.depthTest = false;
    closingLine.material.depthWrite = false;
    closingLine.onBeforeRender = function (renderer) { renderer.clearDepth(); };
    
    scene.add(closingLine);

    if (bone) {
        bone.attach(closingLine);
    }
}

export function calculateCircumference(malha, vertices) {
    let circumference = 0;
    for (let i = 0; i < vertices.length - 1; i++) {
        const v1 = new THREE.Vector3(vertices[i].x, vertices[i].y, vertices[i].z);
        const v2 = new THREE.Vector3(vertices[i + 1].x, vertices[i + 1].y, vertices[i + 1].z);

        malha.localToWorld(v1);
        malha.localToWorld(v2);
        
        // Calcular a distância entre dois vértices adjacentes
        const dx = v2.x - v1.x;
        const dz = v2.z - v1.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        circumference += distance;
    }
    
    // Fechar o loop (conectar o último vértice ao primeiro)
    const vStart = new THREE.Vector3(vertices[0].x, vertices[0].y, vertices[0].z);
    const vEnd = new THREE.Vector3(vertices[vertices.length - 1].x, vertices[vertices.length - 1].y, vertices[vertices.length - 1].z);

    malha.localToWorld(vStart);
    malha.localToWorld(vEnd);

    const dx = vEnd.x - vStart.x;
    const dz = vEnd.z - vStart.z;
    const closingDistance = Math.sqrt(dx * dx + dz * dz);
    
    circumference += closingDistance;
    
    return circumference;
}


/**
 * Dispose of all Object3D`s nested Geometries, Materials and Textures
 *
 * @param object  Object3D, BufferGeometry, Material or Texture
 * @param disposeMedia If set to true will dispose of the texture image or video element, default false
 */
export function deepDispose(object) {
  const dispose = (obj) => obj.dispose();

  const disposeObject = (obj) => {
    if (obj.geometry) dispose(obj.geometry);
    if (obj.material) traverseMaterialsTextures(obj.material, dispose, dispose);
  };

  if (object instanceof THREE.BufferGeometry || object instanceof THREE.Texture) {
    return dispose(object);
  }

  if (object instanceof THREE.Material) {
    return traverseMaterialsTextures(object, dispose, dispose);
  }

  disposeObject(object);

  if (object.traverse) {
    object.traverse((obj) => disposeObject(obj));
  }
}

/**
 * Traverse material or array of materials and all nested textures
 * executing their respective callback
 *
 * @param material          Three.js Material or array of materials
 * @param materialCallback  Material callback
 * @param textureCallback   Texture callback
 */
function traverseMaterialsTextures(material, materialCallback, textureCallback) {
  const traverseMaterial = (mat) => {
    if (materialCallback) materialCallback(mat);

    if (!textureCallback) return;

    Object.values(mat)
      .filter((value) => value instanceof THREE.Texture)
      .forEach((texture) => textureCallback(texture));

    if (mat.uniforms) {
      Object.values(mat.uniforms)
        .filter(({ value }) => value instanceof THREE.Texture)
        .forEach(({ value }) => textureCallback(value));
    }
  };

  if (Array.isArray(material)) {
    material.forEach((mat) => traverseMaterial(mat));
  } else {
    traverseMaterial(material);
  }
}