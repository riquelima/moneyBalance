import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import * as faceapi from 'face-api.js';
import { detectFace, loadModels } from '../utils/faceAuth';

interface BiometricCaptureProps {
  onCapture: (descriptor: Float32Array) => void;
  onCancel: () => void;
  mode: 'enroll' | 'login';
  isProcessing?: boolean;
}

export const BiometricCapture: React.FC<BiometricCaptureProps> = ({ onCapture, onCancel, mode, isProcessing = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [faceDetected, setFaceDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Inicializa Câmera e Modelos
  useEffect(() => {
    const startCamera = async () => {
      try {
        await loadModels();
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } }); // Tamanho padrão vga
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsLoading(false);
      } catch (err) {
        console.error(err);
        setError('Não foi possível acessar a câmera. Verifique as permissões.');
        setIsLoading(false);
      }
    };

    startCamera();

    return () => {
      // Limpar stream ao desmontar
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Loop de Detecção
  useEffect(() => {
    if (isLoading || !!error) return;

    const interval = setInterval(async () => {
      if (videoRef.current && canvasRef.current && !videoRef.current.paused && !videoRef.current.ended) {
        
        // Detecção
        const detection = await detectFace(videoRef.current);
        
        // Desenhar no Canvas
        const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true);
        
        if (detection) {
          setFaceDetected(true);
          const resizedDetections = faceapi.resizeResults(detection, dims);
          faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
          
          // Se for modo login, tenta capturar automaticamente se a confiança for alta e estiver estável
          // Para simplificar e evitar flood, vamos deixar o login automático disparar apenas uma vez se detectar
          // Mas quem controla o disparo é o componente pai ou um botão? 
          // O requisito diz "Comparação em tempo real".
          // Vamos disparar o onCapture automaticamente no modo login
          if (mode === 'login' && !isProcessing) {
             onCapture(detection.descriptor);
          }

        } else {
          setFaceDetected(false);
          const ctx = canvasRef.current.getContext('2d');
          ctx?.clearRect(0, 0, dims.width, dims.height);
        }
      }
    }, 500); // Verifica a cada 500ms para não pesar a CPU

    return () => clearInterval(interval);
  }, [isLoading, error, mode, onCapture, isProcessing]);

  const handleManualCapture = async () => {
    if (videoRef.current) {
      const detection = await detectFace(videoRef.current);
      if (detection) {
        onCapture(detection.descriptor);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-surface-dark border-4 border-dark dark:border-white shadow-neo"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 border-b-2 border-dark dark:border-white bg-primary text-white">
          <h3 className="text-xl font-black uppercase tracking-wider">
            {mode === 'enroll' ? 'Cadastrar Rosto' : 'Reconhecimento Facial'}
          </h3>
          <button onClick={onCancel} className="rounded-full p-1 hover:bg-white/20">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Área de Vídeo */}
        <div className="relative aspect-[4/3] bg-black">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
              <p>Iniciando câmera e IA...</p>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 bg-black p-4 text-center">
              <span className="material-symbols-outlined text-4xl mb-2">videocam_off</span>
              <p>{error}</p>
            </div>
          )}

          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline
            onPlay={() => {
                // Ajustar canvas quando video começar a tocar
                if (videoRef.current && canvasRef.current) {
                    faceapi.matchDimensions(canvasRef.current, videoRef.current);
                }
            }}
            className="absolute inset-0 h-full w-full object-cover mirror" // mirror class para espelhar
            style={{ transform: 'scaleX(-1)' }} // Espelhar horizontalmente
          />
          <canvas 
            ref={canvasRef} 
            className="absolute inset-0 h-full w-full pointer-events-none"
            style={{ transform: 'scaleX(-1)' }} // Espelhar canvas também
          />
          
          {/* Guia Visual */}
          <div className="absolute inset-0 pointer-events-none border-[30px] border-black/50 rounded-[50%] opacity-50 scale-90"></div>
          
          {/* Feedback de Status */}
          <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
            {faceDetected ? (
              <span className="inline-block px-3 py-1 rounded-full bg-green-500 text-white font-bold text-sm shadow-md">
                Rosto Detectado
              </span>
            ) : (
              !isLoading && !error && (
                <span className="inline-block px-3 py-1 rounded-full bg-yellow-500 text-black font-bold text-sm shadow-md">
                  Posicione seu rosto
                </span>
              )
            )}
          </div>
        </div>

        {/* Rodapé / Ações */}
        <div className="p-4 bg-gray-50 dark:bg-surface-dark border-t-2 border-dark dark:border-white flex justify-center gap-4">
          <motion.button
            whileTap={{ scale: 0.95, y: 2 }}
            onClick={onCancel}
            className="px-6 py-3 rounded-lg border-2 border-dark dark:border-white bg-gray-200 text-dark font-bold shadow-neo"
          >
            Cancelar
          </motion.button>
          
          {mode === 'enroll' && (
            <motion.button
              whileTap={{ scale: 0.95, y: 2 }}
              onClick={handleManualCapture}
              disabled={!faceDetected || isProcessing}
              className={`px-6 py-3 rounded-lg border-2 border-dark dark:border-white text-white font-bold shadow-neo flex items-center gap-2
                ${faceDetected && !isProcessing ? 'bg-primary cursor-pointer' : 'bg-gray-400 cursor-not-allowed'}`}
            >
              <span className="material-symbols-outlined">camera</span>
              {isProcessing ? 'Processando...' : 'Capturar'}
            </motion.button>
          )}

          {mode === 'login' && (
             <div className="text-sm text-dark dark:text-white font-medium flex items-center gap-2">
                 {isProcessing ? (
                     <>
                        <span className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></span>
                        Verificando identidade...
                     </>
                 ) : (
                     "Aguardando reconhecimento..."
                 )}
             </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
