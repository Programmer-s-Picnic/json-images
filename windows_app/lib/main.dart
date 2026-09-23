import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:webview_flutter_windows/webview_flutter_windows.dart';
import 'package:window_manager/window_manager.dart';

String? _startupTimedUrl;
String? _startupExternalUrl;

String _appDataPath(String fileName) {
  final base = Platform.environment['APPDATA'] ?? Directory.current.path;
  return '$base\\LearnWithChampakDesktop\\$fileName';
}

Future<Map<String, dynamic>?> _readWindowBounds() async {
  try {
    final file = File(_appDataPath('window_bounds.json'));
    if (!await file.exists()) return null;
    final decoded = jsonDecode(await file.readAsString());
    return decoded is Map<String, dynamic> ? decoded : null;
  } catch (_) {
    return null;
  }
}

Future<void> _writeWindowBounds(Rect bounds) async {
  try {
    final file = File(_appDataPath('window_bounds.json'));
    await file.parent.create(recursive: true);
    await file.writeAsString(
      jsonEncode({
        'x': bounds.left,
        'y': bounds.top,
        'width': bounds.width,
        'height': bounds.height,
      }),
      flush: true,
    );
  } catch (_) {}
}

void main(List<String> args) async {
  WidgetsFlutterBinding.ensureInitialized();
  await windowManager.ensureInitialized();

  for (var i = 0; i < args.length; i++) {
    if (args[i] == '--timed-open' && i + 1 < args.length) {
      _startupTimedUrl = args[i + 1];
      break;
    }
    if (args[i].startsWith('--timed-open=')) {
      _startupTimedUrl = args[i].substring('--timed-open='.length);
      break;
    }
    final arg = args[i].trim();
    if (arg.startsWith('http://') || arg.startsWith('https://')) {
      _startupExternalUrl = arg;
    }
  }

  final saved = await _readWindowBounds();
  final width = ((saved?['width'] as num?)?.toDouble() ?? 1280).clamp(900.0, 3840.0);
  final height = ((saved?['height'] as num?)?.toDouble() ?? 820).clamp(600.0, 2160.0);
  final hasSavedPosition = saved?['x'] is num && saved?['y'] is num;

  final options = WindowOptions(
    size: Size(width, height),
    minimumSize: const Size(900, 600),
    center: !hasSavedPosition,
    backgroundColor: Colors.white,
    title: 'Learn With Champak Desktop Browser',
  );

  await windowManager.waitUntilReadyToShow(options, () async {
    if (hasSavedPosition) {
      await windowManager.setPosition(
        Offset(
          (saved!['x'] as num).toDouble(),
          (saved['y'] as num).toDouble(),
        ),
      );
    }
    await windowManager.setPreventClose(true);
    await windowManager.show();
    await windowManager.focus();
  });

  runApp(const LearnWithChampakWindowsApp());
}

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
  BrowserTab({
    required this.controller,
    required this.title,
    required this.url,
    this.privacyBlur = false,
  });

  final WebviewController controller;
  String title;
  String url;
  bool privacyBlur;
  bool ready = false;
}

class DesktopHomePage extends StatefulWidget {
  const DesktopHomePage({super.key});

  @override
  State<DesktopHomePage> createState() => _DesktopHomePageState();
}

class _DesktopHomePageState extends State<DesktopHomePage> with WindowListener {
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
  final List<Map<String, String>> _history = [];
  final List<Map<String, String>> _bookmarks = [];

  Timer? _sessionSaveTimer;
  Timer? _windowBoundsSaveTimer;
  bool _restoringSession = false;
  bool _suppressSessionPersistence = false;
  int _current = 0;
  bool _fullScreen = false;
  bool _checking = false;
  bool _windowHasFocus = true;
  bool _privacyHidden = false;
  String? _lastDownloadedPath;
  String _status = 'Starting browser...';

  BrowserTab? get _tab => _tabs.isEmpty || _current < 0 || _current >= _tabs.length ? null : _tabs[_current];
  WebviewController? get _controller => _tab?.controller;

  @override
  void initState() {
    super.initState();
    windowManager.addListener(this);
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _startBrowser();
      if (mounted && _startupTimedUrl == null) _askDefaultBrowserFirstRun();
    });
  }

  Future<void> _startBrowser() async {
    await _loadHistory();
    await _loadBookmarks();
    await _prepareWebView2Environment();

    final timedUrl = _startupTimedUrl;
    final externalUrl = _startupExternalUrl;

    if (timedUrl != null && timedUrl.trim().isNotEmpty) {
      _suppressSessionPersistence = true;
      await _newTab(timedUrl, false);
      if (mounted) setState(() => _status = 'Timed site opened automatically');
    } else if (externalUrl != null && externalUrl.trim().isNotEmpty) {
      await _newTab(externalUrl);
      if (mounted) setState(() => _status = 'Opened link from Windows');
    } else {
      await _restorePreviousSessionOrStartFresh();
    }

    await _checkUpdate();
  }

  String get _historyFilePath => _appDataPath('browser_history.json');
  String get _bookmarksFilePath => _appDataPath('browser_bookmarks.json');

  Future<void> _loadBookmarks() async {
    try {
      final file = File(_bookmarksFilePath);
      if (!await file.exists()) return;
      final decoded = jsonDecode(await file.readAsString());
      if (decoded is! List) return;
      _bookmarks
        ..clear()
        ..addAll(
          decoded.whereType<Map>().map((item) => {
                'url': item['url']?.toString() ?? '',
                'title': item['title']?.toString() ?? '',
                'savedAt': item['savedAt']?.toString() ?? '',
              }).where((item) => item['url']!.isNotEmpty),
        );
    } catch (_) {}
  }

  Future<void> _saveBookmarks() async {
    try {
      final file = File(_bookmarksFilePath);
      await file.parent.create(recursive: true);
      await file.writeAsString(jsonEncode(_bookmarks), flush: true);
    } catch (_) {}
  }

  Future<void> _bookmarkCurrentPage() async {
    final tab = _tab;
    if (tab == null) return;
    final url = tab.url.trim();
    if (!(url.startsWith('http://') || url.startsWith('https://'))) {
      if (mounted) setState(() => _status = 'Open a web page before adding a bookmark');
      return;
    }

    final existing = _bookmarks.indexWhere((item) => item['url'] == url);
    if (existing >= 0) {
      if (mounted) setState(() => _status = 'This page is already bookmarked');
      return;
    }

    _bookmarks.insert(0, {
      'url': url,
      'title': tab.title.trim().isEmpty ? url : tab.title.trim(),
      'savedAt': DateTime.now().toIso8601String(),
    });
    await _saveBookmarks();
    if (mounted) setState(() => _status = 'Bookmark saved');
  }

  void _showBookmarks() {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setLocalState) => AlertDialog(
          title: const Text('Bookmarks'),
          content: SizedBox(
            width: 720,
            height: 520,
            child: _bookmarks.isEmpty
                ? const Center(
                    child: Text('No bookmarks yet. Use Add Bookmark on any web page.'),
                  )
                : ListView.builder(
                    itemCount: _bookmarks.length,
                    itemBuilder: (context, index) {
                      final item = _bookmarks[index];
                      return ListTile(
                        leading: const Icon(Icons.bookmark),
                        title: Text(
                          item['title'] ?? item['url'] ?? 'Bookmark',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text(
                          item['url'] ?? '',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        onTap: () {
                          Navigator.pop(dialogContext);
                          _newTab(item['url'] ?? homeUrl);
                        },
                        trailing: IconButton(
                          tooltip: 'Delete bookmark',
                          icon: const Icon(Icons.delete_outline),
                          onPressed: () async {
                            _bookmarks.removeAt(index);
                            await _saveBookmarks();
                            setLocalState(() {});
                            if (mounted) setState(() => _status = 'Bookmark deleted');
                          },
                        ),
                      );
                    },
                  ),
          ),
          actions: [
            TextButton.icon(
              onPressed: _bookmarks.isEmpty
                  ? null
                  : () async {
                      _bookmarks.clear();
                      await _saveBookmarks();
                      setLocalState(() {});
                      if (mounted) setState(() => _status = 'All bookmarks cleared');
                    },
              icon: const Icon(Icons.delete_sweep),
              label: const Text('Clear All'),
            ),
            FilledButton.icon(
              onPressed: () {
                Navigator.pop(dialogContext);
                _bookmarkCurrentPage();
              },
              icon: const Icon(Icons.bookmark_add),
              label: const Text('Add Current Page'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Close'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _loadHistory() async {
    try {
      final file = File(_historyFilePath);
      if (!await file.exists()) return;
      final decoded = jsonDecode(await file.readAsString());
      if (decoded is! List) return;
      _history
        ..clear()
        ..addAll(
          decoded.whereType<Map>().map((item) => {
                'url': item['url']?.toString() ?? '',
                'title': item['title']?.toString() ?? '',
                'visitedAt': item['visitedAt']?.toString() ?? '',
              }).where((item) => item['url']!.isNotEmpty),
        );
    } catch (_) {}
  }

  Future<void> _saveHistory() async {
    try {
      final file = File(_historyFilePath);
      await file.parent.create(recursive: true);
      await file.writeAsString(jsonEncode(_history.take(100).toList()), flush: true);
    } catch (_) {}
  }

  void _addHistory(String url, String title) {
    if (!(url.startsWith('http://') || url.startsWith('https://'))) return;
    _history.removeWhere((item) => item['url'] == url);
    _history.insert(0, {
      'url': url,
      'title': title.trim().isEmpty ? url : title.trim(),
      'visitedAt': DateTime.now().toIso8601String(),
    });
    if (_history.length > 100) _history.removeRange(100, _history.length);
    unawaited(_saveHistory());
  }

  void _showHistory() {
    showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Browsing History'),
        content: SizedBox(
          width: 700,
          height: 520,
          child: _history.isEmpty
              ? const Center(child: Text('No browsing history yet.'))
              : ListView.builder(
                  itemCount: _history.length,
                  itemBuilder: (context, index) {
                    final item = _history[index];
                    final visited = DateTime.tryParse(item['visitedAt'] ?? '');
                    final timeText = visited == null
                        ? ''
                        : '${visited.toLocal().day.toString().padLeft(2, '0')}/'
                            '${visited.toLocal().month.toString().padLeft(2, '0')}/'
                            '${visited.toLocal().year} '
                            '${visited.toLocal().hour.toString().padLeft(2, '0')}:'
                            '${visited.toLocal().minute.toString().padLeft(2, '0')}';
                    return ListTile(
                      leading: const Icon(Icons.history),
                      title: Text(
                        item['title'] ?? item['url'] ?? 'Page',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      subtitle: Text(
                        '${item['url'] ?? ''}${timeText.isEmpty ? '' : '\n$timeText'}',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      onTap: () {
                        Navigator.pop(context);
                        _newTab(item['url'] ?? homeUrl);
                      },
                    );
                  },
                ),
        ),
        actions: [
          TextButton.icon(
            onPressed: _history.isEmpty
                ? null
                : () async {
                    _history.clear();
                    await _saveHistory();
                    if (mounted) {
                      Navigator.pop(context);
                      setState(() => _status = 'Browsing history cleared');
                    }
                  },
            icon: const Icon(Icons.delete_sweep),
            label: const Text('Clear History'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  String get _sessionFilePath {
    final base = Platform.environment['APPDATA'] ?? Directory.current.path;
    return '$base\\LearnWithChampakDesktop\\browser_session.json';
  }

  Future<Map<String, dynamic>?> _readSavedSession() async {
    try {
      final file = File(_sessionFilePath);
      if (!await file.exists()) return null;
      final decoded = jsonDecode(await file.readAsString());
      return decoded is Map<String, dynamic> ? decoded : null;
    } catch (_) {
      return null;
    }
  }

  Map<String, dynamic> _sessionSnapshot() => {
        'savedAt': DateTime.now().toIso8601String(),
        'current': _current,
        'tabs': _tabs
            .map((tab) => {
                  'title': tab.title,
                  'url': tab.url,
                  'privacyBlur': tab.privacyBlur,
                })
            .toList(),
      };

  void _scheduleSessionSave() {
    if (_restoringSession || _suppressSessionPersistence) return;
    _sessionSaveTimer?.cancel();
    _sessionSaveTimer = Timer(const Duration(milliseconds: 250), _saveSessionNow);
  }

  Future<void> _saveSessionNow() async {
    if (_restoringSession || _suppressSessionPersistence || _tabs.isEmpty) return;
    try {
      final file = File(_sessionFilePath);
      await file.parent.create(recursive: true);
      await file.writeAsString(jsonEncode(_sessionSnapshot()), flush: true);
    } catch (_) {}
  }

  void _saveSessionNowSync() {
    if (_restoringSession || _suppressSessionPersistence || _tabs.isEmpty) return;
    try {
      final file = File(_sessionFilePath);
      file.parent.createSync(recursive: true);
      file.writeAsStringSync(jsonEncode(_sessionSnapshot()), flush: true);
    } catch (_) {}
  }

  Future<void> _deleteSavedSession() async {
    _sessionSaveTimer?.cancel();
    try {
      final file = File(_sessionFilePath);
      if (await file.exists()) await file.delete();
    } catch (_) {}
  }

  Future<void> _restorePreviousSessionOrStartFresh() async {
    final saved = await _readSavedSession();
    final rawTabs = saved?['tabs'];
    final savedTabs = rawTabs is List
        ? rawTabs
            .whereType<Map>()
            .map((item) => <String, dynamic>{
                  'title': item['title']?.toString() ?? 'Tab',
                  'url': item['url']?.toString() ?? '',
                  'privacyBlur': item['privacyBlur'] == true,
                })
            .where((item) => (item['url']?.toString() ?? '').isNotEmpty && item['url'] != 'about:blank')
            .toList()
        : <Map<String, dynamic>>[];

    if (savedTabs.isEmpty) {
      await _newTab('about:blank');
      return;
    }

    if (!mounted) return;
    final reopen = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        title: const Text('Previous browsing session found'),
        content: Text(
          '${savedTabs.length} ${savedTabs.length == 1 ? 'tab was' : 'tabs were'} still open when Learn With Champak Desktop last closed.\n\n'
          'Reopen them, or discard the old session and start with a blank tab?',
        ),
        actions: [
          TextButton.icon(
            autofocus: true,
            onPressed: () => Navigator.pop(context, false),
            icon: const Icon(Icons.delete_outline),
            label: const Text('DISCARD & START FRESH'),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.pop(context, true),
            icon: const Icon(Icons.restore),
            label: Text('REOPEN ${savedTabs.length} ${savedTabs.length == 1 ? 'TAB' : 'TABS'}'),
          ),
        ],
      ),
    );

    if (reopen != true) {
      await _deleteSavedSession();
      await _newTab('about:blank');
      if (mounted) setState(() => _status = 'Previous tabs discarded');
      return;
    }

    _restoringSession = true;
    try {
      for (final item in savedTabs) {
        await _newTab(item['url']!.toString(), false, item['privacyBlur'] == true);
      }
      if (_tabs.isNotEmpty) {
        final savedCurrent = saved?['current'];
        final desired = savedCurrent is int ? savedCurrent : 0;
        _current = desired.clamp(0, _tabs.length - 1).toInt();
        _addressController.text = _tab?.url == 'about:blank' ? '' : (_tab?.url ?? '');
      }
    } finally {
      _restoringSession = false;
    }
    await _saveSessionNow();
    if (mounted) setState(() => _status = 'Previous session restored');
  }

  static const _timedTaskName = 'LearnWithChampakTimedSite';

  String get _timedSiteFilePath {
    final base = Platform.environment['APPDATA'] ?? Directory.current.path;
    return '$base\\LearnWithChampakDesktop\\timed_site.json';
  }

  Future<Map<String, dynamic>?> _readTimedSiteConfig() async {
    try {
      final file = File(_timedSiteFilePath);
      if (!await file.exists()) return null;
      final value = jsonDecode(await file.readAsString());
      return value is Map<String, dynamic> ? value : null;
    } catch (_) {
      return null;
    }
  }

  Future<void> _writeTimedSiteConfig(Map<String, dynamic> value) async {
    final file = File(_timedSiteFilePath);
    await file.parent.create(recursive: true);
    await file.writeAsString(jsonEncode(value), flush: true);
  }

  Future<void> _deleteTimedSiteConfig() async {
    try {
      final file = File(_timedSiteFilePath);
      if (await file.exists()) await file.delete();
    } catch (_) {}
  }

  Future<bool> _createTimedSiteTask({
    required String url,
    required String mode,
    required TimeOfDay dailyTime,
    required int intervalMinutes,
  }) async {
    final normalised = _normaliseUrl(url);
    final uri = Uri.tryParse(normalised);
    if (uri == null || (uri.scheme != 'http' && uri.scheme != 'https')) return false;

    final exe = Platform.resolvedExecutable;
    final taskCommand = '"$exe" --timed-open "$normalised"';
    final args = <String>[
      '/Create',
      '/F',
      '/TN',
      _timedTaskName,
      '/TR',
      taskCommand,
    ];

    if (mode == 'interval') {
      if (intervalMinutes < 1 || intervalMinutes > 1439) return false;
      args.addAll(['/SC', 'MINUTE', '/MO', '$intervalMinutes']);
    } else {
      final hh = dailyTime.hour.toString().padLeft(2, '0');
      final mm = dailyTime.minute.toString().padLeft(2, '0');
      args.addAll(['/SC', 'DAILY', '/ST', '$hh:$mm']);
    }

    try {
      final result = await Process.run('schtasks.exe', args, runInShell: false);
      if (result.exitCode != 0) {
        if (mounted) setState(() => _status = 'Could not create Windows timed task: ${result.stderr}');
        return false;
      }
      await _writeTimedSiteConfig({
        'enabled': true,
        'url': normalised,
        'mode': mode,
        'hour': dailyTime.hour,
        'minute': dailyTime.minute,
        'intervalMinutes': intervalMinutes,
      });
      return true;
    } catch (e) {
      if (mounted) setState(() => _status = 'Timed task error: $e');
      return false;
    }
  }

  Future<void> _disableTimedSiteTask() async {
    try {
      await Process.run(
        'schtasks.exe',
        ['/Delete', '/F', '/TN', _timedTaskName],
        runInShell: false,
      );
    } catch (_) {}
    await _deleteTimedSiteConfig();
    if (mounted) setState(() => _status = 'Timed site opening disabled');
  }

  String _timedConfigSummary(Map<String, dynamic>? config) {
    if (config == null || config['enabled'] != true) return 'No timed site is configured.';
    final url = config['url']?.toString() ?? '';
    final mode = config['mode']?.toString() ?? 'daily';
    if (mode == 'interval') {
      return 'Every ${config['intervalMinutes'] ?? '?'} minutes → $url';
    }
    final h = (config['hour'] as num?)?.toInt() ?? 0;
    final m = (config['minute'] as num?)?.toInt() ?? 0;
    return 'Daily at ${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')} → $url';
  }

  Future<void> _showTimedSiteDialog() async {
    final config = await _readTimedSiteConfig();
    if (!mounted) return;

    final currentUrl = _tab?.url;
    final urlController = TextEditingController(
      text: config?['url']?.toString() ??
          ((currentUrl != null && currentUrl != 'about:blank') ? currentUrl : homeUrl),
    );
    final intervalController = TextEditingController(
      text: (config?['intervalMinutes'] ?? 30).toString(),
    );
    var mode = config?['mode']?.toString() == 'interval' ? 'interval' : 'daily';
    var dailyTime = TimeOfDay(
      hour: (config?['hour'] as num?)?.toInt() ?? TimeOfDay.now().hour,
      minute: (config?['minute'] as num?)?.toInt() ?? TimeOfDay.now().minute,
    );
    var saving = false;

    await showDialog<void>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setLocalState) => AlertDialog(
          title: const Text('Timed Site Open'),
          content: SizedBox(
            width: 560,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(_timedConfigSummary(config)),
                const SizedBox(height: 14),
                TextField(
                  controller: urlController,
                  decoration: const InputDecoration(
                    labelText: 'Website URL',
                    hintText: 'https://example.com',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: mode,
                  decoration: const InputDecoration(
                    labelText: 'Open mode',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'daily', child: Text('Daily at a fixed time')),
                    DropdownMenuItem(value: 'interval', child: Text('Repeat at an interval')),
                  ],
                  onChanged: (value) {
                    if (value != null) setLocalState(() => mode = value);
                  },
                ),
                const SizedBox(height: 12),
                if (mode == 'daily')
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Daily time'),
                    subtitle: Text(dailyTime.format(dialogContext)),
                    trailing: FilledButton.icon(
                      onPressed: () async {
                        final picked = await showTimePicker(
                          context: dialogContext,
                          initialTime: dailyTime,
                        );
                        if (picked != null) setLocalState(() => dailyTime = picked);
                      },
                      icon: const Icon(Icons.schedule),
                      label: const Text('Choose'),
                    ),
                  )
                else
                  TextField(
                    controller: intervalController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Interval in minutes',
                      helperText: '1–1439 minutes',
                      border: OutlineInputBorder(),
                    ),
                  ),
              ],
            ),
          ),
          actions: [
            if (config != null)
              TextButton.icon(
                onPressed: saving
                    ? null
                    : () async {
                        setLocalState(() => saving = true);
                        await _disableTimedSiteTask();
                        if (dialogContext.mounted) Navigator.pop(dialogContext);
                      },
                icon: const Icon(Icons.timer_off),
                label: const Text('Disable'),
              ),
            TextButton(
              onPressed: saving ? null : () => Navigator.pop(dialogContext),
              child: const Text('Cancel'),
            ),
            FilledButton.icon(
              onPressed: saving
                  ? null
                  : () async {
                      final interval = int.tryParse(intervalController.text.trim()) ?? 0;
                      final url = _normaliseUrl(urlController.text);
                      final uri = Uri.tryParse(url);
                      if (uri == null || (uri.scheme != 'http' && uri.scheme != 'https')) {
                        setState(() => _status = 'Enter a valid http/https URL');
                        return;
                      }
                      if (mode == 'interval' && (interval < 1 || interval > 1439)) {
                        setState(() => _status = 'Interval must be between 1 and 1439 minutes');
                        return;
                      }
                      setLocalState(() => saving = true);
                      final ok = await _createTimedSiteTask(
                        url: url,
                        mode: mode,
                        dailyTime: dailyTime,
                        intervalMinutes: interval,
                      );
                      if (!mounted) return;
                      if (ok) {
                        setState(() {
                          _status = mode == 'daily'
                              ? 'Timed site scheduled daily at ${dailyTime.format(context)}'
                              : 'Timed site scheduled every $interval minutes';
                        });
                        if (dialogContext.mounted) Navigator.pop(dialogContext);
                      } else {
                        setLocalState(() => saving = false);
                      }
                    },
              icon: const Icon(Icons.alarm_add),
              label: Text(saving ? 'Saving...' : 'Save Schedule'),
            ),
          ],
        ),
      ),
    );

    urlController.dispose();
    intervalController.dispose();
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

  Future<void> _saveWindowBoundsNow() async {
    try {
      final bounds = await windowManager.getBounds();
      if (bounds.width >= 300 && bounds.height >= 300) {
        await _writeWindowBounds(bounds);
      }
    } catch (_) {}
  }

  void _scheduleWindowBoundsSave() {
    _windowBoundsSaveTimer?.cancel();
    _windowBoundsSaveTimer = Timer(
      const Duration(milliseconds: 250),
      () => unawaited(_saveWindowBoundsNow()),
    );
  }

  @override
  void onWindowFocus() {
    _windowHasFocus = true;
    if (mounted) {
      setState(() => _privacyHidden = false);
    }
  }

  @override
  void onWindowBlur() {
    _windowHasFocus = false;
    if (mounted) {
      setState(() => _privacyHidden = _tab?.privacyBlur == true);
    }
  }

  @override
  void onWindowMove() => _scheduleWindowBoundsSave();

  @override
  void onWindowResize() => _scheduleWindowBoundsSave();

  @override
  void onWindowMoved() => _scheduleWindowBoundsSave();

  @override
  void onWindowResized() => _scheduleWindowBoundsSave();

  @override
  void onWindowClose() async {
    _windowBoundsSaveTimer?.cancel();
    await _saveWindowBoundsNow();
    await _saveSessionNow();
    await windowManager.setPreventClose(false);
    await windowManager.destroy();
  }

  @override
  void dispose() {
    _windowBoundsSaveTimer?.cancel();
    _sessionSaveTimer?.cancel();
    windowManager.removeListener(this);
    _saveSessionNowSync();
    _addressController.dispose();
    for (final tab in _tabs) {
      tab.controller.dispose();
    }
    super.dispose();
  }

  Future<void> _newTab([
    String url = homeUrl,
    bool saveSession = true,
    bool privacyBlur = false,
  ]) async {
    final safeUrl = _normaliseUrl(url);
    final controller = WebviewController();
    final tab = BrowserTab(
      controller: controller,
      title: 'New Tab',
      url: safeUrl,
      privacyBlur: privacyBlur,
    );

    setState(() {
      _tabs.add(tab);
      _current = _tabs.length - 1;
      _addressController.text = safeUrl == 'about:blank' ? '' : safeUrl;
      _status = 'Opening new tab...';
    });
    if (saveSession) _scheduleSessionSave();

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
        _addHistory(value, tab.title);
        _scheduleSessionSave();
        if (mounted && _tab == tab) {
          setState(() => _addressController.text = value == 'about:blank' ? '' : value);
        }
      });

      controller.title.listen((value) {
        if (value.isNotEmpty) {
          tab.title = value;
          _addHistory(tab.url, value);
        }
        _scheduleSessionSave();
        if (mounted) setState(() {});
      });

      controller.loadingState.listen((state) {
        if (mounted && _tab == tab) {
          setState(() => _status = state == LoadingState.loading ? 'Loading...' : 'Ready');
        }
      });

      controller.onDownloadEvent.listen((event) {
        if (event.resultFilePath.isNotEmpty) {
          _lastDownloadedPath = event.resultFilePath;
        }
        if (!mounted) return;
        if (event.kind == WebviewDownloadEventKind.downloadStarted) {
          setState(() => _status = 'Download started');
        } else if (event.kind == WebviewDownloadEventKind.downloadCompleted) {
          setState(() => _status = 'Download complete: ' + event.resultFilePath);
        } else if (event.kind == WebviewDownloadEventKind.downloadProgress &&
            event.totalBytesToReceive > 0) {
          final percent = ((event.bytesReceived * 100) / event.totalBytesToReceive).round();
          setState(() => _status = 'Downloading... ' + percent.toString() + '%');
        }
      });

      await controller.loadUrl(safeUrl);
      tab.ready = true;
      if (saveSession) _scheduleSessionSave();
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

  void _togglePrivacyBlur() {
    final tab = _tab;
    if (tab == null) return;
    setState(() {
      tab.privacyBlur = !tab.privacyBlur;
      _privacyHidden = !_windowHasFocus && tab.privacyBlur;
      _status = tab.privacyBlur
          ? 'Privacy Blur enabled for this tab'
          : 'Privacy Blur disabled for this tab';
    });
    _scheduleSessionSave();
  }

  void _switchTab(int index) {
    if (index < 0 || index >= _tabs.length) return;
    setState(() {
      _current = index;
      _privacyHidden = !_windowHasFocus && (_tab?.privacyBlur == true);
      _addressController.text = _tab?.url == 'about:blank' ? '' : (_tab?.url ?? homeUrl);
      _status = 'Tab ${index + 1}';
    });
    _scheduleSessionSave();
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
      _current = index.clamp(0, _tabs.length - 1).toInt();
    } else {
      _current = oldCurrent.clamp(0, _tabs.length - 1).toInt();
    }

    setState(() {
      _addressController.text = _tab?.url == 'about:blank' ? '' : (_tab?.url ?? homeUrl);
      _status = 'Tab closed';
    });
    _scheduleSessionSave();
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
    _scheduleSessionSave();
    await _controller?.setUserAgent(desktopUserAgent);
    await _controller?.loadUrl(url);
  }

  Future<void> _openGoogleSignInInside() async {
    await _newTab(googleSignInUrl);
    if (mounted) {
      setState(() => _status = 'Google Sign-In opened in a new app tab.');
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
          'Use G Inside. It opens Google sign-in in a new internal browser tab with WebView2 session storage and a Windows desktop user-agent.\\n\\n'
          'No website button opens Chrome, Bing, Edge, or another default browser.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
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

  Future<bool> _regAdd(
    String key, {
    String? valueName,
    required String data,
  }) async {
    try {
      final args = <String>['add', key];
      if (valueName == null) {
        args.add('/ve');
      } else {
        args.addAll(['/v', valueName]);
      }
      args.addAll(['/t', 'REG_SZ', '/d', data, '/f']);
      final result = await Process.run('reg.exe', args, runInShell: false);
      return result.exitCode == 0;
    } catch (_) {
      return false;
    }
  }

  Future<bool> _ensureCurrentUserBrowserRegistration() async {
    if (!Platform.isWindows) return false;

    final exe = Platform.resolvedExecutable;
    final icon = '$exe,0';
    final command = '"$exe" "%1"';
    const appName = 'Learn With Champak Desktop';
    const capabilitiesPath = r'Software\LearnWithChampakDesktop\Capabilities';
    const capabilitiesKey = r'HKCU\Software\LearnWithChampakDesktop\Capabilities';
    const progIdKey = r'HKCU\Software\Classes\LearnWithChampakHTML';

    final results = <bool>[];

    results.add(await _regAdd(
      r'HKCU\Software\RegisteredApplications',
      valueName: appName,
      data: capabilitiesPath,
    ));

    results.add(await _regAdd(
      capabilitiesKey,
      valueName: 'ApplicationName',
      data: appName,
    ));
    results.add(await _regAdd(
      capabilitiesKey,
      valueName: 'ApplicationDescription',
      data: 'Learn With Champak desktop web browser',
    ));
    results.add(await _regAdd(
      capabilitiesKey,
      valueName: 'ApplicationIcon',
      data: icon,
    ));

    results.add(await _regAdd(
      r'HKCU\Software\LearnWithChampakDesktop\Capabilities\URLAssociations',
      valueName: 'http',
      data: 'LearnWithChampakHTML',
    ));
    results.add(await _regAdd(
      r'HKCU\Software\LearnWithChampakDesktop\Capabilities\URLAssociations',
      valueName: 'https',
      data: 'LearnWithChampakHTML',
    ));
    results.add(await _regAdd(
      r'HKCU\Software\LearnWithChampakDesktop\Capabilities\FileAssociations',
      valueName: '.htm',
      data: 'LearnWithChampakHTML',
    ));
    results.add(await _regAdd(
      r'HKCU\Software\LearnWithChampakDesktop\Capabilities\FileAssociations',
      valueName: '.html',
      data: 'LearnWithChampakHTML',
    ));

    results.add(await _regAdd(
      progIdKey,
      data: 'Learn With Champak HTML Document',
    ));
    results.add(await _regAdd(
      progIdKey,
      valueName: 'FriendlyTypeName',
      data: 'Learn With Champak Web Link',
    ));
    results.add(await _regAdd(
      progIdKey,
      valueName: 'URL Protocol',
      data: '',
    ));
    results.add(await _regAdd(
      r'HKCU\Software\Classes\LearnWithChampakHTML\DefaultIcon',
      data: icon,
    ));
    results.add(await _regAdd(
      r'HKCU\Software\Classes\LearnWithChampakHTML\shell\open\command',
      data: command,
    ));

    return results.every((ok) => ok);
  }

  Future<bool> _launchSettingsUri(String uri) async {
    try {
      final process = await Process.start(
        'explorer.exe',
        [uri],
        runInShell: false,
      );
      return process.pid > 0;
    } catch (_) {
      return false;
    }
  }

  Future<void> _openWindowsDefaultApps() async {
    final userRegistered = await _ensureCurrentUserBrowserRegistration();

    var opened = false;
    if (userRegistered) {
      opened = await _launchSettingsUri(
        'ms-settings:defaultapps?registeredAppUser=Learn%20With%20Champak%20Desktop',
      );
    }

    if (!opened) {
      opened = await _launchSettingsUri(
        'ms-settings:defaultapps?registeredAppMachine=Learn%20With%20Champak%20Desktop',
      );
    }

    if (!opened) {
      opened = await _launchSettingsUri('ms-settings:defaultapps');
    }

    if (!mounted) return;
    setState(() {
      _status = opened
          ? 'In Default apps, choose Learn With Champak Desktop and set HTTP/HTTPS (and HTML if offered).'
          : 'Open Windows Settings > Apps > Default apps > Learn With Champak Desktop.';
    });
  }

  void _askDefaultBrowserFirstRun() {
    showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Set as default browser?'),
        content: const Text(
          'Learn With Champak will register itself for this Windows user, then open its own Default Apps page. '
          'Windows requires you to confirm the default browser choice there.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Later')),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              _openWindowsDefaultApps();
            },
            child: const Text('Register & Open Settings'),
          ),
        ],
      ),
    );
  }

  String get _downloadsDirectoryPath {
    final home = Platform.environment['USERPROFILE'] ?? Directory.current.path;
    return home + r'\Downloads';
  }

  String _safeDownloadFileName(String value) {
    var name = value.trim();
    if (name.isEmpty) {
      name = 'download_' + DateTime.now().millisecondsSinceEpoch.toString();
    }
    name = name.replaceAll(RegExp(r'[<>:"/\\|?*\x00-\x1F]'), '_');
    while (name.endsWith('.') || name.endsWith(' ')) {
      name = name.substring(0, name.length - 1);
    }
    return name.isEmpty
        ? 'download_' + DateTime.now().millisecondsSinceEpoch.toString()
        : name;
  }

  String? _contentDispositionFileName(String? value) {
    if (value == null || value.trim().isEmpty) return null;
    final utf8Match = RegExp(
      r'''filename\*=UTF-8''([^;]+)''',
      caseSensitive: false,
    ).firstMatch(value);
    if (utf8Match != null) {
      try {
        return Uri.decodeComponent(utf8Match.group(1)!.trim());
      } catch (_) {
        return utf8Match.group(1)!.trim();
      }
    }
    final match = RegExp(
      r'''filename="?([^";]+)"?''',
      caseSensitive: false,
    ).firstMatch(value);
    return match?.group(1)?.trim();
  }

  String _downloadFileName(Uri uri, Map<String, String> headers) {
    final fromHeader = _contentDispositionFileName(headers['content-disposition']);
    if (fromHeader != null && fromHeader.isNotEmpty) {
      return _safeDownloadFileName(fromHeader);
    }

    if (uri.pathSegments.isNotEmpty && uri.pathSegments.last.trim().isNotEmpty) {
      try {
        return _safeDownloadFileName(Uri.decodeComponent(uri.pathSegments.last));
      } catch (_) {
        return _safeDownloadFileName(uri.pathSegments.last);
      }
    }

    final contentType = headers['content-type']?.toLowerCase() ?? '';
    final ext = contentType.contains('text/html')
        ? '.html'
        : contentType.contains('application/pdf')
            ? '.pdf'
            : '';
    return 'download_' + DateTime.now().millisecondsSinceEpoch.toString() + ext;
  }

  Future<String> _uniqueDownloadPath(String fileName) async {
    final dir = Directory(_downloadsDirectoryPath);
    await dir.create(recursive: true);

    final safeName = _safeDownloadFileName(fileName);
    var path = dir.path + '\\' + safeName;
    if (!await File(path).exists()) return path;

    final dot = safeName.lastIndexOf('.');
    final base = dot > 0 ? safeName.substring(0, dot) : safeName;
    final ext = dot > 0 ? safeName.substring(dot) : '';
    var index = 1;
    while (await File(path).exists()) {
      path = dir.path + '\\' + base + ' (' + index.toString() + ')' + ext;
      index++;
    }
    return path;
  }

  Future<void> _downloadCurrentUrl() async {
    final url = _tab?.url ?? '';
    final uri = Uri.tryParse(url);
    if (uri == null || (uri.scheme != 'http' && uri.scheme != 'https')) {
      if (mounted) setState(() => _status = 'Open a downloadable HTTP/HTTPS address first');
      return;
    }

    http.Client? client;
    IOSink? sink;
    try {
      if (mounted) setState(() => _status = 'Starting download...');

      final request = http.Request('GET', uri);
      request.headers['User-Agent'] = desktopUserAgent;

      final cookies = await _controller?.getCookies(url) ?? <WebviewCookie>[];
      if (cookies.isNotEmpty) {
        request.headers['Cookie'] =
            cookies.map((cookie) => cookie.name + '=' + cookie.value).join('; ');
      }

      client = http.Client();
      final response = await client.send(request);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw HttpException('HTTP ' + response.statusCode.toString());
      }

      final fileName = _downloadFileName(uri, response.headers);
      final path = await _uniqueDownloadPath(fileName);
      final file = File(path);
      sink = file.openWrite();

      var received = 0;
      final total = response.contentLength ?? 0;
      await for (final chunk in response.stream) {
        sink.add(chunk);
        received += chunk.length;
        if (mounted && total > 0) {
          final percent = ((received * 100) / total).round();
          setState(() => _status = 'Downloading ' + fileName + '... ' + percent.toString() + '%');
        }
      }
      await sink.flush();
      await sink.close();
      sink = null;

      _lastDownloadedPath = path;
      if (mounted) setState(() => _status = 'Download complete: ' + path);
    } catch (e) {
      if (mounted) setState(() => _status = 'Download failed: ' + e.toString());
    } finally {
      if (sink != null) {
        try {
          await sink.close();
        } catch (_) {}
      }
      client?.close();
    }
  }

  Future<File?> _findLatestDownloadedFile() async {
    try {
      final dir = Directory(_downloadsDirectoryPath);
      if (!await dir.exists()) return null;
      final files = await dir
          .list()
          .where((entity) => entity is File)
          .cast<File>()
          .where((file) {
            final lower = file.path.toLowerCase();
            return !lower.endsWith('.crdownload') &&
                !lower.endsWith('.tmp') &&
                !lower.endsWith('.partial');
          })
          .toList();
      if (files.isEmpty) return null;

      final dated = <MapEntry<File, DateTime>>[];
      for (final file in files) {
        try {
          dated.add(MapEntry(file, (await file.stat()).modified));
        } catch (_) {}
      }
      if (dated.isEmpty) return null;
      dated.sort((a, b) => b.value.compareTo(a.value));
      return dated.first.key;
    } catch (_) {
      return null;
    }
  }

  Future<void> _openLastDownloadedFile() async {
    File? file;
    final remembered = _lastDownloadedPath;
    if (remembered != null && remembered.isNotEmpty) {
      final candidate = File(remembered);
      if (await candidate.exists()) file = candidate;
    }
    file ??= await _findLatestDownloadedFile();

    if (file == null) {
      await _openDownloadsFolder();
      if (mounted) setState(() => _status = 'No downloaded file found; opened Downloads folder');
      return;
    }

    final downloadedFile = file;
    try {
      await Process.start(
        'powershell.exe',
        ['-NoProfile', '-Command', r'Start-Process -FilePath $args[0]', downloadedFile.path],
        runInShell: false,
      );
      _lastDownloadedPath = downloadedFile.path;
      if (mounted) setState(() => _status = 'Opened ' + downloadedFile.path);
    } catch (_) {
      await _openDownloadsFolder();
      if (mounted) setState(() => _status = 'Could not open file directly; opened Downloads folder');
    }
  }

  Future<void> _openDownloadsFolder() async {
    try {
      await Directory(_downloadsDirectoryPath).create(recursive: true);
      await Process.start('explorer.exe', [_downloadsDirectoryPath], runInShell: false);
    } catch (_) {}
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
    final rawTitle = tab.title.trim().isEmpty ? 'New Tab' : tab.title.trim();
    final title = (!_windowHasFocus && tab.privacyBlur) ? 'Private Tab' : rawTitle;

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
          _toolbarButton('Timed', Icons.alarm, _showTimedSiteDialog, important: true),
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
                    const Text('Learn With Champak Desktop v2.6 - Bookmarks + Privacy', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                    Text(_privacyHidden ? 'Private Tab' : (_tab?.title ?? 'Browser'), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Color(0xffffdd80))),
                  ],
                ),
              ),
              _toolbarButton('+ New Tab', Icons.add_box, () => _newTab(homeUrl), important: true),
              _toolbarButton('Tabs', Icons.tab, _showTabs, important: true),
              _toolbarButton('Close', Icons.close, () => _closeTab(_current), important: true),
              _toolbarButton('History', Icons.history, _showHistory, important: true),
              _toolbarButton('Bookmarks', Icons.bookmarks, _showBookmarks, important: true),
              _toolbarButton('G Help', Icons.help, _showGoogleSignInHelp),
              _toolbarButton('Win Update', Icons.system_update_alt, () => _newTab(windowsInstallerUrl)),
              _toolbarButton('APK', Icons.android, () => _newTab(apkUrl)),
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
              _toolbarButton('G Account', Icons.account_circle, _openGoogleAccountInside),
              _toolbarButton('Gmail', Icons.mail, _openGmailInside),
              _toolbarButton('Add Bookmark', Icons.bookmark_add, _bookmarkCurrentPage, important: true),
              _toolbarButton('Download', Icons.download, _downloadCurrentUrl, important: true),
              _toolbarButton('Open File', Icons.file_open, _openLastDownloadedFile, important: true),
              _toolbarButton(_tab?.privacyBlur == true ? 'Privacy On' : 'Privacy', Icons.visibility_off, _togglePrivacyBlur, important: true),
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
                    : Stack(
                        fit: StackFit.expand,
                        children: [
                          Webview(
                            tab.controller,
                            permissionRequested: (_, __, ___) => WebviewPermissionDecision.allow,
                          ),
                          if (_privacyHidden)
                            ClipRect(
                              child: BackdropFilter(
                                filter: ui.ImageFilter.blur(sigmaX: 24, sigmaY: 24),
                                child: Container(
                                  color: const Color(0xcc031526),
                                  alignment: Alignment.center,
                                  child: const Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.visibility_off, color: Colors.white, size: 52),
                                      SizedBox(height: 14),
                                      Text(
                                        'PRIVATE TAB',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 26,
                                          fontWeight: FontWeight.w900,
                                          letterSpacing: 1.3,
                                        ),
                                      ),
                                      SizedBox(height: 6),
                                      Text(
                                        'Return to Learn With Champak to reveal this tab',
                                        style: TextStyle(color: Colors.white70, fontSize: 15),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
              ),
            ],
          ),
          if (_fullScreen) _header(),
        ],
      ),
    );
  }
}
