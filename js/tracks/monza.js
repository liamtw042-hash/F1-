// Autodromo Nazionale Monza
// Scale: 1 unit ≈ 2 meters, circuit is ~5.793km
const MonzaTrack = {
    name: 'Italian Grand Prix',
    shortName: 'Monza',
    country: 'Italy',
    lapLength: 5793,
    lapRecord: { time: 80.872, driver: 'Barrichello', year: 2004 },
    drsZones: 2,
    corners: 11,
    background: '#1a2515',

    startPosition: { x: 450, y: 600 },
    startAngle: 0,

    pitEntry: 0.94,
    pitExit: 0.01,
    pitLaneTime: 23,

    sectors: [0.30, 0.65],

    controlPoints: [
        // Start/finish straight (very long)
        { x: 450, y: 600, width: 16, drs: true, sector: 1 },
        { x: 550, y: 598, width: 16, drs: true, sector: 1 },
        { x: 650, y: 598, width: 16, drs: true, sector: 1 },
        { x: 750, y: 598, width: 15, drs: false, sector: 1 },
        // Prima variante chicane (Turns 1/2)
        { x: 820, y: 590, width: 12, drs: false, kerb: true, sector: 1 },
        { x: 850, y: 570, width: 11, drs: false, kerb: true, sector: 1 },
        { x: 860, y: 545, width: 11, drs: false, kerb: true, sector: 1 },
        { x: 840, y: 525, width: 11, drs: false, kerb: true, sector: 1 },
        { x: 810, y: 520, width: 12, drs: false, sector: 1 },
        // Curva Grande (Turn 3) - long high speed right
        { x: 780, y: 515, width: 13, drs: false, kerb: true, sector: 1 },
        { x: 750, y: 505, width: 13, drs: false, sector: 1 },
        { x: 720, y: 490, width: 14, drs: false, sector: 1 },
        { x: 690, y: 480, width: 14, drs: false, sector: 1 },
        { x: 660, y: 475, width: 14, drs: false, sector: 1 },
        { x: 620, y: 475, width: 14, drs: false, sector: 1 },
        // Seconda variante chicane (Turns 4/5)
        { x: 580, y: 475, width: 12, drs: false, kerb: true, sector: 1 },
        { x: 555, y: 465, width: 11, drs: false, kerb: true, sector: 1 },
        { x: 540, y: 450, width: 11, drs: false, kerb: true, sector: 1 },
        { x: 545, y: 430, width: 11, drs: false, kerb: true, sector: 1 },
        { x: 560, y: 420, width: 12, drs: false, sector: 1 },
        // Lesmo 1 approach
        { x: 590, y: 420, width: 13, drs: false, sector: 2 },
        { x: 620, y: 415, width: 13, drs: false, sector: 2 },
        // Lesmo 1 (Turn 6)
        { x: 655, y: 410, width: 12, drs: false, kerb: true, sector: 2 },
        { x: 680, y: 395, width: 11, drs: false, kerb: true, sector: 2 },
        { x: 690, y: 370, width: 11, drs: false, sector: 2 },
        // Between Lesmos
        { x: 700, y: 345, width: 12, drs: false, sector: 2 },
        { x: 710, y: 325, width: 12, drs: false, sector: 2 },
        // Lesmo 2 (Turn 7)
        { x: 720, y: 305, width: 11, drs: false, kerb: true, sector: 2 },
        { x: 730, y: 280, width: 11, drs: false, kerb: true, sector: 2 },
        { x: 720, y: 260, width: 11, drs: false, sector: 2 },
        { x: 700, y: 250, width: 12, drs: false, sector: 2 },
        // Serraglio and Ascari
        { x: 670, y: 245, width: 13, drs: false, sector: 2 },
        { x: 640, y: 245, width: 13, drs: false, sector: 2 },
        // Curva di Ascari (Turns 8-10)
        { x: 610, y: 250, width: 12, drs: false, kerb: true, sector: 2 },
        { x: 580, y: 260, width: 11, drs: false, kerb: true, sector: 2 },
        { x: 565, y: 280, width: 11, drs: false, kerb: true, sector: 2 },
        { x: 570, y: 305, width: 11, drs: false, kerb: true, sector: 2 },
        { x: 585, y: 325, width: 11, drs: false, kerb: true, sector: 2 },
        { x: 600, y: 340, width: 12, drs: false, sector: 2 },
        // Long back straight (Rettifilo Centrale)
        { x: 570, y: 355, width: 14, drs: false, sector: 3 },
        { x: 535, y: 370, width: 14, drs: false, sector: 3 },
        { x: 500, y: 385, width: 14, drs: false, sector: 3 },
        { x: 465, y: 400, width: 14, drs: false, sector: 3 },
        { x: 430, y: 420, width: 14, drs: false, sector: 3 },
        { x: 400, y: 440, width: 14, drs: false, sector: 3 },
        // Parabolica approach
        { x: 375, y: 465, width: 14, drs: false, sector: 3 },
        { x: 355, y: 490, width: 14, drs: false, sector: 3 },
        // Parabolica (Curva Parabolica / Turn 11)
        { x: 345, y: 520, width: 12, drs: false, kerb: true, sector: 3 },
        { x: 350, y: 555, width: 12, drs: false, kerb: true, sector: 3 },
        { x: 365, y: 575, width: 13, drs: false, kerb: true, sector: 3 },
        { x: 390, y: 590, width: 14, drs: false, sector: 3 },
        // Back onto main straight
        { x: 420, y: 598, width: 15, drs: true, sector: 3 },
    ],

    drsZonesList: [
        { start: 0.0, end: 0.15, detectionPoint: 0.96 },
        { start: 0.55, end: 0.68, detectionPoint: 0.52 }
    ],

    cornerSpeeds: {
        'Prima Variante': 80,
        'Curva Grande': 280,
        'Seconda Variante': 90,
        'Lesmo 1': 195,
        'Lesmo 2': 195,
        'Ascari': 155,
        'Parabolica': 135
    }
};
