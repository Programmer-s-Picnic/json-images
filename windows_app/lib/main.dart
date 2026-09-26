import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
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
    title: "Champak's Desktop Browser",
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
      title: "Champak's Desktop Browser",
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

class _WeatherDay {
  const _WeatherDay({
    required this.date,
    required this.code,
    required this.maxTemp,
    required this.minTemp,
    required this.rainChance,
  });

  final DateTime date;
  final int code;
  final double maxTemp;
  final double minTemp;
  final int rainChance;
}

class _LocalClockPanel extends StatefulWidget {
  const _LocalClockPanel();

  @override
  State<_LocalClockPanel> createState() => _LocalClockPanelState();
}

class _LocalClockPanelState extends State<_LocalClockPanel> {
  late DateTime _now;
  Timer? _timer;

  static const _weekdays = <String>[
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];
  static const _months = <String>[
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  @override
  void initState() {
    super.initState();
    _now = DateTime.now();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String get _timeText =>
      '${_now.hour.toString().padLeft(2, '0')}:${_now.minute.toString().padLeft(2, '0')}:${_now.second.toString().padLeft(2, '0')}';

  String get _dateText =>
      '${_weekdays[_now.weekday - 1]}, ${_now.day} ${_months[_now.month - 1]} ${_now.year}';

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 54,
          height: 54,
          child: CustomPaint(
            painter: _AnalogClockPainter(_now),
          ),
        ),
        const SizedBox(width: 8),
        SizedBox(
          width: 112,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                _timeText,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                  letterSpacing: 0.4,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                _dateText,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Color(0xffffdd80),
                  fontWeight: FontWeight.w700,
                  fontSize: 10.5,
                  height: 1.15,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _AnalogClockPainter extends CustomPainter {
  const _AnalogClockPainter(this.now);

  final DateTime now;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2 - 2;

    canvas.drawCircle(
      center,
      radius,
      Paint()..color = const Color(0x22ffffff),
    );
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = const Color(0xaaffffff)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.4,
    );

    for (var i = 0; i < 12; i++) {
      final angle = (i * 30 - 90) * math.pi / 180;
      final outer = Offset(
        center.dx + math.cos(angle) * (radius - 3),
        center.dy + math.sin(angle) * (radius - 3),
      );
      final inner = Offset(
        center.dx + math.cos(angle) * (radius - (i % 3 == 0 ? 8 : 6)),
        center.dy + math.sin(angle) * (radius - (i % 3 == 0 ? 8 : 6)),
      );
      canvas.drawLine(
        inner,
        outer,
        Paint()
          ..color = i % 3 == 0 ? const Color(0xffffdd80) : const Color(0x99ffffff)
          ..strokeWidth = i % 3 == 0 ? 2 : 1,
      );
    }

    final second = now.second.toDouble();
    final minute = now.minute + second / 60;
    final hour = (now.hour % 12) + minute / 60;

    void hand(double value, double maxValue, double length, double width, Color color) {
      final angle = (value / maxValue * 360 - 90) * math.pi / 180;
      canvas.drawLine(
        center,
        Offset(
          center.dx + math.cos(angle) * radius * length,
          center.dy + math.sin(angle) * radius * length,
        ),
        Paint()
          ..color = color
          ..strokeWidth = width
          ..strokeCap = StrokeCap.round,
      );
    }

    hand(hour, 12, 0.52, 3.4, Colors.white);
    hand(minute, 60, 0.72, 2.5, const Color(0xffffdd80));
    hand(second, 60, 0.82, 1.2, const Color(0xffff8a80));

    canvas.drawCircle(center, 2.8, Paint()..color = Colors.white);
  }

  @override
  bool shouldRepaint(covariant _AnalogClockPainter oldDelegate) =>
      oldDelegate.now.second != now.second;
}


class _DefaultAssociationTile extends StatelessWidget {
  const _DefaultAssociationTile({
    required this.label,
    required this.description,
    required this.icon,
  });

  final String label;
  final String description;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xffdde5ea)),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xff075985)),
          const SizedBox(width: 12),
          SizedBox(
            width: 78,
            child: Text(label, style: const TextStyle(fontWeight: FontWeight.w900)),
          ),
          Expanded(
            child: Text(description, style: const TextStyle(color: Colors.black54)),
          ),
          const Icon(Icons.open_in_new, size: 18, color: Colors.black45),
        ],
      ),
    );
  }
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
  static const githubCodeUrl = 'https://github.com/Programmer-s-Picnic/json-images/tree/main/windows_app';
  static const contactEmail = 'champaksworld@gmail.com';
  static const contactPhone = '+91 9335874326';
  static const whatsappNumber = '919335874326';
  static const defaultBrowserAppName = "Champak's Desktop Browser";
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

  document.addEventListener('contextmenu', function(e){
    try {
      e.preventDefault();
      e.stopPropagation();
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      var linkUrl = '';
      var linkText = '';
      if (a) {
        try { linkUrl = new URL(a.href, location.href).href; } catch(_) {}
        linkText = (a.textContent || a.title || '').trim();
      }
      var selectedText = '';
      try { selectedText = (window.getSelection ? window.getSelection().toString() : '').trim(); } catch(_) {}
      window.chrome.webview.postMessage(JSON.stringify({
        type: 'lwc-context-menu',
        x: e.clientX || 0,
        y: e.clientY || 0,
        linkUrl: linkUrl,
        linkText: linkText,
        selectedText: selectedText,
        pageUrl: location.href,
        pageTitle: document.title || ''
      }));
    } catch(_) {}
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
  final GlobalKey _webViewAreaKey = GlobalKey();
  final List<BrowserTab> _tabs = [];
  final List<Map<String, String>> _history = [];
  final List<Map<String, String>> _bookmarks = [];

  Timer? _sessionSaveTimer;
  Timer? _windowBoundsSaveTimer;
  Timer? _weatherRefreshTimer;
  bool _restoringSession = false;
  bool _suppressSessionPersistence = false;
  int _current = 0;
  bool _fullScreen = false;
  bool _checking = false;
  bool _windowHasFocus = true;
  bool _privacyHidden = false;
  bool _isDefaultBrowser = false;
  bool _weatherLoading = false;
  String? _lastDownloadedPath;
  String _status = 'Starting browser...';
  String _weatherLocation = 'Finding local weather...';
  String _weatherCurrent = 'Weather loading...';
  String _weatherFeelsLike = '';
  int? _weatherCode;
  double? _weatherTemperature;
  DateTime? _weatherUpdatedAt;
  List<_WeatherDay> _weatherForecast = const [];

  BrowserTab? get _tab => _tabs.isEmpty || _current < 0 || _current >= _tabs.length ? null : _tabs[_current];
  WebviewController? get _controller => _tab?.controller;

  @override
  void initState() {
    super.initState();
    windowManager.addListener(this);
    unawaited(_refreshWeather());
    _weatherRefreshTimer = Timer.periodic(
      const Duration(minutes: 30),
      (_) => unawaited(_refreshWeather(silent: true)),
    );
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _startBrowser();
      await _refreshDefaultBrowserState();
      final promptShown = await _defaultPromptShownForCurrentVersion();
      if (mounted &&
          _startupTimedUrl == null &&
          !_isDefaultBrowser &&
          !promptShown) {
        await _markDefaultPromptShown();
        _askDefaultBrowserFirstRun();
      }
    });
  }

  String _weatherDescription(int code) {
    if (code == 0) return 'Clear sky';
    if (code == 1) return 'Mainly clear';
    if (code == 2) return 'Partly cloudy';
    if (code == 3) return 'Overcast';
    if (code == 45 || code == 48) return 'Fog';
    if (code >= 51 && code <= 57) return 'Drizzle';
    if (code >= 61 && code <= 67) return 'Rain';
    if (code >= 71 && code <= 77) return 'Snow';
    if (code >= 80 && code <= 82) return 'Rain showers';
    if (code >= 85 && code <= 86) return 'Snow showers';
    if (code >= 95) return 'Thunderstorm';
    return 'Variable weather';
  }

  IconData _weatherIcon(int? code) {
    if (code == null) return Icons.cloud_queue;
    if (code == 0) return Icons.wb_sunny;
    if (code <= 2) return Icons.wb_cloudy;
    if (code == 3 || code == 45 || code == 48) return Icons.cloud;
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return Icons.grain;
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return Icons.ac_unit;
    if (code >= 95) return Icons.thunderstorm;
    return Icons.cloud_queue;
  }

  String _shortDay(DateTime date) {
    const days = <String>['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days[date.weekday - 1];
  }

  Future<void> _refreshWeather({bool silent = false}) async {
    if (_weatherLoading) return;
    _weatherLoading = true;
    if (mounted && !silent) {
      setState(() {
        _weatherCurrent = 'Updating weather...';
      });
    }

    try {
      final locationResponse = await http
          .get(Uri.parse('https://ipwho.is/'))
          .timeout(const Duration(seconds: 8));
      if (locationResponse.statusCode != 200) {
        throw HttpException('Location HTTP ${locationResponse.statusCode}');
      }

      final locationData = jsonDecode(locationResponse.body);
      if (locationData is! Map || locationData['success'] == false) {
        throw const FormatException('Local location unavailable');
      }

      final latitude = (locationData['latitude'] as num?)?.toDouble();
      final longitude = (locationData['longitude'] as num?)?.toDouble();
      if (latitude == null || longitude == null) {
        throw const FormatException('Location coordinates unavailable');
      }

      final city = locationData['city']?.toString().trim() ?? '';
      final region = locationData['region']?.toString().trim() ?? '';
      final country = locationData['country']?.toString().trim() ?? '';
      final locationParts = <String>[
        if (city.isNotEmpty) city,
        if (region.isNotEmpty && region != city) region,
        if (country.isNotEmpty) country,
      ];

      final weatherUri = Uri.https(
        'api.open-meteo.com',
        '/v1/forecast',
        <String, String>{
          'latitude': latitude.toString(),
          'longitude': longitude.toString(),
          'current': 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m',
          'daily': 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
          'forecast_days': '4',
          'timezone': 'auto',
        },
      );

      final weatherResponse =
          await http.get(weatherUri).timeout(const Duration(seconds: 10));
      if (weatherResponse.statusCode != 200) {
        throw HttpException('Weather HTTP ${weatherResponse.statusCode}');
      }

      final weatherData = jsonDecode(weatherResponse.body);
      if (weatherData is! Map) throw const FormatException('Weather response invalid');

      final current = weatherData['current'];
      final daily = weatherData['daily'];
      if (current is! Map || daily is! Map) {
        throw const FormatException('Weather data incomplete');
      }

      final temp = (current['temperature_2m'] as num?)?.toDouble();
      final feels = (current['apparent_temperature'] as num?)?.toDouble();
      final code = (current['weather_code'] as num?)?.toInt();
      final wind = (current['wind_speed_10m'] as num?)?.toDouble();

      final times = daily['time'] is List ? daily['time'] as List : const [];
      final codes = daily['weather_code'] is List ? daily['weather_code'] as List : const [];
      final maxTemps = daily['temperature_2m_max'] is List ? daily['temperature_2m_max'] as List : const [];
      final minTemps = daily['temperature_2m_min'] is List ? daily['temperature_2m_min'] as List : const [];
      final rain = daily['precipitation_probability_max'] is List
          ? daily['precipitation_probability_max'] as List
          : const [];

      final count = <int>[
        times.length,
        codes.length,
        maxTemps.length,
        minTemps.length,
        rain.length,
        4,
      ].reduce(math.min);

      final forecast = <_WeatherDay>[];
      for (var i = 0; i < count; i++) {
        final date = DateTime.tryParse(times[i]?.toString() ?? '');
        if (date == null) continue;
        forecast.add(
          _WeatherDay(
            date: date,
            code: (codes[i] as num?)?.toInt() ?? 0,
            maxTemp: (maxTemps[i] as num?)?.toDouble() ?? 0,
            minTemp: (minTemps[i] as num?)?.toDouble() ?? 0,
            rainChance: (rain[i] as num?)?.round() ?? 0,
          ),
        );
      }

      if (!mounted) return;
      setState(() {
        _weatherLocation =
            locationParts.isEmpty ? 'Local weather' : locationParts.join(', ');
        _weatherTemperature = temp;
        _weatherCode = code;
        _weatherCurrent = code == null
            ? (temp == null ? 'Weather available' : '${temp.round()}°C')
            : '${temp == null ? '' : '${temp.round()}°C • '}${_weatherDescription(code)}';
        _weatherFeelsLike = [
          if (feels != null) 'Feels ${feels.round()}°C',
          if (wind != null) 'Wind ${wind.round()} km/h',
        ].join(' • ');
        _weatherForecast = forecast;
        _weatherUpdatedAt = DateTime.now();
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _weatherLocation = 'Local weather';
        _weatherCurrent = 'Weather unavailable';
        _weatherFeelsLike = 'Click to retry';
        _weatherCode = null;
        _weatherTemperature = null;
      });
    } finally {
      _weatherLoading = false;
    }
  }

  Widget _localClockWeatherPanel() {
    return Container(
      constraints: const BoxConstraints(minWidth: 330, maxWidth: 370),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0x20000000),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white24),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const _LocalClockPanel(),
          Container(
            width: 1,
            height: 50,
            margin: const EdgeInsets.symmetric(horizontal: 10),
            color: Colors.white24,
          ),
          Expanded(
            child: InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: _showWeatherForecast,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 3),
                child: Row(
                  children: [
                    Icon(
                      _weatherIcon(_weatherCode),
                      color: const Color(0xffffdd80),
                      size: 26,
                    ),
                    const SizedBox(width: 7),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            _weatherLocation,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 10.5,
                            ),
                          ),
                          Text(
                            _weatherCurrent,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Color(0xffffdd80),
                              fontWeight: FontWeight.w900,
                              fontSize: 12,
                            ),
                          ),
                          Text(
                            _weatherFeelsLike,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 9.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (_weatherLoading)
                      const SizedBox(
                        width: 13,
                        height: 13,
                        child: CircularProgressIndicator(
                          strokeWidth: 1.5,
                          color: Colors.white,
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showWeatherForecast() {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Row(
          children: [
            Icon(_weatherIcon(_weatherCode), color: const Color(0xff075985)),
            const SizedBox(width: 10),
            Expanded(child: Text('Local Weather • $_weatherLocation')),
          ],
        ),
        content: SizedBox(
          width: 620,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(_weatherIcon(_weatherCode), size: 40),
                title: Text(
                  _weatherCurrent,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                ),
                subtitle: Text(
                  [
                    if (_weatherFeelsLike.isNotEmpty) _weatherFeelsLike,
                    if (_weatherUpdatedAt != null)
                      'Updated ${_weatherUpdatedAt!.hour.toString().padLeft(2, '0')}:${_weatherUpdatedAt!.minute.toString().padLeft(2, '0')}',
                    'Location is estimated from this internet connection.',
                  ].join('\n'),
                ),
              ),
              const Divider(),
              if (_weatherForecast.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(18),
                  child: Text('Forecast is not available. Use Refresh Weather to try again.'),
                )
              else
                ..._weatherForecast.map(
                  (day) => ListTile(
                    dense: true,
                    leading: Icon(_weatherIcon(day.code)),
                    title: Text(
                      '${_shortDay(day.date)} • ${_weatherDescription(day.code)}',
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                    subtitle: Text('Rain chance ${day.rainChance}%'),
                    trailing: Text(
                      '${day.maxTemp.round()}° / ${day.minTemp.round()}°',
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                  ),
                ),
            ],
          ),
        ),
        actions: [
          TextButton.icon(
            onPressed: () {
              Navigator.pop(dialogContext);
              unawaited(_refreshWeather());
            },
            icon: const Icon(Icons.refresh),
            label: const Text('Refresh Weather'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Close'),
          ),
        ],
      ),
    );
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
  String get _defaultPromptStateFilePath => _appDataPath('default_browser_prompt.json');

  Future<bool> _defaultPromptShownForCurrentVersion() async {
    try {
      final file = File(_defaultPromptStateFilePath);
      if (!await file.exists()) return false;
      final decoded = jsonDecode(await file.readAsString());
      return decoded is Map && decoded['version']?.toString() == '3.5.0';
    } catch (_) {
      return false;
    }
  }

  Future<void> _markDefaultPromptShown() async {
    try {
      final file = File(_defaultPromptStateFilePath);
      await file.parent.create(recursive: true);
      await file.writeAsString(
        jsonEncode({
          'version': '3.5.0',
          'shownAt': DateTime.now().toIso8601String(),
        }),
        flush: true,
      );
    } catch (_) {}
  }

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
    unawaited(_refreshDefaultBrowserState());
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
    _weatherRefreshTimer?.cancel();
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

      final type = decoded['type']?.toString() ?? '';
      if (type == 'lwc-open-new-tab') {
        final url = decoded['url']?.toString() ?? '';
        if (!_isInternalTabUrl(url)) return;
        _newTab(url);
        if (mounted) setState(() => _status = 'Opened link in a new app tab');
        return;
      }

      if (type == 'lwc-context-menu') {
        final x = (decoded['x'] as num?)?.toDouble() ?? 0;
        final y = (decoded['y'] as num?)?.toDouble() ?? 0;
        final linkUrl = decoded['linkUrl']?.toString() ?? '';
        final selectedText = decoded['selectedText']?.toString() ?? '';
        final pageUrl = decoded['pageUrl']?.toString() ?? (_tab?.url ?? '');
        unawaited(
          _showWebContextMenu(
            x: x,
            y: y,
            linkUrl: linkUrl,
            selectedText: selectedText,
            pageUrl: pageUrl,
          ),
        );
      }
    } catch (_) {}
  }

  Future<void> _showWebContextMenu({
    required double x,
    required double y,
    required String linkUrl,
    required String selectedText,
    required String pageUrl,
  }) async {
    if (!mounted) return;

    final overlay = Overlay.of(context).context.findRenderObject() as RenderBox?;
    final webBox = _webViewAreaKey.currentContext?.findRenderObject() as RenderBox?;
    if (overlay == null) return;

    final anchor = webBox?.localToGlobal(Offset(x, y)) ??
        Offset(overlay.size.width / 2, overlay.size.height / 2);
    final left = anchor.dx
        .clamp(0.0, math.max(0.0, overlay.size.width - 1))
        .toDouble();
    final top = anchor.dy
        .clamp(0.0, math.max(0.0, overlay.size.height - 1))
        .toDouble();
    final position = RelativeRect.fromRect(
      Rect.fromLTWH(left, top, 1, 1),
      Offset.zero & overlay.size,
    );

    final hasLink = _isInternalTabUrl(linkUrl);
    final hasSelection = selectedText.trim().isNotEmpty;
    final items = <PopupMenuEntry<String>>[];

    if (hasLink) {
      items.addAll(const [
        PopupMenuItem(value: 'link-here', child: ListTile(leading: Icon(Icons.open_in_browser), title: Text('Open Link Here'), dense: true)),
        PopupMenuItem(value: 'link-tab', child: ListTile(leading: Icon(Icons.add_box), title: Text('Open Link in New Tab'), dense: true)),
        PopupMenuItem(value: 'link-copy', child: ListTile(leading: Icon(Icons.link), title: Text('Copy Link Address'), dense: true)),
        PopupMenuItem(value: 'link-download', child: ListTile(leading: Icon(Icons.download), title: Text('Download Link'), dense: true)),
        PopupMenuItem(value: 'link-outside', child: ListTile(leading: Icon(Icons.open_in_new), title: Text('Open Link Outside'), dense: true)),
        PopupMenuDivider(),
      ]);
    }

    if (hasSelection) {
      items.addAll(const [
        PopupMenuItem(value: 'selection-copy', child: ListTile(leading: Icon(Icons.copy), title: Text('Copy Selected Text'), dense: true)),
        PopupMenuItem(value: 'selection-search', child: ListTile(leading: Icon(Icons.search), title: Text('Search Selected Text'), dense: true)),
        PopupMenuDivider(),
      ]);
    }

    items.addAll(const [
      PopupMenuItem(value: 'back', child: ListTile(leading: Icon(Icons.arrow_back), title: Text('Back'), dense: true)),
      PopupMenuItem(value: 'forward', child: ListTile(leading: Icon(Icons.arrow_forward), title: Text('Forward'), dense: true)),
      PopupMenuItem(value: 'reload', child: ListTile(leading: Icon(Icons.refresh), title: Text('Reload'), dense: true)),
      PopupMenuDivider(),
      PopupMenuItem(value: 'bookmark', child: ListTile(leading: Icon(Icons.bookmark_add), title: Text('Bookmark This Page'), dense: true)),
      PopupMenuItem(value: 'copy-page', child: ListTile(leading: Icon(Icons.content_copy), title: Text('Copy Page Address'), dense: true)),
      PopupMenuItem(value: 'download-page', child: ListTile(leading: Icon(Icons.download_for_offline), title: Text('Download Current Page/File'), dense: true)),
      PopupMenuItem(value: 'downloads', child: ListTile(leading: Icon(Icons.folder_open), title: Text('Open Downloads'), dense: true)),
      PopupMenuItem(value: 'outside-page', child: ListTile(leading: Icon(Icons.launch), title: Text('Open Page Outside'), dense: true)),
      PopupMenuDivider(),
      PopupMenuItem(value: 'fullscreen', child: ListTile(leading: Icon(Icons.fullscreen), title: Text('Full Screen'), dense: true)),
    ]);

    final choice = await showMenu<String>(
      context: context,
      position: position,
      items: items,
      elevation: 12,
    );
    if (choice == null || !mounted) return;

    switch (choice) {
      case 'link-here':
        _load(linkUrl);
        break;
      case 'link-tab':
        await _newTab(linkUrl);
        break;
      case 'link-copy':
        await Clipboard.setData(ClipboardData(text: linkUrl));
        if (mounted) setState(() => _status = 'Link copied');
        break;
      case 'link-download':
        await _downloadUrl(linkUrl);
        break;
      case 'link-outside':
        await _launchExternalUri(Uri.parse(linkUrl));
        break;
      case 'selection-copy':
        await Clipboard.setData(ClipboardData(text: selectedText));
        if (mounted) setState(() => _status = 'Selected text copied');
        break;
      case 'selection-search':
        await _newTab(
          'https://www.google.com/search?q=' + Uri.encodeQueryComponent(selectedText),
        );
        break;
      case 'back':
        await _safeBack();
        break;
      case 'forward':
        await _safeForward();
        break;
      case 'reload':
        await _controller?.reload();
        break;
      case 'bookmark':
        await _bookmarkCurrentPage();
        break;
      case 'copy-page':
        await Clipboard.setData(ClipboardData(text: pageUrl));
        if (mounted) setState(() => _status = 'Page address copied');
        break;
      case 'download-page':
        await _downloadUrl(pageUrl);
        break;
      case 'downloads':
        await _openDownloadsFolder();
        break;
      case 'outside-page':
        final uri = Uri.tryParse(pageUrl);
        if (uri != null) await _launchExternalUri(uri);
        break;
      case 'fullscreen':
        setState(() => _fullScreen = true);
        break;
    }
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

  Future<String?> _regQueryValue(String key, String valueName) async {
    try {
      final result = await Process.run(
        'reg.exe',
        ['query', key, '/v', valueName],
        runInShell: false,
      );
      if (result.exitCode != 0) return null;

      final output = result.stdout.toString();
      for (final line in const LineSplitter().convert(output)) {
        final trimmed = line.trim();
        if (!trimmed.startsWith(valueName)) continue;
        final parts = trimmed.split(RegExp(r'\s+'));
        if (parts.length >= 3) {
          return parts.sublist(2).join(' ').trim();
        }
      }
    } catch (_) {}
    return null;
  }

  Future<bool> _detectDefaultBrowser() async {
    if (!Platform.isWindows) return false;

    const httpKey =
        r'HKCU\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\http\UserChoice';
    const httpsKey =
        r'HKCU\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\https\UserChoice';

    final httpProgId = await _regQueryValue(httpKey, 'ProgId');
    final httpsProgId = await _regQueryValue(httpsKey, 'ProgId');

    bool isChampakProgId(String? value) {
      final normalized = value?.trim().toLowerCase() ?? '';
      return normalized == 'learnwithchampakhtml' ||
          normalized.contains('learnwithchampak') ||
          normalized.contains('learn_with_champak');
    }

    return isChampakProgId(httpProgId) && isChampakProgId(httpsProgId);
  }

  Future<void> _refreshDefaultBrowserState() async {
    final value = await _detectDefaultBrowser();
    if (!mounted) return;
    if (_isDefaultBrowser != value) {
      setState(() => _isDefaultBrowser = value);
    }
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
    const appName = defaultBrowserAppName;
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
    // Do not pass ms-settings: URIs to explorer.exe. On some Windows
    // installations Explorer interprets them as file-system locations and
    // opens Documents instead of Settings.
    try {
      final parsed = Uri.parse(uri);
      final launched = await launchUrl(
        parsed,
        mode: LaunchMode.externalApplication,
      );
      if (launched) return true;
    } catch (_) {}

    // Windows shell fallback.
    try {
      final result = await Process.run(
        'cmd.exe',
        ['/d', '/c', 'start', '', uri],
        runInShell: false,
      );
      if (result.exitCode == 0) return true;
    } catch (_) {}

    // Final protocol-handler fallback.
    try {
      final result = await Process.run(
        'rundll32.exe',
        ['url.dll,FileProtocolHandler', uri],
        runInShell: false,
      );
      return result.exitCode == 0;
    } catch (_) {
      return false;
    }
  }

  Future<void> _openWindowsDefaultApps() async {
    final userRegistered = await _ensureCurrentUserBrowserRegistration();
    final encodedName = Uri.encodeComponent(defaultBrowserAppName);

    var opened = false;
    if (userRegistered) {
      opened = await _launchSettingsUri(
        'ms-settings:defaultapps?registeredAppUser=' + encodedName,
      );
    }

    if (!opened) {
      opened = await _launchSettingsUri(
        'ms-settings:defaultapps?registeredAppMachine=' + encodedName,
      );
    }

    if (!opened) {
      opened = await _launchSettingsUri('ms-settings:defaultapps');
    }

    if (!mounted) return;
    setState(() {
      _status = opened
          ? "Windows Default Apps opened. Press Set default for Champak's Desktop Browser."
          : "Open Windows Settings > Apps > Default apps > Champak's Desktop Browser.";
    });
  }

  void _showDefaultBrowserSetup() {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        titlePadding: EdgeInsets.zero,
        title: Container(
          padding: const EdgeInsets.fromLTRB(22, 18, 22, 16),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xff022c43), Color(0xff075985)],
            ),
            borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
          ),
          child: const Row(
            children: [
              Icon(Icons.public, color: Colors.white, size: 28),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Default Browser',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900),
                ),
              ),
            ],
          ),
        ),
        content: SizedBox(
          width: 720,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: const Color(0xfff8fafc),
                    border: Border.all(color: const Color(0xffd8e3ea)),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const CircleAvatar(
                        radius: 25,
                        backgroundImage: AssetImage('assets/champak_roy.jpg'),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _isDefaultBrowser
                                  ? "Champak's Desktop Browser is your default browser"
                                  : "Make Champak's Desktop Browser your default browser",
                              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _isDefaultBrowser
                                  ? 'HTTP and HTTPS links are currently assigned to this browser.'
                                  : 'Windows will show the final confirmation screen.',
                              style: const TextStyle(color: Colors.black54),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      if (_isDefaultBrowser)
                        const Chip(
                          avatar: Icon(Icons.verified, size: 18),
                          label: Text('Default'),
                        )
                      else
                        FilledButton.icon(
                          onPressed: () {
                            Navigator.pop(dialogContext);
                            _openWindowsDefaultApps();
                          },
                          icon: const Icon(Icons.check_circle_outline),
                          label: const Text('Set default'),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 22),
                const Text(
                  'Set default link and file types',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 8),
                const _DefaultAssociationTile(
                  label: 'HTTP',
                  description: 'Web links using http://',
                  icon: Icons.link,
                ),
                const _DefaultAssociationTile(
                  label: 'HTTPS',
                  description: 'Secure web links using https://',
                  icon: Icons.lock_outline,
                ),
                const _DefaultAssociationTile(
                  label: '.htm',
                  description: 'HTML document',
                  icon: Icons.description_outlined,
                ),
                const _DefaultAssociationTile(
                  label: '.html',
                  description: 'HTML document',
                  icon: Icons.description_outlined,
                ),
                const SizedBox(height: 10),
                const Text(
                  'Windows controls the actual default-app choice. This browser registers these types, then opens the Windows Default Apps page where you confirm the change.',
                  style: TextStyle(color: Colors.black54, height: 1.35),
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton.icon(
            onPressed: () async {
              final ok = await _ensureCurrentUserBrowserRegistration();
              await _refreshDefaultBrowserState();
              if (mounted) {
                setState(() => _status = _isDefaultBrowser
                    ? "Champak's Desktop Browser is already the Windows default"
                    : (ok
                        ? 'Default-browser registration refreshed'
                        : 'Could not refresh default-browser registration'));
              }
            },
            icon: const Icon(Icons.refresh),
            label: const Text('Refresh status'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Close'),
          ),
          if (!_isDefaultBrowser)
            FilledButton.icon(
              onPressed: () {
                Navigator.pop(dialogContext);
                _openWindowsDefaultApps();
              },
              icon: const Icon(Icons.settings),
              label: const Text('Open Windows Settings'),
            ),
        ],
      ),
    );
  }

  void _askDefaultBrowserFirstRun() {
    showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Set as default browser?'),
        content: const Text(
          "Champak's Desktop Browser will register itself for this Windows user, then open its own Default Apps page. "
          'Windows requires you to confirm the default browser choice there.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Later')),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              _showDefaultBrowserSetup();
            },
            child: const Text('Set default'),
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
    await _downloadUrl(_tab?.url ?? '');
  }

  Future<void> _downloadUrl(String url) async {
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

  Future<void> _launchExternalUri(Uri uri) async {
    try {
      final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!ok && mounted) {
        setState(() => _status = 'Could not open ' + uri.toString());
      }
    } catch (e) {
      if (mounted) setState(() => _status = 'Could not open link: ' + e.toString());
    }
  }

  void _showHowToUse() {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.school, color: Color(0xff075985)),
            SizedBox(width: 10),
            Text("How to use Champak's Desktop Browser"),
          ],
        ),
        content: const SizedBox(
          width: 680,
          child: SingleChildScrollView(
            child: Text(
              '1. Type a website address or search in the address bar and press Go.\n\n'
              '2. Use New Tab, Tabs and Close to work with several learning pages at once.\n\n'
              '3. Use Add Bookmark to save the current page. Open Bookmarks to revisit or remove saved pages.\n\n'
              '4. Use Download to save the current HTTP/HTTPS address into your Windows Downloads folder. '
              'Open File opens the most recent downloaded file, while Downloads opens the folder.\n\n'
              '5. History shows recently visited pages. Privacy hides the selected tab when this browser loses focus.\n\n'
              '6. Timed lets you schedule a learning website to open automatically.\n\n'
              '7. Default Browser registers Champak\'s Desktop Browser with Windows and opens Default Apps, where Windows asks you to confirm it.\n\n'
              '8. Use Learn With Champak, Inside Kashi, YouTube, WhatsApp Web, Google, Gmail and the other shortcuts for quick access.\n\n'
              '9. Right-click anywhere on a web page for browser actions. Right-click a link for Open Here, New Tab, Copy Link, Download Link or Open Outside. Selected text can be copied or searched directly.\n\n'
              'This browser is strictly for learning purposes.',
              style: TextStyle(fontSize: 15, height: 1.4),
            ),
          ),
        ),
        actions: [
          FilledButton.icon(
            onPressed: () => Navigator.pop(dialogContext),
            icon: const Icon(Icons.check),
            label: const Text('Got it'),
          ),
        ],
      ),
    );
  }

  Future<void> _showContactChampak() async {
    final nameController = TextEditingController();
    final emailController = TextEditingController();
    final messageController = TextEditingController();

    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Row(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundImage: AssetImage('assets/champak_roy.jpg'),
            ),
            SizedBox(width: 12),
            Expanded(child: Text('Contact Champak Roy')),
          ],
        ),
        content: SizedBox(
          width: 650,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Learn With Champak',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xff075985)),
                ),
                const SizedBox(height: 6),
                const SelectableText('Email: champaksworld@gmail.com'),
                const SelectableText('WhatsApp / Phone: +91 9335874326'),
                const SizedBox(height: 16),
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(labelText: 'Your name', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: emailController,
                  decoration: const InputDecoration(labelText: 'Your email', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: messageController,
                  minLines: 4,
                  maxLines: 8,
                  decoration: const InputDecoration(labelText: 'Message', border: OutlineInputBorder()),
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton.icon(
            onPressed: () async {
              await Clipboard.setData(const ClipboardData(text: contactPhone));
              if (mounted) setState(() => _status = 'Phone number copied: ' + contactPhone);
            },
            icon: const Icon(Icons.copy),
            label: const Text('Copy Phone'),
          ),
          TextButton.icon(
            onPressed: () {
              final text = [
                'Hello Champak Roy,',
                if (nameController.text.trim().isNotEmpty) 'My name is ' + nameController.text.trim() + '.',
                if (emailController.text.trim().isNotEmpty) 'Email: ' + emailController.text.trim(),
                if (messageController.text.trim().isNotEmpty) messageController.text.trim(),
              ].join('\n');
              final uri = Uri.https('wa.me', '/$whatsappNumber', {'text': text});
              _launchExternalUri(uri);
            },
            icon: const Icon(Icons.chat),
            label: const Text('WhatsApp'),
          ),
          FilledButton.icon(
            onPressed: () {
              final subject = nameController.text.trim().isEmpty
                  ? "Champak's Desktop Browser contact"
                  : "Champak's Desktop Browser contact from " + nameController.text.trim();
              final body = [
                if (nameController.text.trim().isNotEmpty) 'Name: ' + nameController.text.trim(),
                if (emailController.text.trim().isNotEmpty) 'Email: ' + emailController.text.trim(),
                '',
                messageController.text.trim(),
              ].join('\n');
              final uri = Uri(
                scheme: 'mailto',
                path: contactEmail,
                queryParameters: {'subject': subject, 'body': body},
              );
              _launchExternalUri(uri);
            },
            icon: const Icon(Icons.email),
            label: const Text('Send Email'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Close'),
          ),
        ],
      ),
    );

    nameController.dispose();
    emailController.dispose();
    messageController.dispose();
  }

  void _showDisclaimer() {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Disclaimer'),
        content: const SizedBox(
          width: 560,
          child: Text(
            'This browser is strictly for learning purposes.\n\n'
            'Websites, downloads and external services opened through the browser remain subject to their own terms, '
            'privacy policies and security practices.',
            style: TextStyle(fontSize: 15, height: 1.4),
          ),
        ),
        actions: [
          TextButton.icon(
            onPressed: () {
              Navigator.pop(dialogContext);
              _newTab(githubCodeUrl);
            },
            icon: const Icon(Icons.code),
            label: const Text('View Code on GitHub'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Future<void> _openDeveloperTools() async {
    final controller = _controller;
    if (controller == null) {
      if (mounted) setState(() => _status = 'Open a web page before using Developer Mode');
      return;
    }

    try {
      await controller.openDevTools();
      if (mounted) setState(() => _status = 'WebView2 DevTools opened');
    } catch (e) {
      if (mounted) setState(() => _status = 'Could not open DevTools: $e');
    }
  }

  Future<void> _viewPageSource() async {
    final controller = _controller;
    if (controller == null) {
      if (mounted) setState(() => _status = 'Open a web page before viewing source');
      return;
    }

    try {
      final raw = await controller.executeScript('document.documentElement.outerHTML');
      final source = raw?.toString() ?? '';
      final readable = source.replaceAll('><', '>\n<');
      final lines = const LineSplitter().convert(readable);
      final width = lines.length.toString().length;
      final numbered = <String>[];
      for (var i = 0; i < lines.length; i++) {
        numbered.add('${(i + 1).toString().padLeft(width)}  ${lines[i]}');
      }
      final numberedSource = numbered.join('\n');

      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: Row(
            children: [
              const Icon(Icons.code, color: Color(0xff075985)),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Page Source — ${_tab?.title ?? 'Current Page'}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          content: SizedBox(
            width: 980,
            height: 620,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: const Color(0xff0f172a),
                borderRadius: BorderRadius.circular(10),
              ),
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(14),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: SelectableText(
                    numberedSource.isEmpty ? '(No source returned)' : numberedSource,
                    style: const TextStyle(
                      color: Color(0xffe2e8f0),
                      fontFamily: 'Consolas',
                      fontSize: 12.5,
                      height: 1.35,
                    ),
                  ),
                ),
              ),
            ),
          ),
          actions: [
            TextButton.icon(
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: source));
                if (mounted) setState(() => _status = 'Page source copied');
              },
              icon: const Icon(Icons.copy),
              label: const Text('Copy Source'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    } catch (e) {
      if (mounted) setState(() => _status = 'Could not read page source: $e');
    }
  }

  Future<void> _showJavaScriptRunner() async {
    final controller = _controller;
    if (controller == null) {
      if (mounted) setState(() => _status = 'Open a web page before running JavaScript');
      return;
    }

    final scriptController = TextEditingController(text: 'document.title');
    var resultText = 'Enter JavaScript and press Run.';
    var running = false;

    await showDialog<void>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setLocalState) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.javascript, color: Color(0xff075985)),
              SizedBox(width: 10),
              Text('Run JavaScript'),
            ],
          ),
          content: SizedBox(
            width: 800,
            height: 520,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Runs in the current page. Use only code you understand.',
                  style: TextStyle(color: Colors.black54),
                ),
                const SizedBox(height: 10),
                Expanded(
                  flex: 3,
                  child: TextField(
                    controller: scriptController,
                    expands: true,
                    minLines: null,
                    maxLines: null,
                    textAlignVertical: TextAlignVertical.top,
                    style: const TextStyle(fontFamily: 'Consolas', fontSize: 13),
                    decoration: const InputDecoration(
                      labelText: 'JavaScript',
                      alignLabelWithHint: true,
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    FilledButton.icon(
                      onPressed: running
                          ? null
                          : () async {
                              final script = scriptController.text.trim();
                              if (script.isEmpty) return;
                              setLocalState(() {
                                running = true;
                                resultText = 'Running...';
                              });
                              try {
                                final value = await controller.executeScript(script);
                                String display;
                                try {
                                  display = const JsonEncoder.withIndent('  ').convert(value);
                                } catch (_) {
                                  display = value?.toString() ?? 'null';
                                }
                                if (dialogContext.mounted) {
                                  setLocalState(() {
                                    resultText = display;
                                    running = false;
                                  });
                                }
                              } catch (e) {
                                if (dialogContext.mounted) {
                                  setLocalState(() {
                                    resultText = 'Error: $e';
                                    running = false;
                                  });
                                }
                              }
                            },
                      icon: const Icon(Icons.play_arrow),
                      label: Text(running ? 'Running...' : 'Run'),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton.icon(
                      onPressed: () => scriptController.text =
                          "document.querySelectorAll('a').length",
                      icon: const Icon(Icons.auto_fix_high),
                      label: const Text('Example'),
                    ),
                    const Spacer(),
                    TextButton.icon(
                      onPressed: () async {
                        await Clipboard.setData(ClipboardData(text: resultText));
                      },
                      icon: const Icon(Icons.copy),
                      label: const Text('Copy Result'),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Expanded(
                  flex: 2,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: const Color(0xfff1f5f9),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xffcbd5e1)),
                    ),
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(12),
                      child: SelectableText(
                        resultText,
                        style: const TextStyle(fontFamily: 'Consolas', fontSize: 12.5),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Close'),
            ),
          ],
        ),
      ),
    );

    scriptController.dispose();
  }

  Future<void> _showPageInfo() async {
    final controller = _controller;
    final tab = _tab;
    if (controller == null || tab == null) {
      if (mounted) setState(() => _status = 'Open a web page before viewing page information');
      return;
    }

    if (mounted) setState(() => _status = 'Reading page information...');

    try {
      final raw = await controller.executeScript(r'''
(() => {
  function safe(fn) {
    try { return fn(); } catch (e) { return 'Unavailable'; }
  }
  return JSON.stringify({
    url: location.href,
    title: document.title,
    protocol: location.protocol.replace(':', '').toUpperCase(),
    viewport: window.innerWidth + ' × ' + window.innerHeight,
    documentSize: document.documentElement.scrollWidth + ' × ' + document.documentElement.scrollHeight,
    readyState: document.readyState,
    language: navigator.language,
    userAgent: navigator.userAgent,
    links: document.links.length,
    images: document.images.length,
    scripts: document.scripts.length,
    forms: document.forms.length,
    localStorageItems: safe(() => localStorage.length),
    sessionStorageItems: safe(() => sessionStorage.length)
  });
})()
''');

      Map<String, dynamic> info = <String, dynamic>{};
      if (raw is String && raw.isNotEmpty) {
        final decoded = jsonDecode(raw);
        if (decoded is Map) {
          info = decoded.map((key, value) => MapEntry(key.toString(), value));
        }
      }

      final currentUrl = info['url']?.toString() ?? tab.url;
      var cookieCount = 0;
      try {
        cookieCount = (await controller.getCookies(currentUrl)).length;
      } catch (_) {}

      final entries = <MapEntry<String, String>>[
        MapEntry('Title', info['title']?.toString() ?? tab.title),
        MapEntry('URL', currentUrl),
        MapEntry('Protocol', info['protocol']?.toString() ?? ''),
        MapEntry('Viewport', info['viewport']?.toString() ?? ''),
        MapEntry('Document size', info['documentSize']?.toString() ?? ''),
        MapEntry('Ready state', info['readyState']?.toString() ?? ''),
        MapEntry('Language', info['language']?.toString() ?? ''),
        MapEntry('Links', info['links']?.toString() ?? '0'),
        MapEntry('Images', info['images']?.toString() ?? '0'),
        MapEntry('Scripts', info['scripts']?.toString() ?? '0'),
        MapEntry('Forms', info['forms']?.toString() ?? '0'),
        MapEntry('Cookies', cookieCount.toString()),
        MapEntry('Local storage items', info['localStorageItems']?.toString() ?? ''),
        MapEntry('Session storage items', info['sessionStorageItems']?.toString() ?? ''),
        MapEntry('User agent', info['userAgent']?.toString() ?? desktopUserAgent),
      ];

      final copyText = entries.map((e) => '${e.key}: ${e.value}').join('\n');

      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.info_outline, color: Color(0xff075985)),
              SizedBox(width: 10),
              Text('Page Information'),
            ],
          ),
          content: SizedBox(
            width: 780,
            height: 560,
            child: ListView.separated(
              itemCount: entries.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final entry = entries[index];
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 9),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        width: 150,
                        child: Text(
                          entry.key,
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: SelectableText(entry.value)),
                    ],
                  ),
                );
              },
            ),
          ),
          actions: [
            TextButton.icon(
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: currentUrl));
                if (mounted) setState(() => _status = 'Page URL copied');
              },
              icon: const Icon(Icons.link),
              label: const Text('Copy URL'),
            ),
            TextButton.icon(
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: copyText));
                if (mounted) setState(() => _status = 'Page information copied');
              },
              icon: const Icon(Icons.copy_all),
              label: const Text('Copy Info'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    } catch (e) {
      if (mounted) setState(() => _status = 'Could not read page information: $e');
    }
  }

  void _showDeveloperMenu() {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 6, 18, 18),
          child: Wrap(
            runSpacing: 4,
            children: [
              ListTile(
                leading: const CircleAvatar(
                  backgroundColor: Color(0xff075985),
                  child: Icon(Icons.code, color: Colors.white),
                ),
                title: const Text(
                  'Developer Mode v1',
                  style: TextStyle(fontWeight: FontWeight.w900),
                ),
                subtitle: Text(
                  _tab == null
                      ? 'Open a page to use developer tools'
                      : (_tab!.title.trim().isEmpty ? _tab!.url : _tab!.title),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              ListTile(
                leading: const Icon(Icons.developer_mode),
                title: const Text('Open DevTools'),
                subtitle: const Text('Elements, Console, Network, Sources, Storage and more'),
                onTap: () {
                  Navigator.pop(sheetContext);
                  _openDeveloperTools();
                },
              ),
              ListTile(
                leading: const Icon(Icons.code),
                title: const Text('View Page Source'),
                subtitle: const Text('HTML source with line numbers and copy support'),
                onTap: () {
                  Navigator.pop(sheetContext);
                  _viewPageSource();
                },
              ),
              ListTile(
                leading: const Icon(Icons.javascript),
                title: const Text('Run JavaScript'),
                subtitle: const Text('Execute JavaScript in the current page and inspect the result'),
                onTap: () {
                  Navigator.pop(sheetContext);
                  _showJavaScriptRunner();
                },
              ),
              ListTile(
                leading: const Icon(Icons.info_outline),
                title: const Text('Page Info'),
                subtitle: const Text('URL, viewport, document size, cookies, storage and page counts'),
                onTap: () {
                  Navigator.pop(sheetContext);
                  _showPageInfo();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showBrandMenu() {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 6, 18, 18),
          child: Wrap(
            runSpacing: 8,
            children: [
              const ListTile(
                leading: CircleAvatar(
                  radius: 24,
                  backgroundImage: AssetImage('assets/champak_roy.jpg'),
                ),
                title: Text("Champak's Desktop Browser", style: TextStyle(fontWeight: FontWeight.w900)),
                subtitle: Text('Learn With Champak • Designed by Champak Roy'),
              ),
              ListTile(
                leading: const Icon(Icons.menu_book),
                title: const Text('How to Use'),
                onTap: () {
                  Navigator.pop(sheetContext);
                  _showHowToUse();
                },
              ),
              ListTile(
                leading: const Icon(Icons.contact_mail),
                title: const Text('Contact Champak Roy'),
                subtitle: const Text('champaksworld@gmail.com • +91 9335874326'),
                onTap: () {
                  Navigator.pop(sheetContext);
                  _showContactChampak();
                },
              ),
              ListTile(
                leading: Icon(_isDefaultBrowser ? Icons.verified : Icons.check_circle_outline),
                title: Text(_isDefaultBrowser ? 'Default Browser ✓' : 'Default Browser'),
                subtitle: Text(
                  _isDefaultBrowser
                      ? 'Already the Windows default for HTTP and HTTPS'
                      : 'Register and open Windows Default Apps',
                ),
                onTap: () {
                  Navigator.pop(sheetContext);
                  _showDefaultBrowserSetup();
                },
              ),
              ListTile(
                leading: const Icon(Icons.developer_mode),
                title: const Text('Developer Mode'),
                subtitle: const Text('DevTools, source, JavaScript and page information'),
                onTap: () {
                  Navigator.pop(sheetContext);
                  _showDeveloperMenu();
                },
              ),
              ListTile(
                leading: const Icon(Icons.code),
                title: const Text('Code on GitHub'),
                subtitle: const Text('Programmer-s-Picnic / json-images / windows_app'),
                onTap: () {
                  Navigator.pop(sheetContext);
                  _newTab(githubCodeUrl);
                },
              ),
              ListTile(
                leading: const Icon(Icons.info_outline),
                title: const Text('Disclaimer'),
                subtitle: const Text('This browser is strictly for learning purposes.'),
                onTap: () {
                  Navigator.pop(sheetContext);
                  _showDisclaimer();
                },
              ),
            ],
          ),
        ),
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

    Widget actionScroller(List<Widget> children) => SizedBox(
          height: 46,
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: children),
          ),
        );

    return Container(
      padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
      decoration: const BoxDecoration(
        gradient: LinearGradient(colors: [Color(0xff022c43), Color(0xff075985), Color(0xff0b6f9f)]),
        boxShadow: [BoxShadow(blurRadius: 7, color: Colors.black26, offset: Offset(0, 2))],
      ),
      child: Column(
        children: [
          Row(
            children: [
              InkWell(
                borderRadius: BorderRadius.circular(28),
                onTap: _showContactChampak,
                child: const CircleAvatar(
                  radius: 25,
                  backgroundColor: Colors.white,
                  backgroundImage: AssetImage('assets/champak_roy.jpg'),
                ),
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Champak's Desktop Browser v3.5.0",
                      style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900),
                    ),
                    const Text(
                      'Learn With Champak • Designed by Champak Roy • Strictly for learning purposes',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: Color(0xffffdd80), fontSize: 12.5, fontWeight: FontWeight.w700),
                    ),
                    Text(
                      _privacyHidden ? 'Private Tab' : (_tab?.title ?? 'Browser'),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              _localClockWeatherPanel(),
              const SizedBox(width: 8),
              _toolbarButton('How to Use', Icons.menu_book, _showHowToUse, important: true),
              _toolbarButton('Contact', Icons.contact_mail, _showContactChampak, important: true),
              _toolbarButton('Menu', Icons.menu, _showBrandMenu),
            ],
          ),
          const SizedBox(height: 7),
          _tabStrip(),
          const SizedBox(height: 7),
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
                    hintText: 'Type a website, search, or paste a link',
                    prefixIcon: const Icon(Icons.language),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              _toolbarButton('Go', Icons.play_arrow, () => _load(_addressController.text), important: true),
              _toolbarButton('Full', Icons.fullscreen, () => setState(() => _fullScreen = true)),
            ],
          ),
          const SizedBox(height: 6),
          actionScroller([
            _toolbarButton('Home', Icons.home, () => _load(homeUrl)),
            _toolbarButton('Learn With Champak', Icons.school, () => _newTab(homeUrl), important: true),
            _toolbarButton('Inside Kashi', Icons.temple_hindu, () => _newTab(insideKashiUrl)),
            _toolbarButton('YouTube', Icons.smart_display, () => _newTab(youtubeUrl)),
            _toolbarButton('WhatsApp Web', Icons.chat, () => _newTab(whatsappUrl)),
            _toolbarButton('Google', Icons.search, () => _newTab(googleSearchUrl)),
            _toolbarButton('G Account', Icons.account_circle, _openGoogleAccountInside),
            _toolbarButton('Gmail', Icons.mail, _openGmailInside),
            _toolbarButton('Add Bookmark', Icons.bookmark_add, _bookmarkCurrentPage, important: true),
            _toolbarButton('Bookmarks', Icons.bookmarks, _showBookmarks, important: true),
            _toolbarButton('History', Icons.history, _showHistory),
            _toolbarButton('Developer', Icons.developer_mode, _showDeveloperMenu, important: true),
            _toolbarButton('Download', Icons.download, _downloadCurrentUrl, important: true),
            _toolbarButton('Open File', Icons.file_open, _openLastDownloadedFile, important: true),
            _toolbarButton('Downloads', Icons.folder_open, _openDownloadsFolder),
            _toolbarButton(_tab?.privacyBlur == true ? 'Privacy On' : 'Privacy', Icons.visibility_off, _togglePrivacyBlur),
            if (_isDefaultBrowser)
              _toolbarButton('Default ✓', Icons.verified, _showDefaultBrowserSetup)
            else
              _toolbarButton('Set Default', Icons.check_circle, _showDefaultBrowserSetup, important: true),
            _toolbarButton('GitHub Code', Icons.code, () => _newTab(githubCodeUrl)),
            _toolbarButton('Disclaimer', Icons.info_outline, _showDisclaimer),
            _toolbarButton('Win Update', Icons.system_update_alt, () => _newTab(windowsInstallerUrl)),
            _toolbarButton('APK', Icons.android, () => _newTab(apkUrl)),
          ]),
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(Icons.school_outlined, color: Color(0xffffdd80), size: 15),
              const SizedBox(width: 5),
              const Text(
                'Learn With Champak',
                style: TextStyle(color: Color(0xffffdd80), fontWeight: FontWeight.w900, fontSize: 12),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  _status,
                  style: const TextStyle(color: Colors.white70, fontSize: 11.5),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (_checking)
                const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
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
                          Container(
                            key: _webViewAreaKey,
                            child: Webview(
                              tab.controller,
                              permissionRequested: (_, __, ___) => WebviewPermissionDecision.allow,
                            ),
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
