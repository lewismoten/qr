import Foundation
import Translation

@main
struct TranslationAvailabilityCheck {
    static func main() async {
        let source = Locale.Language(identifier: "en")
        let availability = LanguageAvailability(preferredStrategy: .lowLatency)
        let languages = await availability.supportedLanguages
        print(languages.map(\.minimalIdentifier).joined(separator: ","))
        for target in ["ar", "es", "hi", "zh-Hans"] {
            let language = Locale.Language(identifier: target)
            let status = await availability.status(from: source, to: language)
            print("\(target):\(status)")
        }
    }
}
