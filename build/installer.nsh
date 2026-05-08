!include LogicLib.nsh

!macro migrateLegacyWorkShotData
  ${If} ${FileExists} "$INSTDIR\workshot.json"
  ${AndIfNot} ${FileExists} "$APPDATA\WorkShot\workshot.json"
    CreateDirectory "$APPDATA\WorkShot"
    CopyFiles /SILENT "$INSTDIR\workshot.json" "$APPDATA\WorkShot"
  ${EndIf}

  ${If} ${FileExists} "$INSTDIR\snapshots\*.workshot"
    CreateDirectory "$APPDATA\WorkShot\snapshots"
    CopyFiles /SILENT "$INSTDIR\snapshots\*.workshot" "$APPDATA\WorkShot\snapshots"
  ${EndIf}

  ${If} ${FileExists} "$INSTDIR\auto-backups\*.workshot"
    CreateDirectory "$APPDATA\WorkShot\auto-backups"
    CopyFiles /SILENT "$INSTDIR\auto-backups\*.workshot" "$APPDATA\WorkShot\auto-backups"
  ${EndIf}
!macroend

!macro customInit
  ${If} $installMode == "all"
    SetShellVarContext current
  ${EndIf}

  !insertmacro migrateLegacyWorkShotData

  ${If} $installMode == "all"
    SetShellVarContext all
  ${EndIf}
!macroend
