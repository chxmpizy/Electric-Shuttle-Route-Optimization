# 🚌 Electric Shuttle Route Optimization (TU Rangsit)

This project optimizes the electric shuttle bus routes and schedules at Thammasat University (Rangsit Campus) using Metaheuristic Algorithms and simulates the results visually using Eclipse SUMO.

## 🌟 Features
* **Metaheuristic Optimization**: Supports GA (Genetic Algorithm), SA (Simulated Annealing), PSO (Particle Swarm Optimization), and ACO (Ant Colony Optimization).
* **Real GPS Coordinates**: Accurately maps 14 real-world campus stops using Latitude and Longitude.
* **SUMO 2D Simulation**: Generates fully functioning `.rou.xml` and `.sumocfg` files to visualize exactly 5 buses looping per route continuously.
* **Interactive Web Dashboard**: Built with Streamlit for comparing wait times, travel times, and easily launching the visual simulation.

## ⚙️ Prerequisites
1. **Python 3.10+**
2. **Eclipse SUMO** (Must be installed and added to your system `PATH`)

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone https://github.com/chxmpizy/Electric-Shuttle-Route-Optimization.git
cd Electric-Shuttle-Route-Optimization
```

2. **Set up a Virtual Environment (Optional but recommended)**
```bash
python3 -m venv .venv
source .venv/bin/activate  # Mac/Linux
# .venv\Scripts\activate   # Windows
```

3. **Install Requirements**
```bash
pip install -r requirements.txt
```

## 🚀 Usage

### 1. Web Dashboard (Recommended)
You can use the interactive Streamlit dashboard to select algorithms, see metric improvements, and launch SUMO:
```bash
streamlit run app.py
```
This will open a browser window at `http://localhost:8501`.

### 2. Command Line Interface (CLI)
If you prefer the terminal, you can use the unified launcher script:
```bash
# Run Baseline
python3 run_sim.py --mode baseline

# Run Genetic Algorithm
python3 run_sim.py --mode ga

# Note: Add --no-gui if you want to skip launching the SUMO window.
```

## 📂 Project Structure
* `app.py`: Streamlit Web Dashboard entry point.
* `run_sim.py`: Unified CLI launcher and comparison tool.
* `src/algorithms/`: Contains the implementation of GA, SA, PSO, and ACO.
* `src/data/`: Graph generation and baseline route definitions.
* `src/models/`: Scripts to generate SUMO configuration files (`generate_real_schedule.py`, `sumo.py`).
* `src/optimization/`: Evaluator and fitness functions to compute delays and travel times.
* `src/simulation/`: Discrete-event Python simulation logic for rapid evaluation.

