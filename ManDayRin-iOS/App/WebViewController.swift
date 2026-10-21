import UIKit
import WebKit
import WidgetKit

/// Hosts the bundled ManDayRin web app (build/web) at mandayrin://localhost/ and bridges
/// notifications and saved state to native code.
final class WebViewController: UIViewController, WKNavigationDelegate, WKScriptMessageHandlerWithReply {
    private static let background = UIColor(red: 9 / 255, green: 11 / 255, blue: 13 / 255, alpha: 1)
    private var webView: WKWebView?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = Self.background
        // The page reads Notification.permission synchronously, so the current value is baked into the bridge script.
        Reminders.permission { [weak self] permission in self?.makeWebView(permission: permission) }
        NotificationCenter.default.addObserver(self, selector: #selector(didBecomeActive), name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    private func makeWebView(permission: String) {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(BundleSchemeHandler(), forURLScheme: BundleSchemeHandler.scheme)
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.userContentController.addScriptMessageHandler(self, contentWorld: .page, name: "mandayrin")
        config.userContentController.addUserScript(WKUserScript(source: Bridge.script(permission: permission), injectionTime: .atDocumentStart, forMainFrameOnly: true))

        let webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.isOpaque = false
        webView.backgroundColor = Self.background
        webView.scrollView.backgroundColor = Self.background
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.navigationDelegate = self
        if #available(iOS 16.4, *) { webView.isInspectable = true }
        view.addSubview(webView)
        self.webView = webView
        webView.load(URLRequest(url: URL(string: "\(BundleSchemeHandler.scheme)://localhost/index.html")!))
    }

    @objc private func didBecomeActive() {
        Reminders.permission { [weak self] permission in
            self?.webView?.evaluateJavaScript("window.__mandayrinSetPermission && window.__mandayrinSetPermission('\(permission)')")
        }
        Reminders.reschedule()
        WidgetCenter.shared.reloadAllTimelines()
    }

    // Keep the app's own pages in the web view; anything else opens in Safari.
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { return decisionHandler(.cancel) }
        if url.scheme == BundleSchemeHandler.scheme || url.scheme == "blob" || url.scheme == "about" {
            decisionHandler(.allow)
        } else {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
        }
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.reload()
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else {
            return replyHandler(nil, nil)
        }
        switch type {
        case "requestPermission":
            Reminders.requestPermission { replyHandler($0, nil) }
        case "notify":
            // Daily reminders are scheduled natively; only the Reminder tab's test goes out from the page.
            if (body["tag"] as? String ?? "").hasPrefix("mandayrin-test") {
                Reminders.notifyNow(title: body["title"] as? String ?? "ManDayRin", body: body["body"] as? String ?? "")
            }
            replyHandler(nil, nil)
        case "state":
            if let json = body["value"] as? String {
                let change = SharedState.save(json: json)
                if change.reminderChanged || change.startChanged { Reminders.reschedule() }
                if change.startChanged { WidgetCenter.shared.reloadAllTimelines() }
            }
            replyHandler(nil, nil)
        default:
            replyHandler(nil, nil)
        }
    }
}

/// Serves the files in the app bundle's `web` folder.
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "mandayrin"
    private let root = Bundle.main.resourceURL!.appendingPathComponent("web", isDirectory: true).standardizedFileURL

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return }
        var path = url.path
        if path.isEmpty || path.hasSuffix("/") { path += "index.html" }
        let file = root.appendingPathComponent(String(path.drop { $0 == "/" })).standardizedFileURL
        guard file.path.hasPrefix(root.path), let data = try? Data(contentsOf: file, options: .mappedIfSafe) else {
            task.didReceive(HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: nil)!)
            task.didFinish()
            return
        }
        let headers = [
            "Content-Type": Self.mimeType(file.pathExtension),
            "Content-Length": String(data.count),
            "Cache-Control": "no-cache"
        ]
        task.didReceive(HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)!)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

    private static func mimeType(_ ext: String) -> String {
        switch ext.lowercased() {
        case "html": return "text/html; charset=utf-8"
        case "js": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json", "webmanifest": return "application/json"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "mp3": return "audio/mpeg"
        default: return "application/octet-stream"
        }
    }
}

/// Injected before the page's scripts: stands in for the web Notification API (backed by native
/// notifications), hides the service worker and the PWA install bits, and mirrors saved state to native.
enum Bridge {
    static func script(permission: String) -> String {
        """
        (function () {
          "use strict";
          const post = (message) => window.webkit.messageHandlers.mandayrin.postMessage(message);
          let permission = "\(permission)";
          window.__mandayrinSetPermission = (value) => { permission = value; };

          try { delete Navigator.prototype.serviceWorker; } catch (_) {}
          try { Object.defineProperty(navigator, "standalone", { value: true, configurable: true }); } catch (_) {}
          try { Object.defineProperty(window, "isSecureContext", { value: true, configurable: true }); } catch (_) {}

          function NativeNotification(title, options) {
            options = options || {};
            post({ type: "notify", title: String(title), body: String(options.body || ""), tag: String(options.tag || "") });
          }
          Object.defineProperty(NativeNotification, "permission", { get: () => permission });
          NativeNotification.requestPermission = () => post({ type: "requestPermission" }).then((value) => (permission = value || permission));
          window.Notification = NativeNotification;

          const STATE_KEY = "mandayrinState.v2";
          const setItem = Storage.prototype.setItem;
          Storage.prototype.setItem = function (key, value) {
            setItem.call(this, key, value);
            if (key === STATE_KEY && this === window.localStorage) post({ type: "state", value: String(value) });
          };

          // The install button and the "Keep it reliable" calendar panel are for the web version.
          const style = document.createElement("style");
          style.textContent = "#installButton, .device-panel { display: none !important; }";
          document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
        })();
        """
    }
}
