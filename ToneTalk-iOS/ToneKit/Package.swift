// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "ToneKit",
    platforms: [.iOS(.v17), .macOS(.v13)],
    products: [.library(name: "ToneKit", targets: ["ToneKit"])],
    targets: [
        .target(name: "ToneKit"),
        .testTarget(name: "ToneKitTests", dependencies: ["ToneKit"]),
    ]
)
