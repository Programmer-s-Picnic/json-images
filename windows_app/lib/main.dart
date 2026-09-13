import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_windows/webview_windows.dart';

void main() {
  runApp(const LearnWithChampakWindowsApp());
}

class LearnWithChampakWindowsApp extends StatelessWidget {
  const LearnWithChampakWindowsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Learn With Champak Desktop',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff075985)),
        useMaterial3: true,
      ),
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
  static const whatsappUrl = 'https://web.whatsapp.com';
  static const apkUrl = 'https://programmer-s-picnic.github.io/json-images/tv/champak-tv.apk';
  static const windowsInstallerUrl = 'https://programmer-s-picnic.github.io/json-images/windows/learn-with-champak-windows-setup.exe';
  static const versionUrl = 'https://programmer-s-picnic.github.io/json-images/windows/learn-with-champak-windows-version.json';

  final WebviewController _controller = WebviewController();
  final TextEditingController _addressController = TextEditingController(text: homeUrl);

  bool _ready = false;
  bool _fullScreen = false;
  bool _checking = false;
  String _title = 'Learn With Champak Desktop';
  String _status = 'Starting browser...';

  @override
  void initState() {
    super.initState();
    _initWebView();
    _checkUpdate();
  }

  Future<void> _initWebView() async {
    try {
      await _controller.initialize();
      await _controller.setBackgroundColor(Colors.white);
      await _controller.setPopupWindowPolicy(WebviewPopupWindowPolicy.deny);
      _controller.url.listen((url) {
        if (url.isNotEmpty && mounted) {
          _addressController.text = url;
        }
      });
      _controller.title.listen((title) {
        if (mounted && title.isNotEmpty) setState(() => _title = title);
      });
      _controller.loadingState.listen((state) {
        if (mounted) {
          setState(() {
            _status = state == LoadingState.loading ? 'Loading...' : 'Ready';
          });
        }
      });
      await _controller.loadUrl(homeUrl);
      if (mounted) {
        setState(() {
          _ready = true;
          _status = 'Ready';
        });
      }
    } catch (e) {
      if (mounted) setState(() => _status = 'WebView2 is required. Error: $e');
    }
  }

  @override
  void dispose() {
    _addressController.dispose();
    _controller.dispose();
    super.dispose();
  }

  String _normaliseUrl(String value) {
    final input = value.trim();
    if (input.isEmpty) return 'about:blank';
    if (input.startsWith('http://') || input.startsWith('https://')) return input;
    if (input.startsWith('www.') || (input.contains('.') && !input.contains(' '))) {
      return 'https://$input';
    }
    return 'https://www.google.com/search?q=${Uri.encodeComponent(input)}';
  }

  Future<void> _load(String value) async {
    final url = _normaliseUrl(value);
    _addressController.text = url == 'about:blank' ? '' : url;
    setState(() => _status = 'Opening $url');
    await _controller.loadUrl(url);
  }

  Future<void> _openExternal(String url) async {
    final uri = Uri.parse(url);
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      setState(() => _status = 'Could not open $url');
    }
  }

  Future<void> _safeBack() async {
    try {
      await _controller.goBack();
    } catch (_) {
      setState(() => _status = 'No back page');
    }
  }

  Future<void> _safeForward() async {
    try {
      await _controller.goForward();
    } catch (_) {
      setState(() => _status = 'No forward page');
    }
  }

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

  Widget _toolbarButton(String text, IconData icon, VoidCallback onPressed) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: FilledButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, size: 16),
        label: Text(text),
        style: FilledButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
        ),
      ),
    );
  }

  Widget _header() {
    if (_fullScreen) {
      return Positioned(
        left: 12,
        top: 12,
        child: FilledButton.icon(
          onPressed: () => setState(() => _fullScreen = false),
          icon: const Icon(Icons.arrow_back, size: 18),
          label: const Text('Controls'),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: const BoxDecoration(
        gradient: LinearGradient(colors: [Color(0xff022c43), Color(0xff075985)]),
      ),
      child: Column(
        children: [
          Row(
            children: [
              const CircleAvatar(
                radius: 22,
                backgroundColor: Colors.white,
                child: Icon(Icons.school, color: Color(0xff075985), size: 28),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Learn With Champak Desktop', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                    Text(_title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Color(0xffffdd80))),
                  ],
                ),
              ),
              _toolbarButton('Windows Update', Icons.system_update_alt, () => _openExternal(windowsInstallerUrl)),
              _toolbarButton('APK', Icons.android, () => _openExternal(apkUrl)),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _toolbarButton('Back', Icons.arrow_back, _safeBack),
              _toolbarButton('Forward', Icons.arrow_forward, _safeForward),
              _toolbarButton('Reload', Icons.refresh, () => _controller.reload()),
              _toolbarButton('Home', Icons.home, () => _load(homeUrl)),
              Expanded(
                child: TextField(
                  controller: _addressController,
                  onSubmitted: _load,
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: Colors.white,
                    hintText: 'Type website or search',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              _toolbarButton('Go', Icons.play_arrow, () => _load(_addressController.text)),
              _toolbarButton('Full', Icons.fullscreen, () => setState(() => _fullScreen = true)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _toolbarButton('LearnWithChampak', Icons.public, () => _load(homeUrl)),
              _toolbarButton('Inside Kashi', Icons.temple_hindu, () => _load(insideKashiUrl)),
              _toolbarButton('YouTube', Icons.smart_display, () => _openExternal(youtubeUrl)),
              _toolbarButton('WhatsApp Web', Icons.chat, () => _load(whatsappUrl)),
              const Spacer(),
              if (_checking) const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
              const SizedBox(width: 8),
              Text(_status, style: const TextStyle(color: Colors.white), overflow: TextOverflow.ellipsis),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xff031526),
      body: Stack(
        children: [
          Column(
            children: [
              if (!_fullScreen) _header(),
              Expanded(
                child: _ready
                    ? Webview(_controller, permissionRequested: (_, permissionKind, isUserInitiated) => WebviewPermissionDecision.allow)
                    : Center(child: Text(_status, style: const TextStyle(color: Colors.white))),
              ),
            ],
          ),
          if (_fullScreen) _header(),
        ],
      ),
    );
  }
}
