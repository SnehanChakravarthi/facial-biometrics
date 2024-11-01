'use client';

import React, { useRef, useEffect, useState } from 'react';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

export default function EnrollmentPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [showFrames, setShowFrames] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
  });
  const [countdown, setCountdown] = useState<number | null>(null);
  const [faceDetector, setFaceDetector] = useState<FaceDetector | null>(null);
  const detectionRef = useRef<number>();

  useEffect(() => {
    const initializeAndStartDetection = async () => {
      await initializeFaceDetector();
      startCamera();
    };

    initializeAndStartDetection();

    return () => {
      if (detectionRef.current) {
        cancelAnimationFrame(detectionRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (faceDetector && videoRef.current) {
      startFaceDetection();
    }
  }, [faceDetector]);

  const initializeFaceDetector = async () => {
    try {
      console.log('Initializing face detector...');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest'
      );
      const detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/Face Detection Model.tflite',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.5,
        minSuppressionThreshold: 0.3,
      });
      console.log('Face detector created:', detector);
      setFaceDetector(detector);
    } catch (error) {
      console.error('Failed to initialize face detector:', error);
      setError(
        'Failed to initialize face detector. Please check the console for more details.'
      );
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          console.log(
            'Camera started with dimensions:',
            videoRef.current?.videoWidth,
            videoRef.current?.videoHeight
          );
          if (faceDetector) {
            startFaceDetection();
          }
        };
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const startFaceDetection = () => {
    if (!videoRef.current || !faceDetector) {
      console.log('Missing requirements:', {
        video: !!videoRef.current,
        detector: !!faceDetector,
      });
      return;
    }

    const detectFaces = async () => {
      if (!videoRef.current || !faceDetector) return;

      const startTimeMs = performance.now();
      const detections = faceDetector.detectForVideo(
        videoRef.current,
        startTimeMs
      ).detections;

      console.log('Detections found:', detections.length, detections);

      const videoElement = videoRef.current;
      const canvas = videoElement.parentElement?.querySelector('canvas');
      if (!canvas) {
        console.error('Canvas element not found');
        return;
      }

      if (
        canvas.width !== videoElement.videoWidth ||
        canvas.height !== videoElement.videoHeight
      ) {
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Could not get canvas context');
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.fillStyle = '#00ff00';
      ctx.font = '16px Arial';

      detections.forEach((detection) => {
        const boundingBox = detection.boundingBox;
        if (boundingBox) {
          ctx.strokeRect(
            boundingBox.originX,
            boundingBox.originY,
            boundingBox.width,
            boundingBox.height
          );

          if (detection.categories?.[0]) {
            const score = Math.round(detection.categories[0].score * 100);
            ctx.fillText(
              `${score}%`,
              boundingBox.originX,
              boundingBox.originY - 5
            );
          }
        }
      });

      detectionRef.current = requestAnimationFrame(detectFaces);
    };

    detectFaces();
  };

  const handleCapture = async () => {
    if (isRecording || !mediaStreamRef.current) return;

    setCountdown(3); // Start countdown from 3
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(countdownInterval);
          startCapture(); // Start capture after countdown ends
          return null;
        }
        return (prev ?? 0) - 1;
      });
    }, 1000);
  };

  const startCapture = async () => {
    try {
      setIsRecording(true);
      setCapturedFrames([]);
      setShowFrames(false);

      const mediaRecorder = new MediaRecorder(mediaStreamRef.current!);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);

        const video = document.createElement('video');
        video.src = videoUrl;
        await video.load();

        const frames: string[] = [];
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;

        video.addEventListener('loadeddata', async () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          for (let time = 0; time <= 300; time += 100) {
            video.currentTime = time / 1000;
            await new Promise((resolve) => setTimeout(resolve, 100));
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            frames.push(canvas.toDataURL('image/jpeg'));
          }

          setCapturedFrames(frames);
          setShowFrames(true);
          setIsRecording(false);
          URL.revokeObjectURL(videoUrl);
        });

        video.play();
      };

      mediaRecorder.start();
      setTimeout(() => {
        mediaRecorder.stop();
      }, 300);
    } catch (err) {
      console.error('Error during recording:', err);
      setIsRecording(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const imageFiles = await Promise.all(
        capturedFrames.map(async (dataUrl, index) => {
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          return new File([blob], `frame_${index}.jpg`, { type: 'image/jpeg' });
        })
      );

      const formDataToSend = new FormData();
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('age', formData.age);

      imageFiles.forEach((file) => {
        formDataToSend.append('images', file);
      });

      const response = await fetch('http://127.0.0.1:4000/enroll', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Enrollment successful:', result);
    } catch (error) {
      console.error('Error during enrollment:', error);
      setError('Failed to complete enrollment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Facial Enrollment
        </h1>

        {error ? (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
            role="alert"
          >
            <p className="font-medium">{error}</p>
            <button
              onClick={startCamera}
              className="mt-3 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              {showFrames ? (
                <div className="grid grid-cols-3 gap-2">
                  {capturedFrames.map((frame, index) => (
                    <img
                      key={index}
                      src={frame}
                      alt={`Frame ${index + 1}`}
                      className="w-[213px] h-[160px] object-cover rounded-lg"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center bg-gray-100">
                  <div className="relative w-[640px] h-[480px]">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        transform: 'scaleX(-1)',
                        width: '100%',
                        height: '100%',
                      }}
                      className="bg-black rounded-lg"
                    />
                    <canvas
                      className="absolute top-0 left-0"
                      style={{
                        transform: 'scaleX(-1)',
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                  {countdown !== null && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white text-6xl font-bold">
                      {countdown}
                    </div>
                  )}
                </div>
              )}
            </div>
            {showFrames ? (
              <div className="flex flex-col gap-4 justify-center">
                <p className="text-gray-600">
                  Please enter your details below and click submit.
                </p>
                <form onSubmit={handleSubmit}>
                  <div className="mb-4 flex flex-row gap-2 items-center">
                    <input
                      className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      id="firstName"
                      type="text"
                      placeholder="First Name"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                    />
                    <input
                      className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      id="lastName"
                      type="text"
                      placeholder="Last Name"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                    />
                    <input
                      className="shadow appearance-none max-w-[100px] border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      id="age"
                      type="number"
                      placeholder="Age"
                      value={formData.age}
                      onChange={(e) =>
                        setFormData({ ...formData, age: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={startCamera}
                      className="px-8 py-3 rounded-full text-white font-semibold bg-black hover:bg-gray-800 transition-colors"
                    >
                      Retake
                    </button>
                    <button
                      type="submit"
                      className="px-8 py-3 rounded-full text-white font-semibold bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <>
                <p className="text-gray-600">
                  Please look into the camera and capture your face.
                </p>
                <button
                  onClick={handleCapture}
                  disabled={isRecording || isLoading}
                  className={`px-8 py-3 rounded-full text-white font-semibold ${
                    isRecording || isLoading
                      ? 'bg-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 transition-colors'
                  }`}
                >
                  {isRecording
                    ? 'Recording...'
                    : isLoading
                    ? 'Loading...'
                    : 'Capture'}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
