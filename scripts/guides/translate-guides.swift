import Foundation
import Translation

struct TranslationInput: Decodable {
    let locale: String
    let strategy: String?
    let values: [String]
}

struct TranslationOutput: Encodable {
    let values: [String]
}

@main
struct GuideTranslator {
    static func main() async throws {
        let arguments = CommandLine.arguments
        let inputData = arguments.count > 1
            ? try Data(contentsOf: URL(fileURLWithPath: arguments[1]))
            : FileHandle.standardInput.readDataToEndOfFile()
        let input = try JSONDecoder().decode(
            TranslationInput.self,
            from: inputData
        )
        let source = Locale.Language(identifier: "en")
        let target = Locale.Language(identifier: input.locale)
        let strategy: TranslationSession.Strategy =
            input.strategy == "highFidelity" ? .highFidelity : .lowLatency
        let session = TranslationSession(
            installedSource: source,
            target: target,
            preferredStrategy: strategy
        )
        var translations = Array(
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
                translations[index] = response.targetText
            }
        }

        let output = TranslationOutput(values: translations)
        let data = try JSONEncoder().encode(output)
        if arguments.count > 2 {
            try data.write(to: URL(fileURLWithPath: arguments[2]))
        } else {
            FileHandle.standardOutput.write(data)
        }
    }
}
