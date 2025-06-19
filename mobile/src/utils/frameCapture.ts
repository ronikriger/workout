import { CameraView } from 'expo-camera';
import { captureRef } from 'react-native-view-shot';

export interface FrameData {
    uri: string;
    width: number;
    height: number;
    data?: Uint8Array;
}

export class FrameCapture {
    private static instance: FrameCapture;
    private isCapturing = false;
    private captureQueue: (() => void)[] = [];

    static getInstance(): FrameCapture {
        if (!FrameCapture.instance) {
            FrameCapture.instance = new FrameCapture();
        }
        return FrameCapture.instance;
    }

    async captureFrame(cameraRef: any, width: number, height: number): Promise<FrameData | null> {
        if (!cameraRef || this.isCapturing) {
            return null;
        }

        try {
            this.isCapturing = true;

            // Capture frame using react-native-view-shot
            const uri = await captureRef(cameraRef, {
                format: 'jpg',
                quality: 0.8,
                width: width,
                height: height,
            });

            return {
                uri,
                width,
                height,
            };
        } catch (error) {
            console.error('Frame capture error:', error);
            return null;
        } finally {
            this.isCapturing = false;

            // Process queue
            if (this.captureQueue.length > 0) {
                const nextCapture = this.captureQueue.shift();
                if (nextCapture) {
                    setTimeout(nextCapture, 16); // ~60 FPS max
                }
            }
        }
    }

    queueCapture(captureFunction: () => void): void {
        if (this.isCapturing) {
            this.captureQueue.push(captureFunction);
        } else {
            captureFunction();
        }
    }

    // Mock frame data for development/testing
    getMockFrameData(width: number, height: number): FrameData {
        // Create mock RGBA data
        const pixelCount = width * height;
        const data = new Uint8Array(pixelCount * 4);

        // Fill with random pixel data for testing
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.random() * 255;     // R
            data[i + 1] = Math.random() * 255; // G
            data[i + 2] = Math.random() * 255; // B
            data[i + 3] = 255;                 // A
        }

        return {
            uri: '',
            width,
            height,
            data,
        };
    }

    // Convert image URI to ImageData for TensorFlow.js
    async uriToImageData(uri: string, width: number, height: number): Promise<ImageData | null> {
        try {
            // This would require additional implementation to convert URI to ImageData
            // For now, return mock data
            const data = new Uint8ClampedArray(width * height * 4);
            return new ImageData(data, width, height);
        } catch (error) {
            console.error('URI to ImageData conversion error:', error);
            return null;
        }
    }

    // Throttle frame processing to maintain performance
    throttleFrameProcessing(callback: () => void, interval: number = 33): () => void {
        let lastCall = 0;

        return () => {
            const now = Date.now();
            if (now - lastCall >= interval) {
                lastCall = now;
                callback();
            }
        };
    }
}

export default FrameCapture.getInstance(); 