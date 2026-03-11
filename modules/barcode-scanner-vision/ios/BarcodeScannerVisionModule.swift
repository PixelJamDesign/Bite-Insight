import ExpoModulesCore
import Vision
import UIKit

public class BarcodeScannerVisionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BarcodeScannerVision")

    /// Scan barcodes from a static image URI using Apple Vision framework.
    /// Supports ALL barcode types (EAN-13, UPC-A, Code 128, QR, etc.).
    /// Returns an array of { value: string, format: string } objects.
    AsyncFunction("scanFromImage") { (uri: String, promise: Promise) in
      // Load image from URI (file:// or asset path)
      guard let url = URL(string: uri),
            let imageData = try? Data(contentsOf: url),
            let image = UIImage(data: imageData),
            let cgImage = image.cgImage else {
        promise.reject("ERR_IMAGE_LOAD", "Could not load image from URI")
        return
      }

      let request = VNDetectBarcodesRequest { request, error in
        if let error = error {
          promise.reject("ERR_SCAN", error.localizedDescription)
          return
        }

        guard let results = request.results as? [VNBarcodeObservation] else {
          promise.resolve([])
          return
        }

        let barcodes: [[String: String]] = results.compactMap { observation in
          guard let payload = observation.payloadStringValue else { return nil }
          return [
            "value": payload,
            "format": self.mapSymbology(observation.symbology)
          ]
        }

        promise.resolve(barcodes)
      }

      // Request all supported barcode types
      request.symbologies = [
        .ean13, .ean8,
        .upce,
        .code39, .code39Checksum, .code39FullASCII, .code39FullASCIIChecksum,
        .code93, .code93i,
        .code128,
        .itf14,
        .qr,
        .pdf417,
        .aztec,
        .dataMatrix,
        .codabar,
        .i2of5, .i2of5Checksum
      ]

      let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          try handler.perform([request])
        } catch {
          promise.reject("ERR_VISION", error.localizedDescription)
        }
      }
    }
  }

  /// Map Apple Vision symbology to a human-readable format string
  private func mapSymbology(_ symbology: VNBarcodeSymbology) -> String {
    switch symbology {
    case .ean13: return "ean13"
    case .ean8: return "ean8"
    case .upce: return "upc_e"
    case .code39, .code39Checksum, .code39FullASCII, .code39FullASCIIChecksum: return "code39"
    case .code93, .code93i: return "code93"
    case .code128: return "code128"
    case .itf14: return "itf14"
    case .qr: return "qr"
    case .pdf417: return "pdf417"
    case .aztec: return "aztec"
    case .dataMatrix: return "dataMatrix"
    case .codabar: return "codabar"
    case .i2of5, .i2of5Checksum: return "itf"
    default: return "unknown"
    }
  }
}
