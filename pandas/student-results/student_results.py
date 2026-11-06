import pandas as pd

# Read the source CSV into a DataFrame
df = pd.read_csv("inputmarks.csv")
subjects = ["Physics", "Maths", "Chemistry"]

# Pass only if ALL three subjects have marks of at least 40
is_passed = (df[subjects] >= 40).all(axis=1)
passed = df[is_passed]
failed = df[~is_passed]

# Write two CSV files
passed.to_csv("passed.csv", index=False)
failed.to_csv("failed.csv", index=False)

print("Total students:", len(df))
print("Passed:", len(passed))
print("Failed:", len(failed))
print("Created passed.csv and failed.csv successfully.")
