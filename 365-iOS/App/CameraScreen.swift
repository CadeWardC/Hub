import AVFoundation
import PhotosUI
import SwiftUI

/// Front or back camera. Photos come out upright and, for the front camera, mirrored like the preview.
final class CameraModel: NSObject, ObservableObject, AVCapturePhotoCaptureDelegate {
    let session = AVCaptureSession()
    @Published var position: AVCaptureDevice.Position
    @Published var denied = false
    var onPhoto: ((UIImage) -> Void)?

    private let output = AVCapturePhotoOutput()
    private let queue = DispatchQueue(label: "365.camera")

    init(position: AVCaptureDevice.Position) {
        self.position = position
    }

    func start() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            configure()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async {
                    if granted { self.configure() } else { self.denied = true }
                }
            }
        default:
            denied = true
        }
    }

    func stop() {
        queue.async { if self.session.isRunning { self.session.stopRunning() } }
    }

    func flip() {
        position = position == .front ? .back : .front
        configure()
    }

    private func configure() {
        let position = position
        queue.async {
            let session = self.session
            session.beginConfiguration()
            session.sessionPreset = .photo
            session.inputs.forEach { session.removeInput($0) }
            if let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: position),
               let input = try? AVCaptureDeviceInput(device: device),
               session.canAddInput(input) {
                session.addInput(input)
            }
            if !session.outputs.contains(self.output), session.canAddOutput(self.output) {
                session.addOutput(self.output)
            }
            session.commitConfiguration()
            if !session.isRunning { session.startRunning() }
        }
    }

    func capture() {
        let mirrored = position == .front
        queue.async {
            if let connection = self.output.connection(with: .video) {
                if connection.isVideoRotationAngleSupported(90) { connection.videoRotationAngle = 90 }
                if connection.isVideoMirroringSupported {
                    connection.automaticallyAdjustsVideoMirroring = false
                    connection.isVideoMirrored = mirrored
                }
            }
            self.output.capturePhoto(with: AVCapturePhotoSettings(), delegate: self)
        }
    }

    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        guard let data = photo.fileDataRepresentation(), let image = UIImage(data: data) else { return }
        DispatchQueue.main.async { self.onPhoto?(image) }
    }
}

private final class PreviewView: UIView {
    override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
    var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
}

private struct CameraPreview: UIViewRepresentable {
    let session: AVCaptureSession

    func makeUIView(context: Context) -> PreviewView {
        let view = PreviewView()
        view.previewLayer.session = session
        view.previewLayer.videoGravity = .resizeAspectFill
        return view
    }

    func updateUIView(_ view: PreviewView, context: Context) {}
}

/// Full-screen camera for one day's photo. The previous photo is laid over the preview as a faint
/// ghost so every day lines up the same way. The frame is 3:4, the shape of the photo itself.
struct CameraScreen: View {
    let day: String

    @EnvironmentObject private var store: Store
    @Environment(\.dismiss) private var dismiss
    @AppStorage("ghostOn") private var ghostOn = true
    @AppStorage("ghostOpacity") private var ghostOpacity = 0.35
    @AppStorage("frontCamera") private var frontCamera = true
    @StateObject private var camera: CameraModel
    @State private var captured: UIImage?
    @State private var ghost: UIImage?
    @State private var pickerItem: PhotosPickerItem?
    @State private var showGrid = true

    init(day: String) {
        self.day = day
        let front = UserDefaults.standard.object(forKey: "frontCamera") as? Bool ?? true
        _camera = StateObject(wrappedValue: CameraModel(position: front ? .front : .back))
    }

    var body: some View {
        VStack(spacing: 16) {
            header
            Color.clear
                .aspectRatio(3 / 4, contentMode: .fit)
                .overlay { viewfinder }
                .clipShape(RoundedRectangle(cornerRadius: 18))
                .padding(.horizontal, 12)

            Spacer(minLength: 0)
            controls
        }
        .padding(.bottom, 24)
        .background(Color.black.ignoresSafeArea())
        .onAppear {
            camera.onPhoto = { image in captured = Store.normalized(image, maxSide: 1600) }
            camera.start()
            ghost = previousPhoto()
        }
        .onDisappear { camera.stop() }
        .onChange(of: pickerItem) { _, item in
            guard let item else { return }
            Task {
                if let data = try? await item.loadTransferable(type: Data.self), let image = UIImage(data: data) {
                    captured = Store.normalized(image, maxSide: 1600)
                }
                pickerItem = nil
            }
        }
    }

    private var viewfinder: some View {
        ZStack {
            if let captured {
                Image(uiImage: captured).resizable().scaledToFill()
            } else {
                CameraPreview(session: camera.session)
                if ghostOn, let ghost {
                    Image(uiImage: ghost).resizable().scaledToFill().opacity(ghostOpacity).allowsHitTesting(false)
                }
                if showGrid { GuideGrid().allowsHitTesting(false) }
                if camera.denied {
                    Text("Camera access is off. Turn it on in Settings → 365, or pick a photo from your library.")
                        .multilineTextAlignment(.center)
                        .padding()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(.black)
                }
            }
        }
    }

    private var header: some View {
        HStack {
            Button("Cancel") { dismiss() }
            Spacer()
            VStack(spacing: 2) {
                Text("Day \(store.dayNumber(day))").font(.headline)
                Text(Day.pretty(day)).font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            Button {
                showGrid.toggle()
            } label: {
                Image(systemName: showGrid ? "grid" : "square")
            }
            .disabled(captured != nil)
        }
        .padding(.horizontal)
        .padding(.top, 8)
    }

    @ViewBuilder private var controls: some View {
        if let captured {
            HStack(spacing: 16) {
                Button {
                    self.captured = nil
                } label: {
                    Label("Retake", systemImage: "arrow.counterclockwise").frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                Button {
                    store.savePhoto(captured, day: day)
                    dismiss()
                } label: {
                    Label("Use photo", systemImage: "checkmark").frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }
            .controlSize(.large)
            .padding(.horizontal)
        } else {
            VStack(spacing: 12) {
                if ghost != nil {
                    HStack {
                        Toggle("Ghost", isOn: $ghostOn).fixedSize()
                        Slider(value: $ghostOpacity, in: 0.1...0.7).disabled(!ghostOn)
                    }
                    .font(.subheadline)
                    .padding(.horizontal, 24)
                }
                HStack {
                    PhotosPicker(selection: $pickerItem, matching: .images) {
                        Image(systemName: "photo.on.rectangle").font(.title2).frame(width: 60, height: 60)
                    }
                    Spacer()
                    Button {
                        camera.capture()
                    } label: {
                        ZStack {
                            Circle().fill(.white).frame(width: 68, height: 68)
                            Circle().stroke(.white, lineWidth: 4).frame(width: 80, height: 80)
                        }
                    }
                    .disabled(camera.denied)
                    Spacer()
                    Button {
                        camera.flip()
                        frontCamera = camera.position == .front
                    } label: {
                        Image(systemName: "arrow.triangle.2.circlepath.camera").font(.title2).frame(width: 60, height: 60)
                    }
                    .disabled(camera.denied)
                }
                .padding(.horizontal, 32)
            }
        }
    }

    /// The latest photo before this day, or this day's own photo when retaking.
    private func previousPhoto() -> UIImage? {
        let earlier = store.photoDays.filter { $0 < day }
        guard let source = earlier.last ?? store.photoDays.first(where: { $0 == day }) else { return nil }
        return store.image(source)
    }
}

/// Thirds plus a centre line, to keep the head in the same place.
private struct GuideGrid: View {
    var body: some View {
        GeometryReader { geo in
            Path { path in
                for i in 1...2 {
                    let x = geo.size.width * CGFloat(i) / 3
                    let y = geo.size.height * CGFloat(i) / 3
                    path.move(to: CGPoint(x: x, y: 0))
                    path.addLine(to: CGPoint(x: x, y: geo.size.height))
                    path.move(to: CGPoint(x: 0, y: y))
                    path.addLine(to: CGPoint(x: geo.size.width, y: y))
                }
            }
            .stroke(.white.opacity(0.25), lineWidth: 1)
            Path { path in
                path.move(to: CGPoint(x: geo.size.width / 2, y: 0))
                path.addLine(to: CGPoint(x: geo.size.width / 2, y: geo.size.height))
            }
            .stroke(.white.opacity(0.4), style: StrokeStyle(lineWidth: 1, dash: [6, 6]))
        }
    }
}
