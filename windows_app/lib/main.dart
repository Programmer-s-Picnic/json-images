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
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff075985)),
        useMaterial3: true,
      ),
      home: const DesktopHomePage(),
    );
  }
}

class BrowserTab {
  BrowserTab({required this.controller, required this.title, required this.url});
  final WebviewController controller;
  String title;
  String url;
  bool ready = false;
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
  static const googleSignInUrl = 'https://accounts.google.com/signin';
  static const apkUrl = 'https://programmer-s-picnic.github.io/json-images/tv/champak-tv.apk';
  static const windowsInstallerUrl = 'https://programmer-s-picnic.github.io/json-images/windows/learn-with-champak-windows-setup.exe';
  static const versionUrl = 'https://programmer-s-picnic.github.io/json-images/windows/learn-with-champak-windows-version.json';

  final TextEditingController _addressController = TextEditingController(text: homeUrl);
  final List<BrowserTab> _tabs = [];
  int _current = 0;
  bool _fullScreen = false;
  bool _checking = false;
  String _status = 'Starting browser...';

  BrowserTab? get _tab => _tabs.isEmpty ? null : _tabs[_current];
  WebviewController? get _controller => _tab?.controller;

  @override
  void initState() {
    super.initState();
    _newTab(homeUrl);
    _checkUpdate();
    WidgetsBinding.instance.addPostFrameCallback((_) => _askDefaultBrowserFirstRun());
  }

  @override
  void dispose() {
    _addressController.dispose();
    for (final tab in _tabs) {
      tab.controller.dispose();
    }
    super.dispose();
  }

  Future<void> _newTab([String url = homeUrl]) async {
    final controller = WebviewController();
    final tab = BrowserTab(controller: controller, title: 'New Tab', url: url);
    setState(() {
      _tabs.add(tab);
      _current = _tabs.length - 1;
      _addressController.text = url;
      _status = 'Opening new tab...';
    });

    try {
      await controller.initialize();
      await controller.setBackgroundColor(Colors.white);
      await controller.setPopupWindowPolicy(WebviewPopupWindowPolicy.deny);

      controller.url.listen((value) {
        tab.url = value;
        if (mounted && _tab == tab && value.isNotEmpty) {
          setState(() => _addressController.text = value);
        }
      });

      controller.title.listen((value) {
        if (value.isNotEmpty) tab.title = value;
        if (mounted) setState(() {});
      });

      controller.loadingState.listen((state) {
        if (mounted && _tab == tab) {
          setState(() => _status = state == LoadingState.loading ? 'Loading...' : 'Ready');
        }
      });

      await controller.loadUrl(_normaliseUrl(url));
      tab.ready = true;
      if (mounted) setState(() => _status = 'Ready');
    } catch (e) {
      if (mounted) setState(() => _status = 'WebView2 is required. Error: $e');
    }
  }

  void _switchTab(int index) {
    if (index < 0 || index >= _tabs.length) return;
    setState(() {
      _current = index;
      _addressController.text = _tab?.url ?? homeUrl;
      _status = 'Tab ${index + 1}';
    });
  }

  void _showTabs() {
    showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Open tabs'),
        content: SizedBox(
          width: 520,
          child: ListView.builder(
            shrinkWrap: true,
            itemCount: _tabs.length,
            itemBuilder: (context, index) {
              final tab = _tabs[index];
              return ListTile(
                leading: CircleAvatar(child: Text('${index + 1}')),
                title: Text(tab.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                subtitle: Text(tab.url, maxLines: 1, overflow: TextOverflow.ellipsis),
                selected: index == _current,
                onTap: () {
                  Navigator.pop(context);
                  _switchTab(index);
                },
                trailing: IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () {
                    Navigator.pop(context);
                    _closeTab(index);
                  },
                ),
              );
            },
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              _newTab(homeUrl);
            },
            child: const Text('+ New Tab'),
          ),
        ],
      ),
    );
  }

  void _closeTab(int index) {
    if (_tabs.length <= 1) {
      _load('about:blank');
      return;
    }
    final old = _tabs.removeAt(index);
    old.controller.dispose();
    if (_current >= _tabs.length) _current = _tabs.length - 1;
    setState(() {
      _addressController.text = _tab?.url ?? homeUrl;
      _status = 'Tab closed';
    });
  }

  String _normaliseUrl(String value) {
    final input = value.trim();
    if (input.isEmpty) return 'about:blank';
    if (input.startsWith('http://') || input.startsWith('https://') || input == 'about:blank') return input;
    if (input.startsWith('www.') || (input.contains('.') && !input.contains(' '))) return 'https://$input';
    return 'https://www.google.com/search?q=${Uri.encodeComponent(input)}';
  }

  Future<void> _load(String value) async {
    final url = _normaliseUrl(value);
    _tab?.url = url;
    _addressController.text = url == 'about:blank' ? '' : url;
    setState(() => _status = 'Opening $url');
    await _controller?.loadUrl(url);
  }

  Future<void> _openExternal(String url) async {
    final uri = Uri.parse(url);
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      setState(() => _status = 'Could not open $url');
    }
  }

  Future<void> _openWindowsDefaultApps() async {
    try {
      await Process.start('explorer.exe', ['ms-settings:defaultapps']);
      setState(() => _status = 'Opened Windows default apps settings');
    } catch (_) {
      setState(() => _status = 'Open Settings > Apps > Default apps');
    }
  }

  void _askDefaultBrowserFirstRun() {
    showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Set as default browser?'),
        content: const Text('Windows will open Default apps settings. Search for Learn With Champak Desktop and set it as your browser/link handler where available.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Later')),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              _openWindowsDefaultApps();
            },
            child: const Text('Open Settings'),
          ),
        ],
      ),
    );
  }

  Future<void> _safeBack() async {
    try {
      await _controller?.goBack();
    } catch (_) {
      setState(() => _status = 'No back page');
    }
  }

  Future<void> _safeForward() async {
    try {
      await _controller?.goForward();
    } catch (_) {
      setState(() => _status = 'No forward page');
    }
  }

  Future<void> _checkUpdate() async {
    setState(() => _checking = true);
    try {
      final response = await http.get(Uri.parse(versionUrl));
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      setState(() => _status = 'Latest Windows version: ${data['versionName'] ?? 'unknown'}');
    } catch (_) {
      setState(() => _status = 'Windows update link ready');
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  Widget _toolbarButton(String text, IconData icon, VoidCallback onPressed, {bool important = false}) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: important
          ? FilledButton.icon(
              onPressed: onPressed,
              icon: Icon(icon, size: 16),
              label: Text(text),
              style: FilledButton.styleFrom(
                backgroundColor: Colors.amber,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                textStyle: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
              ),
            )
          : FilledButton.icon(
              onPressed: onPressed,
              icon: Icon(icon, size: 15),
              label: Text(text),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 8),
                textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
              ),
            ),
    );
  }

  Widget _tabStrip() {
    return Container(
      height: 42,
      padding: const EdgeInsets.symmetric(horizontal: 6),
      decoration: BoxDecoration(
        color: const Color(0xff02182a),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white24),
      ),
      child: Row(
        children: [
          const Text('Tabs:', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          const SizedBox(width: 8),
          Expanded(
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _tabs.length,
              itemBuilder: (context, index) {
                final tab = _tabs[index];
                final selected = index == _current;
                return Padding(
                  padding: const EdgeInsets.only(right: 6, top: 4, bottom: 4),
                  child: selected
                      ? FilledButton(
                          onPressed: () => _switchTab(index),
                          child: Text('${index + 1}. ${tab.title}', overflow: TextOverflow.ellipsis),
                        )
                      : OutlinedButton(
                          onPressed: () => _switchTab(index),
                          child: Text('${index + 1}. ${tab.title}', overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white)),
                        ),
                );
              },
            ),
          ),
          _toolbarButton('+ New Tab', Icons.add_box, () => _newTab(homeUrl), important: true),
          _toolbarButton('Tab List', Icons.tab, _showTabs, important: true),
          _toolbarButton('Close Tab', Icons.close, () => _closeTab(_current), important: true),
        ],
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
      padding: const EdgeInsets.all(10),
      decoration: const BoxDecoration(
        gradient: LinearGradient(colors: [Color(0xff022c43), Color(0xff075985)]),
      ),
      child: Column(
        children: [
          Row(
            children: [
              const CircleAvatar(radius: 20, backgroundColor: Colors.white, child: Icon(Icons.school, color: Color(0xff075985), size: 25)),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Learn With Champak Desktop v1.3 - Tabbed Browser', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                    Text(_tab?.title ?? 'Browser', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Color(0xffffdd80))),
                  ],
                ),
              ),
              _toolbarButton('+ New Tab', Icons.add_box, () => _newTab(homeUrl), important: true),
              _toolbarButton('Tabs', Icons.tab, _showTabs, important: true),
              _toolbarButton('Close Tab', Icons.close, () => _closeTab(_current), important: true),
              _toolbarButton('Win Update', Icons.system_update_alt, () => _openExternal(windowsInstallerUrl)),
              _toolbarButton('APK', Icons.android, () => _openExternal(apkUrl)),
            ],
          ),
          const SizedBox(height: 8),
          _tabStrip(),
          const SizedBox(height: 8),
          Row(
            children: [
              _toolbarButton('Back', Icons.arrow_back, _safeBack),
              _toolbarButton('Forward', Icons.arrow_forward, _safeForward),
              _toolbarButton('Reload', Icons.refresh, () => _controller?.reload()),
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
          const SizedBox(height: 7),
          Row(
            children: [
              _toolbarButton('Home', Icons.home, () => _load(homeUrl)),
              _toolbarButton('LearnWithChampak', Icons.public, () => _load(homeUrl)),
              _toolbarButton('Inside Kashi', Icons.temple_hindu, () => _load(insideKashiUrl)),
              _toolbarButton('YouTube', Icons.smart_display, () => _openExternal(youtubeUrl)),
              _toolbarButton('WhatsApp Web', Icons.chat, () => _load(whatsappUrl)),
              _toolbarButton('Google Sign-in', Icons.login, () => _openExternal(googleSignInUrl)),
              _toolbarButton('Default Browser', Icons.settings_applications, _openWindowsDefaultApps),
              const Spacer(),
              if (_checking) const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
              const SizedBox(width: 8),
              Flexible(child: Text(_status, style: const TextStyle(color: Colors.white), overflow: TextOverflow.ellipsis)),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tab = _tab;
    return Scaffold(
      backgroundColor: const Color(0xff031526),
      body: Stack(
        children: [
          Column(
            children: [
              if (!_fullScreen) _header(),
              Expanded(
                child: tab == null || !tab.ready
                    ? Center(child: Text(_status, style: const TextStyle(color: Colors.white)))
                    : Webview(tab.controller, permissionRequested: (_, __, ___) => WebviewPermissionDecision.allow),
              ),
            ],
          ),
          if (_fullScreen) _header(),
        ],
      ),
    );
  }
}
