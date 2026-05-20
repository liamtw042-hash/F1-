// Silverstone Circuit
// Scale: 1 unit ≈ 2 meters, circuit is ~5.891km
const SilverstoneTrack = {
    name: 'British Grand Prix',
    shortName: 'Silverstone',
    country: 'United Kingdom',
    lapLength: 5891,
    lapRecord: { time: 87.097, driver: 'Hamilton', year: 2020 },
    drsZones: 2,
    corners: 18,
    background: '#1a2030',

    startPosition: { x: 700, y: 700 },
    startAngle: -Math.PI,

    pitEntry: 0.95,
    pitExit: 0.02,
    pitLaneTime: 23,

    sectors: [0.33, 0.66],

    controlPoints: [
        // Start/finish straight
        { x: 700, y: 700, width: 16, drs: true, sector: 1 },
        { x: 620, y: 700, width: 16, drs: true, sector: 1 },
        { x: 540, y: 698, width: 15, drs: false, sector: 1 },
        // Copse (Turn 1)
        { x: 470, y: 680, width: 14, drs: false, kerb: true, sector: 1 },
        { x: 440, y: 660, width: 13, drs: false, kerb: true, sector: 1 },
        { x: 430, y: 630, width: 13, drs: false, sector: 1 },
        // Maggots (Turn 3)
        { x: 440, y: 600, width: 13, drs: false, kerb: true, sector: 1 },
        { x: 460, y: 575, width: 13, drs: false, kerb: true, sector: 1 },
        // Becketts (Turn 4/5/6) - the famous fast S
        { x: 490, y: 555, width: 13, drs: false, kerb: true, sector: 1 },
        { x: 520, y: 540, width: 12, drs: false, kerb: true, sector: 1 },
        { x: 550, y: 525, width: 12, drs: false, kerb: true, sector: 1 },
        { x: 570, y: 510, width: 12, drs: false, kerb: true, sector: 1 },
        // Chapel
        { x: 590, y: 495, width: 13, drs: false, kerb: true, sector: 1 },
        { x: 610, y: 485, width: 13, drs: false, sector: 1 },
        // Hangar Straight (DRS zone)
        { x: 640, y: 480, width: 15, drs: true, sector: 1 },
        { x: 700, y: 478, width: 15, drs: true, sector: 1 },
        { x: 760, y: 478, width: 15, drs: true, sector: 1 },
        { x: 820, y: 480, width: 14, drs: true, sector: 1 },
        // Stowe (Turn 7)
        { x: 870, y: 490, width: 13, drs: false, kerb: true, sector: 2 },
        { x: 890, y: 510, width: 12, drs: false, kerb: true, sector: 2 },
        { x: 900, y: 535, width: 12, drs: false, sector: 2 },
        // Vale
        { x: 895, y: 560, width: 12, drs: false, kerb: true, sector: 2 },
        { x: 880, y: 580, width: 12, drs: false, sector: 2 },
        // Club (Turn 9)
        { x: 860, y: 595, width: 12, drs: false, kerb: true, sector: 2 },
        { x: 840, y: 605, width: 13, drs: false, sector: 2 },
        { x: 820, y: 615, width: 13, drs: false, sector: 2 },
        { x: 800, y: 625, width: 13, drs: false, sector: 2 },
        // Abbey (Turn 10)
        { x: 780, y: 640, width: 13, drs: false, kerb: true, sector: 2 },
        { x: 750, y: 650, width: 14, drs: false, sector: 2 },
        { x: 720, y: 655, width: 14, drs: false, sector: 2 },
        // Farm (Turn 11)
        { x: 690, y: 660, width: 13, drs: false, kerb: true, sector: 2 },
        { x: 660, y: 650, width: 13, drs: false, sector: 2 },
        { x: 640, y: 640, width: 13, drs: false, sector: 2 },
        // Village (Turn 12) - Wellington / Loop complex
        { x: 610, y: 640, width: 12, drs: false, kerb: true, sector: 3 },
        { x: 590, y: 660, width: 11, drs: false, kerb: true, sector: 3 },
        { x: 580, y: 680, width: 11, drs: false, sector: 3 },
        { x: 590, y: 710, width: 11, drs: false, kerb: true, sector: 3 },
        { x: 610, y: 730, width: 12, drs: false, sector: 3 },
        // The Loop
        { x: 640, y: 745, width: 12, drs: false, kerb: true, sector: 3 },
        { x: 670, y: 755, width: 12, drs: false, kerb: true, sector: 3 },
        { x: 700, y: 755, width: 12, drs: false, sector: 3 },
        // Aintree (Turn 15)
        { x: 730, y: 750, width: 12, drs: false, kerb: true, sector: 3 },
        { x: 750, y: 735, width: 12, drs: false, sector: 3 },
        // Wellington Straight
        { x: 770, y: 740, width: 13, drs: true, sector: 3 },
        { x: 790, y: 750, width: 13, drs: true, sector: 3 },
        { x: 810, y: 755, width: 13, drs: false, sector: 3 },
        // Luffield (Turn 16/17)
        { x: 840, y: 745, width: 12, drs: false, kerb: true, sector: 3 },
        { x: 850, y: 730, width: 11, drs: false, kerb: true, sector: 3 },
        { x: 845, y: 715, width: 11, drs: false, kerb: true, sector: 3 },
        { x: 830, y: 705, width: 12, drs: false, sector: 3 },
        // Woodcote (Turn 18)
        { x: 810, y: 700, width: 13, drs: false, kerb: true, sector: 3 },
        { x: 790, y: 698, width: 14, drs: false, sector: 3 },
        { x: 760, y: 700, width: 15, drs: true, sector: 3 },
    ],

    drsZonesList: [
        { start: 0.0, end: 0.12, detectionPoint: 0.97 },
        { start: 0.36, end: 0.48, detectionPoint: 0.33 }
    ],

    cornerSpeeds: {
        'Copse': 290,
        'Maggots': 280,
        'Becketts': 270,
        'Chapel': 290,
        'Stowe': 155,
        'Vale': 170,
        'Club': 205,
        'Abbey': 250,
        'Farm': 210,
        'Village': 105,
        'The Loop': 90,
        'Aintree': 145,
        'Luffield': 85,
        'Woodcote': 235
    }
};
