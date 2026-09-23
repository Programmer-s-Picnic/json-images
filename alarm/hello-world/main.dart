import 'package:flutter/material.dart';

void main() => runApp(const ChampaksAlarmApp());

class ChampaksAlarmApp extends StatelessWidget {
  const ChampaksAlarmApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "Champak's Alarm",
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1976D2)),
        useMaterial3: true,
      ),
      home: Scaffold(
        appBar: AppBar(title: const Text("Champak's Alarm")),
        body: const Center(
          child: Text(
            'Hello World',
            style: TextStyle(fontSize: 32, fontWeight: FontWeight.w600),
          ),
        ),
      ),
    );
  }
}
