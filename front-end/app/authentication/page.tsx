'use client';
import React, { useRef, useEffect, useState } from 'react';

export default function AuthenticationPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authResult, setAuthResult] = useState<any>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setError('Error accessing camera');
      console.error('Error accessing camera:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthenticate = async () => {
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
      setAuthResult(null);

      const mediaRecorder = new MediaRecorder(mediaStreamRef.current!);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);

        const video = document.createElement('video');
        video.src = videoUrl;

        video.addEventListener('loadeddata', async () => {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Set to last moment of video
          video.currentTime = 0.3;
          await new Promise((resolve) => setTimeout(resolve, 100));

          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(async (blob) => {
            if (!blob) return;

            const formData = new FormData();
            formData.append('image', blob, 'frame.jpg');

            try {
              const response = await fetch(
                'http://127.0.0.1:4000/authenticate',
                {
                  method: 'POST',
                  body: formData,
                }
              );

              if (!response.ok)
                throw new Error(`HTTP error! status: ${response.status}`);

              const result = await response.json();
              console.log(result);
              setAuthResult(result);
            } catch (error) {
              console.error('Authentication error:', error);
              setError('Authentication failed. Please try again.');
            }
          }, 'image/jpeg');

          setIsRecording(false);
          URL.revokeObjectURL(videoUrl);
        });

        await video.load();
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 300);
    } catch (err) {
      console.error('Error during recording:', err);
      setIsRecording(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Face Authentication
        </h1>

        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
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
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ transform: 'scaleX(-1)' }}
                className="w-[640px] h-[480px] bg-black rounded-lg"
              />
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white text-6xl font-bold">
                  {countdown}
                </div>
              )}
            </div>

            <button
              onClick={handleAuthenticate}
              disabled={isRecording || isLoading}
              className={`
                px-8 py-3 rounded-full text-white font-semibold
                ${
                  isRecording || isLoading
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 transition-colors'
                }
              `}
            >
              {isRecording
                ? 'Recording...'
                : isLoading
                ? 'Loading...'
                : 'Authenticate'}
            </button>

            {authResult && (
              <div className="mt-4 p-4 bg-white rounded-lg shadow text-black">
                <h2 className="text-xl font-semibold mb-2">
                  Authentication Results
                </h2>
                {authResult.match ? (
                  <div className="mb-2">
                    <p>
                      Name: {authResult.match.firstName}{' '}
                      {authResult.match.lastName}
                    </p>
                    <p>Similarity: {authResult.match.similarity_score}%</p>
                  </div>
                ) : (
                  <div className="text-red-600">
                    {authResult.message || 'No matching user found'}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
