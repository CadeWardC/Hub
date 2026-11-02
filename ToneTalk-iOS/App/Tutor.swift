import Foundation
import Security

enum Provider: String, CaseIterable, Identifiable {
    case deepseek, kimi
    var id: String { rawValue }

    var name: String { self == .deepseek ? "DeepSeek" : "Kimi" }
    var baseURL: String {
        self == .deepseek ? "https://api.deepseek.com/v1" : "https://api.moonshot.ai/v1"
    }
    var defaultModel: String { self == .deepseek ? "deepseek-flash" : "kimi-latest" }
    var keyPage: String {
        self == .deepseek ? "https://platform.deepseek.com/api_keys"
                          : "https://platform.moonshot.ai/console/api-keys"
    }
    var modelDefaultsKey: String { "model.\(rawValue)" }
}

/// API keys live only in this device's Keychain. They are never in the app or repo.
enum Keychain {
    private static func query(_ account: String) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: "com.cadeward.tonetalk",
         kSecAttrAccount as String: account]
    }

    static func save(_ value: String, for account: String) {
        SecItemDelete(query(account) as CFDictionary)
        guard !value.isEmpty else { return }
        var item = query(account)
        item[kSecValueData as String] = Data(value.utf8)
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(item as CFDictionary, nil)
    }

    static func read(_ account: String) -> String {
        var item = query(account)
        item[kSecReturnData as String] = true
        var result: AnyObject?
        guard SecItemCopyMatching(item as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return "" }
        return String(decoding: data, as: UTF8.self)
    }
}

struct TutorReply: Decodable {
    let hanzi: String
    let pinyin: String
    let english: String
    let correction: String?
}

struct ChatTurn {
    let role: String   // "user" or "assistant"
    let text: String
}

enum TutorError: LocalizedError {
    case noKey(String), failed(String)
    var errorDescription: String? {
        switch self {
        case .noKey(let name): return "Add your \(name) API key in Settings."
        case .failed(let message): return message
        }
    }
}

/// The conversation partner. Speech and tones are handled on the device; this only
/// exchanges text with the OpenAI-compatible APIs of DeepSeek and Kimi.
struct Tutor {
    var provider: Provider
    var model: String
    var level: String

    private var system: String {
        """
        You are a warm, patient Mandarin tutor having a spoken conversation with a learner \
        at about \(level) level. Reply in natural Mandarin suited to that level, in 1-2 short \
        sentences that keep the conversation going, usually ending with a question. The learner's \
        words come from a speech recognizer, so tolerate recognition slips. Messages may include \
        a [tones] note from a pitch analyzer listing syllables said with the wrong tone. If there \
        is a real grammar, word choice or tone mistake, explain it briefly in English in \
        "correction", giving the fix. Otherwise set "correction" to null. Do not invent mistakes.
        Respond with strict JSON only: {"hanzi": "...", "pinyin": "... with tone marks", \
        "english": "...", "correction": "..." or null}
        """
    }

    func reply(to history: [ChatTurn]) async throws -> TutorReply {
        var messages: [[String: String]] = [["role": "system", "content": system]]
        messages += history.suffix(20).map { ["role": $0.role, "content": $0.text] }
        return try await complete(messages)
    }

    /// A new sentence to practise, for the Practice tab.
    func practicePhrase(focus: String) async throws -> TutorReply {
        let ask = """
        Give one useful spoken Mandarin sentence of 4-10 characters for a \(level) learner to \
        practise tones. Avoid these, already used: \(focus). Respond with strict JSON only: \
        {"hanzi": "...", "pinyin": "... with tone marks", "english": "...", "correction": null}
        """
        return try await complete([["role": "user", "content": ask]])
    }

    private func complete(_ messages: [[String: String]]) async throws -> TutorReply {
        let key = Keychain.read(provider.rawValue)
        guard !key.isEmpty else { throw TutorError.noKey(provider.name) }
        guard let url = URL(string: provider.baseURL + "/chat/completions") else {
            throw TutorError.failed("Bad API address.")
        }
        var request = URLRequest(url: url, timeoutInterval: 60)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        let body: [String: Any] = [
            "model": model.isEmpty ? provider.defaultModel : model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 2000,
            "response_format": ["type": "json_object"],
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard status == 200 else {
            let detail = String(decoding: data.prefix(200), as: UTF8.self)
            throw TutorError.failed("\(provider.name) error \(status): \(detail)")
        }
        guard let outer = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let choices = outer["choices"] as? [[String: Any]],
              let message = choices.first?["message"] as? [String: Any],
              let content = message["content"] as? String,
              let start = content.firstIndex(of: "{"), let end = content.lastIndex(of: "}"),
              let reply = try? JSONDecoder().decode(TutorReply.self,
                                                    from: Data(content[start...end].utf8)) else {
            throw TutorError.failed("\(provider.name) sent a reply the app could not read.")
        }
        return reply
    }
}
