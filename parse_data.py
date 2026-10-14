import pandas as pd
import json

df = pd.read_excel("data/raw/real_data.xlsx")

# Find the row that contains "Row Labels"
header_row_idx = df[df.eq('Row Labels').any(axis=1)].index[0]
print(f"Header row: {header_row_idx}")

# Set columns
df.columns = df.iloc[header_row_idx]

# Drop rows up to the header
df = df.iloc[header_row_idx+1:].reset_index(drop=True)

# Keep only 'Row Labels' and 'Grand Total'
faculty_data = df[['Row Labels', 'Grand Total']].dropna(subset=['Row Labels'])
print(faculty_data.head(50))
