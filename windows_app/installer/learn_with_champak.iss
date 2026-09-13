#define MyAppName "Learn With Champak Desktop"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Learn With Champak"
#define MyAppExeName "learn_with_champak_windows.exe"

[Setup]
AppId={{B7292687-CEAB-44DF-B9B6-14B95C7A9D40}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\Learn With Champak Desktop
DefaultGroupName=Learn With Champak Desktop
DisableProgramGroupPage=yes
OutputDir=..\dist
OutputBaseFilename=learn-with-champak-windows-setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional icons:"; Flags: unchecked

[Files]
Source: "..\build\windows\x64\runner\Release\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent
