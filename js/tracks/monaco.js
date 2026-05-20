// Monaco Grand Prix Circuit
// Scale: 1 unit ≈ 1 meter, circuit is ~3.337km
const MonacoTrack = {
    name: 'Monaco Grand Prix',
    shortName: 'Monaco',
    country: 'Monte Carlo',
    lapLength: 3337, // meters
    lapRecord: { time: 71.909, driver: 'Verstappen', year: 2023 },
    drsZones: 1,
    corners: 19,
    background: '#1a3a2a',

    // Starting grid position and angle
    startPosition: { x: 580, y: 680 },
    startAngle: -Math.PI / 2,

    // Pit lane entry/exit
    pitEntry: 0.95,
    pitExit: 0.02,
    pitLaneTime: 22,

    // Sector boundaries (as fraction of lap)
    sectors: [0.33, 0.66],

    // Control points for the racing line
    // Monaco: Sainte Devote, Massenet, Casino, Mirabeau, Grand Hotel Hairpin, Portier, Tunnel, Chicane, La Rascasse
    controlPoints: [
        // Start/Finish straight
        { x: 580, y: 680, width: 14, drs: true, sector: 1 },
        { x: 640, y: 650, width: 14, drs: true, sector: 1 },
        { x: 700, y: 620, width: 13, drs: false, sector: 1 },
        // Sainte Devote (Turn 1)
        { x: 730, y: 580, width: 10, drs: false, kerb: true, sector: 1 },
        { x: 720, y: 540, width: 10, drs: false, kerb: true, sector: 1 },
        // Climb to Casino
        { x: 700, y: 500, width: 10, drs: false, sector: 1 },
        { x: 670, y: 470, width: 10, drs: false, sector: 1 },
        { x: 640, y: 450, width: 9, drs: false, sector: 1 },
        { x: 610, y: 430, width: 9, drs: false, sector: 1 },
        // Massenet (Turn 3)
        { x: 580, y: 420, width: 9, drs: false, kerb: true, sector: 1 },
        { x: 550, y: 430, width: 9, drs: false, kerb: true, sector: 1 },
        // Casino Square
        { x: 520, y: 440, width: 10, drs: false, sector: 1 },
        { x: 490, y: 450, width: 10, drs: false, sector: 1 },
        // Mirabeau (Turn 5)
        { x: 460, y: 470, width: 9, drs: false, kerb: true, sector: 2 },
        { x: 440, y: 490, width: 9, drs: false, sector: 2 },
        { x: 430, y: 510, width: 9, drs: false, sector: 2 },
        // Loews / Grand Hotel Hairpin (Turn 6)
        { x: 420, y: 540, width: 9, drs: false, kerb: true, sector: 2 },
        { x: 415, y: 570, width: 9, drs: false, kerb: true, sector: 2 },
        { x: 420, y: 600, width: 10, drs: false, sector: 2 },
        { x: 440, y: 620, width: 10, drs: false, sector: 2 },
        // Portier (Turn 9/10)
        { x: 470, y: 640, width: 10, drs: false, kerb: true, sector: 2 },
        { x: 500, y: 655, width: 11, drs: false, sector: 2 },
        // Entry to Tunnel
        { x: 530, y: 660, width: 12, drs: false, sector: 2 },
        { x: 560, y: 660, width: 13, drs: false, sector: 2 },
        // Tunnel (underground - no changes in direction)
        { x: 600, y: 655, width: 13, drs: false, sector: 2 },
        { x: 640, y: 645, width: 12, drs: false, sector: 2 },
        { x: 680, y: 640, width: 12, drs: false, sector: 2 },
        { x: 720, y: 640, width: 12, drs: false, sector: 2 },
        { x: 760, y: 645, width: 12, drs: false, sector: 2 },
        { x: 800, y: 650, width: 12, drs: false, sector: 2 },
        // Nouvelle Chicane (Turns 10/11)
        { x: 830, y: 660, width: 10, drs: false, kerb: true, sector: 3 },
        { x: 850, y: 680, width: 10, drs: false, kerb: true, sector: 3 },
        { x: 840, y: 700, width: 10, drs: false, kerb: true, sector: 3 },
        { x: 820, y: 715, width: 11, drs: false, sector: 3 },
        { x: 800, y: 720, width: 11, drs: false, sector: 3 },
        // Tabac (Turn 12)
        { x: 780, y: 720, width: 10, drs: false, kerb: true, sector: 3 },
        { x: 760, y: 718, width: 10, drs: false, sector: 3 },
        { x: 740, y: 715, width: 10, drs: false, sector: 3 },
        // Swimming Pool complex (Turns 13-16)
        { x: 720, y: 720, width: 9, drs: false, kerb: true, sector: 3 },
        { x: 700, y: 730, width: 9, drs: false, kerb: true, sector: 3 },
        { x: 690, y: 750, width: 9, drs: false, kerb: true, sector: 3 },
        { x: 695, y: 770, width: 9, drs: false, kerb: true, sector: 3 },
        { x: 710, y: 785, width: 9, drs: false, sector: 3 },
        { x: 730, y: 790, width: 9, drs: false, sector: 3 },
        // Rascasse (Turn 17/18)
        { x: 680, y: 800, width: 9, drs: false, kerb: true, sector: 3 },
        { x: 650, y: 800, width: 9, drs: false, kerb: true, sector: 3 },
        { x: 630, y: 790, width: 9, drs: false, sector: 3 },
        { x: 620, y: 775, width: 10, drs: false, sector: 3 },
        // Anthony Noghes (Turn 19)
        { x: 610, y: 760, width: 10, drs: false, kerb: true, sector: 3 },
        { x: 600, y: 740, width: 11, drs: false, sector: 3 },
        { x: 590, y: 720, width: 12, drs: true, sector: 3 },
        { x: 585, y: 700, width: 13, drs: true, sector: 3 },
    ],

    // DRS zones definition
    drsZonesList: [
        { start: 0.92, end: 0.08, detectionPoint: 0.90 }
    ],

    // Corner reference speeds (km/h)
    cornerSpeeds: {
        'Sainte Devote': 75,
        'Massenet': 120,
        'Casino': 95,
        'Mirabeau': 65,
        'Loews Hairpin': 30,
        'Portier': 85,
        'Tunnel': 280,
        'Nouvelle Chicane': 155,
        'Tabac': 155,
        'Swimming Pool': 140,
        'Rascasse': 50,
        'Anthony Noghes': 95
    }
};
