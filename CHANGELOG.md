# Changelog

All notable changes to BSS Companion are documented here.
Versions follow [Semantic Versioning](https://semver.org). Dates are YYYY-MM-DD.

---

## [Unreleased] — 1.1.0

### Added
- **Deck export** — share or save decks as JSON, TXT, CSV, or Image
  - JSON: full structured export with version tag, restores exactly
  - TXT: human-readable list (`4x BSS01-001: Card Name`), header line with deck name
  - CSV: spreadsheet-compatible (Count, CardID, Name, Type, Color, Rarity, Cost columns)
  - Image: Design A dark-theme card preview — donut color chart, avg cost, type breakdown, 4-col card grid sorted by type then cost; share or save to device
- **Deck import** — pick a `.json`, `.txt`, or `.csv` file from device storage; unknown card IDs reported but skipped
- **Hand tester** — compact grid layout (4+1 card view), mulligan count persists across "New Hand"
- **Deck detail** — round accent FAB replaces "Done" text button in add-card mode
- **Deck detail** — rename (pencil) icon moved to navigation header

### Changed
- Export modal: X close button in title row; Cancel button removed
- Deck list: stacked FABs (create / import / hand-test) replace bottom bar
- Deck list: FAB colors unified — black icon on accent (create), accent icon on dark surface (import/test)
- Deck list: long-press context menu centered (was bottom sheet)
- Cards screen: active filter option highlighted in accent color (was plain bold only)
- Grid view: card aspect ratio uses 63:88 ratio instead of fixed height — padding now equal on all sides
- All picker modals app-wide: centered with `animationType="fade"`

### Fixed
- Deck delete: consecutive rapid deletes now all commit to the database — previously only the last delete in a sequence was persisted
- TXT import: card IDs with trailing colon (`BSS01-001:`) now parsed correctly
- CSV export: rarity column was missing data

---

## [1.0.1] — 2026-04-XX

### Fixed
- Deck builder: enforce 4-copy limit when adding cards in rapid succession (race condition allowed more than 4 copies of the same card)

---

## [1.0.0] — 2026-04-XX

### Added
- **Cards browser** — fully offline SQLite card database, filterable by set / type / rarity, sortable by name / cost / rarity; tap any card for full detail view with effects, core levels, rulings
- **Deck builder** — create, rename, copy, delete decks; add/remove cards with quantity controls; list and grid views; filter and sort within deck; color dot breakdown
- **Hand tester** — simulate opening hand draw with mulligan support
- **Rulings viewer** — keyword definitions and per-card Q&A from official BSS FAQ
- **About tab** — app info, version, changelog
- Fully offline: card data bundled in APK, no network required for browsing
