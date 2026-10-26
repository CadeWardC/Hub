import UIKit
import WebKit
import WidgetKit

/// Hosts the bundled Task & Schedule web app (build/web) at taskschedule://localhost/ and bridges
/// notifications, network requests, saved data and widget ticks to native code.
final class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandlerWithReply {
    /// The page's --bg in light and dark mode.
    static let background = UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 16 / 255, green: 20 / 255, blue: 24 / 255, alpha: 1)
            : UIColor(red: 244 / 255, green: 245 / 255, blue: 247 / 255, alpha: 1)
    }

    private var webView: WKWebView?
    private var pendingRefresh: DispatchWorkItem?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = Self.background
        // The page reads Notification.permission synchronously, so the current value is baked into the bridge script.
        Alerts.permission { [weak self] permission in self?.makeWebView(permission: permission) }
        NotificationCenter.default.addObserver(self, selector: #selector(didBecomeActive), name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    private func makeWebView(permission: String) {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(BundleSchemeHandler(), forURLScheme: BundleSchemeHandler.scheme)
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.userContentController.addScriptMessageHandler(self, contentWorld: .page, name: "taskschedule")
        config.userContentController.addUserScript(WKUserScript(source: Bridge.script(permission: permission), injectionTime: .atDocumentStart, forMainFrameOnly: true))

        let webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.isOpaque = false
        webView.backgroundColor = Self.background
        webView.scrollView.backgroundColor = Self.background
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.navigationDelegate = self
        webView.uiDelegate = self
        if #available(iOS 16.4, *) { webView.isInspectable = true }
        view.addSubview(webView)
        self.webView = webView
        webView.load(URLRequest(url: URL(string: "\(BundleSchemeHandler.scheme)://localhost/index.html")!))
    }

    @objc private func didBecomeActive() {
        Alerts.permission { [weak self] permission in
            self?.webView?.evaluateJavaScript("window.__tsSetPermission && window.__tsSetPermission('\(permission)')")
        }
        applyWidgetTicks()
        Alerts.reschedule()
        WidgetCenter.shared.reloadAllTimelines()
    }

    /// Hands ticks made on the widgets to the page, which marks them done through its own data (so they sync).
    private func applyWidgetTicks() {
        let ticks = SharedState.pendingTicks
        guard !ticks.isEmpty, let webView,
              let json = try? JSONSerialization.data(withJSONObject: ticks),
              let list = String(data: json, encoding: .utf8) else { return }
        webView.evaluateJavaScript("window.__tsApplyTicks ? window.__tsApplyTicks(\(list)) : false") { result, _ in
            guard result as? Bool == true else { return }
            SharedState.pendingTicks = SharedState.pendingTicks.filter { !ticks.contains($0) }
        }
    }

    /// The snapshot changes in bursts while editing; settle before rescheduling and redrawing widgets.
    private func snapshotChanged() {
        pendingRefresh?.cancel()
        let work = DispatchWorkItem {
            Alerts.reschedule()
            WidgetCenter.shared.reloadAllTimelines()
        }
        pendingRefresh = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 1, execute: work)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        applyWidgetTicks()
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

    // MARK: alert / confirm / prompt (protocols use them; WKWebView shows nothing without these)

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let alert = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
        alert.addTextField { $0.text = defaultText }
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(nil) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak alert] _ in completionHandler(alert?.textFields?.first?.text ?? "") })
        present(alert, animated: true)
    }

    // MARK: messages from the bridge

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else {
            return replyHandler(nil, nil)
        }
        switch type {
        case "requestPermission":
            Alerts.requestPermission { replyHandler($0, nil) }
        case "notify":
            // Scheduled reminders are native; this is only for anything the page shows straight away.
            Alerts.notifyNow(title: body["title"] as? String ?? "Task & Schedule", body: body["body"] as? String ?? "")
            replyHandler(nil, nil)
        case "snapshot":
            if let json = body["value"] as? String, SharedState.save(json: json) { snapshotChanged() }
            replyHandler(nil, nil)
        case "haptic":
            UINotificationFeedbackGenerator().notificationOccurred(.warning)
            replyHandler(nil, nil)
        case "fetch":
            NativeFetch.run(body) { replyHandler($0, nil) }
        default:
            replyHandler(nil, nil)
        }
    }
}

/// Sync talks to Directus from native code: the page's taskschedule:// origin isn't one Directus's CORS
/// settings would allow, and URLSession doesn't care about CORS.
enum NativeFetch {
    static func run(_ message: [String: Any], reply: @escaping ([String: Any]) -> Void) {
        guard let string = message["url"] as? String, let url = URL(string: string), let scheme = url.scheme, ["http", "https"].contains(scheme) else {
            return reply(["error": "Bad URL"])
        }
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 30)
        request.httpMethod = message["method"] as? String ?? "GET"
        (message["headers"] as? [String: String] ?? [:]).forEach { request.setValue($1, forHTTPHeaderField: $0) }
        if let body = message["body"] as? String { request.httpBody = Data(body.utf8) }
        URLSession.shared.dataTask(with: request) { data, response, error in
            let result: [String: Any]
            if let http = response as? HTTPURLResponse {
                var headers: [String: String] = [:]
                http.allHeaderFields.forEach { headers["\($0.key)"] = "\($0.value)" }
                result = [
                    "status": http.statusCode,
                    "statusText": HTTPURLResponse.localizedString(forStatusCode: http.statusCode),
                    "headers": headers,
                    "body": String(decoding: data ?? Data(), as: UTF8.self)
                ]
            } else {
                result = ["error": error?.localizedDescription ?? "Load failed"]
            }
            DispatchQueue.main.async { reply(result) }
        }.resume()
    }
}

/// Serves the files in the app bundle's `web` folder.
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "taskschedule"
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
        case "js", "mjs": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json", "webmanifest": return "application/json"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        default: return "application/octet-stream"
        }
    }
}

/// Injected before the page's scripts: stands in for the web Notification API, navigator.vibrate and
/// cross-origin fetch, hides the service worker and the install button, posts a slim snapshot of
/// tasks/events/the running protocol after every save, and applies ticks made on the widgets.
enum Bridge {
    static func script(permission: String) -> String {
        """
        (function () {
          "use strict";
          const post = (message) => window.webkit.messageHandlers.taskschedule.postMessage(message);
          let permission = "\(permission)";
          window.__tsSetPermission = (value) => { permission = value; };

          try { delete Navigator.prototype.serviceWorker; } catch (_) {}
          try { Object.defineProperty(navigator, "standalone", { value: true, configurable: true }); } catch (_) {}

          function NativeNotification(title, options) {
            options = options || {};
            post({ type: "notify", title: String(title), body: String(options.body || "") });
          }
          Object.defineProperty(NativeNotification, "permission", { get: () => permission });
          NativeNotification.requestPermission = () => post({ type: "requestPermission" }).then((value) => (permission = value || permission));
          window.Notification = NativeNotification;

          navigator.vibrate = () => { post({ type: "haptic" }); return true; };

          // Requests to other sites (Directus sync) go through URLSession.
          const pageFetch = window.fetch.bind(window);
          window.fetch = function (input, init) {
            const url = new URL(typeof input === "string" ? input : input.url, location.href);
            if (url.protocol !== "http:" && url.protocol !== "https:") return pageFetch(input, init);
            init = init || {};
            const headers = {};
            new Headers(init.headers || (typeof input === "string" ? undefined : input.headers)).forEach((v, k) => { headers[k] = v; });
            return post({
              type: "fetch", url: url.href, method: init.method || (typeof input === "string" ? "GET" : input.method),
              headers, body: typeof init.body === "string" ? init.body : null,
            }).then((r) => {
              if (!r || r.error) throw new TypeError((r && r.error) || "Load failed");
              const empty = [101, 204, 205, 304].includes(r.status);
              return new Response(empty ? null : r.body, { status: r.status, statusText: r.statusText || "", headers: r.headers });
            });
          };

          // ---- snapshot for the widgets and native reminders ----
          const DATA_KEY = "taskschedule.v1", RUN_KEY = "taskschedule.run";
          const pad = (n) => String(n).padStart(2, "0");
          const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
          const read = (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; } };
          function snapshot() {
            const data = read(DATA_KEY) || {};
            const run = read(RUN_KEY);
            const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
            const from = dayKey(yesterday);
            const tasks = (data.tasks || []).map((t) => ({
              id: String(t.id), title: String(t.title || ""), date: t.date || null, planned: t.planned || null, done: !!t.done,
            }));
            const events = (data.events || []).filter((e) => e.date && e.date >= from && e.start).map((e) => ({
              id: String(e.id), title: String(e.title || ""), date: e.date, start: e.start, end: e.end || "", auto: !!e.auto, done: !!e.done,
            }));
            let wait = null;
            const b = run && run.blocks && run.blocks[run.index];
            if (b && b.type === "wait" && run.waitEnd && run.pausedLeft == null) {
              const n = run.blocks[run.index + 1];
              const next = !n ? "" : n.type === "wait" ? "wait" : String(n.text || "next step").replace(/___/g, "…");
              wait = { title: String(run.title || "Protocol"), waitEnd: run.waitEnd, next };
            }
            return JSON.stringify({ tasks, events, run: wait });
          }
          let snapTimer = 0;
          const postSnapshot = () => {
            clearTimeout(snapTimer);
            snapTimer = setTimeout(() => post({ type: "snapshot", value: snapshot() }), 300);
          };
          const setItem = Storage.prototype.setItem, removeItem = Storage.prototype.removeItem;
          Storage.prototype.setItem = function (key, value) {
            setItem.call(this, key, value);
            if ((key === DATA_KEY || key === RUN_KEY) && this === window.localStorage) postSnapshot();
          };
          Storage.prototype.removeItem = function (key) {
            removeItem.call(this, key);
            if (key === RUN_KEY && this === window.localStorage) postSnapshot();
          };
          window.addEventListener("load", postSnapshot);

          // ---- ticks made on the widgets: "task|<id>|1" / "session|<id>|0" ----
          window.__tsApplyTicks = (ticks) => {
            const TS = window.TS;
            if (!TS) return false;
            const now = new Date(), today = dayKey(now), mins = now.getHours() * 60 + now.getMinutes();
            const toMin = (t) => { const [h, m] = String(t).split(":").map(Number); return h * 60 + m; };
            const upcoming = (ev) => ev.date > today || (ev.date === today && toMin(ev.start) > mins);
            let changed = false;
            ticks.forEach((tick) => {
              const [kind, id, flag] = String(tick).split("|");
              const done = flag === "1";
              if (kind === "task") {
                const task = TS.state.tasks.find((t) => String(t.id) === id);
                if (!task || !!task.done === done) return;
                task.done = done;
                task.doneAt = done ? Date.now() : null;
                // Same as ticking it in the app: its upcoming work sessions go.
                if (done) {
                  const gone = TS.state.events.filter((ev) => ev.auto && ev.taskId === task.id && upcoming(ev));
                  TS.state.events = TS.state.events.filter((ev) => !gone.includes(ev));
                  gone.forEach((ev) => TS.bury("event", ev.id));
                }
                TS.touch(task);
                changed = true;
              } else if (kind === "session") {
                const ev = TS.state.events.find((e) => String(e.id) === id);
                if (!ev || !!ev.done === done) return;
                ev.done = done;
                TS.touch(ev);
                changed = true;
              }
            });
            if (changed) { TS.save(); TS.render(); }
            return true;
          };

          // The install button is for the web version.
          const style = document.createElement("style");
          style.textContent = "#installButton { display: none !important; }";
          document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
        })();
        """
    }
}
