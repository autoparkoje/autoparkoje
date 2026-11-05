<div align="center">
🅿️ Sistem Inteligjent për Monitorimin dhe Menaxhimin e Parkimit në Qendra Tregtare

Prototip IoT + Web për zbulimin e vendeve të lira, orientimin e shoferëve dhe gjetjen e veturës së parkuar.

Show Image Show Image Show Image Show Image Show Image Show Image Show Image

Moduli STC • Viti akademik 2026–2027 • Mentore: Prof. Ass. Dr. Aferdita Ibrahimi

</div> <!-- Shto këtu një screenshot ose GIF të dashboard-it dhe një foto të modelit fizik --> <!-- ![Demo](docs/images/demo.gif) -->
📑 Përmbajtja
Përmbledhje
Funksionalitetet
Arkitektura
Pajisjet
Skema e pinave
Logjika e zbulimit
Struktura e repo-s
Instalimi dhe nisja
QR Code
Testimi
Plani i realizimit
Ekipi
Kufizimet dhe zhvillimet e ardhshme
Licenca
📖 Përmbledhje

Ky projekt realizon një prototip për monitorimin e vendeve të parkimit në një qendër tregtare. Një model fizik me 8 vende parkimi (P1–P8) përdor sensorë ultrasonikë HC-SR04, të lexuar nga një Arduino Uno. Matjet dërgohen përmes USB Serial te kompjuteri dhe shfaqen në një web aplikacion në kohë reale: vendet e lira me të gjelbër, vendet e zëna me të kuqe.

Projekti kombinon elektronikën, programimin e mikrokontrollerëve, komunikimin serial, databazat dhe zhvillimin web në një sistem të vetëm të integruar.

✨ Funksionalitetet

Hardware

8 vende parkimi me nga një sensor HC-SR04 secili
Sinjalizim me LED për çdo vend (gjelbër = i lirë, kuq = i zënë)
Model fizik me vija ndarëse, hyrje, rrugë qarkullimi dhe miniatura veturash

Web aplikacioni

🗺️ Hartë vizuale e parkingut me gjendje live
🧭 Ndarje dhe filtrim sipas sektorëve
📊 Statistika: total, vende të lira, të zëna, probleme sensorësh
📱 QR Code për secilin vend dhe funksioni “Gjeje veturën time”
🔐 Kyçje e përdoruesve dhe ruajtja e kohës së qëndrimit
🕒 Rezervime vendesh me orën e daljes
🛠️ Panel administrativ për parametra, sektorë dhe gjendje
⚠️ Njoftim për humbje lidhjeje ose gabime sensorësh
💾 Databazë për vendet, matjet dhe historikun
🏗️ Arkitektura
USB Serial 9600 baud
8 × HC-SR04
Arduino UnoC/C++
Kompjuteri
Programi ndërmjetësWeb Serial / Node.js
Backend / APINode.js
SQLite
Web aplikacioni
LED-të
Shtresa	Përgjegjësia	Teknologjia
Sensorët	Matja e distancës për çdo vend	8 × HC-SR04
Mikrokontrolleri	Leximi dhe përgatitja e të dhënave	Arduino Uno, C/C++
Komunikimi	Dërgimi i të dhënave te kompjuteri	USB Serial, 9600 baud
Ndërmjetësi	Leximi i portës seriale	Web Serial API / Node.js
Backend/API	Pranimi dhe shpërndarja e gjendjeve	Node.js
Databaza	Vendet, matjet, historiku, rezervimet	SQLite
Frontend	Harta, sektorët, statistikat, QR, administrimi	HTML / CSS / JavaScript

ℹ️ Arduino Uno nuk ka Wi-Fi të integruar, prandaj komunikimi me kompjuterin bëhet përmes USB-së.

🔌 Pajisjet (Hardware)
Komponenti	Sasia	Shënime
Arduino Uno R3	1	Mikrokontrolleri kryesor
Sensor HC-SR04	8	Një për çdo vend parkimi
LED (gjelbër/kuq)	8	Sinjalizimi i gjendjes
Rezistorë për LED	8	Një në seri me secilin LED
Breadboard	1	Prototipim i lidhjeve
Jumper wires (FF / MF / MM)	~40	20 FF + 20 MF
Kabllo USB	1	Komunikimi serial
Servo motor	1	Opsional – barriera hyrëse
LCD 16×2	1	Opsional – numri i vendeve të lira
Bazë fizike + miniatura veturash	–	Foam board / MDF, deri në 8 vetura
📍 Skema e pinave
Vendi	TRIG	ECHO
P1	D2	D3
P2	D4	D5
P3	D6	D7
P4	D8	D9
P5	D10	D11
P6	D12	D13
P7	A0	A1
P8	A2	A3
Të gjithë sensorët ndajnë 5V dhe GND; secili ka TRIG dhe ECHO të veçantë.
Sensorët lexohen një nga një për të shmangur ndërhyrjet ultrasonike.
Nëse përdoret LCD me I²C, ai përdor zakonisht A4/A5.
⚠️ Skema duhet verifikuar me lidhjet e fundit para montimit të të 8 sensorëve.
📐 Logjika e zbulimit të zënies

Parametrat fillestarë për testim:

Parametri	Vlera
Distanca maksimale	10 cm
Pragu i zënies	3 cm
Matja	Gjendja
≤ 3 cm (e vlefshme)	🔴 E zënë
> 3 cm dhe ≤ 10 cm	🟢 E lirë
E pavlefshme / pa echo	🟠 Problem teknik (nuk interpretohet si “e lirë”)

HC-SR04 ka kufi minimal praktik rreth 2 cm, prandaj pragu duhet kalibruar fizikisht në model.

📂 Struktura e repo-s

Përshtate sipas strukturës reale të projektit.

text
.
├── arduino/            # Kodi C/C++ për Arduino Uno (sensorë + LED)
├── backend/            # API (Node.js) + databaza SQLite
├── frontend/           # Dashboard: hartë, sektorë, statistika, QR, admin
├── docs/               # Raporti, skemat, fotografitë, rezultatet e testeve
│   └── images/
├── .gitignore
├── LICENSE
└── README.md
🚀 Instalimi dhe nisja
Kërkesat
Arduino IDE (ose PlatformIO)
Node.js 18+
Shfletues i bazuar në Chromium (Chrome / Edge) për Web Serial API
1. Klono repo-n
bash
git clone https://github.com/<organizata-ose-perdoruesi>/<emri-i-repo-s>.git
cd <emri-i-repo-s>
2. Ngarko kodin në Arduino
Hap arduino/ në Arduino IDE.
Zgjidh Board: Arduino Uno dhe portën e duhur.
Ngarko (Upload) kodin dhe hap Serial Monitor në 9600 baud për kontroll.
3. Nis backend-in
bash
cd backend
npm install
npm start
4. Hap dashboard-in
Hap frontend/index.html ose adresën e backend-it (p.sh. http://localhost:3000).
Shtyp “Lidh Arduino” dhe zgjidh portën serial (Web Serial).

Për qasje nga pajisje të tjera (p.sh. telefona që skanojnë QR) aplikacioni duhet të jetë i hostuar online ose në të njëjtin rrjet lokal.

📱 QR Code / “Gjeje veturën time”

Çdo vend parkimi ka një QR Code unik që identifikon vendin (p.sh. P3, Sektori A).

Përdoruesi skanon QR-in e vendit ku parkon.
Sistemi ruan vendndodhjen dhe (opsionalisht) orën e daljes për rezervim.
Më vonë, te “Gjeje veturën time”, përdoruesi sheh vendin e ruajtur në hartë.

QR Code nuk detekton veturën automatikisht; ai identifikon vendin që skanohet. Detektimi i zënies bëhet nga sensorët.

🧪 Testimi
Testi	Rezultati i pritshëm
Vendi i lirë	Paraqitet i lirë, LED gjelbër
Vendi i zënë	Paraqitet i zënë, LED kuq
Pragu i distancës (rreth 3 cm)	Klasifikimi përputhet me konfigurimin
Pa echo	Shfaqet paralajmërim teknik
USB i shkëputur	Aplikacioni njofton humbjen e lidhjes
QR Code	Vendi identifikohet dhe ruhet
Ndërrimi i sektorit	Harta filtrohet sipas sektorit
Statistikat	Numrat përditësohen saktë
Databaza	Ndryshimi ruhet dhe lexohet saktë

Rezultatet dhe fotografitë e testeve ruhen në docs/.

🗓️ Plani i realizimit
 1. Planifikimi (role, pajisje, skema e pinave, dizajni)
 2. Testimi i sensorëve (2 ekzistues, pastaj 8)
 3. Modeli fizik (bazë, vija, vende, sensorë, LED)
 4. Arduino dhe USB (kodi C/C++, format serial i qëndrueshëm)
 5. Frontend-i (hartë, sektorë, statistika, QR)
 6. Backend dhe databaza
 7. Testimi i përgjithshëm
 8. Raporti dhe prezantimi
👥 Ekipi
Anëtari	Roli	Përgjegjësitë kryesore
Erblin Baliqi	Koordinator, Arduino C/C++, integrim fizik	Afatet, komunikimi me mentoren, kodi Arduino, lidhjet fizike
Isra Miftari	Frontend/UX dhe QR Code	Harta P1–P8, sektorët, ndërfaqja responsive, QR, “Gjeje veturën time”
Erdi Latifi	Databaza	Modelimi i të dhënave, tabelat, saktësia e të dhënave
Emir Daku	Backend/API, DevOps	API, integrimi me Arduino, Git, mjedisi i zhvillimit, deploy
Blend Arifi	Rrjetet, pjesa fizike, testimi	Montimi, diagnostikimi i komunikimit, dokumentimi i rrjedhës së të dhënave
Loresa Demiri	Dokumentim dhe testim bazë	Raporti, lista e testeve, fotografitë, materialet e prezantimit

Mentore: Prof. Ass. Dr. Aferdita Ibrahimi

⚠️ Kufizimet dhe zhvillimet e ardhshme
Prototip me 8 vende; sensorët ultrasonikë janë të ndjeshëm ndaj këndit dhe sipërfaqes së objektit.
Lidhja me kompjuterin është me kabllo (USB); një version i ardhshëm mund të përdorë ESP32/Wi-Fi.
Zgjerim me historik të plotë dhe grafikë analitikë.
Integrim i barrierës hyrëse (servo) dhe LCD për vendet e lira.
📄 Licenca

Projekti shpërndahet nën licencën MIT. Shiko skedarin LICENSE për detaje.

<div align="center">

Realizuar me ❤️ nga ekipi i Moduli STC • 2026–2027

</div>
