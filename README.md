# 🚌 Electric Shuttle Route Optimization (TU Rangsit)

This project optimizes the electric shuttle bus routes and schedules at Thammasat University (Rangsit Campus) using Metaheuristic Algorithms and simulates the results visually using Eclipse SUMO.

## 🌟 Features
* **Metaheuristic Optimization**: Supports GA (Genetic Algorithm), SA (Simulated Annealing), PSO (Particle Swarm Optimization), and ACO (Ant Colony Optimization).
* **Real GPS Coordinates**: Accurately maps 14 real-world campus stops using Latitude and Longitude.
* **SUMO 2D Simulation**: Generates fully functioning `.rou.xml` and `.sumocfg` files to visualize exactly 5 buses looping per route continuously.
* **Modern Web Dashboard**: Built with **Next.js** and **FastAPI** to easily run algorithms, view metric comparisons, and launch SUMO directly from the web!

## ⚙️ Prerequisites
1. **Python 3.10+**
2. **Node.js (npm)**
3. **Eclipse SUMO** (Must be installed and added to your system `PATH`)

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone https://github.com/chxmpizy/Electric-Shuttle-Route-Optimization.git
cd Electric-Shuttle-Route-Optimization
```

2. **Set up Python Backend (FastAPI)**
```bash
python3 -m venv .venv
source .venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
```

3. **Set up Frontend (Next.js)**
```bash
cd web
npm install
cd ..
```

## 🚀 Usage (Web Dashboard)

You need to run both the Python API and the Next.js frontend at the same time.

**Terminal 1: Start Python API Server**
```bash
# In the root directory
source .venv/bin/activate
python3 api_server.py
```

**Terminal 2: Start Next.js Frontend**
```bash
cd web
npm run dev
```

Finally, open your browser and go to `http://localhost:3000`. You can now run algorithms and click "Open SUMO-GUI" directly from the website!

## 📂 Project Structure
* `web/`: Next.js frontend dashboard.
* `api_server.py`: FastAPI backend that bridges Python algorithms to Next.js.
* `src/algorithms/`: Contains the implementation of GA, SA, PSO, and ACO.
* `src/data/`: Graph generation and baseline route definitions.
* `src/models/`: Scripts to generate SUMO configuration files (`generate_real_schedule.py`, `sumo.py`).
