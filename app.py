import streamlit as st
import sys
from pathlib import Path
import json
import subprocess
import time

# Add src to python path so we can import modules
sys.path.insert(0, str(Path("src").resolve()))

from pipeline import setup_environment
from run_sim import get_simulation_metrics
from algorithms.GA import run_ga
from algorithms.SA import run_sa
from algorithms.PSO import run_pso
from algorithms.ACO import run_aco

# Configure the page
st.set_page_config(page_title="TU Shuttle Optimization", page_icon="🚌", layout="wide")

st.title("🚌 Electric Shuttle Route Optimization")
st.markdown("""
Welcome to the interactive dashboard! Select an algorithm from the sidebar to optimize the routes, 
compare it against the baseline, and launch the SUMO 2D simulation.
""")

st.sidebar.header("⚙️ Settings")
algo = st.sidebar.selectbox("Select Algorithm to Run", ["Baseline", "GA", "SA", "PSO", "ACO"])

if st.sidebar.button("🚀 Run Analysis", type="primary"):
    st.session_state["run_algo"] = algo.lower()

if "run_algo" in st.session_state:
    mode = st.session_state["run_algo"]
    
    with st.spinner(f"Running {mode.upper()} Optimization... Please wait."):
        # 1. Setup Env & Baseline
        graph, fixed_routes, stops, ctx = setup_environment()
        base_metrics, base_schedule = get_simulation_metrics(fixed_routes, ctx)
        
        # 2. Run selected algorithm
        if mode == "baseline":
            opt_metrics, final_schedule = base_metrics, base_schedule
        else:
            if mode == "ga":
                solution, _, _ = run_ga(ctx, generations=10)
            elif mode == "sa":
                solution, _, _ = run_sa(ctx)
            elif mode == "pso":
                solution, _, _ = run_pso(fixed_routes, ctx)
            elif mode == "aco":
                # ACO might take a bit longer
                solution, _, _ = run_aco(ctx, iterations=20, ants=10) # Reduced for dashboard speed
            
            opt_metrics, final_schedule = get_simulation_metrics(solution, ctx)
            
    # 3. Display Metrics
    st.success(f"✅ Optimization complete! Showing results for **{mode.upper()}**.")
    
    st.subheader("📊 Performance Comparison (Baseline vs Optimized)")
    
    col1, col2 = st.columns(2)
    
    # Wait Time
    b_wait = base_metrics["avg_wait_time"]
    o_wait = opt_metrics["avg_wait_time"]
    w_delta = o_wait - b_wait
    
    # Travel Time
    b_travel = base_metrics["avg_travel_time"]
    o_travel = opt_metrics["avg_travel_time"]
    t_delta = o_travel - b_travel
    
    with col1:
        st.metric(label="⏳ Avg Passenger Wait Time (mins)", 
                  value=f"{o_wait:.2f}", 
                  delta=f"{w_delta:+.2f} mins", 
                  delta_color="inverse")
                  
    with col2:
        st.metric(label="⏱️ Avg Travel Time (mins)", 
                  value=f"{o_travel:.2f}", 
                  delta=f"{t_delta:+.2f} mins", 
                  delta_color="inverse")

    # 4. Generate SUMO Files
    with st.spinner("Generating SUMO scenario files..."):
        json_path = f"{mode}_schedule.json"
        with open(json_path, "w") as f:
            json.dump(final_schedule, f, indent=4)
            
        cmd_gen = ["python3", "src/models/generate_real_schedule.py", "--prefix", mode, "--input", json_path]
        subprocess.run(cmd_gen, check=True)
        
    st.info(f"SUMO config generated: `src/models/sumo_output/{mode}.sumocfg`")

    st.markdown("---")
    st.subheader("🖥️ View 2D Simulation")
    st.markdown("Click the button below to launch the **SUMO-GUI** window with this specific schedule.")
    
    if st.button("🗺️ Open SUMO-GUI", type="primary"):
        st.info("Launching SUMO-GUI... Please check your desktop windows.")
        cfg_file = f"src/models/sumo_output/{mode}.sumocfg"
        subprocess.Popen(["sumo-gui", "-c", cfg_file])
