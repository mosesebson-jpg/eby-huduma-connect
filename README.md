# EBY HUDUMA CONNECT

Jukwaa la huduma na biashara la EBY MEDIA TZ. Toleo hili ni mwanzo wa frontend (HTML/CSS/JavaScript) unaoweza kujaribiwa bila Netlify.

## Kilichopo
- Muonekano unaojibadilisha kwa simu na kompyuta.
- Usajili na kuingia kupitia Supabase Auth.
- Kutuma biashara kwa ukaguzi (status `pending`).
- Kuonyesha biashara zilizoidhinishwa (`approved`).
- Utafutaji kwa jina, maelezo na eneo.
- Hakuna Supabase service-role key ndani ya frontend.

## 1. Unganisha Supabase
1. Fungua Supabase project `EBY-HUDUMA-CONNECT`.
2. Nenda **Project Settings → API** (au sehemu ya API Keys kwenye dashboard).
3. Nakili **Project URL** na **anon/public key** pekee.
4. Fungua `config.js` na ujaze:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
5. Usitumie `service_role` / `secret` key. Usishiriki database password.

## 2. Jaribio la ndani
Fungua `index.html` kwenye browser. Kwa baadhi ya browser, JavaScript modules/CDN au usalama wa browser unaweza kuhitaji kuendesha kupitia local static server. Unaweza pia kutumia GitHub Pages.

## 3. GitHub Pages (bila Netlify)
1. Tengeneza repository mpya, kwa mfano `eby-huduma-connect`.
2. Pakia mafaili yote yaliyomo kwenye folda hii kwenye root ya repository.
3. GitHub repository → **Settings → Pages**.
4. Chagua **Deploy from a branch**, branch `main`, folder `/ (root)`, kisha Save.
5. Subiri GitHub itoe anwani ya tovuti.

GitHub Pages ni static hosting. Hakuna malipo ya Netlify yanayotumika, lakini tumia kwa kufuata masharti ya GitHub Pages na usiweke data za siri kwenye repository.

## 4. Muhimu kuhusu Supabase
- Jedwali la `businesses` linatarajia columns zilizotengenezwa kwenye SQL ya awali.
- Hakikisha RLS imewashwa na policies zinafanya kazi.
- Kwa usajili, Supabase inaweza kuhitaji mtumiaji athibitishe email kabla ya kuingia.
- Akaunti ya admin inapaswa kupewa role kupitia SQL Editor kwa mmiliki aliyeidhinishwa.
- Frontend hii haijumuishi malipo, AI API, ajira/vikundi CRUD au dashboard kamili ya admin. Vipengele hivyo vitaongezwa na kupimwa hatua kwa hatua.

## 5. Usalama
`anon/public key` imekusudiwa kutumika kwenye frontend ikiwa RLS imewekwa kwa usahihi. **Usiweke** `service_role`, secret key, database password, au token binafsi kwenye `config.js`, GitHub, screenshot au chat.

## Picha za biashara (hatua ya 3)
1. Fungua `business-images-migration.sql` na utekeleze SQL yote mara moja kwenye Supabase SQL Editor.
2. Hakikisha bucket `business-images` imeundwa na columns `image_url` na `storage_path` zipo kwenye `businesses`.
3. Kisha pakia mafaili yote ya kifurushi hiki kwenye root ya GitHub Pages.
4. Picha ni ya hiari wakati wa usajili; ukubwa wa juu ni MB 5, JPG/PNG/WEBP.
5. Picha itaonekana kwenye tovuti kuu baada ya biashara kuidhinishwa.
