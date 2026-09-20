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
      title: 'Learn With Champak Desktop Browser',
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
  static const googleMyAccountUrl = 'https://myaccount.google.com';
  static const googleMailUrl = 'https://mail.google.com';
  static const googleSearchUrl = 'https://www.google.com';
  static const apkUrl = 'https://programmer-s-picnic.github.io/json-images/tv/champak-tv.apk';
  static const windowsInstallerUrl = 'https://programmer-s-picnic.github.io/json-images/windows/learn-with-champak-windows-setup.exe';
  static const versionUrl = 'https://programmer-s-picnic.github.io/json-images/windows/learn-with-champak-windows-version.json';
  static const desktopUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0';

  static const newTabLinkScript = r'''
(function(){
  if (window.__lwcInternalTabsInstalled) return;
  window.__lwcInternalTabsInstalled = true;

  function isOpenableHttpUrl(url){
    try {
      var u = new URL(url, location.href);
      return (u.protocol === 'http:' || u.protocol === 'https:');
    } catch(e) {
      return false;
    }
  }

  function shouldIgnoreAnchor(a){
    if (!a) return true;
    var raw = (a.getAttribute('href') || '').trim();
    if (!raw) return true;
    var lower = raw.toLowerCase();
    if (raw === '#' || lower.indexOf('javascript:') === 0 || lower.indexOf('mailto:') === 0 || lower.indexOf('tel:') === 0) return true;
    if (a.hasAttribute('download')) return true;
    try {
      var u = new URL(a.href, location.href);
      if ((u.protocol !== 'http:' && u.protocol !== 'https:')) return true;
      if (u.href.split('#')[0] === location.href.split('#')[0] && u.hash) return true;
    } catch(e) { return true; }
    return false;
  }

  function post(url, reason, label){
    try {
      var u = new URL(url, location.href);
      if (!isOpenableHttpUrl(u.href)) return;
      window.chrome.webview.postMessage(JSON.stringify({
        type: 'lwc-open-new-tab',
        url: u.href,
        reason: reason || 'link',
        label: label || ''
      }));
    } catch(e) {}
  }

  document.addEventListener('auxclick', function(e){
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (e.button !== 1 || shouldIgnoreAnchor(a)) return;
    e.preventDefault();
    e.stopPropagation();
    post(a.href, 'middle-click', a.textContent || a.title || a.href);
  }, true);

  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (shouldIgnoreAnchor(a)) return;
    e.preventDefault();
    e.stopPropagation();
    post(a.href, 'click', a.textContent || a.title || a.href);
  }, true);

  var originalOpen = window.open;
  window.open = function(url, name, features){
    if (url && isOpenableHttpUrl(url)) {
      try { post(new URL(url, location.href).href, 'window-open', name || ''); } catch(e) {}
      return null;
    }
    return originalOpen.apply(window, arguments);
  };
})();
''';

  final TextEditingController _addressController = TextEditingController(text: homeUrl);
  final List<BrowserTab> _tabs = [];

  int _current = 0;
  bool _fullScreen = false;
  bool _checking = false;
  String _status = 'Starting browser...';

  BrowserTab? get _tab => _tabs.isEmpty || _current < 0 || _current >= _tabs.length ? null : _tabs[_current];
  WebviewController? get _controller => _tab?.controller;

  @override
  void initState() {
    super.initState();
    _startBrowser();
    WidgetsBinding.instance.addPostFrameCallback((_) => _askDefaultBrowserFirstRun());
  }

  Future<void> _startBrowser() async {
    await _prepareWebView2Environment();
    await _newTab(homeUrl);
    await _checkUpdate();
  }

  Future<void> _prepareWebView2Environment() async {
    try {
      final base = Platform.environment['APPDATA'] ?? Directory.current.path;
      final userDataPath = '$base\\LearnWithChampakDesktop\\WebView2UserData';
      await Directory(userDataPath).create(recursive: true);
      await WebviewController.initializeEnvironment(
        userDataPath: userDataPath,
        additionalArguments: '--enable-features=NetworkService',
      );
      if (mounted) setState(() => _status = 'WebView2 session storage ready');
    } catch (e) {
      if (mounted) setState(() => _status = 'WebView2 default session will be used: $e');
    }
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
    final safeUrl = _normaliseUrl(url);
    final controller = WebviewController();
    final tab = BrowserTab(controller: controller, title: 'New Tab', url: safeUrl);

    setState(() {
      _tabs.add(tab);
      _current = _tabs.length - 1;
      _addressController.text = safeUrl == 'about:blank' ? '' : safeUrl;
      _status = 'Opening new tab...';
    });

    try {
      await controller.initialize();
      await controller.setBackgroundColor(Colors.white);
      await controller.setPopupWindowPolicy(WebviewPopupWindowPolicy.allow);
      await controller.setUserAgent(desktopUserAgent);
      await controller.addScriptToExecuteOnDocumentCreated(newTabLinkScript);

      controller.webMessage.listen(_handleWebMessage);

      controller.url.listen((value) {
        if (value.isEmpty) return;
        tab.url = value;
        if (mounted && _tab == tab) {
          setState(() => _addressController.text = value == 'about:blank' ? '' : value);
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

      await controller.loadUrl(safeUrl);
      tab.ready = true;
      if (mounted) setState(() => _status = 'Ready');
    } catch (e) {
      if (mounted) setState(() => _status = 'WebView2 is required. Error: $e');
    }
  }

  void _handleWebMessage(dynamic message) {
    try {
      final Object? decoded = message is String ? jsonDecode(message) : message;
      if (decoded is! Map) return;
      if (decoded['type'] != 'lwc-open-new-tab') return;
      final url = decoded['url']?.toString() ?? '';
      if (!_isInternalTabUrl(url)) return;
      _newTab(url);
      if (mounted) setState(() => _status = 'Opened link in a new app tab');
    } catch (_) {}
  }

  bool _isInternalTabUrl(String value) {
    try {
      final uri = Uri.parse(_normaliseUrl(value));
      return uri.scheme == 'http' || uri.scheme == 'https';
    } catch (_) {
      return false;
    }
  }

  void _switchTab(int index) {
    if (index < 0 || index >= _tabs.length) return;
    setState(() {
      _current = index;
      _addressController.text = _tab?.url == 'about:blank' ? '' : (_tab?.url ?? homeUrl);
      _status = 'Tab ${index + 1}';
    });
  }

  void _closeTab(int index) {
    if (index < 0 || index >= _tabs.length) return;
    if (_tabs.length <= 1) {
      _load('about:blank');
      return;
    }

    final oldCurrent = _current;
    final old = _tabs.removeAt(index);
    old.controller.dispose();

    if (index < oldCurrent) {
      _current = oldCurrent - 1;
    } else if (index == oldCurrent) {
      _current = index.clamp(0, _tabs.length - 1);
    } else {
      _current = oldCurrent.clamp(0, _tabs.length - 1);
    }

    setState(() {
      _addressController.text = _tab?.url == 'about:blank' ? '' : (_tab?.url ?? homeUrl);
      _status = 'Tab closed';
    });
  }

  void _showTabs() {
    showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Open Tabs'),
        content: SizedBox(
          width: 620,
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
                  tooltip: 'Close tab',
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
          FilledButton.icon(
            onPressed: () {
              Navigator.pop(context);
              _newTab(homeUrl);
            },
            icon: const Icon(Icons.add),
            label: const Text('New Tab'),
          ),
        ],
      ),
    );
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
    await _controller?.setUserAgent(desktopUserAgent);
    await _controller?.loadUrl(url);
  }

  Future<void> _openGoogleSignInInside() async {
    await _newTab(googleSignInUrl);
    if (mounted) {
      setState(() => _status = 'Google Sign-In opened in a new app tab. Use Outside if Google blocks embedded sign-in.');
    }
  }

  Future<void> _openGoogleAccountInside() async {
    await _newTab(googleMyAccountUrl);
    if (mounted) setState(() => _status = 'Google Account opened in a new app tab');
  }

  Future<void> _openGmailInside() async {
    await _newTab(googleMailUrl);
    if (mounted) setState(() => _status = 'Gmail opened in a new app tab');
  }

  void _showGoogleSignInHelp() {
    showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Google sign-in support'),
        content: const Text(
          'Use G Inside first. This opens Google sign-in in a new internal browser tab with WebView2 session storage and a Windows desktop user-agent.\n\n'
          'If Google still shows a secure-browser warning, choose G Outside. Google sometimes blocks sign-in from embedded browsers even when WebView2 is used.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _openExternal(googleSignInUrl);
            },
            child: const Text('G Outside'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              _openGoogleSignInInside();
            },
            child: const Text('G Inside'),
          ),
        ],
      ),
    );
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

  Widget _tabButton(int index) {
    final tab = _tabs[index];
    final selected = index == _current;
    final title = tab.title.trim().isEmpty ? 'New Tab' : tab.title.trim();

    return Container(
      constraints: const BoxConstraints(maxWidth: 260, minWidth: 150),
      margin: const EdgeInsets.only(right: 6, top: 4, bottom: 4),
      decoration: BoxDecoration(
        color: selected ? Colors.amber : const Color(0xff0b395d),
        borderRadius: BorderRadius.circular(13),
        border: Border.all(color: selected ? Colors.amberAccent : Colors.white24),
      ),
      child: Row(
        children: [
          Expanded(
            child: InkWell(
              borderRadius: BorderRadius.circular(13),
              onTap: () => _switchTab(index),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                child: Row(
                  children: [
                    Icon(Icons.language, size: 16, color: selected ? Colors.black : Colors.white),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        '${index + 1}. $title',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: selected ? Colors.black : Colors.white,
                          fontWeight: selected ? FontWeight.w900 : FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () => _closeTab(index),
            child: Padding(
              padding: const EdgeInsets.all(7),
              child: Icon(Icons.close, size: 16, color: selected ? Colors.black : Colors.white70),
            ),
          ),
        ],
      ),
    );
  }

  Widget _tabStrip() {
    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: 6),
      decoration: BoxDecoration(
        color: const Color(0xff02182a),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white24),
      ),
      child: Row(
        children: [
          const Text('Tabs', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          const SizedBox(width: 8),
          Expanded(
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _tabs.length,
              itemBuilder: (context, index) => _tabButton(index),
            ),
          ),
          _toolbarButton('New', Icons.add_box, () => _newTab(homeUrl), important: true),
          _toolbarButton('List', Icons.tab, _showTabs, important: true),
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
                    const Text('Learn With Champak Desktop v1.7 - Every Link Opens New Tab', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                    Text(_tab?.title ?? 'Browser', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Color(0xffffdd80))),
                  ],
                ),
              ),
              _toolbarButton('+ New Tab', Icons.add_box, () => _newTab(homeUrl), important: true),
              _toolbarButton('Tabs', Icons.tab, _showTabs, important: true),
              _toolbarButton('Close', Icons.close, () => _closeTab(_current), important: true),
              _toolbarButton('G Help', Icons.help, _showGoogleSignInHelp),
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
                    hintText: 'Type website/search, Google, Gmail, WhatsApp, or saved URL',
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
              _toolbarButton('LearnWithChampak', Icons.public, () => _newTab(homeUrl)),
              _toolbarButton('Inside Kashi', Icons.temple_hindu, () => _newTab(insideKashiUrl)),
              _toolbarButton('YouTube', Icons.smart_display, () => _newTab(youtubeUrl)),
              _toolbarButton('WhatsApp Web', Icons.chat, () => _newTab(whatsappUrl)),
              _toolbarButton('Google', Icons.search, () => _newTab(googleSearchUrl)),
              _toolbarButton('G Inside', Icons.login, _openGoogleSignInInside, important: true),
              _toolbarButton('G Outside', Icons.open_in_browser, () => _openExternal(googleSignInUrl)),
              _toolbarButton('G Account', Icons.account_circle, _openGoogleAccountInside),
              _toolbarButton('Gmail', Icons.mail, _openGmailInside),
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