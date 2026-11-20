/* =====================================================================
   SPRACHSTUFE EINFACH (Leitfaden P16) – zweite Fassung aller Paket-Texte.
   Geladen NACH js/inhalt.js und VOR js/engine.js.

   EINFACH enthält dieselbe Struktur wie window.PAKET, aber nur die Texte in
   einfacher Sprache. Listen werden über id, begriff oder lz angesprochen
   (bei Optionen, Zeilen und Tipps über die Position 0, 1, 2 …; null = Text
   bleibt). Regeln: kurze Sätze (meist höchstens 10 Wörter), eine Information
   pro Satz, Hauptsätze, aktiv, Zahlen als Ziffern, Fachbegriffe bleiben gleich.
   Zahlen, Codes und Lösungen bleiben unverändert – die Bewertung ist gleich.

   Texte, die Szenen selbst erzeugen, stehen in js/inhalt.js als L('…', '…').
   Der Umschalter sitzt im Kopf, die Wahl merkt sich der Browser.
   ===================================================================== */
(function () {
  'use strict';
  var P = window.PAKET;

  /* ---- Texte in einfacher Sprache (pro Paket ausfüllen) ----
     Beispiel für den Vorlagen-Inhalt „Bits & Bytes“ – beim Bauen eines neuen
     Pakets vollständig durch die eigenen Texte ersetzen. */
  var EINFACH = window.EINFACH || {
    leitsituation: 'Willkommen bei <b>Lindner Haustechnik</b>! Heute fahren wir zu Familie Yilmaz. Oben ist ein Kinderzimmer kalt. Der Kessel macht genug Wärme. Aber niemand hat die Anlage <b>abgeglichen</b>. Das machst du jetzt. Raum für Raum. Danach kommt ein Neubau mit Fußbodenheizung.',
    lernziele: {
      LZ1: { kurz: 'Ursache', text: 'Ich kann erklären: Ohne Abgleich bekommen nahe Räume zu viel Wasser. Ferne Räume bekommen zu wenig.' },
      LZ2: { kurz: 'Volumenstrom', text: 'Ich kann ausrechnen: So viel Wasser braucht ein Raum.' },
      LZ3: { kurz: 'Voreinstellung', text: 'Ich kann die Ventile so einstellen: Jeder Raum bekommt genug Wasser.' },
      LZ4: { kurz: 'Pumpe', text: 'Ich kann die Pumpe richtig einstellen. Ich weiß: Nur „Pumpe höher“ hilft nicht.' },
      LZ5: { kurz: 'Heizflächen', text: 'Ich kenne die Unterschiede: Heizkörper und Fußbodenheizung.' }
    },
    glossar: {
      'Hydraulischer Abgleich': { erklaerung: 'Jede Heizfläche bekommt genau so viel Wasser, wie sie braucht.' },
      'Volumenstrom': { erklaerung: 'So viel Wasser fließt in einer Stunde. Einheit: l/h.' },
      'Heizlast': { erklaerung: 'So viel Wärme braucht ein Raum im Winter. Einheit: Watt (W).' },
      'Spreizung': { erklaerung: 'Vorlauf minus Rücklauf. Beispiel: 55 °C − 45 °C = 10 K.' },
      'Voreinstellung': { erklaerung: 'Ein Ring am Ventil. Er bremst das Wasser. 1 = viel bremsen. N = gar nicht bremsen.' },
      'Thermostatkopf': { erklaerung: 'Der Drehknopf am Heizkörper. Er macht das Ventil auf oder zu.' },
      'Ventilhub': { erklaerung: 'So weit ist das Ventil gerade offen. In Prozent.' },
      'Differenzdruck': { erklaerung: 'Druck vor dem Bauteil minus Druck danach. Einheit: mbar. Viel Druck am fast zuen Ventil: Es pfeift.' },
      'Förderhöhe': { erklaerung: 'So stark drückt die Pumpe. Einheit: Meter. 1 m sind etwa 100 mbar.' },
      'Δp-konstant': { erklaerung: 'Die Pumpe hält ihren Druck immer gleich.' },
      'Unterversorgung': { erklaerung: 'Ein Raum bekommt zu wenig Wasser. Er wird nicht warm.' },
      'Überversorgung': { erklaerung: 'Ein Raum bekommt zu viel Wasser. Das Wasser fehlt woanders.' },
      'Heizkreisverteiler': { erklaerung: 'Er verteilt bei der Fußbodenheizung das Wasser auf die Kreise.' },
      'Durchflussmesser': { erklaerung: 'Eine Anzeige am Verteiler. Sie zeigt das Wasser pro Kreis. Meist in l/min.' },
      'Ungünstigster Raum': { erklaerung: 'Der Raum mit dem schwersten Weg. Meist der Raum ganz hinten. Nach ihm stellt man die Pumpe ein.' }
    },
    uebungen: {
      U1: { titel: 'Kita Sonnenschein: nur mit der Voreinstellung', auftrag: 'In der Kita steht die Pumpe fest auf 4 m. Stell alle 8 Räume nur mit der Voreinstellung ein.',
        tipps: ['Tippe auf 🔧 Messen. Welche Räume sind orange? Welche rot?', 'Küche und Waschraum sind nah am Keller. Sie bekommen viel zu viel. Dreh dort auf etwa 3 bis 4.', 'Eulen bleibt auf N. Etwa: Bären 6, Küche 3½, Waschraum 3½, Garderobe 4, Füchse 6¼, Ruheraum 5½, Leitung 5.'],
        reflexion: { frage: 'Warum brauchen nahe Räume eine kleinere Voreinstellung?', muster: 'Ihr Weg ist kurz und leicht. Das Ventil muss mehr bremsen. Sonst bekommen sie zu viel Wasser.' } },
      U2: { titel: 'Ferienwohnung: Soll berechnen', auftrag: 'Im Protokoll fehlen die Soll-Werte. Rechne sie für alle 4 Räume aus.',
        tipps: ['Rechne: V = Q / (1,163 · ΔT). Q ist die Heizlast.', 'Heizkörper: ΔT = 10 K. Fußbodenheizung: ΔT = 5 K.', 'Wohnküche ≈ 124 l/h. Bad ≈ 81 l/h. Schlafzimmer ≈ 77 l/h. Flur ≈ 36 l/h.'],
        reflexion: { frage: 'Das Bad braucht wenig Wärme. Aber viel Wasser. Warum?', muster: 'Das Bad hat FBH. Die Spreizung ist nur 5 K. Dann braucht man doppelt so viel Wasser.' } },
      U3: { titel: 'Praxis Dr. Okonkwo: sparsam abgleichen', auftrag: 'In der Praxis steht die Pumpe auf 5 m. Gleiche ab. Stell die Pumpe so klein wie möglich.',
        tipps: ['Der Raum mit dem weitesten Weg ist das Büro oben hinten. Stell es auf N.', 'Dreh die Pumpe runter bis 3,5 m. Dann die anderen Räume bremsen.', 'Etwa: Wartezimmer 4¾, Empfang 4¼, WC 2½, Behandlung 1: 4¾, Behandlung 2: 5, Labor 4½, Büro N.'],
        reflexion: { frage: 'Warum reichen jetzt 3,5 m statt 5 m?', muster: 'Vorher bekamen die nahen Räume viel zu viel. Jetzt fließt nur so viel wie nötig. Die Pumpe muss nur den Raum hinten schaffen.' } }
    },
    nachweis: { einleitung: 'Heute fährst du <b>allein</b> zu Familie Berger. Der Kessel ist neu. Niemand hat abgeglichen. Die Pumpe steht auf 4,5 m. Es gibt keine Hinweise.',
      teilA: { titel: 'Haus Berger abgleichen', auftrag: 'Alle Räume sollen 90 bis 110 % bekommen. Die Pumpe so klein wie möglich. Dann gib Teil A ab.' } },
    merkblatt: {
      LZ1: { titel: 'Warum ein Abgleich?', zeilen: [{ text: 'Ohne Abgleich fließt das Wasser dorthin, wo der ___ am kleinsten ist.' }, { text: 'Nahe Räume sind ___. Ferne Räume sind ___.' }], fehler: 'Im kalten Raum das Thermostat aufdrehen. Das Ventil ist dort schon offen.', beispiel: 'Yilmaz: Küche 158 %. Can 77 %.' },
      LZ2: { titel: 'Soll-Volumenstrom', zeilen: [{ text: 'V = Q / (___ · ΔT)' }, { text: 'Heizkörper: ΔT = ___ K. Fußbodenheizung: ΔT = ___ K.' }], fehler: '1,163 oder ΔT vergessen.', beispiel: '930 W / (1,163 · 10 K) ≈ 80 l/h.' },
      LZ3: { titel: 'Voreinstellung', zeilen: [{ text: 'Man misst mit ___ Thermostatköpfen.' }, { text: 'Kleine Zahl = ___ Widerstand = ___ Wasser.' }], fehler: 'Mit dem Thermostat den Durchfluss bremsen wollen.', beispiel: 'Ziel: jeder Raum 90 bis 110 %.', schema: 'Messen → zu viel: bremsen → zu wenig: öffnen → wieder messen.' },
      LZ4: { titel: 'Pumpe einstellen', zeilen: [{ text: 'Der ___ Raum bestimmt die Pumpe. Meist der Raum ganz hinten.' }, { text: 'Die Pumpe so ___ wie möglich. 1 m sind etwa ___ mbar.' }], fehler: 'Nur die Pumpe höher drehen. Dann bekommen nahe Räume noch mehr.', beispiel: 'Yilmaz: 5 m → 3,5 m. Von 37 W auf 23 W.' },
      LZ5: { titel: 'Fußbodenheizung', zeilen: [{ text: 'Die FBH hat eine kleine Spreizung. Sie braucht ___ Wasser.' }, { text: 'Man stellt sie am ___ ein. Man liest in ___ ab.' }], fehler: 'l/min und l/h verwechseln. 1 l/min = 60 l/h.', beispiel: '270 l/h auf 3 Kreise = 90 l/h je Kreis = 1,5 l/min.' }
    },
    stationen: {
      S1: { titel: 'Auftrag 1 · Haus Yilmaz: das kalte Kinderzimmer',
        mitdenken: { auftrag: 'Erklär Herrn Yilmaz in 3 Sätzen: Warum hilft Aufdrehen nicht?', muster: 'Das Ventil war schon ganz offen. Das Wasser fließt lieber in die nahen Räume. Erst wenn sie gebremst sind, kommt oben genug an.' } },
      S2: { titel: 'Auftrag 2 · Haus Yilmaz: die Pumpe richtig einstellen',
        mitdenken: { auftrag: 'Zeichne auf Papier: Was passiert mit dem Strom? Was passiert mit dem Raum ganz hinten? Die Pumpe geht von 5 m auf 3 m.', muster: 'Der Strom sinkt. Bei Yilmaz von 37 W auf etwa 20 W. Der Raum hinten bekommt weniger. Aber noch 90 %. Das reicht.' } },
      S3: { titel: 'Auftrag 3 · Neubau Okafor: Fußbodenheizung und Heizkörper',
        mitdenken: { auftrag: 'Erklär einer Mitschülerin: Warum braucht das Wohnzimmer mit FBH mehr Wasser?', muster: 'Die FBH hat 35/30 °C. Das sind nur 5 K. Jeder Liter bringt nur halb so viel Wärme. Also braucht der Raum doppelt so viel Wasser.' } }
    },
    fragen: {
      C1: { frage: 'Warum bekommt das Kinderzimmer oben zu wenig Wasser?',
        optionen: [{ text: 'Das Wasser nimmt den leichtesten Weg. Die nahen Heizkörper unten nehmen zu viel.' },
          { text: 'Warmes Wasser steigt nach oben. Oben müsste es also zu viel sein.', feedback: 'Die Pumpe treibt das Wasser. Wichtig ist: Wie schwer ist der Weg?' },
          { text: 'Der Kessel ist zu klein.', feedback: 'Der Kessel macht genug Wärme. Sie ist nur falsch verteilt.' }],
        erklaerung: 'Die nahen Räume haben den leichtesten Weg. Dort fließt zu viel. Für oben bleibt zu wenig.' },
      C2: { frage: 'Herr Yilmaz dreht im kalten Zimmer von 3 auf 5. Was passiert?',
        optionen: [{ text: 'Fast nichts. Das Ventil war schon ganz offen.' },
          { text: 'Der Raum wird schneller warm. Es fließt mehr Wasser.', feedback: 'Das Ventil war schon ganz offen. Mehr geht nicht.' },
          { text: 'Die Pumpe läuft schneller.', feedback: 'Das Thermostat wirkt nur auf sein Ventil. Nicht auf die Pumpe.' }],
        erklaerung: 'Das Ventil war schon ganz offen. Man muss die anderen Räume bremsen.' },
      C3: { frage: 'Ein Raum braucht <b>930 W</b>. Der Heizkörper hat 55/45 °C. Wie viel Wasser braucht er?',
        typisch: [{ feedback: 'Du hast nur durch 10 geteilt. Teile auch durch 1,163.' }, { feedback: 'Rechne: 930 / (1,163 · 10). Das sind etwa 80.' }],
        erklaerung: 'V = 930 W / (1,163 · 10 K). Das sind etwa 80 l/h.' },
      C4: { frage: 'Alles ist abgeglichen. Die Pumpe steht aber auf 5 m statt 3,5 m. Was passiert?',
        optionen: [{ text: 'Alle Räume bekommen zu viel Wasser. Die Pumpe braucht mehr Strom. Es kann rauschen.' }, { text: 'Nichts. Die Voreinstellung begrenzt ja.', feedback: 'Die Voreinstellung bremst nur. Mehr Druck drückt mehr Wasser durch.' }, { text: 'Die Räume werden kälter.', feedback: 'Mehr Druck heißt mehr Wasser. Nicht weniger.' }],
        erklaerung: 'Die Ventile passen nur zu einer Pumpenhöhe. Zu viel Druck: zu viel Wasser, mehr Strom.' },
      C5: { frage: 'Welcher Raum bestimmt: So hoch muss die Pumpe mindestens sein?',
        optionen: [{ text: 'Der ungünstigste Raum. Meist ganz hinten. Sein Ventil steht auf N.' }, { text: 'Der größte Raum.', feedback: 'Wichtig ist der schwere Weg. Nicht die Größe.' }, { text: 'Der Raum neben dem Keller.', feedback: 'Dieser Raum hat den kürzesten Weg. Er wird gebremst.' }],
        erklaerung: 'Die Pumpe muss den schwersten Weg schaffen. Alle anderen Räume werden gebremst.' },
      C6: { frage: 'Warum steht das Ventil ganz hinten meist auf N?',
        optionen: [{ text: 'Der lange Weg bremst schon genug.' }, { text: 'N heißt Nacht.', feedback: 'N heißt normal. Also ganz offen.' }, { text: 'Räume hinten brauchen immer am meisten Wärme.', feedback: 'Die Wärme hängt vom Raum ab. Nicht vom Weg.' }],
        erklaerung: 'Der Raum hinten hat den längsten Weg. Er wird nicht gebremst.' },
      C7: { frage: 'Bad mit FBH (35/30 °C). Heizlast <b>600 W</b>. Wie viel Wasser braucht es?',
        typisch: [{ feedback: 'Du hast 10 K genommen. Die FBH hat 5 K.' }, { feedback: 'Teile auch durch 1,163.' }],
        erklaerung: '600 W / (1,163 · 5 K). Das sind etwa 103 l/h.' },
      C8: { frage: 'Ein Raum mit FBH braucht <b>120 l/h</b>. Er hat <b>2 Kreise</b>. Was zeigt jeder Messer an (l/min)?',
        typisch: [{ feedback: '2 l/min sind beide Kreise zusammen. Je Kreis die Hälfte.' }, { feedback: '60 l/h stimmt. Gefragt ist l/min. 60 : 60 = 1.' }],
        erklaerung: '120 l/h : 2 = 60 l/h. Das ist 1 l/min.' },
      C9: { frage: 'Du drehst die Voreinstellung von 4 auf 3. Was passiert?',
        optionen: [{ text: 'Es bremst mehr. Es fließt weniger Wasser.' }, { text: 'Der Raum wird auf weniger Grad geregelt.', feedback: 'Die Grad stellt der Thermostatkopf ein.' }, { text: 'Es fließt mehr Wasser.', feedback: 'Kleine Zahl = enger = weniger Wasser.' }],
        erklaerung: 'Kleine Zahl: mehr bremsen, weniger Wasser.' },
      N1: { frage: 'Wohin fließt das Wasser <b>ohne</b> Abgleich?',
        optionen: [{ text: 'Dorthin, wo der Weg am leichtesten ist. Meist nah an der Pumpe.' }, { text: 'Gleich in alle Heizkörper.', feedback: 'Kurze Wege bremsen weniger. Dort fließt mehr.' }, { text: 'Nach oben. Warmes Wasser steigt.', feedback: 'Die Pumpe treibt das Wasser. Wichtig ist der Weg.' }],
        erklaerung: 'Das Wasser nimmt den leichtesten Weg. Nahe Räume bekommen zu viel. Ferne zu wenig.' },
      N2: { frage: 'Was zeigt: Hier fehlt der Abgleich? Kreuze alle richtigen an.',
        optionen: [{ text: 'Räume hinten werden nicht warm.' }, { text: 'Ventile pfeifen oder rauschen.' }, { text: 'Die Pumpe steht hoch. Sie braucht viel Strom.' }, { text: 'Ein Heizkörper gluckert. Er ist oben kalt.', feedback: 'Das ist Luft. Man muss entlüften.' }],
        erklaerung: 'Kalte Räume hinten, Geräusche, hohe Pumpe: Das sind Zeichen. Gluckern heißt Luft.' },
      N3: { frage: 'Was ist die Ursache? Ordne zu.', erklaerung: 'Nur einzelne Räume falsch: Abgleich fehlt. Alle Räume kühl: Vorlauf zu kalt. Gluckern: Luft.' },
      N4: { frage: 'Welcher Raum bekommt ohne Abgleich am ehesten zu wenig?',
        optionen: [{ text: 'Ein Raum oben mit dem längsten Weg.' }, { text: 'Ein kleiner Raum direkt über dem Keller.', feedback: 'Kurzer Weg. Er bekommt eher zu viel.' }, { text: 'Das WC neben dem Kessel.', feedback: 'Nah am Kessel. Eher zu viel.' }],
        erklaerung: 'Langer Weg, viel Widerstand. Ohne Abgleich kommt dort zu wenig an.' },
      N5: { frage: 'Heizlast <b>1400 W</b>. Heizkörper 55/45 °C. Wie viel Wasser?',
        typisch: [{ feedback: 'Teile auch durch 1,163.' }, { feedback: 'Das Komma ist falsch. 1400 : 11,63 ≈ 120.' }],
        erklaerung: '1400 W / (1,163 · 10 K) ≈ 120 l/h.' },
      N6: { frage: 'FBH mit 35/30 °C. Heizlast <b>700 W</b>. Wie viel Wasser?',
        typisch: [{ feedback: 'Du hast 10 K genommen. Hier sind es 5 K.' }, { feedback: 'Teile auch durch 1,163.' }],
        erklaerung: '700 W / (1,163 · 5 K) ≈ 120 l/h.' },
      N7: { frage: 'Was bedeutet <b>1,163</b> in der Formel?',
        optionen: [{ text: 'So viel Wärme nimmt 1 kg Wasser pro Kelvin auf: 1,163 Wh.' }, { text: 'Wie schwer das Wasser ist.', feedback: '1 l Wasser wiegt etwa 1 kg. 1,163 ist die Wärme.' }, { text: 'Wie gut der Kessel ist.', feedback: 'Der Kessel ist hier egal. 1,163 gehört zum Wasser.' }],
        erklaerung: '1 kg Wasser nimmt pro Kelvin 1,163 Wh auf.' },
      N8: { frage: 'Die Wärme bleibt gleich. Die Spreizung geht von 10 K auf 5 K. Was passiert mit dem Wasser?',
        optionen: [{ text: 'Es braucht doppelt so viel.' }, { text: 'Es braucht halb so viel.', feedback: 'ΔT steht unten im Bruch. Kleiner ΔT: mehr Wasser.' }, { text: 'Es bleibt gleich.', feedback: 'Jeder Liter bringt weniger Wärme. Also mehr Wasser.' }],
        erklaerung: 'Halbe Spreizung: doppelt so viel Wasser.' },
      N9: { frage: 'Ein Raum bekommt <b>150 %</b>. Was tust du?',
        optionen: [{ text: 'Die Voreinstellung kleiner drehen. Bis 90 bis 110 %.' }, { text: 'Das Thermostat zudrehen.', feedback: 'Das Thermostat regelt die Grad. Die Menge stellt die Voreinstellung ein.' }, { text: 'Die Pumpe höher stellen.', feedback: 'Dann bekommt er noch mehr.' }],
        erklaerung: 'Zu viel Wasser: Voreinstellung kleiner.' },
      N10: { frage: 'Warum nimmt man beim Messen die Thermostatköpfe <b>ab</b>?',
        optionen: [{ text: 'Dann bremst nur die Voreinstellung. Nicht die Raumtemperatur.' }, { text: 'Dann ist das Ventil zu.', feedback: 'Ohne Kopf ist das Ventil offen.' }, { text: 'Sonst geht der Kopf kaputt.', feedback: 'Es geht ums Messen. Der Kopf würde sonst bremsen.' }],
        erklaerung: 'Ohne Kopf ist das Ventil offen. Nur die Voreinstellung bremst.' },
      N11: { frage: 'Ein Raum steht auf <b>N</b>. Er bekommt nur 80 %. Was hilft?',
        optionen: [{ text: 'Die Pumpe höher. Dann die anderen Räume neu einstellen.' }, { text: 'Die Voreinstellung auf 1.', feedback: '1 bremst am meisten. Dann kommt noch weniger.' }, { text: 'Das Thermostat auf 5.', feedback: 'Das Ventil ist schon offen. Das hilft nicht.' }],
        erklaerung: 'Ventil offen und es reicht nicht: Die Pumpe muss höher.' },
      N12: { frage: 'Was bedeutet die Einstellung? Ordne zu.', erklaerung: 'Voreinstellung: 1 = wenig, N = offen. Thermostat: ✱ ≈ 6 °C, 3 ≈ 20 °C.' },
      N13: { frage: 'Wie stellst du die Pumpe nach dem Abgleich ein?',
        optionen: [{ text: 'So klein, dass der Raum hinten gerade genug bekommt.' }, { text: 'Ganz hoch. Dann wird alles warm.', feedback: 'Dann bekommen alle zu viel. Das kostet Strom.' }, { text: 'Immer in die Mitte.', feedback: 'Das hängt vom Haus ab.' }],
        erklaerung: 'Die Pumpe richtet sich nach dem ungünstigsten Raum.' },
      N14: { frage: 'Die Pumpe ist zu hoch. Was passiert? Kreuze alle richtigen an.',
        optionen: [{ text: 'Die Ventile rauschen.' }, { text: 'Die Pumpe braucht mehr Strom.' }, { text: 'Zu viel Wasser, der Rücklauf ist zu warm.' }, { text: 'Der Kessel macht mehr Wärme.', feedback: 'Die Pumpe verteilt nur. Sie macht keine Wärme.' }],
        erklaerung: 'Zu hohe Pumpe: Geräusche, Strom, zu viel Wasser, warmer Rücklauf.' },
      N15: { frage: 'Die Pumpe steht auf <b>3,5 m</b>. Wie viel mbar sind das ungefähr?',
        typisch: [{ feedback: '1 m sind etwa 100 mbar. Nicht 10.' }, { feedback: '1 m sind etwa 100 mbar. 3,5 m ≈ 350 mbar.' }],
        erklaerung: '1 m ≈ 100 mbar. Also 3,5 m ≈ 350 mbar.' },
      N16: { frage: 'Ein Kunde sagt: „Dreh die Pumpe höher. Dann wird es oben warm.“ Was sagst du?',
        optionen: [{ text: 'Dann bekommen die nahen Räume noch mehr. Das kostet Strom. Besser abgleichen.' }, { text: 'Gut. Das ist der Abgleich.', feedback: 'Abgleich heißt: Ventile einstellen. Nicht nur Pumpe.' }, { text: 'Die Pumpe ist egal.', feedback: 'Mehr Druck: mehr Wasser. In allen Räumen.' }],
        erklaerung: 'Höhere Pumpe: mehr Wasser überall. Die Verteilung bleibt falsch.' },
      N17: { frage: 'Der Messer zeigt <b>1,5 l/min</b>. Wie viel l/h sind das?',
        typisch: [{ feedback: 'Mal 60 rechnen. Nicht teilen.' }, { feedback: '1 Stunde = 60 Minuten. 1,5 · 60 = 90.' }],
        erklaerung: '1,5 l/min · 60 = 90 l/h.' },
      N18: { frage: 'Warum braucht die FBH mehr Wasser als ein Heizkörper? Die Wärme ist gleich.',
        optionen: [{ text: 'Sie hat eine kleinere Spreizung. 5 K statt 10 K.' }, { text: 'Ihre Rohre sind länger.', feedback: 'Lange Rohre bremsen. Die Menge hängt aber von Wärme und Spreizung ab.' }, { text: 'Sie braucht wärmeres Wasser.', feedback: 'Nein. Die FBH braucht kühleres Wasser, etwa 35 °C.' }],
        erklaerung: 'Kleine Spreizung: Jeder Liter bringt wenig Wärme. Also mehr Wasser.' },
      N19: { frage: 'Wo stellst du bei der FBH die Wassermenge ein?',
        optionen: [{ text: 'Am Verteiler. Für jeden Kreis einzeln.' }, { text: 'Am Thermostat an der Wand.', feedback: 'Das regelt die Grad. Nicht die Menge.' }, { text: 'Am Kessel.', feedback: 'Am Kessel stellt man Grad ein. Nicht die Menge pro Kreis.' }],
        erklaerung: 'Jeder Kreis hat am Verteiler ein Ventil. Oft mit Anzeige in l/min.' },
      N20: { frage: 'Wohnzimmer mit FBH: <b>270 l/h</b>, <b>3 Kreise</b>. Was zeigt jeder Messer an?',
        optionen: [null, { feedback: '4,5 l/min sind alle 3 Kreise zusammen.' }, { feedback: '90 stimmt. Aber in l/h. In l/min: 90 : 60 = 1,5.' }],
        erklaerung: '270 : 3 = 90 l/h. 90 : 60 = 1,5 l/min.' }
    }
  };

  /* ---- Texte austauschen und wiederherstellen ---- */
  var gemerkt = [];
  function finde(liste, schluessel) {
    if (/^\d+$/.test(schluessel)) return liste[+schluessel];
    return liste.filter(function (x) { return x && (x.id === schluessel || x.begriff === schluessel || x.lz === schluessel); })[0];
  }
  function anwenden(ziel, quelle) {
    Object.keys(quelle).forEach(function (k) {
      var q = quelle[k];
      if (q === null || q === undefined) return;
      var z = Array.isArray(ziel) ? finde(ziel, k) : ziel[k];
      if (typeof q === 'object' && z && typeof z === 'object') { anwenden(z, q); return; }
      if (typeof q === 'object' || Array.isArray(ziel)) return;
      gemerkt.push([ziel, k, ziel[k]]);
      ziel[k] = q;
    });
  }
  function zuruecksetzen() {
    for (var i = gemerkt.length - 1; i >= 0; i--) gemerkt[i][0][gemerkt[i][1]] = gemerkt[i][2];
    gemerkt = [];
  }

  /* ---- Umschalter im Kopf ---- */
  var kopf = document.querySelector('.kopf');
  var leiste = document.createElement('div');
  leiste.className = 'st-sprachwahl';
  leiste.setAttribute('role', 'group');
  leiste.setAttribute('aria-label', 'Sprache wählen');
  leiste.innerHTML = '<span aria-hidden="true">🌐</span>' +
    '<button type="button" data-stufe="standard" lang="de">Standard</button>' +
    '<button type="button" data-stufe="einfach" lang="de">Einfach</button>' +
    '<span class="st-sprachhinweis" aria-live="polite"></span>';
  if (kopf) kopf.appendChild(leiste);
  var hinweis = leiste.querySelector('.st-sprachhinweis');
  var stil = document.createElement('style');
  stil.textContent = '.st-sprachwahl{display:flex;align-items:center;gap:6px;flex-wrap:wrap}' +
    '.st-sprachwahl button{min-height:40px;padding:4px 12px;font-weight:700}' +
    '.st-sprachwahl button[aria-pressed="true"]{background:#fff!important;color:var(--kopf-b)!important;border-color:#fff!important}' +
    '.st-sprachhinweis{font-size:.85rem;color:#fff;flex-basis:100%}.st-sprachhinweis:empty{display:none}';
  document.head.appendChild(stil);

  function setze(stufe, neuZeichnen) {
    if (stufe !== 'einfach') stufe = 'standard';
    if (stufe !== SPRACHE.stufe) {
      if (stufe === 'einfach') anwenden(P, EINFACH); else zuruecksetzen();
      SPRACHE.stufe = stufe;
      STUFEN.merke('sprache', stufe);
    }
    leiste.querySelectorAll('[data-stufe]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-stufe') === SPRACHE.stufe)); });
    if (!neuZeichnen || !window.LERNPAKET) return;
    var a = window.LERNPAKET.ansicht();
    if (a.teil === 'nachweis') { hinweis.textContent = stufe === 'einfach' ? 'Die einfache Sprache gilt ab der nächsten Seite.' : 'Die Standardsprache gilt ab der nächsten Seite.'; return; }
    hinweis.textContent = '';
    window.LERNPAKET.zeige(a.teil, a.i);
  }
  leiste.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-stufe]');
    if (b) setze(b.getAttribute('data-stufe'), true);
  });

  /* ---- Start: gespeicherte Wahl übernehmen (vor dem ersten Zeichnen durch engine.js) ---- */
  setze(STUFEN.lies('sprache', 'standard'), false);
  window.SPRACHWAHL = { setze: setze, einfach: EINFACH };
})();
