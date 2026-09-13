import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_windows/webview_windows.dart';

void main() => runApp(const LearnWithChampakWindowsApp());

class LearnWithChampakWindowsApp extends StatelessWidget {
  const LearnWithChampakWindowsApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Learn With Champak Desktop',
      theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff075985)), useMaterial3: true),
      home: const DesktopHomePage(),
    );
  }
}

class DesktopHomePage extends StatefulWidget {
  const DesktopHomePage({super.key});
  @override
  State<DesktopHomePage> createState() => _DesktopHomePageState();
}

class _DesktopHomePageState extends State<DesktopHomePage> {
  static const homeUrl = 'https://www.learnwithchampak.live';
  static const insideKashiUrl = 'https://insidekashi.com';
  static const youtubeUrl = 'https://youtube.com/@champaksworld';
  static const googleUrl = 'https://accounts.google.com/';
  static const apkUrl = 'https://programmer-s-picnic.github.io/json-images/tv/champak-tv.apk?v=2.7';
  static const windowsInstallerUrl = 'https://programmer-s-picnic.github.io/json-images/windows/learn-with-champak-windows-setup.exe?v=1.1.0';
  static const versionUrl = 'https://programmer-s-picnic.github.io/json-images/windows/learn-with-champak-windows-version.json';

  final WebviewController _controller = WebviewController();
  final TextEditingController _address = TextEditingController(text: homeUrl);
  bool _ready = false;
  bool _full = false;
  bool _checking = false;
  String _title = 'Learn With Champak Desktop';
  String _status = 'Starting browser...';

  @override
  void initState() {
    super.initState();
    _initWebView();
    _checkUpdate();
    WidgetsBinding.instance.addPostFrameCallback((_) => _askDefaultOnFirstRun());
  }

  Future<void> _initWebView() async {
    try {
      await _controller.initialize();
      await _controller.setBackgroundColor(Colors.white);
      await _controller.setPopupWindowPolicy(WebviewPopupWindowPolicy.deny);
      _controller.url.listen((url) { if (url.isNotEmpty && mounted) _address.text = url; });
      _controller.title.listen((title) { if (mounted && title.isNotEmpty) setState(() => _title = title); });
      _controller.loadingState.listen((state) { if (mounted) setState(() => _status = state == LoadingState.loading ? 'Loading...' : 'Ready'); });
      await _controller.loadUrl(homeUrl);
      if (mounted) setState(() { _ready = true; _status = 'Ready'; });
    } catch (e) {
      if (mounted) setState(() => _status = 'Microsoft WebView2 is required. Error: $e');
    }
  }

  @override
  void dispose() { _address.dispose(); _controller.dispose(); super.dispose(); }

  String _normalise(String value) {
    final v = value.trim();
    if (v.isEmpty) return 'about:blank';
    if (v.startsWith('http://') || v.startsWith('https://')) return v;
    if (v.startsWith('www.') || (v.contains('.') && !v.contains(' '))) return 'https://$v';
    return 'https://www.google.com/search?q=${Uri.encodeComponent(v)}';
  }

  Future<void> _load(String value) async {
    final url = _normalise(value);
    _address.text = url == 'about:blank' ? '' : url;
    setState(() => _status = 'Opening $url');
    await _controller.loadUrl(url);
  }

  Future<void> _openExternal(String url) async {
    final uri = Uri.parse(url);
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && mounted) setState(() => _status = 'Could not open $url');
  }

  Future<void> _openCurrentOutside() async {
    final url = _address.text.trim().isEmpty ? homeUrl : _address.text.trim();
    await _openExternal(_normalise(url));
  }

  Future<void> _openDefaultAppsSettings() async {
    try {
      await Process.start('cmd', ['/c', 'start', 'ms-settings:defaultapps'], runInShell: true);
      if (mounted) setState(() => _status = 'Windows Default apps settings opened');
    } catch (_) {
      if (mounted) setState(() => _status = 'Open Windows Settings > Apps > Default apps');
    }
  }

  Future<void> _askDefaultOnFirstRun() async {
    try {
      final dir = Directory('${Platform.environment['APPDATA'] ?? Directory.systemTemp.path}\\LearnWithChampakDesktop');
      await dir.create(recursive: true);
      final marker = File('${dir.path}\\default-browser-prompt-v1.txt');
      if (await marker.exists()) return;
      await marker.writeAsString(DateTime.now().toIso8601String());
    } catch (_) {}
    if (!mounted) return;
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Set as default browser?'),
        content: const Text('Windows does not allow an app to change this silently. Open Default apps, choose your web browser setting, and select Learn With Champak Desktop for web links if Windows offers it. Google sign-in may work better in your system browser, so a Google helper button is included.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Later')),
          FilledButton(onPressed: () { Navigator.pop(context); _openDefaultAppsSettings(); }, child: const Text('Open Default Apps')),
        ],
      ),
    );
  }

  Future<void> _safeBack() async { try { await _controller.goBack(); } catch (_) { setState(() => _status = 'No back page'); } }
  Future<void> _safeForward() async { try { await _controller.goForward(); } catch (_) { setState(() => _status = 'No forward page'); } }

  Future<void> _checkUpdate() async {
    setState(() => _checking = true);
    try {
      final response = await http.get(Uri.parse(versionUrl));
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final latest = data['versionName']?.toString() ?? 'unknown';
      setState(() => _status = 'Windows app latest version: $latest');
    } catch (_) {
      setState(() => _status = 'Windows update link ready');
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  Widget _button(String text, IconData icon, VoidCallback onPressed) => Padding(
    padding: const EdgeInsets.only(right: 6),
    child: FilledButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 16),
      label: Text(text),
      style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8), textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
    ),
  );

  Widget _header() {
    if (_full) return Positioned(left: 12, top: 12, child: FilledButton.icon(onPressed: () => setState(() => _full = false), icon: const Icon(Icons.arrow_back, size: 18), label: const Text('Controls')));
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: const BoxDecoration(gradient: LinearGradient(colors: [Color(0xff022c43), Color(0xff075985)])),
      child: Column(children: [
        Row(children: [
          const CircleAvatar(radius: 22, backgroundColor: Colors.white, child: Icon(Icons.school, color: Color(0xff075985), size: 28)),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Learn With Champak Desktop', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
            Text(_title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Color(0xffffdd80))),
          ])),
          _button('Default Browser', Icons.settings_applications, _openDefaultAppsSettings),
          _button('Windows Update', Icons.system_update_alt, () => _openExternal(windowsInstallerUrl)),
          _button('APK', Icons.android, () => _openExternal(apkUrl)),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          _button('Back', Icons.arrow_back, _safeBack),
          _button('Forward', Icons.arrow_forward, _safeForward),
          _button('Reload', Icons.refresh, () => _controller.reload()),
          _button('Home', Icons.home, () => _load(homeUrl)),
          Expanded(child: TextField(controller: _address, onSubmitted: _load, decoration: InputDecoration(filled: true, fillColor: Colors.white, hintText: 'Type website or search', contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10), border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none)))),
          const SizedBox(width: 8),
          _button('Go', Icons.play_arrow, () => _load(_address.text)),
          _button('Full', Icons.fullscreen, () => setState(() => _full = true)),
        ]),
        const SizedBox(height: 8),
        Row(children: [
          _button('LearnWithChampak', Icons.public, () => _load(homeUrl)),
          _button('Google Login', Icons.login, () => _openExternal(googleUrl)),
          _button('Open Outside', Icons.open_in_browser, _openCurrentOutside),
          _button('Inside Kashi', Icons.temple_hindu, () => _load(insideKashiUrl)),
          _button('YouTube', Icons.smart_display, () => _openExternal(youtubeUrl)),
          const Spacer(),
          if (_checking) const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
          const SizedBox(width: 8),
          Flexible(child: Text(_status, style: const TextStyle(color: Colors.white), overflow: TextOverflow.ellipsis)),
        ]),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: const Color(0xff031526),
    body: Stack(children: [
      Column(children: [
        if (!_full) _header(),
        Expanded(child: _ready ? Webview(_controller, permissionRequested: (_, __, ___) => WebviewPermissionDecision.allow) : Center(child: Text(_status, style: const TextStyle(color: Colors.white)))),
      ]),
      if (_full) _header(),
    ]),
  );
}
