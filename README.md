# Parkimi Inteligjent: serveri

## Nisja
    npm install
    PARKIMI_KEY=një-fjalëkalim-i-gjatë npm start

Hap http://localhost:3000. Baza është skedari `parkimi.db` (SQLite), krijohet vetë.

## Kompjuteri me Arduino
1. Hap faqen nga serveri (në Chrome/Edge). Te "Çelësi i serverit" ngjit `PARKIMI_KEY`.
2. Kliko "Lidh USB". Gjendja e vendeve dërgohet te serveri vetë.

## Telefonat
Hapin linkun e serverit (ose skanojnë QR). Te "Linku publik" vendos adresën publike të serverit, pastaj printo QR-të.

## Hosting
Duhet një host me disk të përhershëm: VPS, Fly.io me volume, ose Raspberry Pi në parking
(me Cloudflare Tunnel për HTTPS). Hostet me disk të përkohshëm e humbasin `parkimi.db`.
Ndrysho `DB_FILE` nëse e do skedarin diku tjetër.

## Kufizime
Hyrja është vetëm emër + targë, pa fjalëkalim. Emrat shfaqen te të gjithë, targat jo.
