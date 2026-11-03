// Vygenerováno skriptem sestav.py – needitovat ručně.
export default {
 "popis": "Virtuální prohlídka – modelový byt A, Lidická 1903/96, Břeclav. Souřadnice v mm podle scene.json (+X východ, +Y sever scény, Z = 0 podlaha). Úhly šipek se počítají v prohlížeči z poloh (atan2).",
 "vygenerovano": "2026-11-03",
 "stred_obrazu_yaw_deg": 90.0,
 "uzly": [
  {
   "id": "P1",
   "nazev": "Vstup",
   "x": 2650,
   "y": 7050,
   "z": 1600,
   "pano": {
    "soubor": "pano/P1.jpg",
    "sirka": 4096,
    "vyska": 2048,
    "zdroj": "03-rendery/pano/P1-4k.jpg",
    "druh": "finál",
    "bajtu": 314991
   }
  },
  {
   "id": "P2",
   "nazev": "Kuchyň",
   "x": 4250,
   "y": 5100,
   "z": 1600,
   "pano": {
    "soubor": "pano/P2.jpg",
    "sirka": 4096,
    "vyska": 2048,
    "zdroj": "03-rendery/pano/P2-4k.jpg",
    "druh": "finál",
    "bajtu": 430638
   }
  },
  {
   "id": "P3",
   "nazev": "Obývací pokoj",
   "x": 4950,
   "y": 1500,
   "z": 1600,
   "pano": {
    "soubor": "pano/P3.jpg",
    "sirka": 4096,
    "vyska": 2048,
    "zdroj": "03-rendery/pano/P3-4k.jpg",
    "druh": "finál",
    "bajtu": 516253
   }
  },
  {
   "id": "P4",
   "nazev": "Spací nika",
   "x": 1250,
   "y": 1850,
   "z": 1600,
   "pano": {
    "soubor": "pano/P4.jpg",
    "sirka": 4096,
    "vyska": 2048,
    "zdroj": "03-rendery/pano/P4-4k.jpg",
    "druh": "finál",
    "bajtu": 394580
   }
  },
  {
   "id": "P5",
   "nazev": "Koupelna",
   "x": 4250,
   "y": 8150,
   "z": 1600,
   "pano": {
    "soubor": "pano/P5.jpg",
    "sirka": 4096,
    "vyska": 2048,
    "zdroj": "03-rendery/pano/P5-4k.jpg",
    "druh": "finál",
    "bajtu": 336744
   }
  },
  {
   "id": "P6",
   "nazev": "Terasa",
   "x": 3300,
   "y": -1085,
   "z": 1600,
   "pano": {
    "soubor": "pano/P6.jpg",
    "sirka": 4096,
    "vyska": 2048,
    "zdroj": "03-rendery/pano/P6-4k.jpg",
    "druh": "finál",
    "bajtu": 814872
   }
  }
 ],
 "hrany": [
  {
   "od": "P1",
   "do": "P2",
   "sipka": [
    3493,
    4964
   ],
   "trasa": [
    [
     2650,
     7040
    ],
    [
     2650,
     6090
    ],
    [
     3650,
     5090
    ],
    [
     4250,
     5090
    ]
   ],
   "delka_trasy": 2964
  },
  {
   "od": "P2",
   "do": "P1",
   "sipka": [
    2407,
    6391
   ],
   "trasa": [
    [
     4250,
     5090
    ],
    [
     3650,
     5090
    ],
    [
     2650,
     6090
    ],
    [
     2650,
     7040
    ]
   ],
   "delka_trasy": 2964
  },
  {
   "od": "P2",
   "do": "P3",
   "sipka": [
    4208,
    2700
   ],
   "trasa": [
    [
     4250,
     5090
    ],
    [
     3950,
     4790
    ],
    [
     3950,
     3390
    ],
    [
     4950,
     2390
    ],
    [
     4950,
     1490
    ]
   ],
   "delka_trasy": 4138
  },
  {
   "od": "P3",
   "do": "P2",
   "sipka": [
    4601,
    3010
   ],
   "trasa": [
    [
     4950,
     1490
    ],
    [
     4950,
     2390
    ],
    [
     3950,
     3390
    ],
    [
     3950,
     4790
    ],
    [
     4250,
     5090
    ]
   ],
   "delka_trasy": 4138
  },
  {
   "od": "P3",
   "do": "P6",
   "sipka": [
    3965,
    239
   ],
   "trasa": [
    [
     4950,
     1490
    ],
    [
     4800,
     990
    ],
    [
     4000,
     190
    ],
    [
     4000,
     -360
    ],
    [
     3300,
     -1060
    ]
   ],
   "delka_trasy": 3233
  },
  {
   "od": "P6",
   "do": "P3",
   "sipka": [
    4427,
    1034
   ],
   "trasa": [
    [
     3300,
     -1060
    ],
    [
     4000,
     -360
    ],
    [
     4000,
     190
    ],
    [
     4800,
     990
    ],
    [
     4950,
     1490
    ]
   ],
   "delka_trasy": 3233
  },
  {
   "od": "P3",
   "do": "P4",
   "sipka": [
    3472,
    3391
   ],
   "trasa": [
    [
     4950,
     1490
    ],
    [
     4950,
     2340
    ],
    [
     3600,
     3590
    ],
    [
     2650,
     3590
    ],
    [
     2350,
     3290
    ],
    [
     2300,
     2690
    ],
    [
     1850,
     2240
    ],
    [
     1500,
     2090
    ],
    [
     1250,
     1840
    ]
   ],
   "delka_trasy": 6115
  },
  {
   "od": "P4",
   "do": "P3",
   "sipka": [
    2728,
    3741
   ],
   "trasa": [
    [
     1250,
     1840
    ],
    [
     1500,
     2090
    ],
    [
     1850,
     2240
    ],
    [
     2300,
     2690
    ],
    [
     2350,
     3290
    ],
    [
     2650,
     3590
    ],
    [
     3600,
     3590
    ],
    [
     4950,
     2340
    ],
    [
     4950,
     1490
    ]
   ],
   "delka_trasy": 6115
  },
  {
   "od": "P1",
   "do": "P5",
   "sipka": [
    3549,
    8434
   ],
   "trasa": [
    [
     2650,
     7040
    ],
    [
     2700,
     7590
    ],
    [
     3200,
     8090
    ],
    [
     4250,
     8140
    ]
   ],
   "delka_trasy": 2349
  },
  {
   "od": "P5",
   "do": "P1",
   "sipka": [
    2672,
    7668
   ],
   "trasa": [
    [
     4250,
     8140
    ],
    [
     3200,
     8090
    ],
    [
     2700,
     7590
    ],
    [
     2650,
     7040
    ]
   ],
   "delka_trasy": 2349
  }
 ],
 "start": {
  "uzel": "P1",
  "pohled": [
   2984,
   3735
  ],
  "sklon": -12,
  "pozn": "úvodní pohled z P1 míří na těžiště obytné místnosti A-101 (scene.json) = do bytu"
 },
 "minimapa": {
  "soubor": "minimapa.png",
  "x0": -700,
  "x1": 6460,
  "y0": -1960,
  "y1": 10440,
  "sirka_px": 895,
  "vyska_px": 1550
 },
 "sipka": {
  "delka": 460,
  "sirka": 460
 },
 "poznamka": "Vizualizace je ilustrační.",
 "zdroje": {
  "pohledy": "01-pudorys/pohledy.json",
  "nabytek": "01-pudorys/nabytek.json",
  "scene": "vizualizace-zkouska/geometrie/scene.json",
  "kamery": "02-scena/kamery.py"
 }
};
