"""Data loading and cleaning for campus bus route data."""
from pathlib import Path
import pandas as pd
from config.settings import ROUTE_CSV
STOP_MAP = {
    "หอพักเอเชียนเกม": "Dorm",
    "green": "Green",
    "SC2 SC3": "SC2_SC3",
    "อาคารสุขศาสตร์": "Health",
    "อาคารบรรยายรวม": "Lecture",
    "ศูนย์ประชุม": "Convention",
    "สถานีขนส่ง": "Terminal",
    "หอสมุดป๋วย": "Library",
    "รพ.ธรรมศาสตร์": "Hospital",
    "อุทยานการเรียนรู้ป๋วย 100 ปี": "Park",
    "TU DOME": "Dome",
    "ประตูเชียงราก 1": "Gate1",
    "SC1": "SC1",
    "อาคารเรียนรวมกลุ่มสังคมศาสตร์": "Social",
}
def load_routes(csv_path: Path | str | None = None) -> pd.DataFrame:
    """Load raw route CSV from disk."""
    path = Path(csv_path) if csv_path else ROUTE_CSV
    return pd.read_csv(path)
def get_stop_names() -> list[str]:
    """Return unique normalized stop names used in the graph."""
    return sorted(set(STOP_MAP.values()))