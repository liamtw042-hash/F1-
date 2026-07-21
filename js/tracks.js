// F1 Circuit Data — 5 circuits
// Coordinates are abstract units; the engine auto-scales each circuit so its
// computed path length matches lapLength (real meters). Widths are meters as-is.
const TRACK_DATA = {
    monaco: {
        hills: 4,
        name: 'Monaco Grand Prix', shortName: 'Monaco', country: 'Monte Carlo',
        lapLength: 3337, record: 71.909, grass: '#20301c', runoff: '#3a3a38',
        sectors: [0.33, 0.66], pitEntry: 0.96,
        drsZonesList: [{ start: 0.92, end: 0.08 }],
        controlPoints: [
            {x:580,y:680,w:14,drs:1},{x:640,y:650,w:14,drs:1},{x:700,y:620,w:13},
            {x:730,y:580,w:10,kerb:1},{x:720,y:540,w:10,kerb:1},
            {x:700,y:500,w:10},{x:670,y:470,w:10},{x:640,y:450,w:9},{x:610,y:430,w:9},
            {x:580,y:420,w:9,kerb:1},{x:550,y:430,w:9,kerb:1},
            {x:520,y:440,w:10},{x:490,y:450,w:10},
            {x:460,y:470,w:9,kerb:1},{x:440,y:490,w:9},{x:430,y:510,w:9},
            {x:420,y:540,w:9,kerb:1},{x:415,y:570,w:9,kerb:1},{x:420,y:600,w:10},{x:440,y:620,w:10},
            {x:470,y:640,w:10,kerb:1},{x:500,y:655,w:11},
            {x:530,y:660,w:12},{x:560,y:660,w:13},
            {x:600,y:655,w:13},{x:640,y:645,w:12},{x:680,y:640,w:12},{x:720,y:640,w:12},
            {x:760,y:645,w:12},{x:800,y:650,w:12},
            {x:830,y:660,w:10,kerb:1},{x:850,y:680,w:10,kerb:1},{x:840,y:700,w:10,kerb:1},
            {x:820,y:715,w:11},{x:800,y:720,w:11},
            {x:780,y:720,w:10,kerb:1},{x:760,y:718,w:10},{x:740,y:715,w:10},
            {x:720,y:720,w:9,kerb:1},{x:700,y:730,w:9,kerb:1},{x:690,y:750,w:9,kerb:1},
            {x:695,y:770,w:9,kerb:1},{x:710,y:785,w:9},{x:730,y:790,w:9},
            {x:680,y:800,w:9,kerb:1},{x:650,y:800,w:9,kerb:1},{x:630,y:790,w:9},{x:620,y:775,w:10},
            {x:610,y:760,w:10,kerb:1},{x:600,y:740,w:11},{x:590,y:720,w:12,drs:1},{x:585,y:700,w:13,drs:1}
        ]
    },

    spa: {
        hills: 16,
        name: 'Belgian Grand Prix', shortName: 'Spa', country: 'Belgium',
        lapLength: 7004, record: 105.792, grass: '#1c2e1a', runoff: '#3b3b36',
        sectors: [0.33, 0.66], pitEntry: 0.95,
        drsZonesList: [{ start: 0.0, end: 0.06 }, { start: 0.20, end: 0.32 }, { start: 0.85, end: 0.97 }],
        controlPoints: [
            {x:350,y:600,w:15,drs:1},{x:430,y:595,w:15,drs:1},{x:510,y:590,w:14},
            {x:570,y:580,w:12,kerb:1},{x:590,y:560,w:11,kerb:1},{x:580,y:540,w:11,kerb:1},{x:560,y:530,w:12},
            {x:530,y:520,w:13},{x:490,y:510,w:14},
            {x:460,y:520,w:13,kerb:1},{x:450,y:540,w:13},{x:455,y:560,w:13,kerb:1},
            {x:460,y:580,w:12},{x:440,y:560,w:12},{x:415,y:540,w:12},
            {x:390,y:510,w:14,drs:1},{x:360,y:480,w:14,drs:1},{x:330,y:450,w:14,drs:1},
            {x:300,y:420,w:14,drs:1},{x:270,y:390,w:14,drs:1},
            {x:240,y:370,w:11,kerb:1},{x:220,y:380,w:11,kerb:1},{x:210,y:400,w:11,kerb:1},{x:220,y:420,w:11},
            {x:240,y:430,w:12,kerb:1},{x:260,y:440,w:12},{x:280,y:450,w:12},
            {x:230,y:460,w:11,kerb:1},{x:200,y:455,w:11,kerb:1},{x:180,y:445,w:11},
            {x:170,y:480,w:12,kerb:1},{x:175,y:510,w:12,kerb:1},{x:185,y:535,w:12},
            {x:200,y:555,w:12},{x:220,y:570,w:12},
            {x:250,y:580,w:11,kerb:1},{x:270,y:575,w:11,kerb:1},{x:290,y:580,w:11,kerb:1},{x:310,y:590,w:12},
            {x:330,y:600,w:12,kerb:1},{x:360,y:615,w:12},{x:390,y:625,w:12},
            {x:420,y:640,w:12,kerb:1},{x:450,y:650,w:12},{x:480,y:655,w:12},
            {x:510,y:650,w:13,kerb:1},{x:540,y:640,w:13},{x:560,y:625,w:13},
            {x:580,y:615,w:11,kerb:1},{x:590,y:625,w:11,kerb:1},{x:575,y:635,w:11,kerb:1},{x:555,y:640,w:12},
            {x:510,y:635,w:13,drs:1},{x:460,y:630,w:14,drs:1},{x:410,y:622,w:14,drs:1}
        ]
    },

    silverstone: {
        hills: 7,
        name: 'British Grand Prix', shortName: 'Silverstone', country: 'United Kingdom',
        lapLength: 5891, record: 87.097, grass: '#22301e', runoff: '#3c3c38',
        sectors: [0.33, 0.66], pitEntry: 0.95,
        drsZonesList: [{ start: 0.0, end: 0.12 }, { start: 0.36, end: 0.48 }],
        controlPoints: [
            {x:700,y:700,w:16,drs:1},{x:620,y:700,w:16,drs:1},{x:540,y:698,w:15},
            {x:470,y:680,w:14,kerb:1},{x:440,y:660,w:13,kerb:1},{x:430,y:630,w:13},
            {x:440,y:600,w:13,kerb:1},{x:460,y:575,w:13,kerb:1},
            {x:490,y:555,w:13,kerb:1},{x:520,y:540,w:12,kerb:1},{x:550,y:525,w:12,kerb:1},{x:570,y:510,w:12,kerb:1},
            {x:590,y:495,w:13,kerb:1},{x:610,y:485,w:13},
            {x:640,y:480,w:15,drs:1},{x:700,y:478,w:15,drs:1},{x:760,y:478,w:15,drs:1},{x:820,y:480,w:14,drs:1},
            {x:870,y:490,w:13,kerb:1},{x:890,y:510,w:12,kerb:1},{x:900,y:535,w:12},
            {x:895,y:560,w:12,kerb:1},{x:880,y:580,w:12},
            {x:860,y:595,w:12,kerb:1},{x:840,y:605,w:13},{x:820,y:615,w:13},{x:800,y:625,w:13},
            {x:780,y:640,w:13,kerb:1},{x:750,y:650,w:14},{x:720,y:655,w:14},
            {x:690,y:660,w:13,kerb:1},{x:660,y:650,w:13},{x:640,y:640,w:13},
            {x:610,y:640,w:12,kerb:1},{x:590,y:660,w:11,kerb:1},{x:580,y:680,w:11},
            {x:590,y:710,w:11,kerb:1},{x:610,y:730,w:12},
            {x:640,y:745,w:12,kerb:1},{x:670,y:755,w:12,kerb:1},{x:700,y:755,w:12},
            {x:730,y:750,w:12,kerb:1},{x:750,y:735,w:12},
            {x:770,y:740,w:13},{x:790,y:750,w:13},{x:810,y:755,w:13},
            {x:840,y:745,w:12,kerb:1},{x:850,y:730,w:11,kerb:1},{x:845,y:715,w:11,kerb:1},{x:830,y:705,w:12},
            {x:810,y:700,w:13,kerb:1},{x:790,y:698,w:14},{x:760,y:700,w:15,drs:1}
        ]
    },

    monza: {
        hills: 4,
        name: 'Italian Grand Prix', shortName: 'Monza', country: 'Italy',
        lapLength: 5793, record: 80.872, grass: '#1e2c18', runoff: '#3c3c38',
        sectors: [0.30, 0.65], pitEntry: 0.94,
        drsZonesList: [{ start: 0.0, end: 0.15 }, { start: 0.55, end: 0.68 }],
        controlPoints: [
            {x:450,y:600,w:16,drs:1},{x:550,y:598,w:16,drs:1},{x:650,y:598,w:16,drs:1},{x:750,y:598,w:15},
            {x:820,y:590,w:12,kerb:1},{x:850,y:570,w:11,kerb:1},{x:860,y:545,w:11,kerb:1},
            {x:840,y:525,w:11,kerb:1},{x:810,y:520,w:12},
            {x:780,y:515,w:13,kerb:1},{x:750,y:505,w:13},{x:720,y:490,w:14},{x:690,y:480,w:14},
            {x:660,y:475,w:14},{x:620,y:475,w:14},
            {x:580,y:475,w:12,kerb:1},{x:555,y:465,w:11,kerb:1},{x:540,y:450,w:11,kerb:1},
            {x:545,y:430,w:11,kerb:1},{x:560,y:420,w:12},
            {x:590,y:420,w:13},{x:620,y:415,w:13},
            {x:655,y:410,w:12,kerb:1},{x:680,y:395,w:11,kerb:1},{x:690,y:370,w:11},
            {x:700,y:345,w:12},{x:710,y:325,w:12},
            {x:720,y:305,w:11,kerb:1},{x:730,y:280,w:11,kerb:1},{x:720,y:260,w:11},{x:700,y:250,w:12},
            {x:670,y:245,w:13},{x:640,y:245,w:13},
            {x:610,y:250,w:12,kerb:1},{x:580,y:260,w:11,kerb:1},{x:565,y:280,w:11,kerb:1},
            {x:570,y:305,w:11,kerb:1},{x:585,y:325,w:11,kerb:1},{x:600,y:340,w:12},
            {x:570,y:355,w:14},{x:535,y:370,w:14},{x:500,y:385,w:14},{x:465,y:400,w:14},
            {x:430,y:420,w:14},{x:400,y:440,w:14},
            {x:375,y:465,w:14},{x:355,y:490,w:14},
            {x:345,y:520,w:12,kerb:1},{x:350,y:555,w:12,kerb:1},{x:365,y:575,w:13,kerb:1},{x:390,y:590,w:14},
            {x:420,y:598,w:15,drs:1}
        ]
    },

    suzuka: {
        hills: 11,
        name: 'Japanese Grand Prix', shortName: 'Suzuka', country: 'Japan',
        lapLength: 5807, record: 90.983, grass: '#1c2a24', runoff: '#3a3a38',
        sectors: [0.35, 0.65], pitEntry: 0.96,
        drsZonesList: [{ start: 0.0, end: 0.12 }, { start: 0.52, end: 0.65 }],
        controlPoints: [
            {x:700,y:620,w:15,drs:1},{x:700,y:560,w:15,drs:1},{x:700,y:500,w:14},
            {x:690,y:460,w:13,kerb:1},{x:670,y:435,w:12,kerb:1},{x:645,y:420,w:12},
            {x:615,y:415,w:12,kerb:1},{x:590,y:420,w:12,kerb:1},{x:575,y:435,w:12,kerb:1},
            {x:570,y:455,w:12,kerb:1},{x:570,y:475,w:12,kerb:1},{x:575,y:495,w:12,kerb:1},
            {x:590,y:510,w:12,kerb:1},{x:610,y:520,w:12},
            {x:630,y:525,w:12,kerb:1},{x:650,y:525,w:12},
            {x:665,y:520,w:12,kerb:1},{x:680,y:505,w:11,kerb:1},{x:695,y:490,w:11},
            {x:720,y:490,w:11,kerb:1},{x:740,y:500,w:11,kerb:1},{x:750,y:520,w:12},
            {x:760,y:540,w:12,kerb:1},{x:770,y:565,w:12},{x:775,y:590,w:12},{x:780,y:615,w:12},
            {x:790,y:640,w:12,kerb:1},{x:810,y:660,w:12,kerb:1},{x:835,y:670,w:12},
            {x:860,y:665,w:13,drs:1},{x:885,y:650,w:13,drs:1},{x:905,y:635,w:13,drs:1},
            {x:920,y:610,w:14,drs:1},{x:930,y:585,w:14,drs:1},
            {x:935,y:555,w:13,kerb:1},{x:930,y:525,w:13},{x:920,y:500,w:13},{x:905,y:480,w:13},
            {x:885,y:465,w:13,kerb:1},{x:860,y:458,w:13},
            {x:830,y:455,w:12,kerb:1},{x:810,y:465,w:11,kerb:1},{x:800,y:480,w:11,kerb:1},
            {x:808,y:498,w:11,kerb:1},{x:820,y:508,w:12},
            {x:810,y:520,w:13,kerb:1},{x:790,y:530,w:13,kerb:1},{x:770,y:535,w:13},{x:750,y:545,w:13},
            {x:740,y:560,w:13,drs:1},{x:730,y:575,w:14,drs:1},{x:720,y:595,w:14,drs:1},{x:710,y:610,w:15,drs:1}
        ]
    }
};

if (typeof globalThis !== 'undefined') globalThis.TRACK_DATA = TRACK_DATA;
