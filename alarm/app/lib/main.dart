import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

const native = MethodChannel('champaks_alarm/native');

void main() => runApp(const ChampaksAlarmApp());

class AlarmItem {
  AlarmItem(this.id, this.hour, this.minute, this.label, this.days, this.enabled, this.nextAt, this.tuneUri, this.tuneName, this.message, this.volume, this.vibrate, this.snoozeMinutes, this.speechRate, this.language);
  final int id, hour, minute, nextAt;
  final String label;
  final String tuneUri, tuneName, message;
  final List<int> days;
  final bool enabled, vibrate;
  final int volume, snoozeMinutes;
  final double speechRate;
  final String language;
  factory AlarmItem.fromJson(String source) {
    final value = jsonDecode(source) as Map<String, dynamic>;
    return AlarmItem(value['id'] as int, value['hour'] as int, value['minute'] as int,
        value['label'] as String, (value['days'] as List).cast<int>(),
        value['enabled'] as bool, value['nextAt'] as int,
        value['tuneUri'] as String? ?? '', value['tuneName'] as String? ?? 'Default alarm',
        value['message'] as String? ?? '', value['volume'] as int? ?? -1,
        value['vibrate'] as bool? ?? true, value['snoozeMinutes'] as int? ?? 5,
        (value['speechRate'] as num? ?? 1).toDouble(), value['language'] as String? ?? '');
  }
}

class ChampaksAlarmApp extends StatelessWidget {
  const ChampaksAlarmApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        title: "Champak's Alarm",
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff2176b9)),
          useMaterial3: true,
          scaffoldBackgroundColor: const Color(0xfff7f9fc),
        ),
        darkTheme: ThemeData(colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xff2176b9), brightness: Brightness.dark), useMaterial3: true),
        themeMode: ThemeMode.system,
        home: const AlarmHome(),
      );
}

class AlarmHome extends StatefulWidget {
  const AlarmHome({super.key});
  @override
  State<AlarmHome> createState() => _AlarmHomeState();
}

class _AlarmHomeState extends State<AlarmHome> with WidgetsBindingObserver {
  List<AlarmItem> alarms = [];
  Map<String, bool> permissions = {};
  bool backgroundNeeded = false, backgroundConfirmed = false, backgroundDialogOpen = false;
  int alarmVolume = -1;
  int alarmVolumeMax = 15;
  int active = 0;
  Timer? timer;
  bool loading = true;
  bool polling = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refresh();
    timer = Timer.periodic(const Duration(seconds: 2), (_) => _checkActive());
  }

  @override
  void dispose() {
    timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refresh();
  }

  Future<void> _checkActive() async {
    if (polling) return;
    polling = true;
    try {
      final current = await native.invokeMethod<int>('active') ?? 0;
      if (mounted && active != current) { await _refresh(); } else if (mounted) { setState(() {}); }
    } catch (_) {
      // Android channel may briefly be unavailable while the activity starts.
    } finally {
      polling = false;
    }
  }

  Future<void> _refresh() async {
    try {
      final entries = await native.invokeListMethod<String>('list') ?? <String>[];
      final status = await native.invokeMapMethod<String, bool>('permissions') ?? <String, bool>{};
      final background = await native.invokeMapMethod<String, bool>('backgroundSetup') ?? <String, bool>{};
      final ringing = await native.invokeMethod<int>('active') ?? 0;
      final volume = await native.invokeMapMethod<String, int>('alarmVolume') ?? <String, int>{};
      if (!mounted) return;
      setState(() {
        alarms = entries.map(AlarmItem.fromJson).toList();
        permissions = status;
        backgroundNeeded = background['needed'] ?? false;
        backgroundConfirmed = background['confirmed'] ?? false;
        active = ringing;
        alarmVolume = volume['current'] ?? -1;
        alarmVolumeMax = volume['max'] ?? 15;
        loading = false;
      });
      if (background['prompt'] == true && !backgroundDialogOpen) await _backgroundSetup();
    } catch (error) {
      if (mounted) _showError(error);
    }
  }

  Future<void> _backgroundSetup() async {
    if (backgroundDialogOpen || !mounted) return;
    backgroundDialogOpen = true;
    await native.invokeMethod<void>('backgroundPromptShown');
    if (!mounted) { backgroundDialogOpen = false; return; }
    await showDialog<void>(context: context, builder: (dialogContext) => AlertDialog(
      title: const Text('Allow background autostart'),
      content: const Text('On Xiaomi, Redmi and POCO phones, enable Background autostart for Champak’s Alarm so saved alarms can ring while the app is closed. Keep app battery settings on No restrictions.\n\nTap Open settings, enable this app, then return. If app details opens instead, search phone Settings for Background autostart. The app cannot read or change this switch.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Later')),
        FilledButton(onPressed: () async {
          Navigator.pop(dialogContext);
          await _mutate(() => native.invokeMethod<void>('openAutostart'));
        }, child: const Text('Open settings')),
      ],
    ));
    backgroundDialogOpen = false;
  }

  void _showError(Object error) => ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error is PlatformException ? error.message ?? 'Alarm error' : '$error')),
      );

  Future<void> _mutate(Future<void> Function() action) async {
    try {
      await action();
      await _refresh();
    } catch (error) {
      if (mounted) _showError(error);
      await _refresh();
    }
  }

  Future<void> _edit([AlarmItem? item]) async {
    var time = TimeOfDay(hour: item?.hour ?? TimeOfDay.now().hour, minute: item?.minute ?? TimeOfDay.now().minute);
    final label = TextEditingController(text: item?.label ?? '');
    final message = TextEditingController(text: item?.message ?? '');
    var tuneUri = item?.tuneUri ?? '';
    var tuneName = item?.tuneName ?? 'Default alarm';
    var previewing = false;
    var previewVolume = item?.volume ?? -1;
    var vibrate = item?.vibrate ?? true;
    var snoozeMinutes = item?.snoozeMinutes ?? 5;
    var speechRate = item?.speechRate ?? 1.0;
    var language = item?.language ?? '';
    final selected = item?.days.toSet() ?? <int>{};
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (sheetContext) => StatefulBuilder(builder: (context, update) {
        final keyboardHeight = MediaQuery.viewInsetsOf(context).bottom;
        return Padding(
          padding: EdgeInsets.only(bottom: keyboardHeight),
          child: SafeArea(
            top: false,
            child: FractionallySizedBox(
              heightFactor: keyboardHeight > 0 ? 0.8 : 0.64,
              child: Column(children: [
                const SizedBox(height: 10),
                Container(width: 36, height: 4, decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(4),
                )),
                Expanded(child: ListView(padding: const EdgeInsets.fromLTRB(24, 22, 24, 12), children: [
                  Text(item == null ? 'Add alarm' : 'Edit alarm', style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(height: 20),
                  Text('TIME', style: Theme.of(context).textTheme.labelMedium),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: () async {
                      final picked = await showTimePicker(context: context, initialTime: time);
                      if (picked != null) update(() => time = picked);
                    },
                    icon: const Icon(Icons.schedule), label: Text(time.format(context)),
                    style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(56), alignment: Alignment.centerLeft),
                  ),
                  const SizedBox(height: 12),
                  TextField(controller: label, maxLength: 80,
                    textInputAction: TextInputAction.done,
                    decoration: const InputDecoration(labelText: 'Label', hintText: 'Wake up', border: OutlineInputBorder())),
                  const SizedBox(height: 4),
                  Text('SOUND & VOICE', style: Theme.of(context).textTheme.labelMedium),
                  const SizedBox(height: 8),
                  ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: Theme.of(context).colorScheme.outlineVariant)),
                    leading: const Icon(Icons.music_note_outlined), title: const Text('Alarm tune'),
                    subtitle: Text(tuneName), trailing: const Icon(Icons.chevron_right),
                    onTap: () async {
                      try {
                        final raw = await native.invokeListMethod<Map<dynamic, dynamic>>('tunes') ?? [];
                        if (!context.mounted) return;
                        final picked = await showModalBottomSheet<Map<dynamic, dynamic>>(
                          context: context, showDragHandle: true, useSafeArea: true,
                          builder: (pickerContext) => SafeArea(child: ListView(shrinkWrap: true, children: [
                            const ListTile(title: Text('Choose alarm tune')),
                            ListTile(leading: const Icon(Icons.audio_file_outlined), title: const Text('Choose audio file from phone'),
                              onTap: () async {
                                try {
                                  final audio = await native.invokeMapMethod<String, dynamic>('pickAudio');
                                  if (pickerContext.mounted && audio != null) Navigator.pop(pickerContext, audio);
                                } catch (error) { if (pickerContext.mounted) _showError(error); }
                              }),
                            for (final tune in raw) ListTile(
                              title: Text('${tune['name']}'),
                              leading: Icon(tuneUri == tune['uri'] ? Icons.radio_button_checked : Icons.radio_button_unchecked),
                              onTap: () => Navigator.pop(pickerContext, tune),
                            ),
                          ])),
                        );
                        if (picked != null) update(() {
                          tuneUri = '${picked['uri']}';
                          tuneName = '${picked['name']}';
                        });
                      } catch (error) { if (context.mounted) _showError(error); }
                    },
                  ),
                  const SizedBox(height: 16),
                  TextField(controller: message, maxLength: 160, maxLines: 2,
                    decoration: const InputDecoration(labelText: 'Speak a message (optional)',
                      hintText: 'Good morning! Time to get up.', border: OutlineInputBorder(),
                      helperText: 'Spoken after each play of the alarm tune')),
                  Row(children: [
                    Expanded(child: OutlinedButton.icon(
                      onPressed: () async {
                        try {
                          if (previewing) {
                            await native.invokeMethod<void>('stopTestAlarm');
                            update(() => previewing = false);
                          } else {
                            await native.invokeMethod<void>('testAlarm', {
                              'label': label.text.trim(), 'tuneUri': tuneUri,
                              'message': message.text.trim(), 'volume': previewVolume,
                              'vibrate': vibrate, 'speechRate': speechRate, 'language': language,
                            });
                            update(() => previewing = true);
                          }
                        } catch (error) {
                          if (context.mounted) _showError(error);
                        }
                      },
                      icon: Icon(previewing ? Icons.stop : Icons.play_arrow),
                      label: Text(previewing ? 'Stop test alarm' : 'Test alarm'),
                    )),
                  ]),
                  const SizedBox(height: 8),
                  SwitchListTile(contentPadding: EdgeInsets.zero,
                    title: const Text('Use phone alarm volume'), value: previewVolume == -1,
                    onChanged: (on) => update(() => previewVolume = on ? -1 : 80)),
                  if (previewVolume >= 0) ...[
                    Text('Volume for this alarm: $previewVolume%'),
                    Slider(value: previewVolume.toDouble(), min: 0, max: 100, divisions: 20,
                      label: '$previewVolume%', onChanged: (v) => update(() => previewVolume = v.round())),
                  ],
                  SwitchListTile(contentPadding: EdgeInsets.zero, title: const Text('Vibration'),
                    value: vibrate, onChanged: (on) => update(() => vibrate = on)),
                  DropdownButtonFormField<int>(initialValue: snoozeMinutes,
                    decoration: const InputDecoration(labelText: 'Snooze duration', border: OutlineInputBorder()),
                    items: [1, 3, 5, 10, 15, 20, 30].map((n) => DropdownMenuItem(value: n, child: Text('$n minutes'))).toList(),
                    onChanged: (n) { if (n != null) update(() => snoozeMinutes = n); }),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(initialValue: language,
                    decoration: const InputDecoration(labelText: 'Spoken language', border: OutlineInputBorder()),
                    items: const [DropdownMenuItem(value: '', child: Text('Phone language')),
                      DropdownMenuItem(value: 'en-IN', child: Text('English (India)')),
                      DropdownMenuItem(value: 'hi-IN', child: Text('Hindi'))],
                    onChanged: (v) { if (v != null) update(() => language = v); }),
                  Text('Speech speed: ${speechRate.toStringAsFixed(1)}'),
                  Slider(value: speechRate, min: 0.5, max: 1.5, divisions: 10,
                    onChanged: (v) => update(() => speechRate = v)),
                  const Text('Voice availability depends on your phone. Test the alarm before saving.'),
                  const SizedBox(height: 16),
                  Text('REPEAT', style: Theme.of(context).textTheme.labelMedium),
                  const SizedBox(height: 4),
                  Text('Leave all days off for a one-time alarm', style: Theme.of(context).textTheme.bodySmall),
                  const SizedBox(height: 12),
                  Wrap(spacing: 8, runSpacing: 4, children: [
                    for (var day = 1; day <= 7; day++) FilterChip(
                      label: Text(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day - 1]),
                      selected: selected.contains(day),
                      onSelected: (checked) => update(() { if (checked) { selected.add(day); } else { selected.remove(day); } }),
                    ),
                  ]),
                ])),
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 12, 24, 16),
                  child: SizedBox(width: double.infinity, height: 52,
                    child: FilledButton.icon(
                      onPressed: () => Navigator.pop(sheetContext, true),
                      icon: const Icon(Icons.check), label: const Text('Save alarm'))),
                ),
              ]),
            ),
          ),
        );
      }),
    );
    if (previewing) {
      try { await native.invokeMethod<void>('stopTestAlarm'); } catch (_) {}
    }
    if (saved == true) {
      final data = jsonEncode({'id': item?.id ?? 0, 'hour': time.hour, 'minute': time.minute,
        'label': label.text.trim(), 'days': selected.toList()..sort(), 'enabled': item?.enabled ?? true,
        'tuneUri': tuneUri, 'tuneName': tuneName, 'message': message.text.trim(),
        'volume': previewVolume, 'vibrate': vibrate, 'snoozeMinutes': snoozeMinutes,
        'speechRate': speechRate, 'language': language});
      await _mutate(() async { await native.invokeMethod<String>('save', {'json': data}); });
    }
    label.dispose();
    message.dispose();
  }

  Future<void> _delete(AlarmItem item) async {
    final confirmed = await showDialog<bool>(context: context, builder: (context) => AlertDialog(
      title: const Text('Delete alarm?'), content: Text(item.label.isEmpty ? 'This alarm will be removed.' : 'Remove ${item.label}?'),
      actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete'))],
    ));
    if (confirmed == true) await _mutate(() => native.invokeMethod<void>('delete', {'id': item.id}));
  }

  Future<void> _test(AlarmItem item) async {
    try {
      await native.invokeMethod<void>('test', {'id': item.id});
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Test alarm will ring in 10 seconds. Lock your phone to check it.')));
    } catch (error) {
      if (mounted) _showError(error);
    }
  }

  String _remaining(int timestamp) {
    final minutes = ((timestamp - DateTime.now().millisecondsSinceEpoch) / 60000).ceil().clamp(0, 999999);
    if (minutes < 1) return 'Ringing shortly';
    final days = minutes ~/ 1440;
    final hours = (minutes % 1440) ~/ 60;
    return 'In ${days > 0 ? "$days days " : ""}${hours > 0 ? "$hours hours " : ""}${minutes % 60} minutes';
  }

  String _time(BuildContext context, AlarmItem item) => TimeOfDay(hour: item.hour, minute: item.minute).format(context);

  @override
  Widget build(BuildContext context) {
    if (active > 0) {
      final item = alarms.where((alarm) => alarm.id == active).firstOrNull;
      return Scaffold(
        body: SafeArea(child: Padding(padding: const EdgeInsets.all(24), child: Column(
          mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.alarm_on, size: 80), const SizedBox(height: 24),
            Text('Alarm', textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineMedium),
            Text(item?.label.isNotEmpty == true ? item!.label : 'Time to wake up', textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 48),
            FilledButton.icon(onPressed: () => _mutate(() => native.invokeMethod<void>('stop')),
              icon: const Icon(Icons.stop), label: const Padding(padding: EdgeInsets.all(12), child: Text('Stop alarm'))),
            const SizedBox(height: 12),
            OutlinedButton.icon(onPressed: () => _mutate(() => native.invokeMethod<void>('snooze', {'id': active})),
              icon: const Icon(Icons.snooze), label: Padding(padding: const EdgeInsets.all(12), child: Text('Snooze ${item?.snoozeMinutes ?? 5} minutes'))),
          ],
        ))),
      );
    }

    final next = alarms.where((a) => a.nextAt > DateTime.now().millisecondsSinceEpoch).toList()
      ..sort((a, b) => a.nextAt.compareTo(b.nextAt));
    final ordered = [...alarms]..sort((a, b) => (a.hour * 60 + a.minute).compareTo(b.hour * 60 + b.minute));
    return Scaffold(
      appBar: AppBar(actions: [IconButton(tooltip: 'Diagnostics', icon: const Icon(Icons.bug_report_outlined), onPressed: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => const DiagnosticsPage())))], title: const Text("Champak's Alarm"), backgroundColor: Theme.of(context).scaffoldBackgroundColor),
      body: loading ? const Center(child: CircularProgressIndicator()) : ListView(padding: const EdgeInsets.only(top: 8), children: [
        Card(margin: const EdgeInsets.fromLTRB(16, 0, 16, 16), color: Theme.of(context).colorScheme.primaryContainer,
          child: Padding(padding: const EdgeInsets.all(22), child: Column(
          crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [const Icon(Icons.nights_stay_outlined, size: 20), const SizedBox(width: 8),
              Text('NEXT ALARM', style: Theme.of(context).textTheme.labelLarge)]),
            const SizedBox(height: 14),
            Text(next.isEmpty ? 'No alarm scheduled' : _time(context, next.first),
              style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 4),
            Text(next.isEmpty ? 'Add an alarm to get started' :
              '${next.first.label.isEmpty ? 'Alarm' : next.first.label} · ${MaterialLocalizations.of(context).formatMediumDate(DateTime.fromMillisecondsSinceEpoch(next.first.nextAt))}',
              style: Theme.of(context).textTheme.bodyMedium),
            if (next.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(_remaining(next.first.nextAt), style: Theme.of(context).textTheme.titleMedium),
            ],
          ],
        ))),
        if (permissions.values.any((allowed) => !allowed)) Card(
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Padding(padding: const EdgeInsets.all(18), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Allow alarm access', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 4),
            const Text('Allow these Android settings so alarms ring at the selected time and show on the lock screen.'),
            for (final kind in ['exact', 'notifications', 'fullScreen'])
              if (permissions[kind] == false) TextButton.icon(
                onPressed: () => _mutate(() => native.invokeMethod<void>('requestPermission', {'kind': kind})),
                icon: const Icon(Icons.settings),
                label: Text({'exact': 'Exact alarms', 'notifications': 'Notifications', 'fullScreen': 'Full-screen alerts'}[kind]!),
              ),
          ])),
        ),
        if (backgroundNeeded) Card(
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Padding(padding: const EdgeInsets.all(18), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Background autostart', style: Theme.of(context).textTheme.titleMedium),
            Text(backgroundConfirmed ? 'You confirmed this setting. Run a background test after phone updates or reinstalling.' : 'Enable this app in Xiaomi Background autostart. The app cannot check this switch automatically.'),
            TextButton.icon(onPressed: _backgroundSetup, icon: const Icon(Icons.settings), label: const Text('Open autostart setup')),
            if (!backgroundConfirmed) TextButton(onPressed: () => _mutate(() => native.invokeMethod<void>('confirmBackgroundSetup')), child: const Text('I have enabled it')),
          ])),
        ),
        if (alarmVolume == 0) Card(
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Padding(padding: const EdgeInsets.all(18), child: Row(children: [
            const Icon(Icons.volume_off_outlined), const SizedBox(width: 12),
            const Expanded(child: Text('Alarm volume is muted. Turn it up in Android sound settings.')),
          ])),
        ),
        if (ordered.isEmpty) Padding(padding: const EdgeInsets.symmetric(horizontal: 36, vertical: 60), child: Column(children: [
          Icon(Icons.alarm_add_outlined, size: 56, color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: 14),
          Text('No alarms yet', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 4),
          const Text('Tap Add alarm to set your first one.', textAlign: TextAlign.center),
        ])),
        for (final item in ordered) Card(margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4), child: ListTile(
          onTap: () => _edit(item),
          title: Text(_time(context, item), style: Theme.of(context).textTheme.headlineMedium),
          subtitle: Text('${item.label.isEmpty ? 'Alarm' : item.label} · ${item.days.isEmpty ? 'Once' : item.days.map((d) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d - 1]).join(', ')}'),
          trailing: Row(mainAxisSize: MainAxisSize.min, children: [
            Switch(value: item.enabled, onChanged: (on) => _mutate(() => native.invokeMethod<void>('toggle', {'id': item.id, 'enabled': on}))),
            PopupMenuButton<String>(tooltip: 'Alarm options',
              onSelected: (value) => value == 'test' ? _test(item) : _delete(item),
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'test', child: Text('Test in 10 seconds')),
                PopupMenuItem(value: 'delete', child: Text('Delete alarm')),
              ]),
          ]),
        )),
        const SizedBox(height: 90),
      ]),
      floatingActionButton: FloatingActionButton.extended(onPressed: () => _edit(), icon: const Icon(Icons.add_alarm), label: const Text('Add alarm')),
    );
  }
}

class DiagnosticsPage extends StatefulWidget {
  const DiagnosticsPage({super.key});
  @override
  State<DiagnosticsPage> createState() => _DiagnosticsPageState();
}

class _DiagnosticsPageState extends State<DiagnosticsPage> {
  String report = 'Loading diagnostics…';
  bool busy = false;
  @override
  void initState() { super.initState(); load(); }
  Future<void> load() async {
    try {
      final value = await native.invokeMethod<String>('diagnostics') ?? 'No report';
      if (mounted) setState(() => report = value);
    } catch (error) { if (mounted) setState(() => report = '$error'); }
  }
  Future<void> test() async {
    setState(() => busy = true);
    try {
      final due = await native.invokeMethod<int>('diagnosticTest');
      await load();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        duration: const Duration(seconds: 10),
        content: Text('Test saved for ${DateTime.fromMillisecondsSinceEpoch(due!)}. Press Home and lock the phone. Reopen Diagnostics afterwards.')));
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    } finally { if (mounted) setState(() => busy = false); }
  }
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Alarm diagnostics'), actions: [
      IconButton(tooltip: 'Refresh', onPressed: load, icon: const Icon(Icons.refresh)),
    ]),
    body: ListView(padding: const EdgeInsets.all(16), children: [
      const Text('Run a background test, press Home and lock the phone. After the due time, reopen this screen and copy the report. Logs stay on your phone; nothing is uploaded.'),
      const SizedBox(height: 12),
      FilledButton.icon(onPressed: busy ? null : test, icon: const Icon(Icons.alarm), label: const Text('Schedule background test (about 2 minutes)')),
      Wrap(spacing: 8, children: [
        TextButton.icon(onPressed: () async {
          await Clipboard.setData(ClipboardData(text: report));
          if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Report copied')));
        }, icon: const Icon(Icons.copy), label: const Text('Copy report')),
        TextButton(onPressed: () async { await native.invokeMethod<void>('clearDiagnostics'); await load(); }, child: const Text('Clear log')),
      ]),
      const Divider(),
      SelectableText(report, style: const TextStyle(fontFamily: 'monospace', fontSize: 13)),
    ]),
  );
}
