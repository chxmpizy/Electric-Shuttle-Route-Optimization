from typing import Dict, List, Any

__all__ = ["queues", "waiting_times", "queue_lengths"]

# Maps destination names to passenger queues
queues: Dict[str, List[Any]] = {
    "Dorm": [],
    "Green": [],
    "SC2_SC3": [],
    "Health": [],
    "Lecture": [],
    "Terminal": [],
    "Convention": [],
    "Library": [],
    "SC1": [],
    "Gate1": [],
    "Hospital": [],
    "Social": [],
    "Park": [],
    "Dome": []
}

waiting_times: List[float] = []
queue_lengths: List[int] = []