import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from demo_server import parse_uploaded_bank_statement_demo

csv_path = os.path.join(os.path.dirname(__file__), "..", "Note", "bankstatements.csv")
with open(csv_path, "rb") as f:
    content = f.read()

result = parse_uploaded_bank_statement_demo(content, "bankstatements.csv")

print("Parsing Result Summary:")
print("  Total Count:", result.get("total_count"))
print("  Statement Period:", result.get("statement_period"))
print("  Total Amount:", result.get("total_amount"))
print("  Total Withdrawal:", result.get("total_withdrawal"))
print("  Total Deposit:", result.get("total_deposit"))
print("  First 3 Transactions:")
for tx in result["transactions"][:3]:
    print("   ", tx)
print("  Last 3 Transactions:")
for tx in result["transactions"][-3:]:
    print("   ", tx)
