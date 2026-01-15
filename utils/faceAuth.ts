import * as faceapi from 'face-api.js';

// URL pública para carregar os modelos pré-treinados
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

let modelsLoaded = false;

/**
 * Carrega os modelos necessários do face-api.js
 */
export const loadModels = async () => {
  if (modelsLoaded) return;

  try {
    console.log('Carregando modelos biométricos...');
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL), // Detecção facial
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL), // Pontos de referência
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL) // Descritor facial
    ]);
    modelsLoaded = true;
    console.log('Modelos carregados com sucesso!');
  } catch (error) {
    console.error('Erro ao carregar modelos:', error);
    throw new Error('Falha ao carregar modelos de reconhecimento facial.');
  }
};

/**
 * Detecta rosto em um elemento de vídeo ou imagem
 * Retorna o descritor facial se encontrado
 */
export const detectFace = async (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) => {
  if (!modelsLoaded) await loadModels();

  // Detecta rosto único com maior confiança
  const detection = await faceapi
    .detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection;
};

/**
 * Compara um descritor capturado com uma lista de descritores salvos
 * @param capturedDescriptor Descritor atual da câmera
 * @param storedDescriptors Lista de { userId, descriptor } do banco
 * @returns O userId correspondente ou null
 */
export const matchFace = (
  capturedDescriptor: Float32Array,
  storedDescriptors: { userId: string; descriptor: Float32Array }[]
) => {
  if (!storedDescriptors.length) return null;

  const faceMatcher = new faceapi.FaceMatcher(
    storedDescriptors.map(d => new faceapi.LabeledFaceDescriptors(d.userId, [d.descriptor])),
    0.6 // Distância máxima (threshold). Menor = mais rigoroso. 0.6 é padrão.
  );

  const bestMatch = faceMatcher.findBestMatch(capturedDescriptor);

  if (bestMatch.label !== 'unknown') {
    return { userId: bestMatch.label, distance: bestMatch.distance };
  }

  return null;
};

/**
 * Converte Float32Array para Array normal para salvar no JSON do Supabase
 */
export const descriptorToArray = (descriptor: Float32Array): number[] => {
  return Array.from(descriptor);
};

/**
 * Converte Array/Object do Supabase de volta para Float32Array
 */
export const arrayToDescriptor = (array: number[] | { [key: string]: number }): Float32Array => {
  // Se vier como objeto {0: x, 1: y...} (comum em JSONB às vezes), converte para array
  if (!Array.isArray(array)) {
    return new Float32Array(Object.values(array));
  }
  return new Float32Array(array);
};
