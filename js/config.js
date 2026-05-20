// F1 Game Configuration Constants
const CONFIG = {
    // Physics
    PHYSICS_TIMESTEP: 1/60,
    MAX_SPEED: 100, // m/s (~360 km/h)

    // Engine
    MAX_RPM: 15000,
    MIN_RPM: 5000,
    GEAR_RATIOS: [0, 3.2, 2.1, 1.55, 1.22, 0.98, 0.82, 0.70, 0.62],
    FINAL_DRIVE: 3.5,
    ENGINE_POWER: 735000, // 735kW ~ 1000hp total with ERS

    // ERS
    ERS_MAX_ENERGY: 4000000, // 4 MJ in joules
    ERS_DEPLOY_RATE: 120000, // 120kW deployment
    ERS_HARVEST_RATE: 60000, // 60kW harvest under braking
    ERS_DEPLOY_BOOST: 160000, // 160kW boost when deployed

    // DRS
    DRS_DRAG_REDUCTION: 0.20, // 20% drag reduction
    DRS_DETECTION_DISTANCE: 1.0, // 1 second gap

    // Fuel
    FUEL_START: 105, // kg
    FUEL_PER_LAP: 2.5, // kg per lap
    FUEL_WEIGHT_EFFECT: 0.03, // 3% per 10kg

    // Aerodynamics
    DRAG_COEFFICIENT: 0.9,
    DOWNFORCE_COEFFICIENT: 3.5,
    AIR_DENSITY: 1.2, // kg/m^3
    CAR_FRONTAL_AREA: 1.5, // m^2
    CAR_PLAN_AREA: 4.5, // m^2
    CAR_MASS: 798, // kg with minimum fuel

    // Tire compounds
    TIRE_COMPOUNDS: {
        SOFT: {
            name: 'Soft',
            color: '#ff3333',
            gripMultiplier: 1.15,
            wearRate: 1.8,
            optimalTemp: 95,
            tempRange: 20,
            rainGrip: 0.3
        },
        MEDIUM: {
            name: 'Medium',
            color: '#ffff00',
            gripMultiplier: 1.0,
            wearRate: 1.0,
            optimalTemp: 90,
            tempRange: 25,
            rainGrip: 0.35
        },
        HARD: {
            name: 'Hard',
            color: '#cccccc',
            gripMultiplier: 0.9,
            wearRate: 0.6,
            optimalTemp: 85,
            tempRange: 30,
            rainGrip: 0.4
        },
        INTERMEDIATE: {
            name: 'Inter',
            color: '#00cc44',
            gripMultiplier: 0.85,
            wearRate: 0.8,
            optimalTemp: 75,
            tempRange: 35,
            rainGrip: 0.85
        },
        WET: {
            name: 'Wet',
            color: '#3399ff',
            gripMultiplier: 0.75,
            wearRate: 0.5,
            optimalTemp: 65,
            tempRange: 40,
            rainGrip: 1.0
        }
    },

    // Pacejka tire model coefficients
    PACEJKA: {
        B: 10,  // Stiffness
        C: 1.9, // Shape
        D: 1.0, // Peak
        E: 0.97 // Curvature
    },

    // Teams
    TEAMS: [
        { name: 'Red Bull Racing', shortName: 'RBR', primaryColor: '#0600ef', secondaryColor: '#cc1e4a', drivers: ['Verstappen', 'Perez'] },
        { name: 'Mercedes-AMG', shortName: 'MER', primaryColor: '#00d2be', secondaryColor: '#c0c0c0', drivers: ['Hamilton', 'Russell'] },
        { name: 'Scuderia Ferrari', shortName: 'FER', primaryColor: '#dc0000', secondaryColor: '#ffff00', drivers: ['Leclerc', 'Sainz'] },
        { name: 'McLaren F1', shortName: 'MCL', primaryColor: '#ff8000', secondaryColor: '#ffffff', drivers: ['Norris', 'Piastri'] },
        { name: 'Aston Martin', shortName: 'AMR', primaryColor: '#006f62', secondaryColor: '#cedc00', drivers: ['Alonso', 'Stroll'] },
        { name: 'Alpine F1', shortName: 'ALP', primaryColor: '#0090ff', secondaryColor: '#ff0000', drivers: ['Ocon', 'Gasly'] },
        { name: 'Williams Racing', shortName: 'WIL', primaryColor: '#005aff', secondaryColor: '#ffffff', drivers: ['Albon', 'Sargeant'] },
        { name: 'Haas F1 Team', shortName: 'HAS', primaryColor: '#ffffff', secondaryColor: '#e8002d', drivers: ['Hulkenberg', 'Magnussen'] },
        { name: 'RB F1 Team', shortName: 'RB', primaryColor: '#1434cb', secondaryColor: '#6692ff', drivers: ['Tsunoda', 'Ricciardo'] },
        { name: 'Stake F1 / Sauber', shortName: 'SAU', primaryColor: '#52e252', secondaryColor: '#000000', drivers: ['Bottas', 'Zhou'] }
    ],

    // All 20 drivers
    DRIVERS: [
        { name: 'Verstappen', number: 1, team: 0, skill: 0.98, aggression: 0.85, consistency: 0.95 },
        { name: 'Hamilton', number: 44, team: 1, skill: 0.97, aggression: 0.75, consistency: 0.97 },
        { name: 'Leclerc', number: 16, team: 2, skill: 0.95, aggression: 0.8, consistency: 0.90 },
        { name: 'Norris', number: 4, team: 3, skill: 0.93, aggression: 0.78, consistency: 0.92 },
        { name: 'Alonso', number: 14, team: 4, skill: 0.96, aggression: 0.82, consistency: 0.94 },
        { name: 'Sainz', number: 55, team: 2, skill: 0.91, aggression: 0.72, consistency: 0.91 },
        { name: 'Russell', number: 63, team: 1, skill: 0.90, aggression: 0.70, consistency: 0.89 },
        { name: 'Perez', number: 11, team: 0, skill: 0.89, aggression: 0.75, consistency: 0.85 },
        { name: 'Piastri', number: 81, team: 3, skill: 0.88, aggression: 0.68, consistency: 0.87 },
        { name: 'Stroll', number: 18, team: 4, skill: 0.78, aggression: 0.65, consistency: 0.80 },
        { name: 'Gasly', number: 10, team: 5, skill: 0.82, aggression: 0.73, consistency: 0.84 },
        { name: 'Ocon', number: 31, team: 5, skill: 0.80, aggression: 0.71, consistency: 0.82 },
        { name: 'Albon', number: 23, team: 6, skill: 0.81, aggression: 0.69, consistency: 0.83 },
        { name: 'Tsunoda', number: 22, team: 8, skill: 0.79, aggression: 0.77, consistency: 0.78 },
        { name: 'Hulkenberg', number: 27, team: 7, skill: 0.77, aggression: 0.70, consistency: 0.81 },
        { name: 'Magnussen', number: 20, team: 7, skill: 0.76, aggression: 0.83, consistency: 0.75 },
        { name: 'Ricciardo', number: 3, team: 8, skill: 0.82, aggression: 0.76, consistency: 0.80 },
        { name: 'Bottas', number: 77, team: 9, skill: 0.78, aggression: 0.65, consistency: 0.82 },
        { name: 'Zhou', number: 24, team: 9, skill: 0.74, aggression: 0.62, consistency: 0.76 },
        { name: 'Sargeant', number: 2, team: 6, skill: 0.70, aggression: 0.60, consistency: 0.72 }
    ],

    // Championship calendar
    CALENDAR: [
        { name: 'Bahrain Grand Prix', track: 'Bahrain' },
        { name: 'Saudi Arabian GP', track: 'Jeddah' },
        { name: 'Australian GP', track: 'Melbourne' },
        { name: 'Japanese GP', track: 'Suzuka', trackKey: 'suzuka' },
        { name: 'Chinese GP', track: 'Shanghai' },
        { name: 'Miami GP', track: 'Miami' },
        { name: 'Emilia Romagna GP', track: 'Imola' },
        { name: 'Monaco GP', track: 'Monaco', trackKey: 'monaco' },
        { name: 'Canadian GP', track: 'Montreal' },
        { name: 'Spanish GP', track: 'Barcelona' },
        { name: 'Austrian GP', track: 'Red Bull Ring' },
        { name: 'British GP', track: 'Silverstone', trackKey: 'silverstone' },
        { name: 'Hungarian GP', track: 'Budapest' },
        { name: 'Belgian GP', track: 'Spa', trackKey: 'spa' },
        { name: 'Dutch GP', track: 'Zandvoort' },
        { name: 'Italian GP', track: 'Monza', trackKey: 'monza' },
        { name: 'Azerbaijan GP', track: 'Baku' },
        { name: 'Singapore GP', track: 'Singapore' },
        { name: 'United States GP', track: 'Austin' },
        { name: 'Mexico City GP', track: 'Mexico' },
        { name: 'São Paulo GP', track: 'Interlagos' },
        { name: 'Las Vegas GP', track: 'Las Vegas' },
        { name: 'Qatar GP', track: 'Lusail' },
        { name: 'Abu Dhabi GP', track: 'Yas Marina' }
    ],

    // Points system
    POINTS: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    FASTEST_LAP_POINT: 1,

    // Camera
    CAMERA_LERP: 0.08,
    CAMERA_OFFSET: 150, // pixels ahead of car

    // Rendering
    CANVAS_WIDTH: 1280,
    CANVAS_HEIGHT: 720,

    // Audio
    ENGINE_BASE_FREQ: 80,
    ENGINE_MAX_FREQ: 220,

    // Weather
    WEATHER_TYPES: {
        DRY: { name: 'Dry', gripModifier: 1.0, visibilityModifier: 1.0, rainIntensity: 0 },
        LIGHT_RAIN: { name: 'Light Rain', gripModifier: 0.85, visibilityModifier: 0.85, rainIntensity: 0.3 },
        HEAVY_RAIN: { name: 'Heavy Rain', gripModifier: 0.65, visibilityModifier: 0.6, rainIntensity: 1.0 },
        CHANGING: { name: 'Changing', gripModifier: 0.9, visibilityModifier: 0.9, rainIntensity: 0.1 }
    }
};

// Keyboard controls
const CONTROLS = {
    P1: {
        accelerate: 'KeyW',
        brake: 'KeyS',
        steerLeft: 'KeyA',
        steerRight: 'KeyD',
        drs: 'Space',
        ers: 'ShiftLeft',
        pit: 'KeyP'
    },
    P2: {
        accelerate: 'ArrowUp',
        brake: 'ArrowDown',
        steerLeft: 'ArrowLeft',
        steerRight: 'ArrowRight',
        drs: 'Enter',
        ers: 'ShiftRight',
        pit: 'Slash'
    }
};
