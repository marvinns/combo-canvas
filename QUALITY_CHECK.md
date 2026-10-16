# Qualitätsprüfung – 13. Oktober 2026

## Behobene Ursachen und Auswirkungen

- **Scrollen:** Der Editor aktualisierte bei jedem Scroll-Ereignis React-Seitenstate. Zeilennummern und Vorschläge folgen jetzt über eine CSS-Variable; damit entfällt dieser Auslöser für Seiten-Rerenders.
- **Mobile Darstellung:** Umbruch und Mindestgrößen konnten Combo-Sequenzen im Vollbild abschneiden. Die Sequenz bleibt mobil horizontal scrollbar; die Werkzeugleiste kann umbrechen.
- **Animationen:** Benutzerdefinierte Icons reagierten nicht zuverlässig auf einen laufenden Wechsel von `prefers-reduced-motion`. Eine gemeinsame Subscription aktualisiert Icons und Motion-Konfiguration. CSS-Animationen werden reduziert; der WebGL-Hintergrund läuft bei verborgenem Dokument nicht weiter und zeigt bei reduzierter Bewegung ein statisches Bild.
- **Zustand und Cleanup:** Abgebrochene Deck-Zuordnungen konnten nach einem `await` noch gespeichert werden. Die Abbruchprüfung erfolgt jetzt vor dem Schreiben. Ausstehende Resize-Animationsframes werden beim Unmount abgebrochen.
- **HUD und Tastatur:** Karten-HUDs werden bei Scrollen und Größenänderungen geschlossen, damit sie nicht an veralteten Koordinaten stehen bleiben. Escape beendet den Vollbildmodus; offene Dialoge verhindern die darunterliegende Combo-Navigation.
- **Combo-Visuals:** Ein verketteter Send-to-GY-Zweig gab die Ursprungszone nicht an die Zielkarte weiter. Diese Information wird jetzt übergeben.
- **Kartendaten:** Ein ungültiger API-Datensatz konnte die gesamte Suchantwort scheitern lassen. Datensätze ohne gültigen Namen werden herausgefiltert.
- **Wartbarkeit und Laden:** Typfehler und Lint-Befunde wurden behoben, gemeinsame Endboard-/HUD-Helfer zusammengeführt und Build-Chunks aufgeteilt. Der größte JS-Chunk liegt bei rund 406 kB; dies ist keine entsprechende Reduktion der gesamten übertragenen JavaScript-Menge.

## Verifikation

- Vollständige Testsuite: **433 bestanden, 0 fehlgeschlagen**.
- TypeScript-Prüfung, ESLint, Produktionsbuild und `git diff --check`: erfolgreich.
- Lokales Headless-Chrome gegen den Produktionsbuild: Desktop 1440 × 900 und mobile Emulation 390 × 844, Beispiel-Combo, 200-Schritte-Combo, Editor-Scrollen, schnelle Navigation, Vollbild/Escape und Endboard-Kartenauswahl.
- Kein horizontaler Seitenüberlauf in den geprüften Größen. Im mobilen Vollbild ließ sich der Combo-Inhalt bei 276 px sichtbarer Breite über seine 660 px Inhaltsbreite scrollen.
- Scroll-Stichprobe über 90 Frames: maximal 16,8 ms, kein Frame über 50 ms.
- Live-Wechsel zu reduzierter Bewegung: keine aktiven Custom-Icon-Trigger und keine laufenden CSS-Animationen im geprüften Zustand.
- Keine Browserfehler oder Warnungen im geprüften Ablauf.

## Grenzen

Die Browserprüfung ist eine automatisierte lokale Stichprobe, kein Nachweis für jedes Gerät, jede Combo oder jede Netzwerksituation. Reale Touch-Geräte, alle möglichen Lade-Races und Langzeit-Speicherverhalten wurden nicht vollständig profiliert. Nicht blockierende Hinweise auf veraltete Browserslist-Daten und Nodes `punycode`-Deprecation bleiben; dafür wurden keine Abhängigkeiten geändert.
