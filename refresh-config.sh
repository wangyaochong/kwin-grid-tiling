#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

RAW=$(kscreen-doctor --outputs 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g')

MONITOR_INFO=$(echo "$RAW" | awk '
function update(){if(enabled && geo){split(geo,a,"x");px=a[1]*a[2];if(px>maxpx){maxpx=px;maxname=name;maxgeo=geo}}}
/Output:/{update();name=$3;gsub(/[[:space:]]/,"",name);enabled=0;geo=""}
/^\tenabled$/{enabled=1}
/Geometry:/{if(enabled)geo=$NF}
END{update();if(maxname)printf "%s %s\n",maxname,maxgeo}
')

INFO_TEXT=""
while IFS=' ' read -r mon res; do
  INFO_TEXT="$mon: $res"
done <<< "$MONITOR_INFO"

if [ -n "$INFO_TEXT" ]; then
  kwriteconfig6 --file kwinrc --group Script-grid-tiling --key monitorInfo "$INFO_TEXT"
fi

kpackagetool6 --type=KWin/Script --upgrade "$SCRIPT_DIR" 2>/dev/null
dbus-send --session --dest=org.kde.KWin /KWin org.kde.KWin.reconfigure 2>/dev/null
