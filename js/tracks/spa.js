// Circuit de Spa-Francorchamps
// Scale: 1 unit ≈ 2 meters, circuit is ~7.004km
const SpaTrack = {
    name: 'Belgian Grand Prix',
    shortName: 'Spa',
    country: 'Belgium',
    lapLength: 7004, // meters
    lapRecord: { time: 105.792, driver: 'Bottas', year: 2018 },
    drsZones: 3,
    corners: 19,
    background: '#1a2a1a',

    startPosition: { x: 350, y: 600 },
    startAngle: 0,

    pitEntry: 0.94,
    pitExit: 0.01,
    pitLaneTime: 24,

    sectors: [0.33, 0.66],

    controlPoints: [
        // Start/Finish - La Source approach
        { x: 350, y: 600, width: 15, drs: true, sector: 1 },
        { x: 430, y: 595, width: 15, drs: true, sector: 1 },
        { x: 510, y: 590, width: 14, drs: false, sector: 1 },
        // La Source hairpin (Turn 1)
        { x: 570, y: 580, width: 12, drs: false, kerb: true, sector: 1 },
        { x: 590, y: 560, width: 11, drs: false, kerb: true, sector: 1 },
        { x: 580, y: 540, width: 11, drs: false, kerb: true, sector: 1 },
        { x: 560, y: 530, width: 12, drs: false, sector: 1 },
        // Raidillon / Eau Rouge (descending and climbing)
        { x: 530, y: 520, width: 13, drs: false, sector: 1 },
        { x: 490, y: 510, width: 14, drs: false, sector: 1 },
        // Eau Rouge flat out
        { x: 460, y: 520, width: 13, drs: false, kerb: true, sector: 1 },
        { x: 450, y: 540, width: 13, drs: false, sector: 1 },
        { x: 455, y: 560, width: 13, drs: false, kerb: true, sector: 1 },
        // Raidillon climb
        { x: 460, y: 580, width: 12, drs: false, sector: 1 },
        { x: 440, y: 560, width: 12, drs: false, sector: 1 },
        { x: 415, y: 540, width: 12, drs: false, sector: 1 },
        // Kemmel Straight (long DRS zone)
        { x: 390, y: 510, width: 14, drs: true, sector: 1 },
        { x: 360, y: 480, width: 14, drs: true, sector: 1 },
        { x: 330, y: 450, width: 14, drs: true, sector: 1 },
        { x: 300, y: 420, width: 14, drs: true, sector: 1 },
        { x: 270, y: 390, width: 14, drs: true, sector: 1 },
        // Les Combes chicane (Turn 5/6)
        { x: 240, y: 370, width: 11, drs: false, kerb: true, sector: 2 },
        { x: 220, y: 380, width: 11, drs: false, kerb: true, sector: 2 },
        { x: 210, y: 400, width: 11, drs: false, kerb: true, sector: 2 },
        { x: 220, y: 420, width: 11, drs: false, sector: 2 },
        // Malmedy
        { x: 240, y: 430, width: 12, drs: false, kerb: true, sector: 2 },
        { x: 260, y: 440, width: 12, drs: false, sector: 2 },
        { x: 280, y: 450, width: 12, drs: false, sector: 2 },
        // Rivage (hairpin)
        { x: 230, y: 460, width: 11, drs: false, kerb: true, sector: 2 },
        { x: 200, y: 455, width: 11, drs: false, kerb: true, sector: 2 },
        { x: 180, y: 445, width: 11, drs: false, sector: 2 },
        // Pouhon double apex
        { x: 170, y: 480, width: 12, drs: false, kerb: true, sector: 2 },
        { x: 175, y: 510, width: 12, drs: false, kerb: true, sector: 2 },
        { x: 185, y: 535, width: 12, drs: false, sector: 2 },
        { x: 200, y: 555, width: 12, drs: false, sector: 2 },
        { x: 220, y: 570, width: 12, drs: false, sector: 2 },
        // Fagnes chicane
        { x: 250, y: 580, width: 11, drs: false, kerb: true, sector: 2 },
        { x: 270, y: 575, width: 11, drs: false, kerb: true, sector: 2 },
        { x: 290, y: 580, width: 11, drs: false, kerb: true, sector: 2 },
        { x: 310, y: 590, width: 12, drs: false, sector: 2 },
        // Stavelot (Turn 14)
        { x: 330, y: 600, width: 12, drs: false, kerb: true, sector: 3 },
        { x: 360, y: 615, width: 12, drs: false, sector: 3 },
        { x: 390, y: 625, width: 12, drs: false, sector: 3 },
        // Paul Frere curve
        { x: 420, y: 640, width: 12, drs: false, kerb: true, sector: 3 },
        { x: 450, y: 650, width: 12, drs: false, sector: 3 },
        { x: 480, y: 655, width: 12, drs: false, sector: 3 },
        // Blanchimont (high speed)
        { x: 510, y: 650, width: 13, drs: false, kerb: true, sector: 3 },
        { x: 540, y: 640, width: 13, drs: false, sector: 3 },
        { x: 560, y: 625, width: 13, drs: false, sector: 3 },
        // Bus Stop chicane (Turn 19)
        { x: 580, y: 615, width: 11, drs: false, kerb: true, sector: 3 },
        { x: 590, y: 625, width: 11, drs: false, kerb: true, sector: 3 },
        { x: 575, y: 635, width: 11, drs: false, kerb: true, sector: 3 },
        { x: 555, y: 640, width: 12, drs: false, sector: 3 },
        // Back to S/F
        { x: 510, y: 635, width: 13, drs: true, sector: 3 },
        { x: 460, y: 630, width: 14, drs: true, sector: 3 },
        { x: 410, y: 622, width: 14, drs: true, sector: 3 },
    ],

    drsZonesList: [
        { start: 0.0, end: 0.06, detectionPoint: 0.97 },
        { start: 0.20, end: 0.32, detectionPoint: 0.18 },
        { start: 0.85, end: 0.97, detectionPoint: 0.82 }
    ],

    cornerSpeeds: {
        'La Source': 75,
        'Eau Rouge': 285,
        'Raidillon': 285,
        'Kemmel': 320,
        'Les Combes': 120,
        'Malmedy': 200,
        'Rivage': 65,
        'Pouhon': 250,
        'Fagnes': 155,
        'Stavelot': 230,
        'Paul Frere': 275,
        'Blanchimont': 305,
        'Bus Stop': 95
    }
};
