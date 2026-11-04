# Parkimi (cloud)

Rezervim dhe parkim përmes QR kodit. Hapur 09:00–23:00, çdo rezervim 15 min – 3 orë.

## Nisja lokale
    npm install
    ADMIN_KEY=një-fjalëkalim-i-gjatë SEED_DEMO=1 npm start
Hap http://localhost:3000 (SEED_DEMO shton disa makina shembull; hiqe në prodhim).

## Docker
    docker build -t parkimi .
    docker run -d -p 3000:3000 -e ADMIN_KEY=... -v parkimi-data:/data parkimi

## Cloud
Duhet host me disk të përhershëm për SQLite (Fly.io me volume, VPS, etj.) dhe HTTPS.
Vetëm 1 kopje e serverit. Variablat: ADMIN_KEY, TZ (parazgjedhja Europe/Belgrade), DB_FILE, PORT.

## Faqet
- `/` harta dhe rezervimi · `/#print` QR kodet për printim · `/#admin` regjistri (emër, telefon, vend, orar)
