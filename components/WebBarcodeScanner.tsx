import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { BarcodeDetector as BarcodeDetectorPolyfill } from 'barcode-detector/pure';

interface WebBarcodeScannerProps {
  onBarcodeScanned: (data: string) => void;
  scanning: boolean;
  processing: boolean;
}

export function WebBarcodeScanner({ onBarcodeScanned, scanning, processing }: WebBarcodeScannerProps) {
  const containerRef = useRef<View>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasDetector, setHasDetector] = useState(true);

  // Create video element and start camera
  useEffect(() => {
    let mounted = true;

    // Use native BarcodeDetector if available, otherwise use the polyfill
    const DetectorClass: any =
      (typeof window !== 'undefined' && 'BarcodeDetector' in window)
        ? (window as any).BarcodeDetector
        : BarcodeDetectorPolyfill;

    try {
      detectorRef.current = new DetectorClass({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'code_128'],
      });
    } catch {
      if (mounted) setHasDetector(false);
    }

    // Create a real HTML video element and inject it into the DOM
    const video = document.createElement('video');
    video.setAttribute('playsinline', 'true');
    video.setAttribute('autoplay', 'true');
    video.muted = true;
    video.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;';
    videoRef.current = video;

    // Attach video to the container DOM node
    const tryAttach = () => {
      const node = (containerRef.current as any);
      // React Native Web exposes the underlying DOM node
      const domNode: HTMLElement | null =
        node instanceof HTMLElement ? node :
        node?._nativeTag ? document.querySelector(`[data-rnw="${node._nativeTag}"]`) :
        null;
      // Fallback: find by data attribute we set
      const target = domNode || document.getElementById('web-scanner-container');
      if (target && !target.contains(video)) {
        target.style.position = 'relative';
        target.style.overflow = 'hidden';
        target.insertBefore(video, target.firstChild);
      }
    };

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        video.srcObject = stream;

        video.onloadedmetadata = () => {
          video.play().then(() => {
            if (mounted) setCameraReady(true);
          }).catch(() => {
            if (mounted) setCameraError('Could not start camera playback.');
          });
        };

        // Attach after a tick to ensure the container DOM node exists
        requestAnimationFrame(tryAttach);
      } catch (err: any) {
        if (mounted) {
          if (err.name === 'NotAllowedError') {
            setCameraError('Camera access was denied. Please allow camera access in your browser settings.');
          } else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
            setCameraError('No camera found on this device.');
          } else {
            setCameraError(`Could not access camera: ${err.message || err.name}`);
          }
        }
      }
    }

    startCamera();

    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
      videoRef.current = null;
    };
  }, []);

  // Barcode detection loop
  const detectBarcode = useCallback(async () => {
    if (!scanning || processing || !detectorRef.current || !videoRef.current || !cameraReady) {
      rafRef.current = requestAnimationFrame(detectBarcode);
      return;
    }

    try {
      const barcodes = await detectorRef.current.detect(videoRef.current);
      if (barcodes.length > 0) {
        onBarcodeScanned(barcodes[0].rawValue);
        return; // Stop scanning after a detection
      }
    } catch {
      // Detection frame error — continue
    }

    rafRef.current = requestAnimationFrame(detectBarcode);
  }, [scanning, processing, cameraReady, onBarcodeScanned]);

  useEffect(() => {
    if (cameraReady && hasDetector) {
      rafRef.current = requestAnimationFrame(detectBarcode);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [cameraReady, hasDetector, detectBarcode]);

  // Camera error
  if (cameraError) {
    return (
      <View style={styles.fallbackContainer}>
        <Ionicons name="camera-off-outline" size={48} color={Colors.secondary} />
        <Text style={styles.errorText}>{cameraError}</Text>
      </View>
    );
  }

  return (
    <View
      ref={containerRef}
      style={styles.container}
      // @ts-ignore — web-only prop for DOM fallback lookup
      nativeID="web-scanner-container"
    >
      {/* Loading spinner while camera initializes */}
      {!cameraReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Starting camera...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 1,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: 'Figtree_300Light',
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
