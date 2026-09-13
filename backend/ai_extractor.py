"""
AI Document Extraction Engine
Uses Google Gemini Vision (primary) with Tesseract OCR fallback.
Supports English, Hindi, and Gujarati business documents.
"""
from __future__ import annotations
import base64
import json
import re
from datetime import datetime
from typing import Any

# pyrefly: ignore [missing-import]
from google import genai
# pyrefly: ignore [missing-import]
from google.genai import types
from shared.config import settings

def _get_client(api_key: str | None = None):
    key = api_key or settings.GEMINI_API_KEY
    truncated_key = (key[:15] + "...") if key else "None"
    print(f"[DEBUG ai_extractor] Creating Gemini client with key: {truncated_key} (len={len(key) if key else 0})", flush=True)
    return genai.Client(api_key=key)

# ── System prompt — tuned for Indian business documents ──────────────────────

_EXTRACTION_SYSTEM_PROMPT = """
You are an expert Indian business document parser. You extract structured data from:
- GST Tax Invoices (English, Hindi, Gujarati)
- Purchase Bills / Supplier Invoices
- Export Invoices (international trade, may have USD/EUR amounts, consignee, INCOTERMS, IEC code)
- Lorry Receipts (LR)
- Transport Challans
- E-Way Bills
- Payment screenshots (UPI, NEFT, RTGS, Cheque)
- Bank Statements (extract all transactions into the transactions list)

EXTRACTION RULES:
1. Extract ALL line items with full details for invoices.
2. For Bank Statements, extract ALL transaction rows into the "transactions" list. Each transaction must contain: date (YYYY-MM-DD), description, reference_number (cheque/ref/utr), withdrawal (debit/withdrawal/payment amount as number, 0 if credit/deposit), deposit (credit/deposit/receipt amount as number, 0 if debit/withdrawal), and balance. Carefully check columns like "Type", "Credit/Debit", "Cr/Dr", "Amount", or color-coding to properly identify withdrawals vs deposits.
3. Separate CGST, SGST, IGST amounts individually.
4. Detect vehicle number format (e.g. GJ05AB1234).
5. Parse Indian date formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY.
6. Handle lakhs notation: 1,50,000 = 150000.
7. Detect GSTIN: 15-character format (e.g. 24AABCA1234Z1Z5).
8. Map common abbreviations: Qty=quantity, HSN=hsn_code, MRP=mrp, Disc=discount.
9. For Gujarati: ₹ amounts, party names, and dates are priority fields.
10. Assign confidence 0.0-1.0 per field; overall confidence = average of key fields.
11. For Export Invoices: Extract consignee details, INCOTERMS, port of loading/discharge, country of origin/destination, IEC code, advance licence number, AD code, currency (USD/EUR/GBP), gross/net weight, vessel/flight info, and any reference numbers (proforma invoice no, LC no, etc.).
12. If document has "EXPORT INVOICE" header or has consignee outside India or mentions CFR/CIF/FOB INCOTERMS, classify as export_invoice.

RESPOND ONLY WITH VALID JSON. No markdown, no explanation.
"""

_EXTRACTION_SCHEMA = """
{
  "document_type": "invoice|purchase_bill|export_invoice|lr|challan|eway_bill|payment_screenshot|bank_statement|other",
  "language": "en|hi|gu|mixed",
  "invoice_number": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "due_date": "YYYY-MM-DD or null",
  "currency": "INR|USD|EUR|GBP or null (default INR for domestic, USD for export)",

  "party_name": "string or null (Exporter/Seller name)",
  "party_gstin": "string or null",
  "party_address": {
    "line1": "string", "city": "string", "state": "string", "pincode": "string", "country": "string"
  },
  "our_gstin": "string or null",
  "exporter_ref": "string or null (Exporter's reference number)",
  "other_reference": "string or null (Other references / AD code / IEC)",
  "iec_code": "string or null (Import Export Code, 10-digit)",
  "ad_code": "string or null (Authorized Dealer Code)",

  "consignee_name": "string or null (Buyer/Consignee name for export)",
  "consignee_address": {
    "line1": "string", "city": "string", "state": "string", "pincode": "string", "country": "string"
  },

  "country_of_origin": "string or null (e.g. INDIA)",
  "country_of_destination": "string or null (e.g. SRI LANKA)",
  "incoterms": "string or null (e.g. CFR COLOMBO SRI LANKA, FOB MUMBAI)",
  "payment_terms": "string or null (e.g. LC AT SIGHT, Net 30)",
  "pre_carriage_by": "string or null (Road/Rail/Air)",
  "vessel_flight_no": "string or null",
  "port_of_loading": "string or null (e.g. ANY PORT IN INDIA)",
  "port_of_discharge": "string or null (e.g. COLOMBO SRI LANKA)",
  "final_destination": "string or null",
  "marks_and_nos": "string or null (Marks & Nos / Container No)",
  "no_of_packages": "string or null (e.g. 200 Two Hundred Bags)",
  "gross_weight_kg": number,
  "net_weight_kg": number,

  "advance_licence_no": "string or null (Export Against Advance Licence No)",
  "advance_licence_date": "YYYY-MM-DD or null",
  "proforma_invoice_no": "string or null (REF.NO / PI number)",
  "lc_no": "string or null (Irrevocable Documentary Credit No)",
  "lc_date": "YYYY-MM-DD or null",
  "net_invoice_amount": number,

  "line_items": [
    {
      "item_name": "string",
      "hsn_code": "string or null",
      "quantity": number,
      "unit": "KG|PCS|LTR|MTR|BAG|BOX|MT",
      "rate": number,
      "discount_pct": number,
      "taxable_amount": number,
      "gst_rate": number,
      "cgst": number, "sgst": number, "igst": number,
      "total": number,
      "description_full": "string or null (full multi-line item description from bill)"
    }
  ],
  "subtotal": number,
  "total_cgst": number,
  "total_sgst": number,
  "total_igst": number,
  "total_amount": number,
  "amount_in_words": "string or null",

  "vehicle_number": "string or null",
  "lr_number": "string or null",
  "transporter_name": "string or null",
  "e_way_bill_number": "string or null",
  "utr_number": "string or null",
  "payment_mode": "upi|neft|rtgs|cheque|cash|lc or null",
  "bank_reference": "string or null",
  "bank_name": "string or null",
  "account_number": "string or null",
  "statement_period": "string or null",
  "transactions": [
    {
      "date": "YYYY-MM-DD or null",
      "description": "string",
      "reference_number": "string or null",
      "withdrawal": number,
      "deposit": number,
      "balance": number
    }
  ],
  "confidence": {
    "overall": 0.0,
    "invoice_number": 0.0, "party_name": 0.0, "total_amount": 0.0,
    "gstin": 0.0, "line_items": 0.0
  }
}
"""


import asyncio

class AIExtractor:
    """Gemini Vision-based document extractor for Indian business documents."""

    # Prioritize fast 2.5-flash and available models
    MODELS = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-flash-latest"]

    async def extract(
        self,
        image_bytes: bytes,
        mime_type: str,
        language_hint: str = "auto",
        document_type_hint: str | None = None,
        api_key: str | None = None,
        history_context: str | None = None,
    ) -> dict[str, Any]:
        """
        Extract structured data from a document image/PDF with rapid timeout.
        """
        lang_hint = (
            "" if language_hint == "auto"
            else f"\nDocument language hint: {language_hint}"
        )
        type_hint = (
            "" if not document_type_hint
            else f"\nDocument type hint: {document_type_hint}"
        )
        hist_hint = (
            "" if not history_context
            else f"\nHistorical ledger mappings & user corrections for reference (AI Learning):\n{history_context}"
        )

        prompt = f"""{_EXTRACTION_SYSTEM_PROMPT}
{lang_hint}{type_hint}{hist_hint}

Extract all data from this document and return JSON matching this schema:
{_EXTRACTION_SCHEMA}

Important: For amounts, always use numbers (not strings).
Detect Indian number format: 1,23,456.00 = 123456.00
"""

        last_error = "No models available"
        client = _get_client(api_key)

        for model in self.MODELS:
            try:
                response = await asyncio.wait_for(
                    client.aio.models.generate_content(
                        model=model,
                        contents=[
                            types.Part.from_text(text=prompt),
                            types.Part.from_bytes(
                                data=image_bytes,
                                mime_type=mime_type,
                            ),
                        ],
                        config=types.GenerateContentConfig(
                            temperature=0.1,
                            max_output_tokens=4096,
                        ),
                    ),
                    timeout=25.0,
                )
                raw = response.text or ""
                # Strip any accidental markdown fences
                raw = re.sub(r"```json\s*", "", raw)
                raw = re.sub(r"\s*```", "", raw).strip()
                # Extract first JSON object if model added extra text
                brace = raw.find("{")
                if brace > 0:
                    raw = raw[brace:]

                # Try to parse; if truncated, attempt repair
                try:
                    data = json.loads(raw)
                except json.JSONDecodeError:
                    raw = self._repair_json(raw)
                    data = json.loads(raw)   # raises if still broken

                data["_model_used"] = model
                return self._post_process(data)

            except json.JSONDecodeError as e:
                # JSON still broken after repair — try next model if available
                last_error = f"JSON parse error from {model}: {e}"
                continue

            except Exception as e:
                err_str = str(e)
                last_error = f"{model}: {err_str}"
                print(f"[ai_extractor] Model {model} failed: {err_str}, trying next model...", flush=True)
                continue

        return self._error_result(f"Extraction failed. Last error: {last_error}")


    def _post_process(self, data: dict) -> dict:
        """Normalise and validate extracted fields."""
        # Normalise date strings
        for field in ["invoice_date", "due_date"]:
            if data.get(field):
                data[field] = self._normalise_date(data[field])

        # Ensure all numeric fields are float
        for field in ["subtotal", "total_cgst", "total_sgst", "total_igst", "total_amount"]:
            if field in data and data[field] is not None:
                try:
                    data[field] = float(str(data[field]).replace(",", ""))
                except (ValueError, TypeError):
                    data[field] = None

        # Normalise line items
        for item in data.get("line_items", []):
            for num_field in ["quantity", "rate", "taxable_amount", "gst_rate",
                               "cgst", "sgst", "igst", "total"]:
                if item.get(num_field) is not None:
                    try:
                        item[num_field] = float(
                            str(item[num_field]).replace(",", ""))
                    except (ValueError, TypeError):
                        item[num_field] = 0.0

        # Normalise GSTIN — uppercase, strip spaces
        for field in ["party_gstin", "our_gstin"]:
            if data.get(field):
                data[field] = data[field].upper().replace(" ", "")
                # Validate format
                if not re.match(r"^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$",
                                 data[field]):
                    data[field + "_invalid"] = True

        # Normalise vehicle number
        if data.get("vehicle_number"):
            data["vehicle_number"] = (
                data["vehicle_number"].upper().replace(" ", "")
            )

        # Normalise bank statement transactions if present
        if "transactions" in data and isinstance(data["transactions"], list):
            for tx in data["transactions"]:
                if tx.get("date"):
                    tx["date"] = self._normalise_date(tx["date"])
                for field in ["withdrawal", "deposit", "balance"]:
                    if field in tx and tx[field] is not None:
                        try:
                            tx[field] = float(str(tx[field]).replace(",", ""))
                        except (ValueError, TypeError):
                            tx[field] = 0.0

        return data

    @staticmethod
    def _repair_json(raw: str) -> str:
        """
        Attempt to close a truncated JSON string so it can be parsed.
        Handles the most common truncation patterns from LLM output:
          - Unterminated string value
          - Unclosed array  [
          - Unclosed object {
        """
        raw = raw.rstrip()

        # Close any open string (odd number of unescaped quotes)
        # Count unescaped double-quotes
        in_string = False
        i = 0
        while i < len(raw):
            ch = raw[i]
            if ch == '\\' and in_string:
                i += 2          # skip escaped char
                continue
            if ch == '"':
                in_string = not in_string
            i += 1

        if in_string:
            raw += '"'          # close the unterminated string

        # Now close unclosed brackets/braces by counting depth
        stack = []
        in_string = False
        i = 0
        while i < len(raw):
            ch = raw[i]
            if ch == '\\' and in_string:
                i += 2
                continue
            if ch == '"':
                in_string = not in_string
                i += 1
                continue
            if not in_string:
                if ch in ('{', '['):
                    stack.append('}' if ch == '{' else ']')
                elif ch in ('}', ']') and stack:
                    stack.pop()
            i += 1

        # Remove trailing comma before we close (invalid JSON)
        raw = re.sub(r',\s*$', '', raw)

        # Close all open containers
        raw += ''.join(reversed(stack))
        return raw

    @staticmethod
    def _normalise_date(raw: str) -> str | None:
        """Convert various Indian date formats to YYYY-MM-DD."""
        formats = [
            "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y",
            "%d/%m/%y", "%d-%m-%y",
            "%Y-%m-%d",  # Already ISO
        ]
        raw = str(raw).strip()
        for fmt in formats:
            try:
                return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        return raw  # Return as-is if can't parse

    @staticmethod
    def _error_result(error: str) -> dict:
        return {
            "extraction_error": error,
            "confidence": {"overall": 0.0},
            "line_items": [],
        }


# ── AI Product Name Matcher ───────────────────────────────────────────────────

class ProductMatcher:
    """
    Matches raw OCR product names to canonical item_codes in the item master.
    Uses company-specific aliases and fuzzy matching.
    """

    def __init__(self, item_master: list[dict]):
        """
        item_master: list of {item_code, item_name, aliases: [str]}
        """
        self._items = item_master
        # Build lookup: lowercase alias → item
        self._lookup: dict[str, dict] = {}
        for item in item_master:
            self._lookup[item["item_name"].lower()] = item
            for alias in item.get("aliases", []):
                self._lookup[alias.lower()] = item

    def match(self, raw_name: str) -> dict | None:
        """
        Return best matching item or None.
        Returns: {item_code, item_name, confidence, match_type}
        """
        normalized = raw_name.lower().strip()

        # 1. Exact match
        if normalized in self._lookup:
            return {**self._lookup[normalized],
                    "confidence": 1.0, "match_type": "exact"}

        # 2. Partial / contains match
        for key, item in self._lookup.items():
            if normalized in key or key in normalized:
                overlap = len(set(normalized.split()) & set(key.split()))
                total = max(len(normalized.split()), len(key.split()))
                conf = overlap / total if total > 0 else 0
                if conf > 0.5:
                    return {**item, "confidence": conf, "match_type": "partial"}

        # 3. Token overlap (handles "Blk MB" → "Black Masterbatch")
        tokens_raw = set(self._tokenize(normalized))
        best_conf = 0.0
        best_item = None
        for key, item in self._lookup.items():
            tokens_key = set(self._tokenize(key))
            if not tokens_key:
                continue
            overlap = len(tokens_raw & tokens_key)
            conf = overlap / max(len(tokens_raw), len(tokens_key))
            if conf > best_conf:
                best_conf = conf
                best_item = item

        if best_conf >= 0.4 and best_item:
            return {**best_item, "confidence": best_conf, "match_type": "token"}

        return None

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        """Break text into meaningful tokens, expanding abbreviations."""
        ABBREV = {
            "blk": "black", "wht": "white", "mb": "masterbatch",
            "pp": "polypropylene", "pe": "polyethylene",
            "hdpe": "hdpe", "ldpe": "ldpe", "pvc": "pvc",
        }
        tokens = re.findall(r"[a-z0-9]+", text.lower())
        return [ABBREV.get(t, t) for t in tokens]


# ── Singleton ─────────────────────────────────────────────────────────────────

ai_extractor = AIExtractor()
