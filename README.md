# Scherer Pilot Console

GitHub-Pages-fähiger Frontend-Prototyp für einen browsergestützten Automatisierungs-Pitch.

## Was der Prototyp zeigt

- natürlichsprachige Eingabe für Operator-Befehle
- Routing / Intent-Erkennung im Frontend
- Run-Log / Logbuch mit Statusschritten
- Approval-Modi für sensible Aktionen (z. B. Kauf)
- Scherer-/Marco-Bender-kontextualisierte Pitch-Oberfläche
- Vorbereitung auf eine private Execution-Bridge

## Wichtig

Dieser Prototyp ist **GitHub Pages kompatibel**, aber GitHub Pages hostet nur das Frontend.
Für **echte Browser-Aktionen** (Amazon suchen, Warenkorb, Portal-Klickpfade, PDF-Verarbeitung) brauchst du später eine **private Backend-/Execution-Bridge**, die den Prompt entgegennimmt und intern ausführt.

Im UI heißt das bewusst neutral **Execution endpoint**, damit der Pitch white-label bleibt.

## Deployment auf GitHub Pages

1. Neues GitHub-Repo anlegen
2. Inhalt dieses Ordners in das Repo root kopieren
3. Repo pushen
4. In GitHub: **Settings → Pages**
5. Source: **Deploy from branch**
6. Branch: **main** / root
7. Speichern

Dann ist die Seite unter `https://<username>.github.io/<repo>/` erreichbar.

## Anpassungen vor dem Pitch

- Projektname direkt im UI ändern
- Endpoint hinterlegen, sobald deine private Bridge steht
- Texte in `index.html` auf Wunsch noch stärker auf Scherer / Marco zuschneiden
- Optional: Logo / Farben / Domain ergänzen

## Nächste sinnvolle Ausbaustufe

- echtes Backend (z. B. eigener API-Service)
- WebSocket-Live-Logs statt Demo-Logik
- Auth / Nutzerrollen
- Run-History in DB
- PDF-Upload + strukturierte Extraktion
- Browser-Runner / Approval Workflow
