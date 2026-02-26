import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface WebBarcodeScannerProps {
  onBarcodeScanned: (data: string) => void;
  scanning: boolean;
  processing: boolean;
}

export function WebBarcodeScanner({ onBarcodeScanned, scanning, processing }: WebBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasDetector, setHasDetector] = useState(true);
  const [manualBarcode, setManualBarcode] = useState('');

  // Start the camera
  useEffect(() => {
    let mounted = true;

    async function startCamera() {
      // Check if BarcodeDetector API is available
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          detectorRef.current = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'code_128'],
          });
        } catch {
          if (mounted) setHasDetector(false);
        }
      } else {
        if (mounted) setHasDetector(false);
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch (err: any) {
        if (mounted) {
          if (err.name === 'NotAllowedError') {
            setCameraError('Camera access was denied. Please allow camera access in your browser settings.');
          } else if (err.name === 'NotFoundError') {
            setCameraError('No camera found on this device.');
          } else {
            setCameraError('Could not access camera.');
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

  function handleManualSubmit() {
    const code = manualBarcode.trim();
    if (!code || processing) return;
    onBarcodeScanned(code);
  }

  // Camera error — show manual entry
  if (cameraError) {
    return (
      <View style={styles.fallbackContainer}>
        <Ionicons name="camera-off-outline" size={48} color={Colors.secondary} />
        <Text style={styles.errorText}>{cameraError}</Text>
        <Text style={styles.fallbackLabel}>Enter a barcode manually instead:</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={manualBarcode}
            onChangeText={setManualBarcode}
            placeholder="e.g. 5000159484695"
            placeholderTextColor="#aad4cd"
            keyboardType="number-pad"
            returnKeyType="search"
            onSubmitEditing={handleManualSubmit}
            editable={!processing}
          />
          <TouchableOpacity
            style={[styles.searchBtn, (!manualBarcode.trim() || processing) && styles.searchBtnDisabled]}
            onPress={handleManualSubmit}
            disabled={!manualBarcode.trim() || processing}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="search" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera video feed */}
      <video
        ref={videoRef as any}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        muted
        playsInline
      />

      {/* Loading spinner while camera initializes */}
      {!cameraReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Starting camera...</Text>
        </View>
      )}

      {/* No BarcodeDetector — show manual entry over camera */}
      {cameraReady && !hasDetector && (
        <View style={styles.manualOverlay}>
          <Text style={styles.manualTitle}>
            Your browser doesn't support barcode detection
          </Text>
          <Text style={styles.manualHint}>Enter the barcode number manually:</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={manualBarcode}
              onChangeText={setManualBarcode}
              placeholder="e.g. 5000159484695"
              placeholderTextColor="#aad4cd"
              keyboardType="number-pad"
              returnKeyType="search"
              onSubmitEditing={handleManualSubmit}
              editable={!processing}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.searchBtn, (!manualBarcode.trim() || processing) && styles.searchBtnDisabled]}
              onPress={handleManualSubmit}
              disabled={!manualBarcode.trim() || processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="search" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
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
  fallbackLabel: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 16,
  },
  manualOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(226,241,238,0.95)',
    padding: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  manualTitle: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
  },
  manualHint: {
    fontSize: 14,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 420,
  },
  input: {
    flex: 1,
    height: 52,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#aad4cd',
    paddingHorizontal: 16,
    fontSize: 18,
    fontFamily: 'Figtree_400Regular',
    color: Colors.primary,
    letterSpacing: 1,
  },
  searchBtn: {
    width: 52,
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnDisabled: {
    opacity: 0.4,
  },
});
