import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

const native = MethodChannel('champaks_alarm/native');

void main() => runApp(const ChampaksAlarmApp());

class AlarmItem {
  AlarmItem(this.id, this.hour, this.minute, this.label, this.days, this.enabled, this.nextAt);
  final int id, hour, minute, nextAt;
  final String label;
  final List<int> days;
  final bool enabled;
  factory AlarmItem.fromJson(String source) {
    final value = jsonDecode(source) as Map<String, dynamic>;
    return AlarmItem(value['id'] as int, value['hour'] as int, value['minute'] as int,
        value['label'] as String, (value['days'] as List).cast<int>(),
        value['enabled'] as bool, value['nextAt'] as int);
  }
}

class ChampaksAlarmApp extends StatelessWidget {
  const ChampaksAlarmApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        title: "Champak's Alarm",
        debugShowCheckedModeBanner: false,
        theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff2176b9)), useMaterial3: true),
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
      if (mounted && active != current) await _refresh();
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
      final ringing = await native.invokeMethod<int>('active') ?? 0;
      if (!mounted) return;
      setState(() {
        alarms = entries.map(AlarmItem.fromJson).toList();
        permissions = status;
        active = ringing;
        loading = false;
      });
    } catch (error) {
      if (mounted) _showError(error);
    }
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
    final selected = item?.days.toSet() ?? <int>{};
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => StatefulBuilder(builder: (context, update) => Padding(
            padding: EdgeInsets.fromLTRB(20, 8, 20, MediaQuery.viewInsetsOf(context).bottom + 24),
            child: SingleChildScrollView(
              child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(item == null ? 'Add alarm' : 'Edit alarm', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 14),
                OutlinedButton.icon(
                  onPressed: () async {
                    final picked = await showTimePicker(context: context, initialTime: time);
                    if (picked != null) update(() => time = picked);
                  },
                  icon: const Icon(Icons.schedule), label: Text(time.format(context)),
                ),
                TextField(controller: label, maxLength: 80, decoration: const InputDecoration(labelText: 'Label', hintText: 'Wake up')),
                const SizedBox(height: 8),
                const Text('Repeat on these days (none means once)'),
                Wrap(spacing: 5, children: [
                  for (var day = 1; day <= 7; day++) FilterChip(
                    label: Text(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day - 1]),
                    selected: selected.contains(day),
                    onSelected: (checked) => update(() { if (checked) { selected.add(day); } else { selected.remove(day); } }),
                  ),
                ]),
                const SizedBox(height: 12),
                FilledButton.icon(onPressed: () => Navigator.pop(sheetContext, true), icon: const Icon(Icons.check), label: const Text('Save alarm')),
              ]),
            ),
          )),
    );
    if (saved == true) {
      final data = jsonEncode({'id': item?.id ?? 0, 'hour': time.hour, 'minute': time.minute,
        'label': label.text.trim(), 'days': selected.toList()..sort(), 'enabled': item?.enabled ?? true});
      await _mutate(() async { await native.invokeMethod<String>('save', {'json': data}); });
    }
    label.dispose();
  }

  Future<void> _delete(AlarmItem item) async {
    final confirmed = await showDialog<bool>(context: context, builder: (context) => AlertDialog(
      title: const Text('Delete alarm?'), content: Text(item.label.isEmpty ? 'This alarm will be removed.' : 'Remove ${item.label}?'),
      actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete'))],
    ));
    if (confirmed == true) await _mutate(() => native.invokeMethod<void>('delete', {'id': item.id}));
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
              icon: const Icon(Icons.snooze), label: const Padding(padding: EdgeInsets.all(12), child: Text('Snooze 5 minutes'))),
          ],
        ))),
      );
    }

    final next = alarms.where((a) => a.nextAt > DateTime.now().millisecondsSinceEpoch).toList()
      ..sort((a, b) => a.nextAt.compareTo(b.nextAt));
    final ordered = [...alarms]..sort((a, b) => (a.hour * 60 + a.minute).compareTo(b.hour * 60 + b.minute));
    return Scaffold(
      appBar: AppBar(title: const Text("Champak's Alarm")),
      body: loading ? const Center(child: CircularProgressIndicator()) : ListView(children: [
        Card(margin: const EdgeInsets.all(16), child: Padding(padding: const EdgeInsets.all(18), child: Column(
          crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('NEXT ALARM'), const SizedBox(height: 5),
            Text(next.isEmpty ? 'No alarm scheduled' : '${_time(context, next.first)} · ${next.first.label.isEmpty ? 'Alarm' : next.first.label}',
              style: Theme.of(context).textTheme.titleLarge),
            if (next.isNotEmpty) Text(MaterialLocalizations.of(context).formatMediumDate(DateTime.fromMillisecondsSinceEpoch(next.first.nextAt))),
          ],
        ))),
        if (permissions.values.any((allowed) => !allowed)) Card(
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Allow alarm access', style: TextStyle(fontWeight: FontWeight.bold)),
            const Text('Allow these Android settings so alarms ring at the selected time and show on the lock screen.'),
            for (final kind in ['exact', 'notifications', 'fullScreen'])
              if (permissions[kind] == false) TextButton.icon(
                onPressed: () => _mutate(() => native.invokeMethod<void>('requestPermission', {'kind': kind})),
                icon: const Icon(Icons.settings),
                label: Text({'exact': 'Exact alarms', 'notifications': 'Notifications', 'fullScreen': 'Full-screen alerts'}[kind]!),
              ),
          ])),
        ),
        if (ordered.isEmpty) const Padding(padding: EdgeInsets.all(36), child: Center(child: Text('No alarms yet. Tap Add alarm.'))),
        for (final item in ordered) Card(margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4), child: ListTile(
          onTap: () => _edit(item),
          title: Text(_time(context, item), style: Theme.of(context).textTheme.headlineMedium),
          subtitle: Text('${item.label.isEmpty ? 'Alarm' : item.label} · ${item.days.isEmpty ? 'Once' : item.days.map((d) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d - 1]).join(', ')}'),
          trailing: Row(mainAxisSize: MainAxisSize.min, children: [
            Switch(value: item.enabled, onChanged: (on) => _mutate(() => native.invokeMethod<void>('toggle', {'id': item.id, 'enabled': on}))),
            IconButton(onPressed: () => _delete(item), tooltip: 'Delete', icon: const Icon(Icons.delete_outline)),
          ]),
        )),
        const SizedBox(height: 90),
      ]),
      floatingActionButton: FloatingActionButton.extended(onPressed: () => _edit(), icon: const Icon(Icons.add_alarm), label: const Text('Add alarm')),
    );
  }
}
