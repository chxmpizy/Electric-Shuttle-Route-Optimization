import pandas as pd

df = pd.read_excel("data/raw/real_data.xlsx")
print(df.head(20))
print(df.columns)
