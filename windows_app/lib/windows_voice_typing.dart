// Launch the Windows built-in voice typing UI using its documented Win+H hotkey.
// The browser never records microphone audio or stores a transcript.
import 'dart:ffi';
import 'dart:io';

import 'package:ffi/ffi.dart';
import 'package:win32/win32.dart';

class WindowsVoiceTyping {
  const WindowsVoiceTyping._();

  /// Invokes the Windows voice-typing panel for the currently focused text field.
  /// Requires a supported Windows edition, a configured microphone and internet.
  static void openForFocusedField() {
    if (!Platform.isWindows) {
      throw UnsupportedError('Windows voice typing is only available on Windows.');
    }

    using((arena) {
      final inputs = arena<INPUT>(4);
      const keys = <VIRTUAL_KEY>[VK_LWIN, VK_H, VK_H, VK_LWIN];
      for (var i = 0; i < 4; i++) {
        final event = inputs.elementAt(i).ref;
        event.type = INPUT_KEYBOARD;
        event.ki.wVk = keys[i];
        event.ki.wScan = 0;
        if (i >= 2) event.ki.dwFlags = KEYEVENTF_KEYUP;
        event.ki.time = 0;
        event.ki.dwExtraInfo = 0;
      }

      final result = SendInput(4, inputs, sizeOf<INPUT>());
      if (result.value != 4) {
        throw StateError(
          'Windows could not open voice typing (SendInput: '
          '${result.value}/4; error ${result.error.toHRESULT()}).',
        );
      }
    });
  }
}
