# KWin Grid Tiling

Automatically tile new windows with gaps in any grid size for KDE Plasma KWin.

## Features

- Auto-tiling of windows on the largest monitor
- Configurable grid size (rows/columns)
- Adjustable gaps and margins
- Window drag to swap positions
- Divider resize support
- Whitelist-based window filtering (e.g. konsole, dolphin)
- Cross-monitor support: windows dragged to the largest monitor get tiled automatically

## Installation

```bash
git clone https://github.com/wangyaochong/kwin-grid-tiling.git
cd kwin-grid-tiling
kpackagetool6 --type=KWin/Script -i .
```

Then enable the script in **System Settings > Window Management > KWin Scripts**, or:

```bash
kwriteconfig6 --file kwinrc --group Plugins --key grid-tilingEnabled true
qdbus org.kde.KWin /KWin reconfigure
```

## Update Monitor Info in Config

```bash
bash refresh-config.sh
```

## Shortcuts

| Shortcut | Action |
|---|---|
| Meta+T | Tile/Float toggle |
| Meta+Shift+T | Toggle tiling on/off |
| Meta+G | Toggle gaps |
| Meta+B | Toggle borders |
| Meta+M | Toggle minimize desktop |
| Meta+= / Meta+- | Increase/decrease divider size |
| Meta++ / Meta+_ | Maximize/minimize divider size |
| Meta+Ctrl+Arrow | Move window |
| Meta+Q | Close desktop |
| Meta+R | Refresh layout |
| Meta+Ctrl+R | Reset layout |

## Configuration

Configure via **System Settings > Window Management > KWin Scripts > Grid Tiling**:

- **Tile**: Enable/disable auto-tiling
- **Gap**: Show gaps and gap size
- **Border/Active Border**: Window border options
- **Force**: Force window geometry
- **Divider Bound/Step**: Divider resize limits
- **Margin**: Top/Bottom/Left/Right margins
- **Whitelist**: Comma-separated regex patterns (e.g. `konsole|dolphin`)
- **Grid Rows/Columns**: Tiling grid dimensions

## License

GPL
