import os
import sys
import sumolib
if 'SUMO_HOME' in os.environ:
    sys.path.append(os.path.join(os.environ['SUMO_HOME'], 'tools'))

# parse the net
net = sumolib.net.readNet('myNet.net.xml')