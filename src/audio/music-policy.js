// Imported from the supplied independent musical labs; gains follow original track order.
export const MUSIC_POLICIES={
  "a": {
    "source": "Wild_Guardians_Gameplay_A_Balafon_and_Flute_Lab_V1_OFFLINE.html",
    "sha256": "96a767f8deb1779f2d63a33dddb9454b410d8ef59113567f6ea8c8aea6503fa6",
    "bpm": 110,
    "gridOffset": 1.437,
    "quantize": 1,
    "fade": 2,
    "anchors": [
      "s2",
      "s4"
    ],
    "levels": {
      "full": [
        1.0,
        1.0,
        1.0,
        1.0,
        1.0,
        1.0,
        1.0,
        1.0,
        1.0,
        1.0
      ],
      "day": [
        0.53,
        0.65,
        0.85,
        0.28,
        0.73,
        0.0,
        0.16,
        0.0,
        0.1,
        0.28
      ],
      "activity": [
        0.88,
        0.83,
        0.8,
        0.38,
        0.92,
        0.0,
        0.28,
        0.0,
        0.2,
        0.3
      ],
      "night": [
        0.06,
        0.24,
        0.52,
        0.22,
        0.27,
        0.0,
        0.12,
        0.0,
        0.08,
        0.78
      ],
      "danger": [
        0.78,
        0.88,
        0.43,
        0.2,
        0.77,
        0.0,
        0.32,
        0.0,
        0.26,
        0.08
      ],
      "attack": [
        1.0,
        1.0,
        0.72,
        0.38,
        1.0,
        0.0,
        0.42,
        0.0,
        0.4,
        0.25
      ],
      "spirit": [
        0.0,
        0.2,
        0.48,
        0.3,
        0.16,
        0.0,
        0.22,
        0.0,
        0.13,
        0.9
      ],
      "minimal": [
        0.12,
        0.25,
        0.7,
        0.12,
        0.45,
        0.0,
        0.0,
        0.0,
        0.0,
        0.0
      ]
    }
  },
  "b": {
    "source": "Wild_Guardians_Gameplay_B_Warm_Afternoon_Lab_V1_OFFLINE.html",
    "sha256": "2ed746d0085c7b4e306b43061253ce135dd5be987e47cd634075fc2a83f08d1c",
    "bpm": 108,
    "gridOffset": 1.211,
    "quantize": 1,
    "fade": 2,
    "anchors": [
      "s2",
      "s4"
    ],
    "levels": {
      "full": [
        1.0,
        1.0,
        1.0,
        1.0,
        1.0,
        1.0,
        1.0,
        1.0,
        1.0,
        1.0
      ],
      "day": [
        0.0,
        0.52,
        0.54,
        0.74,
        0.66,
        0.5,
        0.0,
        0.42,
        0.28,
        0.62
      ],
      "activity": [
        0.0,
        0.8,
        0.76,
        0.8,
        0.75,
        0.84,
        0.0,
        0.52,
        0.4,
        0.54
      ],
      "night": [
        0.0,
        0.06,
        0.27,
        0.6,
        0.48,
        0.12,
        0.0,
        0.6,
        0.12,
        0.82
      ],
      "danger": [
        0.0,
        0.78,
        0.74,
        0.44,
        0.55,
        0.78,
        0.0,
        0.32,
        0.18,
        0.15
      ],
      "attack": [
        0.0,
        1.0,
        0.9,
        0.6,
        0.7,
        1.0,
        0.0,
        0.5,
        0.38,
        0.3
      ],
      "spirit": [
        0.0,
        0.0,
        0.22,
        0.45,
        0.55,
        0.1,
        0.0,
        0.66,
        0.18,
        0.88
      ],
      "minimal": [
        0.0,
        0.0,
        0.2,
        0.5,
        0.4,
        0.0,
        0.0,
        0.0,
        0.0,
        0.0
      ]
    }
  }
};
export const gameplayMusicScene=state=>state.raid?'attack':state.time>=300?'night':'day';
