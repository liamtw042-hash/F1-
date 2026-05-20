// Suzuka International Racing Course
// Scale: 1 unit ≈ 2 meters, circuit is ~5.807km
const SuzukaTrack = {
    name: 'Japanese Grand Prix',
    shortName: 'Suzuka',
    country: 'Japan',
    lapLength: 5807,
    lapRecord: { time: 90.983, driver: 'Leclerc', year: 2019 },
    drsZones: 2,
    corners: 18,
    background: '#1a1a2a',

    startPosition: { x: 700, y: 620 },
    startAngle: -Math.PI / 2,

    pitEntry: 0.96,
    pitExit: 0.01,
    pitLaneTime: 24,

    sectors: [0.35, 0.65],

    controlPoints: [
        // Start/finish straight
        { x: 700, y: 620, width: 15, drs: true, sector: 1 },
        { x: 700, y: 560, width: 15, drs: true, sector: 1 },
        { x: 700, y: 500, width: 14, drs: false, sector: 1 },
        // First curve (Turn 1)
        { x: 690, y: 460, width: 13, drs: false, kerb: true, sector: 1 },
        { x: 670, y: 435, width: 12, drs: false, kerb: true, sector: 1 },
        { x: 645, y: 420, width: 12, drs: false, sector: 1 },
        // S curves (Turns 3-7)
        { x: 615, y: 415, width: 12, drs: false, kerb: true, sector: 1 },
        { x: 590, y: 420, width: 12, drs: false, kerb: true, sector: 1 },
        { x: 575, y: 435, width: 12, drs: false, kerb: true, sector: 1 },
        { x: 570, y: 455, width: 12, drs: false, kerb: true, sector: 1 },
        { x: 570, y: 475, width: 12, drs: false, kerb: true, sector: 1 },
        { x: 575, y: 495, width: 12, drs: false, kerb: true, sector: 1 },
        { x: 590, y: 510, width: 12, drs: false, kerb: true, sector: 1 },
        { x: 610, y: 520, width: 12, drs: false, sector: 1 },
        // Dunlop
        { x: 630, y: 525, width: 12, drs: false, kerb: true, sector: 1 },
        { x: 650, y: 525, width: 12, drs: false, sector: 1 },
        // Degner 1 & 2 (Turns 8-9)
        { x: 665, y: 520, width: 12, drs: false, kerb: true, sector: 1 },
        { x: 680, y: 505, width: 11, drs: false, kerb: true, sector: 1 },
        { x: 695, y: 490, width: 11, drs: false, sector: 1 },
        // Hairpin (Turn 10) - famous slow hairpin
        { x: 720, y: 490, width: 11, drs: false, kerb: true, sector: 2 },
        { x: 740, y: 500, width: 11, drs: false, kerb: true, sector: 2 },
        { x: 750, y: 520, width: 12, drs: false, sector: 2 },
        // Spoon curves (Turns 13-14)
        { x: 760, y: 540, width: 12, drs: false, kerb: true, sector: 2 },
        { x: 770, y: 565, width: 12, drs: false, sector: 2 },
        { x: 775, y: 590, width: 12, drs: false, sector: 2 },
        { x: 780, y: 615, width: 12, drs: false, sector: 2 },
        { x: 790, y: 640, width: 12, drs: false, kerb: true, sector: 2 },
        { x: 810, y: 660, width: 12, drs: false, kerb: true, sector: 2 },
        { x: 835, y: 670, width: 12, drs: false, sector: 2 },
        // Back straight (under flyover)
        { x: 860, y: 665, width: 13, drs: true, sector: 2 },
        { x: 885, y: 650, width: 13, drs: true, sector: 2 },
        { x: 905, y: 635, width: 13, drs: true, sector: 2 },
        { x: 920, y: 610, width: 14, drs: true, sector: 2 },
        { x: 930, y: 585, width: 14, drs: true, sector: 2 },
        // 130R (Turn 15) - famous flat-out corner
        { x: 935, y: 555, width: 13, drs: false, kerb: true, sector: 3 },
        { x: 930, y: 525, width: 13, drs: false, sector: 3 },
        { x: 920, y: 500, width: 13, drs: false, sector: 3 },
        { x: 905, y: 480, width: 13, drs: false, sector: 3 },
        { x: 885, y: 465, width: 13, drs: false, kerb: true, sector: 3 },
        { x: 860, y: 458, width: 13, drs: false, sector: 3 },
        // Casio Triangle chicane (Turns 16-17)
        { x: 830, y: 455, width: 12, drs: false, kerb: true, sector: 3 },
        { x: 810, y: 465, width: 11, drs: false, kerb: true, sector: 3 },
        { x: 800, y: 480, width: 11, drs: false, kerb: true, sector: 3 },
        { x: 808, y: 498, width: 11, drs: false, kerb: true, sector: 3 },
        { x: 820, y: 508, width: 12, drs: false, sector: 3 },
        // Piper Chicane approach to S/F
        { x: 810, y: 520, width: 13, drs: false, kerb: true, sector: 3 },
        { x: 790, y: 530, width: 13, drs: false, kerb: true, sector: 3 },
        { x: 770, y: 535, width: 13, drs: false, sector: 3 },
        { x: 750, y: 545, width: 13, drs: false, sector: 3 },
        // Final chicane leading to main straight
        { x: 740, y: 560, width: 13, drs: true, sector: 3 },
        { x: 730, y: 575, width: 14, drs: true, sector: 3 },
        { x: 720, y: 595, width: 14, drs: true, sector: 3 },
        { x: 710, y: 610, width: 15, drs: true, sector: 3 },
    ],

    drsZonesList: [
        { start: 0.0, end: 0.12, detectionPoint: 0.95 },
        { start: 0.52, end: 0.65, detectionPoint: 0.49 }
    ],

    cornerSpeeds: {
        'Turn 1': 210,
        'S Curves': 230,
        'Dunlop': 175,
        'Degner 1': 190,
        'Degner 2': 170,
        'Hairpin': 60,
        'Spoon': 195,
        '130R': 290,
        'Casio Triangle': 95,
        'Piper': 155
    }
};
