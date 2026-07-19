import AppKit
import Foundation
import SwiftUI
import Translation

struct GuideTranslationInput: Decodable {
    let locale: String
    let values: [String]
}

struct GuideTranslationOutput: Encodable {
    let values: [String]
}

struct TranslationView: View {
    let input: GuideTranslationInput
    let outputPath: String

    var body: some View {
        VStack(spacing: 12) {
            ProgressView()
            Text("Preparing \(input.locale) guide translation...")
        }
        .padding(24)
        .frame(minWidth: 360, minHeight: 120)
        .onAppear {
            NSApplication.shared.activate(ignoringOtherApps: true)
        }
        .translationTask(
            source: Locale.Language(identifier: "en"),
            target: Locale.Language(identifier: input.locale),
            preferredStrategy: .lowLatency
        ) { session in
            await translate(using: session)
        }
    }

    private func translate(using session: TranslationSession) async {
        do {
            var values = Array(
                repeating: "",
                count: input.values.count
            )
            let batchSize = 64
            for start in stride(
                from: 0,
                to: input.values.count,
                by: batchSize
            ) {
                let end = min(start + batchSize, input.values.count)
                let requests = input.values[start..<end].enumerated().map {
                    TranslationSession.Request(
                        sourceText: $0.element,
                        clientIdentifier: String(start + $0.offset)
                    )
                }
                let responses = try await session.translations(from: requests)
                for response in responses {
                    guard
                        let identifier = response.clientIdentifier,
                        let index = Int(identifier)
                    else { continue }
                    values[index] = response.targetText
                }
            }
            let output = GuideTranslationOutput(values: values)
            let data = try JSONEncoder().encode(output)
            try data.write(to: URL(fileURLWithPath: outputPath))
            NSApplication.shared.terminate(nil)
        } catch {
            fputs("Translation failed: \(error)\n", stderr)
            NSApplication.shared.terminate(nil)
        }
    }
}

@main
struct GuideTranslationApp: App {
    private let input: GuideTranslationInput
    private let outputPath: String

    init() {
        let arguments = CommandLine.arguments
        guard arguments.count > 2 else {
            fatalError("Expected input and output JSON paths.")
        }
        do {
            let data = try Data(
                contentsOf: URL(fileURLWithPath: arguments[1])
            )
            input = try JSONDecoder().decode(
                GuideTranslationInput.self,
                from: data
            )
            outputPath = arguments[2]
        } catch {
            fatalError("Unable to read translation input: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            TranslationView(input: input, outputPath: outputPath)
        }
        .defaultPosition(.center)
        .windowResizability(.contentSize)
    }
}
