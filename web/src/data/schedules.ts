// Pre-computed schedules
import { RouteSchedule } from "../types/shuttle";

export const PRECOMPUTED_SCHEDULES: Record<string, RouteSchedule[]> = {
  "baseline": [
    {
      "route_id": 1,
      "path": [
        "Convention",
        "Terminal",
        "SC2_SC3",
        "Library",
        "Dorm",
        "Convention"
      ],
      "num_bus": 5,
      "cycle_time": 17.06,
      "headway": 3.41,
      "startTime": 420,
      "endTime": 1250,
      "timetable": [
        {
          "stop": "Convention",
          "arrival_time": 420
        },
        {
          "stop": "Terminal",
          "arrival_time": 422.52
        },
        {
          "stop": "SC2_SC3",
          "arrival_time": 424.54999999999995
        },
        {
          "stop": "Library",
          "arrival_time": 426.53
        },
        {
          "stop": "Dorm",
          "arrival_time": 428.82
        },
        {
          "stop": "Convention",
          "arrival_time": 430.56
        }
      ]
    },
    {
      "route_id": 2,
      "path": [
        "Convention",
        "Dorm",
        "Library",
        "SC2_SC3",
        "Terminal",
        "Convention"
      ],
      "num_bus": 5,
      "cycle_time": 17.06,
      "headway": 3.41,
      "startTime": 410,
      "endTime": 1290,
      "timetable": [
        {
          "stop": "Convention",
          "arrival_time": 410
        },
        {
          "stop": "Dorm",
          "arrival_time": 411.74
        },
        {
          "stop": "Library",
          "arrival_time": 414.03000000000003
        },
        {
          "stop": "SC2_SC3",
          "arrival_time": 416.01000000000005
        },
        {
          "stop": "Terminal",
          "arrival_time": 418.04
        },
        {
          "stop": "Convention",
          "arrival_time": 420.56
        }
      ]
    },
    {
      "route_id": 3,
      "path": [
        "Convention",
        "Hospital",
        "Health",
        "Park",
        "Lecture",
        "Convention"
      ],
      "num_bus": 5,
      "cycle_time": 20.68,
      "headway": 4.14,
      "startTime": 400,
      "endTime": 1295,
      "timetable": [
        {
          "stop": "Convention",
          "arrival_time": 400
        },
        {
          "stop": "Hospital",
          "arrival_time": 404.35
        },
        {
          "stop": "Health",
          "arrival_time": 406.25
        },
        {
          "stop": "Park",
          "arrival_time": 409.7
        },
        {
          "stop": "Lecture",
          "arrival_time": 411.63
        },
        {
          "stop": "Convention",
          "arrival_time": 414.18
        }
      ]
    },
    {
      "route_id": 4,
      "path": [
        "Dome",
        "Gate1",
        "SC1",
        "Library",
        "Green",
        "Dorm"
      ],
      "num_bus": 5,
      "cycle_time": 19.36,
      "headway": 3.87,
      "startTime": 420,
      "endTime": 1295,
      "timetable": [
        {
          "stop": "Dome",
          "arrival_time": 420
        },
        {
          "stop": "Gate1",
          "arrival_time": 424.03
        },
        {
          "stop": "SC1",
          "arrival_time": 426.57
        },
        {
          "stop": "Library",
          "arrival_time": 428.67
        },
        {
          "stop": "Green",
          "arrival_time": 430.88
        },
        {
          "stop": "Dorm",
          "arrival_time": 432.86
        }
      ]
    },
    {
      "route_id": 5,
      "path": [
        "Convention",
        "Social",
        "Lecture",
        "Park",
        "Health",
        "Hospital"
      ],
      "num_bus": 5,
      "cycle_time": 18.81,
      "headway": 3.76,
      "startTime": 420,
      "endTime": 1080,
      "timetable": [
        {
          "stop": "Convention",
          "arrival_time": 420
        },
        {
          "stop": "Social",
          "arrival_time": 422.59
        },
        {
          "stop": "Lecture",
          "arrival_time": 425.03
        },
        {
          "stop": "Park",
          "arrival_time": 426.96
        },
        {
          "stop": "Health",
          "arrival_time": 430.40999999999997
        },
        {
          "stop": "Hospital",
          "arrival_time": 432.30999999999995
        }
      ]
    },
    {
      "route_id": 6,
      "path": [
        "Dorm",
        "Green",
        "SC2_SC3",
        "Health",
        "Lecture",
        "Dorm"
      ],
      "num_bus": 5,
      "cycle_time": 20.15,
      "headway": 4.03,
      "startTime": 450,
      "endTime": 1300,
      "timetable": [
        {
          "stop": "Dorm",
          "arrival_time": 450
        },
        {
          "stop": "Green",
          "arrival_time": 451.98
        },
        {
          "stop": "SC2_SC3",
          "arrival_time": 454.5
        },
        {
          "stop": "Health",
          "arrival_time": 457.84
        },
        {
          "stop": "Lecture",
          "arrival_time": 460.85999999999996
        },
        {
          "stop": "Dorm",
          "arrival_time": 463.65
        }
      ]
    }
  ],
  "ga": [
    {
      "path": [
        "Social",
        "Lecture",
        "Convention",
        "Hospital",
        "Health"
      ],
      "num_bus": 5,
      "cycle_time": 17.74,
      "headway": 3.55,
      "startTime": 425,
      "endTime": 1102,
      "timetable": [
        {
          "stop": "Social",
          "arrival_time": 425
        },
        {
          "stop": "Lecture",
          "arrival_time": 427.44
        },
        {
          "stop": "Convention",
          "arrival_time": 429.99
        },
        {
          "stop": "Hospital",
          "arrival_time": 434.34000000000003
        },
        {
          "stop": "Health",
          "arrival_time": 436.24
        }
      ]
    },
    {
      "path": [
        "SC2_SC3",
        "Library",
        "SC1",
        "Gate1",
        "Dome"
      ],
      "num_bus": 5,
      "cycle_time": 17.15,
      "headway": 3.43,
      "startTime": 423,
      "endTime": 1124,
      "timetable": [
        {
          "stop": "SC2_SC3",
          "arrival_time": 423
        },
        {
          "stop": "Library",
          "arrival_time": 424.98
        },
        {
          "stop": "SC1",
          "arrival_time": 427.08000000000004
        },
        {
          "stop": "Gate1",
          "arrival_time": 429.62000000000006
        },
        {
          "stop": "Dome",
          "arrival_time": 433.65000000000003
        }
      ]
    },
    {
      "path": [
        "Terminal",
        "Convention",
        "Hospital",
        "Health",
        "Park",
        "Lecture"
      ],
      "num_bus": 5,
      "cycle_time": 20.65,
      "headway": 4.13,
      "startTime": 420,
      "endTime": 1214,
      "timetable": [
        {
          "stop": "Terminal",
          "arrival_time": 420
        },
        {
          "stop": "Convention",
          "arrival_time": 422.52
        },
        {
          "stop": "Hospital",
          "arrival_time": 426.87
        },
        {
          "stop": "Health",
          "arrival_time": 428.77
        },
        {
          "stop": "Park",
          "arrival_time": 432.21999999999997
        },
        {
          "stop": "Lecture",
          "arrival_time": 434.15
        }
      ]
    },
    {
      "path": [
        "Terminal",
        "SC2_SC3",
        "Library",
        "Dorm",
        "Lecture"
      ],
      "num_bus": 5,
      "cycle_time": 15.59,
      "headway": 3.12,
      "startTime": 420,
      "endTime": 1195,
      "timetable": [
        {
          "stop": "Terminal",
          "arrival_time": 420
        },
        {
          "stop": "SC2_SC3",
          "arrival_time": 422.03
        },
        {
          "stop": "Library",
          "arrival_time": 424.01
        },
        {
          "stop": "Dorm",
          "arrival_time": 426.3
        },
        {
          "stop": "Lecture",
          "arrival_time": 429.09000000000003
        }
      ]
    },
    {
      "path": [
        "Terminal",
        "Convention",
        "Dorm",
        "Green",
        "Library"
      ],
      "num_bus": 5,
      "cycle_time": 14.95,
      "headway": 2.99,
      "startTime": 440,
      "endTime": 1112,
      "timetable": [
        {
          "stop": "Terminal",
          "arrival_time": 440
        },
        {
          "stop": "Convention",
          "arrival_time": 442.52
        },
        {
          "stop": "Dorm",
          "arrival_time": 444.26
        },
        {
          "stop": "Green",
          "arrival_time": 446.24
        },
        {
          "stop": "Library",
          "arrival_time": 448.45
        }
      ]
    },
    {
      "path": [
        "Park",
        "Lecture",
        "Social",
        "Convention",
        "Terminal"
      ],
      "num_bus": 5,
      "cycle_time": 15.98,
      "headway": 3.2,
      "startTime": 434,
      "endTime": 1188,
      "timetable": [
        {
          "stop": "Park",
          "arrival_time": 434
        },
        {
          "stop": "Lecture",
          "arrival_time": 435.93
        },
        {
          "stop": "Social",
          "arrival_time": 438.37
        },
        {
          "stop": "Convention",
          "arrival_time": 440.96
        },
        {
          "stop": "Terminal",
          "arrival_time": 443.47999999999996
        }
      ]
    }
  ],
  "sa": [
    {
      "path": [
        "SC2_SC3",
        "Terminal",
        "Convention",
        "Social",
        "Lecture"
      ],
      "num_bus": 5,
      "cycle_time": 4.5,
      "headway": 0.9,
      "startTime": 436,
      "endTime": 1246,
      "timetable": [
        {
          "stop": "SC2_SC3",
          "arrival_time": 436
        },
        {
          "stop": "Terminal",
          "arrival_time": 436.78
        },
        {
          "stop": "Convention",
          "arrival_time": 438.09999999999997
        },
        {
          "stop": "Social",
          "arrival_time": 439.29999999999995
        },
        {
          "stop": "Lecture",
          "arrival_time": 440.49999999999994
        }
      ]
    },
    {
      "path": [
        "SC2_SC3",
        "Terminal",
        "Convention",
        "Hospital",
        "Health"
      ],
      "num_bus": 5,
      "cycle_time": 4.14,
      "headway": 0.83,
      "startTime": 420,
      "endTime": 1221,
      "timetable": [
        {
          "stop": "SC2_SC3",
          "arrival_time": 420
        },
        {
          "stop": "Terminal",
          "arrival_time": 420.78
        },
        {
          "stop": "Convention",
          "arrival_time": 422.09999999999997
        },
        {
          "stop": "Hospital",
          "arrival_time": 422.93999999999994
        },
        {
          "stop": "Health",
          "arrival_time": 424.13999999999993
        }
      ]
    },
    {
      "path": [
        "Gate1",
        "SC1",
        "Library",
        "Green",
        "Dorm"
      ],
      "num_bus": 5,
      "cycle_time": 5.039999999999999,
      "headway": 1.01,
      "startTime": 429,
      "endTime": 1156,
      "timetable": [
        {
          "stop": "Gate1",
          "arrival_time": 429
        },
        {
          "stop": "SC1",
          "arrival_time": 430.2
        },
        {
          "stop": "Library",
          "arrival_time": 431.4
        },
        {
          "stop": "Green",
          "arrival_time": 432.59999999999997
        },
        {
          "stop": "Dorm",
          "arrival_time": 434.03999999999996
        }
      ]
    },
    {
      "path": [
        "Green",
        "Library",
        "SC2_SC3",
        "Terminal",
        "Convention",
        "Lecture"
      ],
      "num_bus": 5,
      "cycle_time": 4.2,
      "headway": 0.84,
      "startTime": 448,
      "endTime": 1248,
      "timetable": [
        {
          "stop": "Green",
          "arrival_time": 448
        },
        {
          "stop": "Library",
          "arrival_time": 449.2
        },
        {
          "stop": "SC2_SC3",
          "arrival_time": 449.92
        },
        {
          "stop": "Terminal",
          "arrival_time": 450.7
        },
        {
          "stop": "Convention",
          "arrival_time": 452.02
        },
        {
          "stop": "Lecture",
          "arrival_time": 452.2
        }
      ]
    },
    {
      "path": [
        "Social",
        "Lecture",
        "Park",
        "Health",
        "Hospital"
      ],
      "num_bus": 5,
      "cycle_time": 3.7199999999999998,
      "headway": 0.74,
      "startTime": 432,
      "endTime": 1260,
      "timetable": [
        {
          "stop": "Social",
          "arrival_time": 432
        },
        {
          "stop": "Lecture",
          "arrival_time": 433.2
        },
        {
          "stop": "Park",
          "arrival_time": 434.4
        },
        {
          "stop": "Health",
          "arrival_time": 434.52
        },
        {
          "stop": "Hospital",
          "arrival_time": 435.71999999999997
        }
      ]
    },
    {
      "path": [
        "SC1",
        "Library",
        "Dorm",
        "Convention",
        "Terminal"
      ],
      "num_bus": 5,
      "cycle_time": 8.64,
      "headway": 1.73,
      "startTime": 436,
      "endTime": 1223,
      "timetable": [
        {
          "stop": "SC1",
          "arrival_time": 436
        },
        {
          "stop": "Library",
          "arrival_time": 437.2
        },
        {
          "stop": "Dorm",
          "arrival_time": 439.0
        },
        {
          "stop": "Convention",
          "arrival_time": 443.32
        },
        {
          "stop": "Terminal",
          "arrival_time": 444.64
        }
      ]
    }
  ],
  "pso": [
    {
      "path": [
        "Dome",
        "Gate1",
        "SC1",
        "Library",
        "Green",
        "Dorm"
      ],
      "num_bus": 5,
      "cycle_time": 16,
      "headway": 3.2,
      "startTime": 450,
      "endTime": 1260
    },
    {
      "path": [
        "Convention",
        "Social",
        "Lecture",
        "Park",
        "Health",
        "Hospital"
      ],
      "num_bus": 5,
      "cycle_time": 12,
      "headway": 2.4,
      "startTime": 450,
      "endTime": 1080
    },
    {
      "path": [
        "Hospital",
        "Health",
        "Lecture",
        "Dorm",
        "Green",
        "Library",
        "SC2_SC3"
      ],
      "num_bus": 5,
      "cycle_time": 20,
      "headway": 4.0,
      "startTime": 420,
      "endTime": 1260
    },
    {
      "path": [
        "Dorm",
        "Green",
        "SC2_SC3",
        "Terminal",
        "Convention"
      ],
      "num_bus": 5,
      "cycle_time": 11,
      "headway": 2.2,
      "startTime": 420,
      "endTime": 1260
    },
    {
      "path": [
        "Convention",
        "Social",
        "Lecture",
        "Dorm",
        "Library",
        "Green",
        "SC2_SC3",
        "Terminal"
      ],
      "num_bus": 5,
      "cycle_time": 23,
      "headway": 4.6,
      "startTime": 420,
      "endTime": 1260
    },
    {
      "path": [
        "Social",
        "Lecture",
        "Health",
        "Hospital",
        "Convention"
      ],
      "num_bus": 5,
      "cycle_time": 10,
      "headway": 2.0,
      "startTime": 420,
      "endTime": 1260
    }
  ],
  "aco": [
    {
      "path": [
        "Dorm",
        "Lecture",
        "Social",
        "Convention",
        "Hospital",
        "Health"
      ],
      "num_bus": 5,
      "cycle_time": 17,
      "headway": 3.4,
      "startTime": 450,
      "endTime": 1232,
      "timetable": [
        {
          "stop": "Dorm",
          "arrival_time": 450
        },
        {
          "stop": "Lecture",
          "arrival_time": 456
        },
        {
          "stop": "Social",
          "arrival_time": 459
        },
        {
          "stop": "Convention",
          "arrival_time": 462
        },
        {
          "stop": "Hospital",
          "arrival_time": 464
        },
        {
          "stop": "Health",
          "arrival_time": 467
        }
      ]
    },
    {
      "path": [
        "Dome",
        "Gate1",
        "SC1",
        "Library",
        "Dorm"
      ],
      "num_bus": 5,
      "cycle_time": 13,
      "headway": 2.6,
      "startTime": 446,
      "endTime": 1154,
      "timetable": [
        {
          "stop": "Dome",
          "arrival_time": 446
        },
        {
          "stop": "Gate1",
          "arrival_time": 449
        },
        {
          "stop": "SC1",
          "arrival_time": 452
        },
        {
          "stop": "Library",
          "arrival_time": 455
        },
        {
          "stop": "Dorm",
          "arrival_time": 459
        }
      ]
    },
    {
      "path": [
        "Park",
        "Lecture",
        "Social",
        "Convention",
        "Terminal"
      ],
      "num_bus": 5,
      "cycle_time": 12,
      "headway": 2.4,
      "startTime": 445,
      "endTime": 1156,
      "timetable": [
        {
          "stop": "Park",
          "arrival_time": 445
        },
        {
          "stop": "Lecture",
          "arrival_time": 448
        },
        {
          "stop": "Social",
          "arrival_time": 451
        },
        {
          "stop": "Convention",
          "arrival_time": 454
        },
        {
          "stop": "Terminal",
          "arrival_time": 457
        }
      ]
    },
    {
      "path": [
        "Lecture",
        "Social",
        "Convention",
        "Terminal",
        "SC2_SC3",
        "Green",
        "Library"
      ],
      "num_bus": 5,
      "cycle_time": 16,
      "headway": 3.2,
      "startTime": 444,
      "endTime": 1232,
      "timetable": [
        {
          "stop": "Lecture",
          "arrival_time": 444
        },
        {
          "stop": "Social",
          "arrival_time": 447
        },
        {
          "stop": "Convention",
          "arrival_time": 450
        },
        {
          "stop": "Terminal",
          "arrival_time": 453
        },
        {
          "stop": "SC2_SC3",
          "arrival_time": 455
        },
        {
          "stop": "Green",
          "arrival_time": 457
        },
        {
          "stop": "Library",
          "arrival_time": 460
        }
      ]
    },
    {
      "path": [
        "Dome",
        "Gate1",
        "SC1",
        "Library",
        "SC2_SC3",
        "Terminal",
        "Convention"
      ],
      "num_bus": 5,
      "cycle_time": 16,
      "headway": 3.2,
      "startTime": 437,
      "endTime": 1184,
      "timetable": [
        {
          "stop": "Dome",
          "arrival_time": 437
        },
        {
          "stop": "Gate1",
          "arrival_time": 440
        },
        {
          "stop": "SC1",
          "arrival_time": 443
        },
        {
          "stop": "Library",
          "arrival_time": 446
        },
        {
          "stop": "SC2_SC3",
          "arrival_time": 448
        },
        {
          "stop": "Terminal",
          "arrival_time": 450
        },
        {
          "stop": "Convention",
          "arrival_time": 453
        }
      ]
    },
    {
      "path": [
        "Health",
        "Park",
        "Lecture",
        "Dorm",
        "Green",
        "Library"
      ],
      "num_bus": 5,
      "cycle_time": 16,
      "headway": 3.2,
      "startTime": 420,
      "endTime": 1260,
      "timetable": [
        {
          "stop": "Health",
          "arrival_time": 420
        },
        {
          "stop": "Park",
          "arrival_time": 420
        },
        {
          "stop": "Lecture",
          "arrival_time": 423
        },
        {
          "stop": "Dorm",
          "arrival_time": 429
        },
        {
          "stop": "Green",
          "arrival_time": 433
        },
        {
          "stop": "Library",
          "arrival_time": 436
        }
      ]
    }
  ]
};
