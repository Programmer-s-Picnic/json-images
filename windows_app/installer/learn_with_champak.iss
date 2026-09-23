#define MyAppName "Champak's Desktop Browser"
#define MyAppVersion "3.1.0"
#define MyAppPublisher "Learn With Champak"
#define MyAppExeName "learn_with_champak_windows.exe"

[Setup]
AppId={{B7292687-CEAB-44DF-B9B6-14B95C7A9D40}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\Learn With Champak Desktop
DefaultGroupName=Champak's Desktop Browser
DisableProgramGroupPage=yes
OutputDir=..\dist
OutputBaseFilename=learn-with-champak-windows-setup
SetupIconFile=..\windows\runner\resources\app_icon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ChangesAssociations=yes
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional icons:"; Flags: unchecked

[Files]
Source: "..\build\windows\x64\runner\Release\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent


[Registry]
; Register Learn With Champak as a browser-capable Windows application.
Root: HKLM; Subkey: "Software\RegisteredApplications"; ValueType: string; ValueName: "{#MyAppName}"; ValueData: "Software\Clients\StartMenuInternet\LearnWithChampakDesktop\Capabilities"; Flags: uninsdeletevalue

Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\LearnWithChampakDesktop"; ValueType: string; ValueName: ""; ValueData: "{#MyAppName}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\LearnWithChampakDesktop\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\{#MyAppExeName},0"
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\LearnWithChampakDesktop\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppExeName}"""

Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\LearnWithChampakDesktop\Capabilities"; ValueType: string; ValueName: "ApplicationName"; ValueData: "{#MyAppName}"
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\LearnWithChampakDesktop\Capabilities"; ValueType: string; ValueName: "ApplicationDescription"; ValueData: "Champak's Desktop Browser for learning and education"
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\LearnWithChampakDesktop\Capabilities"; ValueType: string; ValueName: "ApplicationIcon"; ValueData: "{app}\{#MyAppExeName},0"
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\LearnWithChampakDesktop\Capabilities\URLAssociations"; ValueType: string; ValueName: "http"; ValueData: "LearnWithChampakHTML"
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\LearnWithChampakDesktop\Capabilities\URLAssociations"; ValueType: string; ValueName: "https"; ValueData: "LearnWithChampakHTML"
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\LearnWithChampakDesktop\Capabilities\FileAssociations"; ValueType: string; ValueName: ".htm"; ValueData: "LearnWithChampakHTML"
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\LearnWithChampakDesktop\Capabilities\FileAssociations"; ValueType: string; ValueName: ".html"; ValueData: "LearnWithChampakHTML"
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\LearnWithChampakDesktop\Capabilities\Startmenu"; ValueType: string; ValueName: "StartMenuInternet"; ValueData: "LearnWithChampakDesktop"

Root: HKLM; Subkey: "Software\Classes\LearnWithChampakHTML"; ValueType: string; ValueName: ""; ValueData: "Learn With Champak HTML Document"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Classes\LearnWithChampakHTML"; ValueType: string; ValueName: "FriendlyTypeName"; ValueData: "Learn With Champak Web Link"
Root: HKLM; Subkey: "Software\Classes\LearnWithChampakHTML"; ValueType: string; ValueName: "URL Protocol"; ValueData: ""
Root: HKLM; Subkey: "Software\Classes\LearnWithChampakHTML\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\{#MyAppExeName},0"
Root: HKLM; Subkey: "Software\Classes\LearnWithChampakHTML\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppExeName}"" ""%1"""

Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\LearnWithChampakDesktop\InstallInfo"; ValueType: string; ValueName: "ReinstallCommand"; ValueData: """{app}\{#MyAppExeName}"""
