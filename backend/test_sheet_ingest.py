import io
import csv
import zipfile
import re
import random
import xml.etree.ElementTree as ET

# ── Duplicate of inventory_router parsers for offline zero-dependency validation ──

def parse_xlsx_data(file_bytes: bytes) -> list[list[str]]:
    rows = []
    try:
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
            shared_strings = []
            if "xl/sharedStrings.xml" in z.namelist():
                ss_xml = z.read("xl/sharedStrings.xml")
                root = ET.fromstring(ss_xml)
                for si in root.findall(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si"):
                    t_nodes = si.findall(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")
                    text_val = "".join(t.text for t in t_nodes if t.text)
                    shared_strings.append(text_val)
            
            sheet_xml = z.read("xl/worksheets/sheet1.xml")
            root = ET.fromstring(sheet_xml)
            ns = {"ns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
            
            def col_to_idx(col_str):
                idx = 0
                for char in col_str:
                    if 'A' <= char <= 'Z':
                        idx = idx * 26 + (ord(char) - ord('A') + 1)
                return idx - 1

            for row_el in root.findall(".//ns:row", ns):
                row_idx = int(row_el.get("r", "1")) - 1
                while len(rows) <= row_idx:
                    rows.append([])
                
                cells = {}
                max_col_idx = -1
                for cell_el in row_el.findall("ns:c", ns):
                    r_attr = cell_el.get("r", "")
                    col_str = "".join([c for c in r_attr if c.isalpha()])
                    if not col_str:
                        continue
                    col_idx = col_to_idx(col_str)
                    max_col_idx = max(max_col_idx, col_idx)
                    
                    val_el = cell_el.find("ns:v", ns)
                    val = ""
                    if val_el is not None:
                        val = val_el.text or ""
                        if cell_el.get("t") == "s":
                            try:
                                idx = int(val)
                                if 0 <= idx < len(shared_strings):
                                    val = shared_strings[idx]
                            except ValueError:
                                pass
                    cells[col_idx] = val
                
                row_data = [""] * (max_col_idx + 1)
                for c_idx, val in cells.items():
                    row_data[c_idx] = val
                rows[row_idx] = row_data
    except Exception as e:
        print(f"Fallback XLSX parser error: {e}")
        raise e
    
    valid_rows = [r for r in rows if any(str(cell).strip() for cell in r)]
    if not valid_rows:
        return []
    max_len = max(len(r) for r in valid_rows)
    for r in valid_rows:
        while len(r) < max_len:
            r.append("")
    return valid_rows


def parse_excel_or_csv(file_bytes: bytes, filename: str) -> list[dict]:
    headers = []
    rows_data = []
    
    if filename.endswith(".csv"):
        try:
            text_content = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            text_content = file_bytes.decode("latin-1")
            
        reader = csv.reader(io.StringIO(text_content))
        all_rows = list(reader)
        if not all_rows:
            return []
        headers = [h.strip() for h in all_rows[0]]
        rows_data = all_rows[1:]
    else:
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
            sheet = wb.active
            all_rows = []
            for r in sheet.iter_rows(values_only=True):
                all_rows.append([str(cell) if cell is not None else "" for cell in r])
        except ImportError:
            all_rows = parse_xlsx_data(file_bytes)
            
        if not all_rows:
            return []
        headers = [str(h).strip() for h in all_rows[0]]
        rows_data = all_rows[1:]
        
    result = []
    for row in rows_data:
        row_dict = {}
        for idx, h in enumerate(headers):
            if idx < len(row):
                row_dict[h] = str(row[idx]).strip()
            else:
                row_dict[h] = ""
        result.append(row_dict)
    return result


def generate_sku(name: str) -> str:
    clean = re.sub(r'[^A-Za-z0-9]', '', name).upper()
    prefix = clean[:8] if clean else "ITEM"
    rand_suffix = "".join(random.choices("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=4))
    return f"{prefix}-{rand_suffix}"


def run_tests():
    print("\n=== Running CSV Ingestion Engine Tests ===")
    
    # Test 1: Standard CSV with 'title' and 'dept. name'
    csv_bytes = b"title,dept. name,unit,gst_rate\nSteel Rods 12mm,Raw Material,KG,18.0\nCement Bags 50kg,Consumable,BOX,12.0\n"
    rows = parse_excel_or_csv(csv_bytes, "test_template.csv")
    print(f"Parsed standard CSV ({len(rows)} rows):")
    for r in rows:
        print(f" - {r}")
    
    assert len(rows) == 2
    assert rows[0]["title"] == "Steel Rods 12mm"
    assert rows[0]["dept. name"] == "Raw Material"
    assert rows[1]["title"] == "Cement Bags 50kg"
    assert rows[1]["dept. name"] == "Consumable"
    print("[OK] Standard CSV parsed perfectly.")

    # Test 2: CSV with alternative capitalized headers and spaces
    alt_csv_bytes = b"Product Name,Category,GST%\nCopper Wire 2.5mm,Raw Material,18\nLED Bulbs 9W,Finished Good,28\n"
    alt_rows = parse_excel_or_csv(alt_csv_bytes, "alt_template.csv")
    print(f"\nParsed alternative CSV ({len(alt_rows)} rows):")
    for r in alt_rows:
        print(f" - {r}")
    
    assert len(alt_rows) == 2
    assert alt_rows[0]["Product Name"] == "Copper Wire 2.5mm"
    assert alt_rows[0]["Category"] == "Raw Material"
    print("[OK] Alternative CSV parsed perfectly.")

    # Test 3: SKU Generation
    print("\n=== Testing Unique SKU Generation ===")
    names = ["Steel Rods 12mm", "Cement Bags 50kg", "Polypropylene Bags", "Paint White 20L", "Tiles 60x60"]
    for name in names:
        sku = generate_sku(name)
        print(f"Item: '{name}' => SKU: '{sku}'")
        assert sku.startswith("STEELROD") or sku.startswith("CEMENTBA") or sku.startswith("POLYPROP") or sku.startswith("PAINTWHI") or sku.startswith("TILES60X") or sku.startswith("ITEM")
        assert len(sku) == len(sku.split("-")[0]) + 5
    print("[OK] SKU generation tested perfectly.")

    # Test 4: ZIP XML fallback Excel Ingestion (XLSX)
    print("\n=== Testing Zero-Dependency XLSX Parser ===")
    
    # Generate a real, mini-zipped XML structure for a valid basic Excel spreadsheet to test the fallback parser!
    # A basic xlsx zip needs sharedStrings.xml, workSheets/sheet1.xml etc.
    # To keep it simple, we verify that our parse_xlsx_data can parse custom bytes or handle exceptions,
    # and we can test it directly if we run it on a valid generated zip.
    # Let's create a minimal zipped .xlsx in memory!
    import zipfile
    xlsx_mem = io.BytesIO()
    with zipfile.ZipFile(xlsx_mem, 'w') as z:
        z.writestr("xl/sharedStrings.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="3" uniqueCount="3"><si><t>Item Title</t></si><si><t>Department</t></si><si><t>Cement Rod 20mm</t></si><si><t>Factory Group</t></si></sst>')
        z.writestr("xl/worksheets/sheet1.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" t="s"><v>3</v></c></row></sheetData></worksheet>')
    
    xlsx_bytes = xlsx_mem.getvalue()
    parsed_xlsx = parse_excel_or_csv(xlsx_bytes, "test.xlsx")
    print(f"Parsed custom zipped XML Excel worksheet ({len(parsed_xlsx)} rows):")
    for r in parsed_xlsx:
        print(f" - {r}")
        
    assert len(parsed_xlsx) == 1
    assert parsed_xlsx[0]["Item Title"] == "Cement Rod 20mm"
    assert parsed_xlsx[0]["Department"] == "Factory Group"
    print("[OK] Zero-dependency Excel fallback parser parses zipped XML elements perfectly!")

    print("\nAll unit tests passed successfully!")

if __name__ == "__main__":
    run_tests()
