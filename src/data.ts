/**
 * Static content for the public site.
 *
 * FALLBACK_PROJECTS / FALLBACK_SERVICES mirror the Supabase seed in
 * supabase/schema.sql row-for-row (same slugs, media, EN/LV/RU copy) — they are
 * what useProjects/useServices render when Supabase is unconfigured, erroring,
 * or empty, so the site looks identical either way. Keep both in sync.
 *
 * The remaining exports (SERVICES home-card content, SPACE_LABELS, logos,
 * CONTACT, SCHEDULING) are transcribed from Shakur.dc.html.
 */

import type { Dict } from './i18n';
import type { L10n, MediaItem, ProjectRow, ServiceRow } from './lib/db';

const l = (en: string, lv: string, ru: string): L10n => ({ en, lv, ru });

const img = (id: string, src: string): MediaItem => ({ id, type: 'image', src });
const vid = (id: string, src: string): MediaItem => ({ id, type: 'video', src });

/** Rows carry DB timestamps; static fallbacks don't have them. */
const NO_TS = { created_at: '', updated_at: '' } as const;

// ---------------------------------------------------------------------------
// Projects — mirrors supabase/schema.sql seed.
// ---------------------------------------------------------------------------

export const FALLBACK_PROJECTS: ProjectRow[] = [
  {
    id: 'rimi',
    slug: 'rimi',
    service: 'Drywall partition installation, interior finishing',
    status: 'Completed',
    published: true,
    sort_order: 1,
    client: 'RIMI Latvia',
    country: 'Latvia',
    city: 'Rīga (Milgrāvis)',
    loc: 'RIMI Milgrāvis',
    url: 'https://www.rimi.lv',
    start_date: '2021-04-01',
    end_date: '2022-08-01',
    cover: 'm1',
    media: [
      img('m1', 'images/proj-rimi.png'),
      img('m2', 'images/rimi.png'),
      img('m3', 'images/svc-1.png'),
      img('m4', 'images/img-9c88.png'),
      img('m5', 'images/img-be98.png'),
      img('m6', 'images/img-97b7.png'),
      img('m7', 'images/img-193d.png'),
      img('m8', 'images/home-interior.png'),
    ],
    space_img: 'images/rimi.png',
    i18n: {
      title: l('Rimi Latvia', 'Rimi Latvia', 'Rimi Latvia'),
      summary: l(
        'Retail hypermarket fit-out across 8,400 m², delivered on a live-site schedule.',
        'Mazumtirdzniecības hipermārketa izbūve 8 400 m² platībā, veikta pēc strādājoša objekta grafika.',
        'Отделка гипермаркета площадью 8 400 м², выполненная по графику действующего объекта.'
      ),
      description: l(
        "Shakur delivered the complete interior build for Rimi's Milgrāvis hypermarket, working to a fixed opening date on a phased, live-site programme. Our crews handled partitions, suspended ceilings, and the full finishing package while coordinating around mechanical, electrical, and refrigeration trades.\n\nThe scope covered back-of-house offices, cold-store surrounds, customer washrooms, and the main sales floor. Every phase was sequenced to keep adjacent areas operational, with nightly cleans and strict dust control so handover areas stayed retail-ready.",
        'Shakur veica pilnu iekšdarbu izbūvi Rimi Milgrāvja hipermārketā, strādājot pēc fiksēta atvēršanas datuma pakāpeniskā, strādājoša objekta programmā. Mūsu komandas veica starpsienas, piekaramos griestus un pilnu apdares paketi, koordinējoties ar mehānikas, elektrības un saldēšanas iekārtu darbiem.\n\nApjoms ietvēra saimniecības birojus, aukstuma kameru apdares, klientu tualetes un galveno tirdzniecības zāli. Katrs posms tika plānots tā, lai blakus zonas paliktu darbojošās — ar nakts uzkopšanu un stingru putekļu kontroli, lai nododamās platības būtu gatavas tirdzniecībai.',
        'Shakur выполнил полный комплекс внутренних работ в гипермаркете Rimi в Милгрависе, работая к фиксированной дате открытия по поэтапной программе на действующем объекте. Наши бригады выполнили перегородки, подвесные потолки и полный пакет отделки, координируясь с механическими, электрическими и холодильными подрядчиками.\n\nОбъём включал служебные офисы, обрамление холодильных камер, санузлы для покупателей и основной торговый зал. Каждый этап был выстроен так, чтобы соседние зоны продолжали работать, — с ночной уборкой и строгим контролем пыли, чтобы сдаваемые площади оставались готовыми к торговле.'
      ),
    },
    scope: {
      title: l(
        'What we delivered on this build.',
        'Ko mēs paveicām šajā projektā.',
        'Что мы выполнили на этом объекте.'
      ),
      intro: l(
        'A single accountable team across every interior trade, sequenced around a live retail environment and a fixed opening date.',
        'Viena atbildīga komanda visos iekšdarbu veidos, plānota ap strādājošu tirdzniecības vidi un fiksētu atvēršanas datumu.',
        'Одна ответственная команда по всем внутренним работам, выстроенная вокруг работающего магазина и фиксированной даты открытия.'
      ),
      items: [
        {
          number: '01',
          title: l('Partitions & structure', 'Starpsienas un konstrukcija', 'Перегородки и конструкция'),
          description: l(
            'Full metal-stud partition system to the retail layout.',
            'Pilna metāla karkasa starpsienu sistēma pēc tirdzniecības plānojuma.',
            'Полная система перегородок на металлическом каркасе по торговой планировке.'
          ),
          bullets: [
            l('Back-of-house offices', 'Saimniecības biroji', 'Служебные офисы'),
            l('Cold-store surrounds', 'Aukstuma kameru apdares', 'Обрамление холодильных камер'),
            l('Fire-rated separations', 'Ugunsdrošās atdalošās sienas', 'Противопожарные разделения'),
          ],
        },
        {
          number: '02',
          title: l('Suspended ceilings', 'Piekaramie griesti', 'Подвесные потолки'),
          description: l(
            'Grid and MF ceilings with integrated services.',
            'Režģu un MF griesti ar integrētām komunikācijām.',
            'Кассетные и MF-потолки с интегрированными коммуникациями.'
          ),
          bullets: [
            l('Lighting cut-outs', 'Izgriezumi apgaismojumam', 'Вырезы под освещение'),
            l('HVAC & sprinkler coordination', 'Ventilācijas un sprinkleru koordinācija', 'Координация вентиляции и спринклеров'),
            l('Access panels', 'Revīzijas lūkas', 'Ревизионные люки'),
          ],
        },
        {
          number: '03',
          title: l('Finishing', 'Apdare', 'Отделка'),
          description: l(
            'Plaster, tiling, and decoration to a retail standard.',
            'Apmetums, flīzēšana un dekorēšana tirdzniecības standartā.',
            'Штукатурка, плитка и отделка по торговому стандарту.'
          ),
          bullets: [
            l('Washroom tiling', 'Tualešu flīzēšana', 'Плитка в санузлах'),
            l('Level-5 feature walls', 'Level-5 akcentu sienas', 'Акцентные стены Level-5'),
            l('Snag-free handover', 'Nodošana bez defektiem', 'Сдача без недоделок'),
          ],
        },
        {
          number: '04',
          title: l('Programme & logistics', 'Grafiks un loģistika', 'График и логистика'),
          description: l(
            'Phased delivery on a live, operational site.',
            'Pakāpeniska izpilde strādājošā objektā.',
            'Поэтапная сдача на действующем объекте.'
          ),
          bullets: [
            l('Night works', 'Nakts darbi', 'Ночные работы'),
            l('Dust control', 'Putekļu kontrole', 'Контроль пыли'),
            l('Fixed opening date met', 'Fiksētais atvēršanas datums ievērots', 'Фиксированная дата открытия соблюдена'),
          ],
        },
      ],
    },
    ...NO_TS,
  },
  {
    id: 'kuldiga',
    slug: 'kuldiga',
    service: 'Gypsum partition wall installation, tiling, plastering',
    status: 'Completed',
    published: true,
    sort_order: 2,
    client: 'Kuldīga Park Development',
    country: 'Latvia',
    city: 'Rīga (Āgenskalns)',
    loc: 'Kuldīgas parks',
    url: 'https://www.hipekon.lv',
    start_date: '2022-02-01',
    end_date: '2023-06-01',
    cover: 'm1',
    media: [
      img('m1', 'images/proj-kuldiga.png'),
      img('m2', 'images/img-771e.png'),
      img('m3', 'images/pv-hero.jpg'),
      img('m4', 'images/svc-1.png'),
      img('m5', 'images/img-9c88.png'),
      img('m6', 'images/img-be98.png'),
      img('m7', 'images/home-interior.png'),
      img('m8', 'images/img-97b7.png'),
    ],
    space_img: 'images/img-771e.png',
    i18n: {
      title: l('Kuldīga Park Development', 'Kuldīgas parka projekts', 'Проект Kuldīgas Parks'),
      summary: l(
        'Multi-apartment complex finishing — plaster, paint, and detailing throughout.',
        'Daudzdzīvokļu kompleksa apdare — apmetums, krāsojums un detaļas visā projektā.',
        'Отделка многоквартирного комплекса — штукатурка, покраска и детали по всему проекту.'
      ),
      description: l(
        'Complete finishing package across a multi-block residential development.',
        'Pilna apdares pakete daudzkorpusu dzīvojamā kompleksā.',
        'Полный пакет отделочных работ в многокорпусном жилом комплексе.'
      ),
    },
    scope: {
      title: l(
        'The full finishing package, block by block.',
        'Pilna apdares pakete, korpusu pa korpusam.',
        'Полный пакет отделки, корпус за корпусом.'
      ),
      intro: l(
        'A single finishing team across a multi-block residential development — consistent quality from the first apartment to the last.',
        'Viena apdares komanda visā daudzkorpusu dzīvojamā kompleksā — nemainīga kvalitāte no pirmā dzīvokļa līdz pēdējam.',
        'Одна отделочная команда на весь многокорпусный жилой комплекс — стабильное качество от первой квартиры до последней.'
      ),
      items: [
        {
          number: '01',
          title: l('Plastering', 'Apmešana', 'Штукатурка'),
          description: l(
            'Machine and hand plastering across every unit.',
            'Mašīnapmetums un rokas apmetums katrā dzīvoklī.',
            'Машинная и ручная штукатурка в каждой квартире.'
          ),
          bullets: [
            l('Walls & ceilings', 'Sienas un griesti', 'Стены и потолки'),
            l('Skim-coat finishing', 'Nogludinošā apdare', 'Финишная шпаклёвка'),
            l('Crack-free surfaces', 'Virsmas bez plaisām', 'Поверхности без трещин'),
          ],
        },
        {
          number: '02',
          title: l('Painting & decoration', 'Krāsošana un dekorēšana', 'Покраска и декорирование'),
          description: l(
            "Uniform decoration to the developer's spec.",
            'Vienota dekorēšana pēc attīstītāja specifikācijas.',
            'Единая отделка по спецификации застройщика.'
          ),
          bullets: [
            l('Colour-matched systems', 'Saskaņoti krāsu toņi', 'Согласованные цвета'),
            l('Common areas & stairwells', 'Koplietošanas telpas un kāpņutelpas', 'Общие зоны и лестничные клетки'),
            l('Protective coats', 'Aizsargpārklājumi', 'Защитные слои'),
          ],
        },
        {
          number: '03',
          title: l('Tiling', 'Flīzēšana', 'Плиточные работы'),
          description: l(
            'Bathrooms and kitchens tiled to the show-home standard.',
            'Vannas istabas un virtuves, izflīzētas parauga dzīvokļa standartā.',
            'Ванные и кухни, облицованные по стандарту шоу-рума.'
          ),
          bullets: [
            l('Waterproofed wet rooms', 'Hidroizolētas mitrās telpas', 'Гидроизолированные влажные зоны'),
            l('Wall & floor tiling', 'Sienu un grīdu flīzēšana', 'Плитка на стены и пол'),
            l('Silicone detailing', 'Silikona šuvju apstrāde', 'Силиконовые швы'),
          ],
        },
        {
          number: '04',
          title: l('Handover', 'Nodošana', 'Сдача'),
          description: l(
            'Apartment-by-apartment quality control.',
            'Kvalitātes kontrole dzīvokli pa dzīvoklim.',
            'Контроль качества квартира за квартирой.'
          ),
          bullets: [
            l('Snag lists closed', 'Defektu saraksti slēgti', 'Списки недоделок закрыты'),
            l('Developer walkthroughs', 'Apskates ar attīstītāju', 'Обходы с застройщиком'),
            l('Phased handover met', 'Pakāpeniskā nodošana ievērota', 'Поэтапная сдача соблюдена'),
          ],
        },
      ],
    },
    ...NO_TS,
  },
  {
    id: 'kepler',
    slug: 'kepler',
    service: 'Interior finishing, custom fit-out',
    status: 'Completed',
    published: true,
    sort_order: 3,
    client: 'Kepler',
    country: 'Latvia',
    city: 'Rīga (RIX Airport)',
    loc: 'Kepler Club: Hotel & Lounge at RIX Airport',
    url: 'https://kepler.club',
    start_date: '2023-01-01',
    end_date: '2023-05-01',
    cover: 'm1',
    media: [
      img('m1', 'images/proj-kepler.png'),
      img('m2', 'images/img-aa46.png'),
      img('m3', 'images/img-9c88.png'),
      img('m4', 'images/home-interior.png'),
      img('m5', 'images/svc-1.png'),
      img('m6', 'images/img-be98.png'),
      img('m7', 'images/img-193d.png'),
      img('m8', 'images/img-97b7.png'),
    ],
    space_img: 'images/img-aa46.png',
    i18n: {
      title: l('Kepler Club', 'Kepler Club', 'Kepler Club'),
      summary: l(
        'Airport lounge custom fit-out with feature walls and bespoke joinery.',
        'Lidostas atpūtas zonas individuāla izbūve ar akcentu sienām un galdniecību pēc pasūtījuma.',
        'Индивидуальная отделка лаунжа аэропорта с акцентными стенами и столяркой на заказ.'
      ),
      description: l(
        'A premium lounge fit-out at RIX airport, delivered to a tight aviation programme.',
        'Premium atpūtas zonas izbūve RIX lidostā, veikta pēc saspringta aviācijas grafika.',
        'Отделка премиального лаунжа в аэропорту RIX, выполненная по жёсткому авиационному графику.'
      ),
    },
    scope: {
      title: l(
        'A premium fit-out, delivered airside.',
        'Premium izbūve, veikta lidostas drošības zonā.',
        'Премиальная отделка, выполненная в стерильной зоне аэропорта.'
      ),
      intro: l(
        'Feature finishes and bespoke joinery inside a live airport — delivered on a tight aviation programme with strict security logistics.',
        'Akcentu apdare un individuāla galdniecība strādājošā lidostā — veikta pēc saspringta aviācijas grafika ar stingru drošības loģistiku.',
        'Акцентная отделка и столярка на заказ внутри действующего аэропорта — по жёсткому авиационному графику со строгой логистикой безопасности.'
      ),
      items: [
        {
          number: '01',
          title: l('Feature walls', 'Akcentu sienas', 'Акцентные стены'),
          description: l(
            'Statement surfaces for a premium lounge feel.',
            'Izteiksmīgas virsmas premium atpūtas zonas sajūtai.',
            'Выразительные поверхности для атмосферы премиального лаунжа.'
          ),
          bullets: [
            l('Level-5 feature walls', 'Level-5 akcentu sienas', 'Акцентные стены Level-5'),
            l('Timber slat panelling', 'Koka līstu paneļi', 'Реечные деревянные панели'),
            l('Integrated lighting details', 'Integrēta apgaismojuma detaļas', 'Интегрированные детали освещения'),
          ],
        },
        {
          number: '02',
          title: l('Bespoke joinery', 'Individuāla galdniecība', 'Столярка на заказ'),
          description: l(
            'Custom-built bar, counters, and fittings.',
            'Pēc pasūtījuma būvēts bārs, letes un aprīkojums.',
            'Барная стойка, прилавки и оснащение, изготовленные на заказ.'
          ),
          bullets: [
            l('Reception & bar joinery', 'Reģistratūras un bāra galdniecība', 'Столярка ресепшена и бара'),
            l('Built-in seating', 'Iebūvētas sēdvietas', 'Встроенные сиденья'),
            l('Bespoke storage', 'Individuālas glabātuves', 'Индивидуальные системы хранения'),
          ],
        },
        {
          number: '03',
          title: l('Finishing', 'Apdare', 'Отделка'),
          description: l(
            'Premium materials, precisely detailed.',
            'Premium materiāli, precīzi detalizēti.',
            'Премиальные материалы с точной детализацией.'
          ),
          bullets: [
            l('Premium paint systems', 'Premium krāsu sistēmas', 'Премиальные системы окраски'),
            l('Stone & tile accents', 'Akmens un flīžu akcenti', 'Акценты из камня и плитки'),
            l('Acoustic treatments', 'Akustiskā apdare', 'Акустическая отделка'),
          ],
        },
        {
          number: '04',
          title: l('Airside logistics', 'Drošības zonas loģistika', 'Логистика стерильной зоны'),
          description: l(
            'Working inside airport security.',
            'Darbs lidostas drošības zonā.',
            'Работа внутри зоны авиационной безопасности.'
          ),
          bullets: [
            l('Escorted crews & passes', 'Pavadītas komandas un caurlaides', 'Сопровождение бригад и пропуска'),
            l('Night-shift programme', 'Nakts maiņu grafiks', 'График ночных смен'),
            l('Fixed opening date met', 'Fiksētais atvēršanas datums ievērots', 'Фиксированная дата открытия соблюдена'),
          ],
        },
      ],
    },
    ...NO_TS,
  },
  {
    id: 'moho',
    slug: 'moho',
    service: 'Drywall, finishing, plastering',
    status: 'Completed',
    published: true,
    sort_order: 4,
    client: 'MOHO Park',
    country: 'Latvia',
    city: 'Rīga',
    loc: 'MOHO PARK',
    url: 'https://mohopark.lv',
    start_date: '2023-01-01',
    end_date: '2024-01-01',
    cover: 'm1',
    media: [
      img('m1', 'images/proj-moho.png'),
      img('m2', 'images/img-39bf.png'),
      img('m3', 'images/home-hero.jpg'),
      img('m4', 'images/svc-1.png'),
      img('m5', 'images/img-9c88.png'),
      img('m6', 'images/img-be98.png'),
      img('m7', 'images/img-193d.png'),
      img('m8', 'images/home-interior.png'),
    ],
    space_img: 'images/img-39bf.png',
    i18n: {
      title: l('MOHO Park Development', 'MOHO parka projekts', 'Проект MOHO Park'),
      summary: l(
        'Residential towers — drywall and partition systems across every floor.',
        'Dzīvojamie torņi — ģipškartona un starpsienu sistēmas katrā stāvā.',
        'Жилые башни — системы гипсокартона и перегородок на каждом этаже.'
      ),
      description: l(
        'Drywall and partition works across every floor of the MOHO Park residential towers.',
        'Ģipškartona un starpsienu darbi visos MOHO Park dzīvojamo torņu stāvos.',
        'Работы по гипсокартону и перегородкам на всех этажах жилых башен MOHO Park.'
      ),
    },
    scope: {
      title: l(
        'Drywall at residential-tower scale.',
        'Ģipškartons dzīvojamo torņu mērogā.',
        'Гипсокартон в масштабе жилых башен.'
      ),
      intro: l(
        "Partition and ceiling systems across every floor of the MOHO Park towers — sequenced with the developer's trades on a rolling programme.",
        'Starpsienu un griestu sistēmas katrā MOHO Park torņu stāvā — plānotas kopā ar attīstītāja darbiem ritošā grafikā.',
        'Системы перегородок и потолков на каждом этаже башен MOHO Park — по скользящему графику вместе с подрядчиками застройщика.'
      ),
      items: [
        {
          number: '01',
          title: l('Partition systems', 'Starpsienu sistēmas', 'Системы перегородок'),
          description: l(
            'Metal-stud partitions across every apartment.',
            'Metāla karkasa starpsienas katrā dzīvoklī.',
            'Перегородки на металлическом каркасе в каждой квартире.'
          ),
          bullets: [
            l('Apartment separating walls', 'Dzīvokļu atdalošās sienas', 'Межквартирные стены'),
            l('Acoustic build-ups', 'Akustiskās konstrukcijas', 'Акустические конструкции'),
            l('Fire-rated assemblies', 'Ugunsdrošās konstrukcijas', 'Огнестойкие сборки'),
          ],
        },
        {
          number: '02',
          title: l('Ceilings', 'Griesti', 'Потолки'),
          description: l(
            'Suspended ceilings with integrated services.',
            'Piekaramie griesti ar integrētām komunikācijām.',
            'Подвесные потолки с интегрированными коммуникациями.'
          ),
          bullets: [
            l('MF ceiling systems', 'MF griestu sistēmas', 'Системы MF-потолков'),
            l('Service voids', 'Komunikāciju šahtas', 'Ниши для коммуникаций'),
            l('Access panels', 'Revīzijas lūkas', 'Ревизионные люки'),
          ],
        },
        {
          number: '03',
          title: l('Boarding & finishing', 'Apšuvums un apdare', 'Обшивка и отделка'),
          description: l(
            'Taped, jointed, paint-ready surfaces.',
            'Špaktelētas, krāsošanai gatavas virsmas.',
            'Зашпаклёванные поверхности, готовые под покраску.'
          ),
          bullets: [
            l('Moisture board in wet rooms', 'Mitrumizturīgās plāksnes mitrajās telpās', 'Влагостойкие плиты во влажных зонах'),
            l('Jointing & skimming', 'Šuvju aizpildīšana un gludināšana', 'Заделка швов и шпаклёвка'),
            l('Decorator-ready handover', 'Nodošana gatava krāsotājam', 'Сдача под маляра'),
          ],
        },
        {
          number: '04',
          title: l('Programme', 'Grafiks', 'График'),
          description: l(
            "Floor-by-floor delivery to the developer's schedule.",
            'Izpilde stāvu pa stāvam pēc attīstītāja grafika.',
            'Сдача этаж за этажом по графику застройщика.'
          ),
          bullets: [
            l('Rolling floor cycles', 'Ritoši stāvu cikli', 'Скользящие циклы по этажам'),
            l('Trade coordination', 'Darbu koordinācija', 'Координация подрядчиков'),
            l('Weekly progress reporting', 'Iknedēļas progresa atskaites', 'Еженедельные отчёты о ходе работ'),
          ],
        },
      ],
    },
    ...NO_TS,
  },
  {
    id: 'daugavas',
    slug: 'daugavas',
    service: 'Structural finishing, drywall systems',
    status: 'Completed',
    published: true,
    sort_order: 5,
    client: 'Daugava Stadium',
    country: 'Latvia',
    city: 'Rīga',
    loc: 'Daugavas Vieglatlētikas Manēža',
    url: 'https://www.daugavasstadions.lv',
    start_date: '2020-05-01',
    end_date: '2021-02-01',
    cover: 'm1',
    media: [
      img('m1', 'images/img-553f.png'),
      img('m2', 'images/svc-1.png'),
      img('m3', 'images/img-97b7.png'),
      img('m4', 'images/img-9c88.png'),
      img('m5', 'images/img-be98.png'),
      img('m6', 'images/img-193d.png'),
      img('m7', 'images/home-interior.png'),
      img('m8', 'images/proj-moho.png'),
    ],
    space_img: 'images/img-553f.png',
    i18n: {
      title: l('Daugava Athletics Hall', 'Daugavas vieglatlētikas manēža', 'Легкоатлетический манеж «Даугава»'),
      summary: l(
        'Sports hall structural works — masonry, blockwork, and concrete.',
        'Sporta halles konstrukciju darbi — mūrniecība, bloku mūris un betons.',
        'Конструктивные работы спортивного зала — кладка, блоки и бетон.'
      ),
      description: l(
        'Structural masonry and concrete works for a municipal athletics hall.',
        'Nesošās mūrniecības un betona darbi pašvaldības vieglatlētikas manēžā.',
        'Несущая кладка и бетонные работы для муниципального легкоатлетического манежа.'
      ),
    },
    scope: {
      title: l(
        'Structural works for a municipal sports hall.',
        'Konstrukciju darbi pašvaldības sporta hallē.',
        'Конструктивные работы для муниципального спортзала.'
      ),
      intro: l(
        'Masonry, blockwork, and concrete for the Daugava athletics hall — heavy structural work delivered to public-sector standards.',
        'Mūrniecība, bloku mūris un betons Daugavas vieglatlētikas manēžai — smagie konstrukciju darbi atbilstoši publiskā sektora standartiem.',
        'Кладка, блоки и бетон для легкоатлетического манежа «Даугава» — тяжёлые конструктивные работы по стандартам публичного сектора.'
      ),
      items: [
        {
          number: '01',
          title: l('Blockwork', 'Bloku mūris', 'Блочная кладка'),
          description: l(
            'Load-bearing and partition block walls.',
            'Nesošās un starpsienu bloku sienas.',
            'Несущие и перегородочные блочные стены.'
          ),
          bullets: [
            l('Structural blockwork', 'Nesošais bloku mūris', 'Несущая блочная кладка'),
            l('Reinforced courses', 'Stiegrotas rindas', 'Армированные ряды'),
            l('Movement joints', 'Deformācijas šuves', 'Деформационные швы'),
          ],
        },
        {
          number: '02',
          title: l('Concrete works', 'Betona darbi', 'Бетонные работы'),
          description: l(
            'Slabs, plinths, and structural concrete.',
            'Plātnes, pamatnes un konstrukciju betons.',
            'Плиты, цоколи и конструкционный бетон.'
          ),
          bullets: [
            l('Reinforced slabs', 'Stiegrotas plātnes', 'Армированные плиты'),
            l('Formwork & pouring', 'Veidņi un betonēšana', 'Опалубка и заливка'),
            l('Surface finishing', 'Virsmas apstrāde', 'Отделка поверхности'),
          ],
        },
        {
          number: '03',
          title: l('Drywall systems', 'Ģipškartona sistēmas', 'Системы гипсокартона'),
          description: l(
            'Interior linings over the structural shell.',
            'Iekšējās apšuves virs nesošās konstrukcijas.',
            'Внутренние обшивки поверх несущего каркаса.'
          ),
          bullets: [
            l('Wall linings', 'Sienu apšuvums', 'Обшивка стен'),
            l('Suspended ceilings', 'Piekaramie griesti', 'Подвесные потолки'),
            l('Acoustic separation', 'Akustiskā atdalīšana', 'Акустическое разделение'),
          ],
        },
        {
          number: '04',
          title: l('Compliance', 'Atbilstība', 'Соответствие нормам'),
          description: l(
            'Public-project documentation throughout.',
            'Publiskā projekta dokumentācija visā gaitā.',
            'Документация публичного проекта на всех этапах.'
          ),
          bullets: [
            l('Building-control records', 'Būvuzraudzības dokumentācija', 'Записи стройнадзора'),
            l('Material certification', 'Materiālu sertifikācija', 'Сертификация материалов'),
            l('Stage inspections', 'Posmu pārbaudes', 'Поэтапные проверки'),
          ],
        },
      ],
    },
    ...NO_TS,
  },
  {
    id: 'sweden',
    slug: 'sweden',
    service: 'Wood construction, exterior & interior finishing',
    status: 'Completed',
    published: true,
    sort_order: 6,
    client: 'Private',
    country: 'Sweden',
    city: '—',
    loc: 'Private Object, Sweden',
    url: '',
    start_date: '2022-06-01',
    end_date: '2023-03-01',
    cover: 'm1',
    media: [
      img('m1', 'images/img-575d.png'),
      img('m2', 'images/img-5279.png'),
      img('m3', 'images/img-97b7.png'),
      img('m4', 'images/svc-1.png'),
      img('m5', 'images/img-9c88.png'),
      img('m6', 'images/img-be98.png'),
      img('m7', 'images/home-interior.png'),
      img('m8', 'images/img-193d.png'),
    ],
    space_img: 'images/img-575d.png',
    i18n: {
      title: l('Private Object in Sweden', 'Privāts objekts Zviedrijā', 'Частный объект в Швеции'),
      summary: l(
        'Private timber residence — framing, cladding, and bespoke joinery.',
        'Privāta koka dzīvojamā māja — karkass, apšuvums un individuāla galdniecība.',
        'Частный деревянный дом — каркас, обшивка и столярка на заказ.'
      ),
      description: l(
        'A private timber home in southern Sweden, from frame to finish.',
        'Privāta koka māja Zviedrijas dienvidos — no karkasa līdz apdarei.',
        'Частный деревянный дом на юге Швеции — от каркаса до отделки.'
      ),
    },
    scope: {
      title: l(
        'A timber home, frame to finish.',
        'Koka māja — no karkasa līdz apdarei.',
        'Деревянный дом — от каркаса до отделки.'
      ),
      intro: l(
        'A private residence in southern Sweden built in wood — structural framing, weatherproof cladding, and interior finishing by one team.',
        'Privāta dzīvojamā māja Zviedrijas dienvidos, būvēta kokā — nesošais karkass, laikapstākļiem izturīgs apšuvums un iekšdarbu apdare vienas komandas izpildījumā.',
        'Частный дом на юге Швеции, построенный из дерева, — несущий каркас, погодостойкая обшивка и внутренняя отделка силами одной команды.'
      ),
      items: [
        {
          number: '01',
          title: l('Timber framing', 'Koka karkass', 'Деревянный каркас'),
          description: l(
            'The structural frame, set out and raised.',
            'Nesošais karkass — izlikts un uzstādīts.',
            'Несущий каркас — разметка и монтаж.'
          ),
          bullets: [
            l('Post & beam frame', 'Statu un siju karkass', 'Стоечно-балочный каркас'),
            l('Roof structure', 'Jumta konstrukcija', 'Конструкция крыши'),
            l('Engineered connections', 'Inženiertehniskie savienojumi', 'Инженерные соединения'),
          ],
        },
        {
          number: '02',
          title: l('Envelope & cladding', 'Apvalks un apšuvums', 'Оболочка и обшивка'),
          description: l(
            'A weatherproof shell for Nordic winters.',
            'Laikapstākļiem izturīgs apvalks Ziemeļvalstu ziemām.',
            'Защищённая от непогоды оболочка для северных зим.'
          ),
          bullets: [
            l('Ventilated cladding', 'Vēdināms apšuvums', 'Вентилируемая обшивка'),
            l('Membranes & insulation', 'Membrānas un izolācija', 'Мембраны и утепление'),
            l('Windows & flashings', 'Logi un lāsenes', 'Окна и отливы'),
          ],
        },
        {
          number: '03',
          title: l('Interior finishing', 'Iekšdarbu apdare', 'Внутренняя отделка'),
          description: l(
            'Warm, finished interiors in natural materials.',
            'Silti, pabeigti interjeri dabīgos materiālos.',
            'Тёплые, завершённые интерьеры из натуральных материалов.'
          ),
          bullets: [
            l('Timber panelling', 'Koka paneļi', 'Деревянные панели'),
            l('Plaster & paint', 'Apmetums un krāsojums', 'Штукатурка и покраска'),
            l('Flooring', 'Grīdas segumi', 'Напольные покрытия'),
          ],
        },
        {
          number: '04',
          title: l('Detailing', 'Detaļas', 'Детали'),
          description: l(
            'The joinery that makes it a home.',
            'Galdniecība, kas ēku padara par mājām.',
            'Столярные детали, которые делают дом домом.'
          ),
          bullets: [
            l('Custom stairs', 'Individuālas kāpnes', 'Лестницы на заказ'),
            l('Built-in furniture', 'Iebūvētās mēbeles', 'Встроенная мебель'),
            l('Exterior terraces', 'Āra terases', 'Наружные террасы'),
          ],
        },
      ],
    },
    ...NO_TS,
  },
];

// ---------------------------------------------------------------------------
// Services — mirrors supabase/schema.sql seed.
// ---------------------------------------------------------------------------

/** Sticky-aside facts shared by most services (schema seed repeats them). */
const WARRANTY_FACT = {
  label: l('Warranty', 'Garantija', 'Гарантия'),
  value: l('5 years workmanship', '5 gadu garantija darbiem', '5 лет гарантии на работы'),
};
const COVERAGE_FACT = {
  label: l('Coverage', 'Darbības reģions', 'Регион работы'),
  value: l('Latvia & Sweden', 'Latvija un Zviedrija', 'Латвия и Швеция'),
};
const TIMELINE_LABEL = l('Typical timeline', 'Tipiskais termiņš', 'Типичный срок');

export const FALLBACK_SERVICES: ServiceRow[] = [
  {
    id: 'drywall',
    slug: 'drywall',
    category: 'Construction',
    published: true,
    sort_order: 1,
    cta_label: l(
      'Book a drywall consult',
      'Pieteikt ģipškartona konsultāciju',
      'Записаться на консультацию по гипсокартону'
    ),
    cta_link: '/contact',
    cover: 'm1',
    media: [
      img('m1', 'images/proj-rimi.png'),
      vid('m2', 'images/img-39bf.png'),
      img('m3', 'images/home-interior.png'),
      img('m4', 'images/proj-kepler.png'),
      img('m5', 'images/proj-kuldiga.png'),
      img('m6', 'images/img-553f.png'),
    ],
    i18n: {
      title: l('Drywall & Partitions', 'Ģipškartons un starpsienas', 'Гипсокартон и перегородки'),
      summary: l(
        'Precision drywall, partitions, and suspended ceilings that give your interiors clean lines and a paint-ready finish.',
        'Precīzs ģipškartons, starpsienas un piekaramie griesti, kas piešķir interjeram tīras līnijas un krāsošanai gatavu apdari.',
        'Точный монтаж гипсокартона, перегородок и подвесных потолков — чистые линии и готовая под покраску поверхность.'
      ),
      description: l(
        'Our drywall crews build partitions, suspended ceilings, and acoustic walls to exact tolerances. We handle framing, boarding, jointing, and a paint-ready finish — coordinating closely with electrical and HVAC trades so nothing gets boxed in by mistake.\n\nEvery job starts with a site survey and a fixed, itemised quote. We protect adjacent surfaces, keep the site tidy, and document each stage for building control. A typical single-floor fit-out is completed in two to three weeks.\n\nWhether it is a single office partition or a full commercial floor, the same standards apply: straight lines, solid fixings, and a finish that is ready for the decorator the day we leave.',
        'Mūsu ģipškartona komandas būvē starpsienas, piekaramos griestus un akustiskās sienas ar precīzām pielaidēm. Mēs veicam karkasa montāžu, apšūšanu, špaktelēšanu un krāsošanai gatavu apdari — cieši koordinējoties ar elektrības un ventilācijas darbiem, lai nekas netiktu kļūdaini aizbūvēts.\n\nKatrs darbs sākas ar objekta apsekošanu un fiksētu, detalizētu tāmi. Mēs aizsargājam blakus esošās virsmas, uzturam objektu kārtībā un dokumentējam katru posmu būvuzraudzībai. Tipiska viena stāva izbūve tiek pabeigta divās līdz trīs nedēļās.\n\nVienalga, vai tā ir viena biroja starpsiena vai pilns komercstāvs — standarti ir vieni: taisnas līnijas, droši stiprinājumi un apdare, kas gatava krāsotājam jau mūsu aiziešanas dienā.',
        'Наши бригады возводят перегородки, подвесные потолки и акустические стены с точными допусками. Мы выполняем каркас, обшивку, шпаклёвку и готовую под покраску отделку — в тесной координации с электрикой и вентиляцией, чтобы ничего не оказалось случайно зашито.\n\nКаждая работа начинается с осмотра объекта и фиксированной, детальной сметы. Мы защищаем соседние поверхности, поддерживаем порядок на объекте и документируем каждый этап для стройнадзора. Типичная отделка одного этажа занимает две-три недели.\n\nБудь то одна офисная перегородка или целый коммерческий этаж — стандарты одни: ровные линии, надёжный крепёж и поверхность, готовая для маляра в день нашего ухода.'
      ),
    },
    capabilities: {
      title: l(
        'End-to-end drywall and partition systems, built to spec.',
        'Pilna cikla ģipškartona un starpsienu sistēmas, būvētas pēc specifikācijas.',
        'Системы гипсокартона и перегородок полного цикла, построенные по спецификации.'
      ),
      intro: l(
        'From first survey to final jointing, our crews cover the full scope — so you deal with one team, one standard, and one point of accountability.',
        'No pirmās apsekošanas līdz pēdējai šuvei mūsu komandas sedz visu apjomu — jūs strādājat ar vienu komandu, vienu standartu un vienu atbildīgo.',
        'От первого осмотра до последнего шва наши бригады закрывают весь объём — вы работаете с одной командой, одним стандартом и одной точкой ответственности.'
      ),
      items: [
        {
          number: '01',
          title: l('Framing & structure', 'Karkass un konstrukcija', 'Каркас и конструкция'),
          description: l(
            'Metal and timber stud systems set out to your drawings.',
            'Metāla un koka karkasa sistēmas, izliktas pēc jūsu rasējumiem.',
            'Металлические и деревянные каркасные системы по вашим чертежам.'
          ),
          bullets: [
            l('Load-rated partitions', 'Slodzi nesošas starpsienas', 'Перегородки с расчётной нагрузкой'),
            l('Curved & raked walls', 'Liektas un slīpas sienas', 'Криволинейные и наклонные стены'),
            l('Service voids & bulkheads', 'Komunikāciju šahtas un aizsegi', 'Ниши для коммуникаций и короба'),
          ],
        },
        {
          number: '02',
          title: l('Boarding & acoustics', 'Apšuvums un akustika', 'Обшивка и акустика'),
          description: l(
            'The right board for fire, moisture, and sound performance.',
            'Pareizā plāksne ugunsdrošībai, mitrumam un skaņai.',
            'Правильная плита для огнестойкости, влаги и звука.'
          ),
          bullets: [
            l('Fire-rated build-ups', 'Ugunsdrošas konstrukcijas', 'Огнестойкие конструкции'),
            l('Acoustic & moisture board', 'Akustiskās un mitrumizturīgās plāksnes', 'Акустические и влагостойкие плиты'),
            l('Insulation infill', 'Izolācijas pildījums', 'Заполнение изоляцией'),
          ],
        },
        {
          number: '03',
          title: l('Ceilings', 'Griesti', 'Потолки'),
          description: l(
            'Suspended and MF ceilings with integrated services.',
            'Piekaramie un MF griesti ar integrētām komunikācijām.',
            'Подвесные и MF-потолки с интегрированными коммуникациями.'
          ),
          bullets: [
            l('Grid & MF systems', 'Režģu un MF sistēmas', 'Кассетные и MF-системы'),
            l('Access panels', 'Revīzijas lūkas', 'Ревизионные люки'),
            l('Lighting & HVAC cut-outs', 'Izgriezumi apgaismojumam un ventilācijai', 'Вырезы под освещение и вентиляцию'),
          ],
        },
        {
          number: '04',
          title: l('Finishing', 'Apdare', 'Отделка'),
          description: l(
            'Taped, jointed, and skimmed to a decorator-ready face.',
            'Špaktelēts, slīpēts un nogludināts līdz krāsotājam gatavai virsmai.',
            'Швы проклеены, зашпаклёваны и выведены под маляра.'
          ),
          bullets: [
            l('Level-5 finish available', 'Pieejama Level-5 apdare', 'Доступна отделка Level-5'),
            l('Corner & edge beads', 'Stūru un malu profili', 'Угловые и торцевые профили'),
            l('Snag-free handover', 'Nodošana bez defektiem', 'Сдача без недоделок'),
          ],
        },
      ],
    },
    extras: {
      highlights: [
        {
          title: l('Fixed-price quotes', 'Fiksētas cenas tāmes', 'Сметы с фиксированной ценой'),
          desc: l(
            'Itemised, no surprises after we survey.',
            'Detalizētas, bez pārsteigumiem pēc apsekošanas.',
            'Детальные, без сюрпризов после осмотра.'
          ),
        },
        {
          title: l('Trade coordination', 'Darbu koordinācija', 'Координация работ'),
          desc: l(
            'We sequence around electrics and HVAC.',
            'Mēs plānojam darbus ap elektriku un ventilāciju.',
            'Мы выстраиваем график вокруг электрики и вентиляции.'
          ),
        },
        {
          title: l('Paint-ready finish', 'Krāsošanai gatava apdare', 'Поверхность под покраску'),
          desc: l(
            'Decorator can start the day we leave.',
            'Krāsotājs var sākt darbu mūsu aiziešanas dienā.',
            'Маляр может начать в день нашего ухода.'
          ),
        },
      ],
      facts: [
        { label: TIMELINE_LABEL, value: l('2–3 weeks / floor', '2–3 nedēļas / stāvs', '2–3 недели / этаж') },
        WARRANTY_FACT,
        COVERAGE_FACT,
      ],
    },
    ...NO_TS,
  },
  {
    id: 'interior-finishing',
    slug: 'interior-finishing',
    category: 'Finishing',
    published: true,
    sort_order: 2,
    cta_label: l('Discuss finishing', 'Apspriest apdari', 'Обсудить отделку'),
    cta_link: '/contact',
    cover: 'm1',
    media: [
      img('m1', 'images/home-interior.png'),
      img('m2', 'images/proj-kuldiga.png'),
      vid('m3', 'images/proj-moho.png'),
    ],
    i18n: {
      title: l('Interior Finishing', 'Iekšdarbu apdare', 'Внутренняя отделка'),
      summary: l(
        'Plaster, paint, tiling, and detailing that make a space feel complete.',
        'Apmetums, krāsojums, flīzēšana un detaļas, kas telpu padara pabeigtu.',
        'Штукатурка, покраска, плитка и детали, которые делают пространство завершённым.'
      ),
      description: l(
        'From skim-coat plastering to feature tiling and final decoration, our finishing team delivers the details clients actually notice. We colour-match, protect adjacent surfaces, and leave every room ready to furnish.',
        'No nogludinošā apmetuma līdz akcentu flīzējumam un gala dekorēšanai — mūsu apdares komanda nodrošina detaļas, ko klienti patiešām pamana. Mēs piemeklējam toņus, aizsargājam blakus esošās virsmas un atstājam katru telpu gatavu iekārtošanai.',
        'От финишной штукатурки до акцентной плитки и финальной отделки — наша команда выполняет те детали, которые клиенты действительно замечают. Мы подбираем цвета, защищаем соседние поверхности и оставляем каждую комнату готовой к обустройству.'
      ),
    },
    capabilities: {
      title: l(
        'Complete interior finishing, from bare shell to handover.',
        'Pilna iekšdarbu apdare — no neapdarinātas telpas līdz nodošanai.',
        'Полная внутренняя отделка — от черновой коробки до сдачи.'
      ),
      intro: l(
        'One finishing team covers every surface — plaster, paint, tile, and detail — so the standard stays consistent from room to room.',
        'Viena apdares komanda sedz katru virsmu — apmetumu, krāsojumu, flīzes un detaļas — lai standarts paliktu vienāds katrā telpā.',
        'Одна команда закрывает каждую поверхность — штукатурку, покраску, плитку и детали, — чтобы стандарт оставался одинаковым из комнаты в комнату.'
      ),
      items: [
        {
          number: '01',
          title: l('Plastering & skim', 'Apmešana un gludināšana', 'Штукатурка и шпаклёвка'),
          description: l(
            'Flat, crack-free walls and ceilings ready for decoration.',
            'Līdzenas sienas un griesti bez plaisām, gatavi dekorēšanai.',
            'Ровные стены и потолки без трещин, готовые к отделке.'
          ),
          bullets: [
            l('Skim-coat & full plaster', 'Nogludinošais un pilnais apmetums', 'Финишная и полная штукатурка'),
            l('Crack & corner repair', 'Plaisu un stūru remonts', 'Ремонт трещин и углов'),
            l('Primed, paint-ready surfaces', 'Gruntētas, krāsošanai gatavas virsmas', 'Загрунтованные поверхности под покраску'),
          ],
        },
        {
          number: '02',
          title: l('Painting & decoration', 'Krāsošana un dekorēšana', 'Покраска и декорирование'),
          description: l(
            'Clean lines, even coverage, and colour-matched finishes.',
            'Tīras līnijas, vienmērīgs klājums un saskaņoti toņi.',
            'Чистые линии, ровное покрытие и подобранные цвета.'
          ),
          bullets: [
            l('Interior paint systems', 'Iekšdarbu krāsu sistēmas', 'Системы интерьерной окраски'),
            l('Feature walls & accents', 'Akcentu sienas', 'Акцентные стены'),
            l('Protective final coats', 'Aizsargājošie gala pārklājumi', 'Защитные финишные слои'),
          ],
        },
        {
          number: '03',
          title: l('Tiling', 'Flīzēšana', 'Плиточные работы'),
          description: l(
            'Precision tiling for bathrooms, kitchens, and floors.',
            'Precīza flīzēšana vannas istabām, virtuvēm un grīdām.',
            'Точная укладка плитки для ванных, кухонь и полов.'
          ),
          bullets: [
            l('Wall & floor tiling', 'Sienu un grīdu flīzēšana', 'Плитка на стены и пол'),
            l('Waterproofing & tanking', 'Hidroizolācija', 'Гидроизоляция'),
            l('Grout & silicone detailing', 'Šuvju un silikona apstrāde', 'Затирка и силиконовые швы'),
          ],
        },
        {
          number: '04',
          title: l('Final detailing', 'Gala detaļas', 'Финальные детали'),
          description: l(
            'The last five percent that makes the space feel complete.',
            'Pēdējie pieci procenti, kas telpu padara pabeigtu.',
            'Последние пять процентов, которые делают пространство завершённым.'
          ),
          bullets: [
            l('Skirting & trim', 'Grīdlīstes un apdares līstes', 'Плинтусы и наличники'),
            l('Sealant & caulking', 'Hermētiķis un šuvju aizpildīšana', 'Герметизация швов'),
            l('Snag-free handover', 'Nodošana bez defektiem', 'Сдача без недоделок'),
          ],
        },
      ],
    },
    extras: {
      highlights: [
        {
          title: l('Consistent standard', 'Vienots standarts', 'Единый стандарт'),
          desc: l(
            'One crew, one quality bar in every room.',
            'Viena komanda, viena kvalitātes latiņa katrā telpā.',
            'Одна бригада, одна планка качества в каждой комнате.'
          ),
        },
        {
          title: l('Clean sites', 'Tīri objekti', 'Чистые объекты'),
          desc: l(
            'Surfaces protected, dust controlled, tidied daily.',
            'Virsmas aizsargātas, putekļi kontrolēti, ikdienas uzkopšana.',
            'Поверхности защищены, пыль под контролем, ежедневная уборка.'
          ),
        },
        {
          title: l('Colour matching', 'Toņu piemeklēšana', 'Подбор цвета'),
          desc: l(
            'We match existing finishes exactly.',
            'Mēs precīzi piemeklējam esošo apdari.',
            'Мы точно подбираем существующую отделку.'
          ),
        },
      ],
      facts: [
        { label: TIMELINE_LABEL, value: l('1–4 weeks / unit', '1–4 nedēļas / objekts', '1–4 недели / объект') },
        WARRANTY_FACT,
        COVERAGE_FACT,
      ],
    },
    ...NO_TS,
  },
  {
    id: 'wood-construction',
    slug: 'wood-construction',
    category: 'Construction',
    published: true,
    sort_order: 3,
    cta_label: l('Start a timber project', 'Sākt koka projektu', 'Начать деревянный проект'),
    cta_link: '/contact',
    cover: 'm1',
    media: [img('m1', 'images/proj-moho.png'), img('m2', 'images/img-575d.png')],
    i18n: {
      title: l('Wood Construction', 'Koka konstrukcijas', 'Деревянное строительство'),
      summary: l(
        'Timber framing, cladding, and bespoke joinery built to last.',
        'Koka karkasi, apšuvums un individuāla galdniecība, kas kalpo ilgi.',
        'Деревянные каркасы, обшивка и столярные изделия на заказ, построенные надолго.'
      ),
      description: l(
        'We design and build timber structures — from framing and façade cladding to custom interior joinery. Sustainably sourced material, weatherproof detailing, and craftsmanship that ages well.',
        'Mēs projektējam un būvējam koka konstrukcijas — no karkasa un fasādes apšuvuma līdz individuālai interjera galdniecībai. Ilgtspējīgi iegūts materiāls, laikapstākļiem izturīga detalizācija un meistarība, kas laika gaitā tikai iegūst.',
        'Мы проектируем и строим деревянные конструкции — от каркаса и фасадной обшивки до столярных изделий для интерьера. Экологичный материал, стойкая к погоде детализация и мастерство, которое хорошо стареет.'
      ),
    },
    capabilities: {
      title: l(
        'Timber structures and joinery, from frame to finish.',
        'Koka konstrukcijas un galdniecība — no karkasa līdz apdarei.',
        'Деревянные конструкции и столярка — от каркаса до отделки.'
      ),
      intro: l(
        'We build in wood at every scale — structural frames, weatherproof façades, and the bespoke joinery that gives a project character.',
        'Mēs būvējam kokā jebkurā mērogā — nesošos karkasus, laikapstākļiem izturīgas fasādes un individuālu galdniecību, kas projektam piešķir raksturu.',
        'Мы строим из дерева в любом масштабе — несущие каркасы, защищённые от погоды фасады и столярные изделия, придающие проекту характер.'
      ),
      items: [
        {
          number: '01',
          title: l('Structural framing', 'Nesošais karkass', 'Несущий каркас'),
          description: l(
            'Load-bearing timber frames set out to engineer drawings.',
            'Nesošie koka karkasi pēc inženiera rasējumiem.',
            'Несущие деревянные каркасы по чертежам инженера.'
          ),
          bullets: [
            l('Post & beam structures', 'Statu un siju konstrukcijas', 'Стоечно-балочные конструкции'),
            l('Roof & floor framing', 'Jumta un pārsegumu karkasi', 'Каркасы крыш и перекрытий'),
            l('Engineered timber (CLT, glulam)', 'Inženierkoksne (CLT, līmētā koksne)', 'Инженерная древесина (CLT, клеёный брус)'),
          ],
        },
        {
          number: '02',
          title: l('Cladding & façades', 'Apšuvums un fasādes', 'Обшивка и фасады'),
          description: l(
            'Weatherproof envelopes with clean, lasting detailing.',
            'Laikapstākļiem izturīgs apvalks ar tīru, noturīgu detalizāciju.',
            'Защищённая от погоды оболочка с чистой, долговечной детализацией.'
          ),
          bullets: [
            l('Ventilated façade systems', 'Vēdināmās fasādes sistēmas', 'Вентилируемые фасадные системы'),
            l('Board & panel cladding', 'Dēļu un paneļu apšuvums', 'Обшивка доской и панелями'),
            l('Membranes & flashings', 'Membrānas un lāsenes', 'Мембраны и отливы'),
          ],
        },
        {
          number: '03',
          title: l('Bespoke joinery', 'Individuāla galdniecība', 'Столярка на заказ'),
          description: l(
            'Custom carpentry built to millimetre tolerances.',
            'Individuāla galdniecība ar milimetru precizitāti.',
            'Столярные изделия с миллиметровой точностью.'
          ),
          bullets: [
            l('Stairs & balustrades', 'Kāpnes un margas', 'Лестницы и ограждения'),
            l('Built-in furniture', 'Iebūvētās mēbeles', 'Встроенная мебель'),
            l('Doors & window surrounds', 'Durvju un logu apdares', 'Дверные и оконные обрамления'),
          ],
        },
        {
          number: '04',
          title: l('Treatment & finish', 'Apstrāde un apdare', 'Обработка и отделка'),
          description: l(
            'Sanded, sealed, and protected against wear and weather.',
            'Slīpēts, noslēgts un aizsargāts pret nodilumu un laikapstākļiem.',
            'Отшлифовано, покрыто и защищено от износа и погоды.'
          ),
          bullets: [
            l('Fire & rot treatment', 'Uguns un trupes aizsardzība', 'Огне- и биозащита'),
            l('Oils, stains & lacquers', 'Eļļas, beices un lakas', 'Масла, морилки и лаки'),
            l('UV & moisture protection', 'UV un mitruma aizsardzība', 'Защита от УФ и влаги'),
          ],
        },
      ],
    },
    extras: {
      highlights: [
        {
          title: l('Sustainable timber', 'Ilgtspējīga koksne', 'Экологичная древесина'),
          desc: l(
            'Certified, responsibly sourced material.',
            'Sertificēts, atbildīgi iegūts materiāls.',
            'Сертифицированный, ответственно заготовленный материал.'
          ),
        },
        {
          title: l('Weatherproof detailing', 'Laikapstākļiem izturīga detalizācija', 'Погодостойкая детализация'),
          desc: l(
            'Built for Baltic and Nordic winters.',
            'Būvēts Baltijas un Ziemeļvalstu ziemām.',
            'Построено для балтийских и северных зим.'
          ),
        },
        {
          title: l('Craftsmanship', 'Meistarība', 'Мастерство'),
          desc: l(
            'Joinery that ages well.',
            'Galdniecība, kas laika gaitā tikai iegūst.',
            'Столярка, которая хорошо стареет.'
          ),
        },
      ],
      facts: [
        { label: TIMELINE_LABEL, value: l('4–12 weeks / build', '4–12 nedēļas / būve', '4–12 недель / объект') },
        WARRANTY_FACT,
        COVERAGE_FACT,
      ],
    },
    ...NO_TS,
  },
  {
    id: 'masonry',
    slug: 'masonry',
    category: 'Construction',
    published: true,
    sort_order: 4,
    cta_label: l('Request a survey', 'Pieprasīt apsekošanu', 'Заказать обследование'),
    cta_link: '/contact',
    cover: 'm1',
    media: [img('m1', 'images/img-553f.png')],
    i18n: {
      title: l('Masonry & Structural', 'Mūrniecība un konstrukcijas', 'Каменные и конструктивные работы'),
      summary: l(
        'Brick, block, and concrete works engineered for the long term.',
        'Ķieģeļu, bloku un betona darbi, kas projektēti ilgtermiņam.',
        'Кирпич, блоки и бетон — работы, рассчитанные на долгий срок.'
      ),
      description: l(
        'Load-bearing walls, foundations, and structural repairs delivered by certified masons. We work to engineer drawings and document every stage for building control.',
        'Nesošās sienas, pamati un konstrukciju remonti, ko veic sertificēti mūrnieki. Mēs strādājam pēc inženiera rasējumiem un dokumentējam katru posmu būvuzraudzībai.',
        'Несущие стены, фундаменты и ремонт конструкций силами сертифицированных каменщиков. Мы работаем по чертежам инженера и документируем каждый этап для стройнадзора.'
      ),
    },
    capabilities: {
      title: l(
        'Brick, block, and concrete engineered for the long term.',
        'Ķieģelis, bloki un betons, projektēti ilgtermiņam.',
        'Кирпич, блоки и бетон, рассчитанные на долгий срок.'
      ),
      intro: l(
        'Certified masons working to engineer drawings — with every stage documented for building control.',
        'Sertificēti mūrnieki, kas strādā pēc inženiera rasējumiem — katrs posms dokumentēts būvuzraudzībai.',
        'Сертифицированные каменщики, работающие по чертежам инженера, — каждый этап документируется для стройнадзора.'
      ),
      items: [
        {
          number: '01',
          title: l('Load-bearing walls', 'Nesošās sienas', 'Несущие стены'),
          description: l(
            'Structural brick and blockwork to engineer specification.',
            'Nesošais ķieģeļu un bloku mūris pēc inženiera specifikācijas.',
            'Несущая кирпичная и блочная кладка по спецификации инженера.'
          ),
          bullets: [
            l('Brick & block coursing', 'Ķieģeļu un bloku rindojums', 'Кирпичные и блочные ряды'),
            l('Reinforced masonry', 'Stiegrots mūris', 'Армированная кладка'),
            l('Lintels & openings', 'Pārsedzes un ailes', 'Перемычки и проёмы'),
          ],
        },
        {
          number: '02',
          title: l('Foundations', 'Pamati', 'Фундаменты'),
          description: l(
            'Groundwork and concrete bases done right the first time.',
            'Zemes darbi un betona pamatnes, izdarītas pareizi pirmajā reizē.',
            'Земляные работы и бетонные основания, сделанные правильно с первого раза.'
          ),
          bullets: [
            l('Strip & pad foundations', 'Lentveida un punktveida pamati', 'Ленточные и столбчатые фундаменты'),
            l('Reinforced slabs', 'Stiegrotas plātnes', 'Армированные плиты'),
            l('Damp-proofing', 'Hidroizolācija', 'Гидроизоляция'),
          ],
        },
        {
          number: '03',
          title: l('Structural repair', 'Konstrukciju remonts', 'Ремонт конструкций'),
          description: l(
            'Stabilising and restoring existing structures.',
            'Esošo konstrukciju stabilizēšana un atjaunošana.',
            'Стабилизация и восстановление существующих конструкций.'
          ),
          bullets: [
            l('Crack stitching', 'Plaisu sašūšana', 'Сшивка трещин'),
            l('Underpinning', 'Pamatu pastiprināšana', 'Усиление фундаментов'),
            l('Wall tie replacement', 'Sienu enkuru nomaiņa', 'Замена стенных связей'),
          ],
        },
        {
          number: '04',
          title: l('Pointing & sealing', 'Šuvošana un hermetizācija', 'Расшивка и герметизация'),
          description: l(
            'Weather-tested joints and clean façades.',
            'Laikapstākļos pārbaudītas šuves un tīras fasādes.',
            'Проверенные погодой швы и чистые фасады.'
          ),
          bullets: [
            l('Repointing', 'Šuvju atjaunošana', 'Обновление швов'),
            l('Expansion joints', 'Deformācijas šuves', 'Деформационные швы'),
            l('Water-repellent sealing', 'Ūdeni atgrūdoša apstrāde', 'Водоотталкивающая обработка'),
          ],
        },
      ],
    },
    extras: {
      highlights: [
        {
          title: l('Certified masons', 'Sertificēti mūrnieki', 'Сертифицированные каменщики'),
          desc: l(
            'Qualified crews on every structural job.',
            'Kvalificētas komandas katrā konstrukciju darbā.',
            'Квалифицированные бригады на каждой конструктивной работе.'
          ),
        },
        {
          title: l('To engineer drawings', 'Pēc inženiera rasējumiem', 'По чертежам инженера'),
          desc: l(
            'We build exactly to the structural spec.',
            'Mēs būvējam precīzi pēc konstrukciju specifikācijas.',
            'Мы строим точно по конструктивной спецификации.'
          ),
        },
        {
          title: l('Documented stages', 'Dokumentēti posmi', 'Документированные этапы'),
          desc: l(
            'Every stage recorded for building control.',
            'Katrs posms fiksēts būvuzraudzībai.',
            'Каждый этап фиксируется для стройнадзора.'
          ),
        },
      ],
      facts: [
        { label: TIMELINE_LABEL, value: l('2–8 weeks / phase', '2–8 nedēļas / posms', '2–8 недель / этап') },
        WARRANTY_FACT,
        COVERAGE_FACT,
      ],
    },
    ...NO_TS,
  },
  {
    id: 'flooring',
    slug: 'flooring',
    category: 'Finishing',
    // Draft in the seed — the public grid hides it until the admin publishes.
    published: false,
    sort_order: 5,
    cta_label: l('Get a flooring quote', 'Saņemt grīdas tāmi', 'Получить смету на полы'),
    cta_link: '/contact',
    cover: 'm1',
    media: [img('m1', 'images/img-771e.png')],
    i18n: {
      title: l('Flooring', 'Grīdas segumi', 'Напольные покрытия'),
      summary: l(
        'Screeds, hardwood, laminate, and tile — level, quiet, and durable.',
        'Klons, parkets, lamināts un flīzes — līdzeni, klusi un izturīgi.',
        'Стяжка, паркет, ламинат и плитка — ровно, тихо и долговечно.'
      ),
      description: l(
        'Subfloor preparation, self-levelling screeds, and the finished floor of your choice. We measure moisture, plan expansion, and guarantee a flat, quiet result.',
        'Pamatnes sagatavošana, pašizlīdzinošais klons un jūsu izvēlētais grīdas segums. Mēs mērām mitrumu, plānojam deformācijas šuves un garantējam līdzenu, klusu rezultātu.',
        'Подготовка основания, самовыравнивающаяся стяжка и финишное покрытие на ваш выбор. Мы измеряем влажность, планируем деформационные зазоры и гарантируем ровный, тихий результат.'
      ),
    },
    capabilities: {
      title: l(
        'Level, quiet, durable floors — from screed to skirting.',
        'Līdzenas, klusas, izturīgas grīdas — no klona līdz grīdlīstei.',
        'Ровные, тихие, долговечные полы — от стяжки до плинтуса.'
      ),
      intro: l(
        'We prepare the substrate properly, then lay the finished floor of your choice — measured, moisture-checked, and guaranteed flat.',
        'Mēs pareizi sagatavojam pamatni un tad ieklājam jūsu izvēlēto segumu — izmērītu, mitruma pārbaudītu un garantēti līdzenu.',
        'Мы правильно готовим основание, затем укладываем выбранное вами покрытие — с замерами, контролем влажности и гарантией ровности.'
      ),
      items: [
        {
          number: '01',
          title: l('Subfloor preparation', 'Pamatnes sagatavošana', 'Подготовка основания'),
          description: l(
            'A flat, dry, sound base under every finish.',
            'Līdzena, sausa un stabila pamatne zem katra seguma.',
            'Ровное, сухое и прочное основание под каждым покрытием.'
          ),
          bullets: [
            l('Moisture measurement', 'Mitruma mērījumi', 'Замеры влажности'),
            l('Self-levelling screeds', 'Pašizlīdzinošais klons', 'Самовыравнивающаяся стяжка'),
            l('Acoustic underlays', 'Akustiskās apakšklājas', 'Акустические подложки'),
          ],
        },
        {
          number: '02',
          title: l('Hard flooring', 'Cietie segumi', 'Твёрдые покрытия'),
          description: l(
            'Hardwood, laminate, and engineered boards.',
            'Parkets, lamināts un inženierdēļi.',
            'Паркет, ламинат и инженерная доска.'
          ),
          bullets: [
            l('Hardwood & parquet', 'Masīvkoks un parkets', 'Массив и паркет'),
            l('Laminate & vinyl', 'Lamināts un vinils', 'Ламинат и винил'),
            l('Expansion planning', 'Deformācijas šuvju plānošana', 'Планирование зазоров'),
          ],
        },
        {
          number: '03',
          title: l('Tile & stone', 'Flīzes un akmens', 'Плитка и камень'),
          description: l(
            'Precision-set tile for wet and high-traffic areas.',
            'Precīzi ieklātas flīzes mitrām un intensīvi lietotām zonām.',
            'Точная укладка плитки для влажных и проходных зон.'
          ),
          bullets: [
            l('Large-format tile', 'Liela formāta flīzes', 'Крупноформатная плитка'),
            l('Underfloor heating systems', 'Grīdas apsildes sistēmas', 'Системы тёплого пола'),
            l('Waterproof wet rooms', 'Hidroizolētas mitrās telpas', 'Гидроизолированные влажные зоны'),
          ],
        },
        {
          number: '04',
          title: l('Finishing & trim', 'Apdare un līstes', 'Отделка и профили'),
          description: l(
            'The details that complete the floor.',
            'Detaļas, kas grīdu padara pabeigtu.',
            'Детали, завершающие пол.'
          ),
          bullets: [
            l('Skirting & profiles', 'Grīdlīstes un profili', 'Плинтусы и профили'),
            l('Thresholds & transitions', 'Sliekšņi un pārejas', 'Пороги и переходы'),
            l('Sealing & inspection', 'Hermetizācija un pārbaude', 'Герметизация и проверка'),
          ],
        },
      ],
    },
    extras: {
      highlights: [
        {
          title: l('Moisture-safe', 'Mitruma drošība', 'Контроль влажности'),
          desc: l('We measure before we lay.', 'Mēs mērām, pirms klājam.', 'Мы измеряем, прежде чем укладывать.'),
        },
        {
          title: l('Flat guarantee', 'Līdzenuma garantija', 'Гарантия ровности'),
          desc: l(
            'Level results with no creaks.',
            'Līdzens rezultāts bez čīkstēšanas.',
            'Ровный результат без скрипов.'
          ),
        },
        {
          title: l('All floor types', 'Visi segumu veidi', 'Все типы покрытий'),
          desc: l('One team for every finish.', 'Viena komanda katram segumam.', 'Одна команда для любого покрытия.'),
        },
      ],
      facts: [
        { label: TIMELINE_LABEL, value: l('3–10 days / unit', '3–10 dienas / objekts', '3–10 дней / объект') },
        WARRANTY_FACT,
        COVERAGE_FACT,
      ],
    },
    ...NO_TS,
  },
  {
    id: 'emergency',
    slug: 'emergency',
    category: 'Support',
    published: true,
    sort_order: 6,
    cta_label: l('Call emergency line', 'Zvanīt avārijas līnijai', 'Позвонить на аварийную линию'),
    cta_link: '/contact',
    cover: 'm1',
    media: [img('m1', 'images/img-97b7.png'), vid('m2', 'images/img-9c88.png')],
    i18n: {
      title: l('Emergency Services', 'Avārijas dienests', 'Аварийные работы'),
      summary: l(
        'Rapid response for water, structural, and weather damage — around the clock.',
        'Ātra reaģēšana uz ūdens, konstrukciju un laikapstākļu bojājumiem — visu diennakti.',
        'Быстрое реагирование на повреждения от воды, конструкций и непогоды — круглосуточно.'
      ),
      description: l(
        'When something fails, we stabilise fast. Our emergency crews handle water ingress, structural props, board-ups, and make-safe works 24/7, then plan the permanent repair.',
        'Kad kaut kas atsakās kalpot, mēs ātri stabilizējam situāciju. Mūsu avārijas komandas 24/7 novērš ūdens ieplūdi, uzstāda konstrukciju atbalstus, veic aizsegšanu un drošības darbus, un pēc tam plāno pastāvīgo remontu.',
        'Когда что-то выходит из строя, мы быстро стабилизируем ситуацию. Наши аварийные бригады 24/7 устраняют протечки, ставят подпорки, закрывают проёмы и выполняют работы по обеспечению безопасности, а затем планируют капитальный ремонт.'
      ),
    },
    capabilities: {
      title: l(
        'Rapid response, around the clock.',
        'Ātra reaģēšana visu diennakti.',
        'Быстрое реагирование круглые сутки.'
      ),
      intro: l(
        'When something fails we stabilise fast — then plan and deliver the permanent repair with the same crews.',
        'Kad kaut kas atsakās kalpot, mēs ātri stabilizējam — un pēc tam ar tām pašām komandām plānojam un veicam pastāvīgo remontu.',
        'Когда что-то выходит из строя, мы быстро стабилизируем ситуацию, а затем теми же бригадами планируем и выполняем капитальный ремонт.'
      ),
      items: [
        {
          number: '01',
          title: l('Emergency response', 'Avārijas reaģēšana', 'Аварийный выезд'),
          description: l(
            '24/7 call-out for water, structural, and weather damage.',
            'Izsaukumi 24/7 ūdens, konstrukciju un laikapstākļu bojājumiem.',
            'Выезд 24/7 при повреждениях от воды, конструкций и непогоды.'
          ),
          bullets: [
            l('24/7 call-out line', 'Izsaukumu līnija 24/7', 'Линия вызова 24/7'),
            l('Rapid site assessment', 'Ātra objekta novērtēšana', 'Быстрая оценка объекта'),
            l('Immediate make-safe works', 'Tūlītēji drošības darbi', 'Немедленные работы по безопасности'),
          ],
        },
        {
          number: '02',
          title: l('Water damage', 'Ūdens bojājumi', 'Повреждения от воды'),
          description: l(
            'Stopping ingress and drying the structure.',
            'Ieplūdes apturēšana un konstrukcijas žāvēšana.',
            'Остановка протечек и просушка конструкций.'
          ),
          bullets: [
            l('Leak detection & isolation', 'Noplūžu atrašana un izolēšana', 'Поиск и изоляция протечек'),
            l('Structural drying', 'Konstrukciju žāvēšana', 'Просушка конструкций'),
            l('Anti-mould treatment', 'Pretpelējuma apstrāde', 'Обработка от плесени'),
          ],
        },
        {
          number: '03',
          title: l('Structural stabilisation', 'Konstrukciju stabilizācija', 'Стабилизация конструкций'),
          description: l(
            'Props, supports, and temporary works to code.',
            'Atbalsti, balsti un pagaidu darbi atbilstoši normām.',
            'Подпорки, опоры и временные работы по нормам.'
          ),
          bullets: [
            l('Structural propping', 'Konstrukciju atbalstīšana', 'Установка подпорок'),
            l('Board-ups & enclosures', 'Aizsegšana un norobežošana', 'Закрытие проёмов и ограждения'),
            l('Temporary weatherproofing', 'Pagaidu aizsardzība pret laikapstākļiem', 'Временная защита от непогоды'),
          ],
        },
        {
          number: '04',
          title: l('Permanent repair', 'Pastāvīgais remonts', 'Капитальный ремонт'),
          description: l(
            'From make-safe to fully restored.',
            'No drošības darbiem līdz pilnīgai atjaunošanai.',
            'От обеспечения безопасности до полного восстановления.'
          ),
          bullets: [
            l('Scoped repair plan', 'Detalizēts remonta plāns', 'Детальный план ремонта'),
            l('Insurance documentation', 'Dokumentācija apdrošināšanai', 'Документы для страховой'),
            l('Full reinstatement', 'Pilnīga atjaunošana', 'Полное восстановление'),
          ],
        },
      ],
    },
    extras: {
      highlights: [
        {
          title: l('24/7 availability', 'Pieejamība 24/7', 'Доступность 24/7'),
          desc: l(
            'Crews on call day and night.',
            'Komandas gatavībā dienu un nakti.',
            'Бригады на связи днём и ночью.'
          ),
        },
        {
          title: l('Fast stabilisation', 'Ātra stabilizācija', 'Быстрая стабилизация'),
          desc: l(
            'Make-safe first, repair next.',
            'Vispirms drošība, tad remonts.',
            'Сначала безопасность, затем ремонт.'
          ),
        },
        {
          title: l('Insurance-ready', 'Gatavs apdrošināšanai', 'Готово для страховой'),
          desc: l(
            'Documentation for every claim.',
            'Dokumentācija katram atlīdzības pieteikumam.',
            'Документы для каждого страхового случая.'
          ),
        },
      ],
      facts: [
        {
          label: l('Response time', 'Reaģēšanas laiks', 'Время реагирования'),
          value: l('Under 2 hours (Rīga)', 'Līdz 2 stundām (Rīga)', 'До 2 часов (Рига)'),
        },
        {
          label: l('Availability', 'Pieejamība', 'Доступность'),
          value: l('24/7, year-round', '24/7, visu gadu', '24/7, круглый год'),
        },
        { label: l('Coverage', 'Darbības reģions', 'Регион работы'), value: l('Latvia', 'Latvija', 'Латвия') },
      ],
    },
    ...NO_TS,
  },
];

/** Resolve a row's cover media item ('' = first item) to its src. */
export function coverSrc(row: { cover: string; media: MediaItem[] }): string {
  const item = row.media.find((m) => m.id === row.cover) ?? row.media[0];
  return item?.poster || item?.src || '';
}

// ---------------------------------------------------------------------------
// Home "From Concept to Completion" cards — static design content from
// Shakur.dc.html. `slug` keys the i18n dictionaries (svc_<slug>_t/_d);
// `detail` is the canonical /services/:slug route for the card link.
// ---------------------------------------------------------------------------

export type Service = {
  slug: string;
  /** Canonical services route slug (matches FALLBACK_SERVICES). */
  detail: string;
  title: string;
  img: string;
  desc: string;
};

export type LogoItem = { name: string; img: string };

export const SERVICES: Service[] = [
  {
    slug: 'drywall',
    detail: 'drywall',
    title: 'Drywall Partition Wall Installation',
    img: 'images/svc-1.png',
    desc: 'Expertise in drywall partition systems — precise installation, leveling, and finishing for functional and aesthetic interiors.',
  },
  {
    slug: 'interior',
    detail: 'interior-finishing',
    title: 'Complete Interior Finishing Works',
    img: 'images/img-9c88.png',
    desc: 'From plastering to painting and flooring — complete interior finishing delivered with precision and care.',
  },
  {
    slug: 'wood',
    detail: 'wood-construction',
    title: 'Wood Construction Works',
    img: 'images/img-5279.png',
    desc: 'From structural framing to detailed carpentry, we deliver strong and tailored wood solutions built to last.',
  },
  {
    slug: 'masonry',
    detail: 'masonry',
    title: 'Masonry Works',
    img: 'images/img-97b7.png',
    desc: 'We provide professional masonry services — from bricklaying to blockwork — ensuring durable, precise, and long-lasting structures.',
  },
  {
    slug: 'flooring',
    detail: 'flooring',
    title: 'Flooring Installation',
    img: 'images/img-be98.png',
    desc: 'We handle every step of flooring — from preparation to installation — ensuring smooth, durable, and elegant results.',
  },
  {
    slug: 'emergency',
    detail: 'emergency',
    title: 'Emergency Construction Work',
    img: 'images/img-193d.png',
    desc: 'Fast response and repair of critical construction issues — to avoid project delays or safety risks.',
  },
];

/** Home "See the Spaces" labels — these differ from the Projects card labels. */
export const SPACE_LABELS: Record<string, string> = {
  rimi: 'RIMI Milgrāvis',
  kuldiga: 'Kuldīgas parks',
  kepler: 'Kepler Club: Hotel & Lounge at RIX Airport',
  moho: 'MOHO PARK',
  daugavas: 'Daugavas Vieglatlētikas Manēža',
  sweden: 'Private Object in Sweden',
};

export const LOGOS_ROW1: LogoItem[] = [
  { name: 'Mapri', img: 'images/logo-trust-1.png' },
  { name: 'Ekoteh', img: 'images/logo-trust-2.png' },
  { name: 'Angern', img: 'images/logo-trust-3.png' },
  { name: 'MGS', img: 'images/logo-trust-4.png' },
  { name: 'Partner', img: 'images/logo-trust-5.png' },
  { name: 'Asmetal', img: 'images/logo-trust-6.png' },
];

export const LOGOS_ROW2: LogoItem[] = [
  { name: 'Mitt & Perlebach', img: 'images/logo-def-1.png' },
  { name: 'Lidl', img: 'images/logo-def-2.png' },
  { name: 'Jysk', img: 'images/logo-def-3.png' },
  { name: 'Kuldigas Parks', img: 'images/logo-def-4.png' },
  { name: 'Kepler', img: 'images/logo-def-5.png' },
];

export const CONTACT = {
  address: ['Audēju iela 8, LV-1050', 'Rīga, Latvia'],
  email: 'info.andrey.shakur@gmail.com',
  phone: '+37126872727',
} as const;

/**
 * Booking defaults from the design's `SC` object — the OFFLINE fallback used
 * when /api/slots is unreachable (dev without the API container).
 */
export const SCHEDULING = {
  days: [1, 2, 3, 4, 5],
  start: '09:00',
  end: '17:00',
  interval: 60,
  duration: 30,
  leadDays: 1,
  horizonDays: 60,
  blocked: [] as string[],
} as const;

/** Localize a home service card's title/desc by slug, as the design's `locServices` does. */
export function localizeService(svc: Service, t: Dict): Service {
  const title = t[`svc_${svc.slug}_t` as keyof Dict];
  const desc = t[`svc_${svc.slug}_d` as keyof Dict];
  return { ...svc, title: title || svc.title, desc: desc || svc.desc };
}
