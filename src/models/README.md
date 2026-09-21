# SUMO visual simulation

This directory provides the visual-simulation stage described in the report:
the optimisation schedule becomes a SUMO route file and can be viewed with
SUMO-GUI. Times from the optimisation model are minutes after midnight; SUMO
receives seconds.

Run a self-contained visual demonstration after installing Eclipse SUMO:

```bash
PYTHONPATH=src python -m models.sumo --demo --run --gui
```

For a headless run, omit `--gui`. Generated files are placed in
`src/models/sumo_output/` and include the network, routes, SUMO configuration,
and `tripinfo.xml`.

`map.osm.xml` is an OpenStreetMap export, not a SUMO network despite the legacy
`thammasat.net.xml` filename. Convert it with `netconvert` before using it in a
production scenario. Then add a `sumo_edges` list to every route definition,
containing the connected SUMO edge IDs for that route. This explicit mapping is
important: campus stop names cannot safely be guessed from OSM road-edge IDs.
