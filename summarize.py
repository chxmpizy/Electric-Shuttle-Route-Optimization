import json

files = ['baseline', 'ga', 'sa', 'pso', 'aco']

for algo in files:
    try:
        with open(f"{algo}_schedule.json", "r") as f:
            data = json.load(f)
            print(f"--- {algo.upper()} SCHEDULE ---")
            for i, r in enumerate(data):
                path = " -> ".join(r['path'])
                print(f"Route {i+1} ({r['num_bus']} buses, headway {r['headway']}): {path}")
    except Exception as e:
        pass
