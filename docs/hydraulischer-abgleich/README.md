![Staatliche Berufsschule Kaufbeuren](bilder/logo-bsinfo.png)

# Im Gleichgewicht – Hydraulischer Abgleich (SCORM 1.2, Version 0.10)

**Zielgruppe:** Anlagenmechaniker/-innen SHK · **Dauer:** ca. 60 min · **Gerät:** PC und Tablet · **Präfix:** `shk-`

## Spielidee
Haus-Simulator: Ein Einfamilienhaus mit 2 Etagen × 4 Räumen. In jedem Raum lassen sich Thermostat (✱, 1–5) und Voreinstellung (1–6 in Viertelschritten, N) einstellen, dazu die Förderhöhe der Pumpe (Δp-konstant, 1–6 m). Ansicht **Betrieb** zeigt Raumtemperaturen, Ventilhub und pfeifende Ventile. Ansicht **Messung: Köpfe ab** zeigt den Ist-Volumenstrom in % vom Soll. **Abgleich prüfen** erzeugt das Protokoll.
- Auftrag 1 „Haus Yilmaz“ (LZ1–3): Kinderzimmer im OG bleibt kalt. Geführter Einstieg: Thermostat aufdrehen hilft nicht → Messung → drosseln → Pumpe anpassen.
- Auftrag 2 „Pumpe bei Yilmaz“ (LZ4): Pumpe steht auf 5 m – so niedrig wie möglich einstellen (Ziel ≤ nötige Förderhöhe).
- Auftrag 3 „Neubau Okafor“ (LZ5, LZ2): EG und Bad mit Fußbodenheizung, OG Heizkörper; Durchflussmesser in l/min je Kreis.
- Freies Haus: Räume, Fläche und Heizfläche (Heizkörper, Badheizkörper, Fußbodenheizung) frei zusammenstellen und abgleichen.
- Profi-Pfad: Den Soll-Volumenstrom rechnen die Lernenden je Raum selbst aus (V = Q / (1,163 · ΔT)).

## Rechenmodell – bitte fachlich prüfen (vereinfacht)
- Heizlast = Fläche · 60 W/m² · (θi − θe)/(20 − θe), θe = −12 °C; θi: Wohnräume 20 °C, Bad 24 °C, Flur 16 °C.
- Spreizung: Heizkörper 55/45 °C, Fußbodenheizung 35/30 °C (hydraulisch als Zweig an derselben Pumpe; Mischer nicht modelliert).
- Δp = R · V²; Ventil-kv der Voreinstellung sind Übungswerte (1: 0,031 … 6: 0,29, N: 0,61), kein echtes Fabrikat.
- Rohrnetz nach Heizlast bemessen: bei Soll-Volumenstrom 32 mbar je 6 m Leitungsweg.
- Fußbodenheizung: ein Heizkreis je angefangene 12 m², Durchflussmesser in l/min je Kreis.
- Wärmeabgabe abhängig vom Durchfluss: q(x) = (1 − e^(−a·x))/(1 − e^(−a)); a = 3,5 (HK), 2,5 (FBH).
- Thermostat als P-Regler (Hub 100 % bei 0,5 K unter Soll, 0 % bei 1 K über Soll); 🔊 pfeift bei Hub < 35 % und Δp am Ventil > 150 mbar.
- Abgleich gilt als erreicht bei 90–110 % des Soll-Volumenstroms (mit abgenommenen Köpfen).

## Übungen und Nachweis
- Ü1 Kita Sonnenschein: Pumpe fest auf 4 m, nur Voreinstellungen. Ü2 Ferienwohnung: Soll-Volumenstrom für 4 Räume berechnen. Ü3 Praxis Dr. Okonkwo: mit FBH, sparsam abgleichen.
- Nachweis Teil A: Haus Berger im Simulator ohne Rückmeldung (Prüfpunkte: entferntester Raum ≥ 90 %, EG und OG je 90–110 %, Pumpe ≤ nötig, FBH-Raum 90–110 %). Teil B: 2 Fragen je Lernziel aus 20 Fragen. Bestehen ab 80 %.
- Merkblatt mit Lückentext, Selbsttest (5 Fragen), Vorwissens-Check (5 Fragen), Lernheft mit den eigenen Abgleich-Protokollen.

## Änderungen
- 0.10: Fließendes Wasser in Strang, Decken und Keller (Tempo und Rohrdicke nach Volumenstrom, ruhig bei „Bewegung reduzieren“).
- 0.9: Glossar nur in der Einzahl mit Artikel (Wunsch der Lehrkraft).
- 0.8: Tafelbild für die Einweisung (6 Szenen, `index.html#tafel`); Ablaufplan liegt in `../hydraulischer-abgleich-lehrer/input-ablauf.md` (nicht im ZIP).
- 0.7: Logo und Farben der Staatlichen Berufsschule Kaufbeuren (Projekt-Ausnahme vom BS-Info-Logo).
- 0.6: Einstufung mit Empfehlung Basis/Profi; Vorführung mit Selbsterklär-Frage in Auftrag 2 und 3; Glossar mit Artikel und Plural; Satzanfänge bei Mitdenken und Reflexion; Aufträge mit fettem Operator.
- 0.5: Ventil-Voreinstellung (Ring 1–6, N) direkt in jedem Raum drehbar; Möbel-Symbole in den Raumnamen verschoben.
- 0.4: Thermostatköpfe direkt in jedem Raum drehbar (−/+, Mausrad; am Handy Knopf antippen → Bedienfeld).
- 0.3: Haus realistisch als Schnittbild (Dach, Wände, Decken mit Leitungen, Keller mit Kessel, Pumpe, MAG; Räume mit Fenster, Heizfläche, Boden).
- 0.2: Aufträge 2 und 3, Übungen, Nachweis, Merkblatt, Selbsttest, Vorwissens-Check; Voreinstellung bis N in Viertelschritten; FBH mit Heizkreisen; Rohrnetz nach Heizlast bemessen; Thermostat-Gleichgewicht per Intervallhalbierung.
- 0.1: Prototyp mit Auftrag 1 und freiem Hausplaner.

## Wunsch an die Vorlage
`pruefe_paket.py` erkennt den Basis/Profi-Umschalter im Spielmodus nicht (sucht nur in `stationen[].interaktion`).
