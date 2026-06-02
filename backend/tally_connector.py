"""
TallyPrime XML Connector
Pushes vouchers, stock entries, and ledgers to TallyPrime via its built-in
XML HTTP server (default port 9000).
"""
from __future__ import annotations
import xml.etree.ElementTree as ET
from datetime import date
from typing import Any
import httpx

from shared.config import settings


class TallyConnector:
    """
    Converts platform data to TallyPrime XML and POSTs to Tally's HTTP server.
    Tally must have the HTTP server enabled: F12 > Advanced Config > Enable HTTP.
    """

    def __init__(self, tally_url: str = "", company_name: str = ""):
        self.url = tally_url or settings.TALLY_DEFAULT_URL
        self.company = company_name
        self.timeout = settings.TALLY_TIMEOUT

    # ── High-level methods ────────────────────────────────────────────────────

    async def push_purchase_voucher(self, voucher: dict) -> dict:
        """Create a Purchase voucher in Tally from platform data."""
        xml = self._build_purchase_xml(voucher)
        return await self._post_xml(xml)

    async def push_sales_voucher(self, voucher: dict) -> dict:
        """Create a Sales voucher in Tally."""
        xml = self._build_sales_xml(voucher)
        return await self._post_xml(xml)

    async def push_payment_voucher(self, voucher: dict) -> dict:
        """Create a Payment voucher in Tally."""
        xml = self._build_payment_xml(voucher)
        return await self._post_xml(xml)

    async def push_receipt_voucher(self, voucher: dict) -> dict:
        """Create a Receipt voucher in Tally."""
        xml = self._build_receipt_xml(voucher)
        return await self._post_xml(xml)

    async def push_stock_journal(self, entry: dict) -> dict:
        """Push a Stock Journal entry (production consumption)."""
        xml = self._build_stock_journal_xml(entry)
        return await self._post_xml(xml)

    async def create_ledger(self, ledger: dict) -> dict:
        """Create or update a ledger master in Tally."""
        xml = self._build_ledger_master_xml(ledger)
        return await self._post_xml(xml)

    async def test_connection(self) -> dict:
        """
        Test connectivity with TallyPrime.
        Uses a simple GET request — works with all Tally versions including EDU.
        TallyPrime responds with '<RESPONSE>TallyPrime Server is Running</RESPONSE>'
        """
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(self.url)
                text = response.text.strip()
                # TallyPrime returns this string when the server is running
                if "TallyPrime Server is Running" in text or response.status_code == 200:
                    return {
                        "connected": True,
                        "message": "TallyPrime is reachable and running",
                        "response": text[:200],
                    }
                return {
                    "connected": False,
                    "error": f"Unexpected response (HTTP {response.status_code}): {text[:200]}",
                }
        except httpx.ConnectError:
            return {
                "connected": False,
                "error": f"Cannot connect to {self.url} — is TallyPrime running with Server mode ON?",
            }
        except httpx.TimeoutException:
            return {
                "connected": False,
                "error": f"Connection timed out — Tally at {self.url} is not responding",
            }
        except Exception as e:
            return {"connected": False, "error": str(e)}

    # ── XML Builders ──────────────────────────────────────────────────────────

    def _build_purchase_xml(self, v: dict) -> str:
        """Build Tally Purchase Voucher XML."""
        date_str = self._format_tally_date(v.get("voucher_date"))
        ref = v.get("reference_number", "")
        party = v.get("party_name", "")
        narration = v.get("narration", f"Purchase Bill {ref}")
        items = v.get("line_items", [])

        lines_xml = ""
        # Party leg (Sundry Creditor)
        total = v.get("total", 0)
        lines_xml += f"""
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>{self._xml_escape(party)}</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>{total:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>"""

        # Item legs
        for item in items:
            taxable = item.get("taxable_amount", 0)
            gst_rate = item.get("gst_rate", 0)
            purchase_ledger = f"Purchase @{int(gst_rate)}%"
            lines_xml += f"""
<ALLINVENTORYENTRIES.LIST>
<STOCKITEMNAME>{self._xml_escape(item.get('item_name', ''))}</STOCKITEMNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<RATE>{item.get('rate', 0):.4f}/KG</RATE>
<AMOUNT>-{taxable:.2f}</AMOUNT>
<ACTUALQTY>{item.get('quantity', 0):.3f} KG</ACTUALQTY>
<BILLEDQTY>{item.get('quantity', 0):.3f} KG</BILLEDQTY>
<BATCHALLOCATIONS.LIST>
<GODOWNNAME>Main Godown</GODOWNNAME>
<AMOUNT>-{taxable:.2f}</AMOUNT>
<ACTUALQTY>{item.get('quantity', 0):.3f} KG</ACTUALQTY>
</BATCHALLOCATIONS.LIST>
</ALLINVENTORYENTRIES.LIST>"""

            # GST ledger entries
            if item.get("cgst", 0) > 0:
                lines_xml += f"""
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>CGST @ {int(gst_rate/2)}%</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-{item['cgst']:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>SGST @ {int(gst_rate/2)}%</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-{item['sgst']:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>"""
            elif item.get("igst", 0) > 0:
                lines_xml += f"""
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>IGST @ {int(gst_rate)}%</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-{item['igst']:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>"""

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER>
<TALLYREQUEST>Import Data</TALLYREQUEST>
</HEADER>
<BODY>
<IMPORTDATA>
<REQUESTDESC>
<REPORTNAME>Vouchers</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>{self._xml_escape(self.company)}</SVCURRENTCOMPANY>
</STATICVARIABLES>
</REQUESTDESC>
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="Purchase" ACTION="Create" OBJVIEW="Invoice Voucher View">
<DATE>{date_str}</DATE>
<VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
<VOUCHERNUMBER>{self._xml_escape(ref)}</VOUCHERNUMBER>
<PARTYLEDGERNAME>{self._xml_escape(party)}</PARTYLEDGERNAME>
<NARRATION>{self._xml_escape(narration)}</NARRATION>
{lines_xml}
</VOUCHER>
</TALLYMESSAGE>
</REQUESTDATA>
</IMPORTDATA>
</BODY>
</ENVELOPE>"""

    def _build_sales_xml(self, v: dict) -> str:
        """Build Tally Sales Voucher XML (simplified)."""
        date_str = self._format_tally_date(v.get("voucher_date"))
        ref = v.get("reference_number", "")
        party = v.get("party_name", "")
        total = v.get("total", 0)
        narration = v.get("narration", f"Sales Invoice {ref}")

        lines_xml = f"""
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>{self._xml_escape(party)}</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-{total:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>"""

        for item in v.get("line_items", []):
            gst_rate = item.get("gst_rate", 0)
            taxable = item.get("taxable_amount", 0)
            lines_xml += f"""
<ALLINVENTORYENTRIES.LIST>
<STOCKITEMNAME>{self._xml_escape(item.get('item_name', ''))}</STOCKITEMNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<RATE>{item.get('rate', 0):.4f}/KG</RATE>
<AMOUNT>{taxable:.2f}</AMOUNT>
<ACTUALQTY>{item.get('quantity', 0):.3f} KG</ACTUALQTY>
<BILLEDQTY>{item.get('quantity', 0):.3f} KG</BILLEDQTY>
</ALLINVENTORYENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>Sales @{int(gst_rate)}%</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>{taxable:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>"""

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
<BODY><IMPORTDATA>
<REQUESTDESC>
<REPORTNAME>Vouchers</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>{self._xml_escape(self.company)}</SVCURRENTCOMPANY>
</STATICVARIABLES>
</REQUESTDESC>
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">
<DATE>{date_str}</DATE>
<VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
<VOUCHERNUMBER>{self._xml_escape(ref)}</VOUCHERNUMBER>
<PARTYLEDGERNAME>{self._xml_escape(party)}</PARTYLEDGERNAME>
<NARRATION>{self._xml_escape(narration)}</NARRATION>
{lines_xml}
</VOUCHER>
</TALLYMESSAGE>
</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>"""

    def _build_payment_xml(self, v: dict) -> str:
        """Build Payment voucher XML."""
        date_str = self._format_tally_date(v.get("voucher_date"))
        amount = v.get("amount", 0)
        party = v.get("party_name", "")
        bank = v.get("bank_ledger", "Bank Account")
        ref = v.get("reference_number", "")
        narration = v.get("narration", f"Payment to {party}")

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
<BODY><IMPORTDATA>
<REQUESTDESC>
<REPORTNAME>Vouchers</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>{self._xml_escape(self.company)}</SVCURRENTCOMPANY>
</STATICVARIABLES>
</REQUESTDESC>
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="Payment" ACTION="Create">
<DATE>{date_str}</DATE>
<VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>
<VOUCHERNUMBER>{self._xml_escape(ref)}</VOUCHERNUMBER>
<NARRATION>{self._xml_escape(narration)}</NARRATION>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>{self._xml_escape(party)}</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-{amount:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>{self._xml_escape(bank)}</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>{amount:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
</VOUCHER>
</TALLYMESSAGE>
</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>"""

    def _build_receipt_xml(self, v: dict) -> str:
        """Build Receipt voucher XML."""
        date_str = self._format_tally_date(v.get("voucher_date"))
        amount = v.get("amount", 0)
        party = v.get("party_name", "")
        bank = v.get("bank_ledger", "Bank Account")
        ref = v.get("reference_number", "")

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
<BODY><IMPORTDATA>
<REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>{self._xml_escape(self.company)}</SVCURRENTCOMPANY>
</STATICVARIABLES>
</REQUESTDESC>
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="Receipt" ACTION="Create">
<DATE>{date_str}</DATE>
<VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
<VOUCHERNUMBER>{self._xml_escape(ref)}</VOUCHERNUMBER>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>{self._xml_escape(bank)}</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-{amount:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>{self._xml_escape(party)}</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>{amount:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
</VOUCHER>
</TALLYMESSAGE>
</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>"""

    def _build_ledger_master_xml(self, ledger: dict) -> str:
        """Create a new ledger (party) in Tally."""
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
<BODY><IMPORTDATA>
<REQUESTDESC><REPORTNAME>All Masters</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>{self._xml_escape(self.company)}</SVCURRENTCOMPANY>
</STATICVARIABLES>
</REQUESTDESC>
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<LEDGER NAME="{self._xml_escape(ledger['name'])}" ACTION="Create">
<NAME>{self._xml_escape(ledger['name'])}</NAME>
<PARENT>{self._xml_escape(ledger.get('group', 'Sundry Creditors'))}</PARENT>
<GSTNREGISTRATIONTYPE>Regular</GSTNREGISTRATIONTYPE>
<PARTYGSTIN>{self._xml_escape(ledger.get('gstin', ''))}</PARTYGSTIN>
<MAILINGNAME>{self._xml_escape(ledger.get('name', ''))}</MAILINGNAME>
<ADDRESS.LIST>
<ADDRESS>{self._xml_escape(ledger.get('address', ''))}</ADDRESS>
</ADDRESS.LIST>
<STATENAME>{self._xml_escape(ledger.get('state', ''))}</STATENAME>
<PINCODE>{self._xml_escape(ledger.get('pincode', ''))}</PINCODE>
</LEDGER>
</TALLYMESSAGE>
</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>"""

    def _build_stock_journal_xml(self, entry: dict) -> str:
        """Build Stock Journal for production consumption."""
        date_str = self._format_tally_date(entry.get("date"))
        narration = entry.get("narration", "Production Entry")
        consumptions = entry.get("consumed_items", [])
        produced = entry.get("produced_item", {})

        source_items = ""
        for item in consumptions:
            source_items += f"""
<ALLINVENTORYENTRIES.LIST>
<STOCKITEMNAME>{self._xml_escape(item['item_name'])}</STOCKITEMNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<RATE>{item.get('rate', 0):.4f}/KG</RATE>
<AMOUNT>{item.get('amount', 0):.2f}</AMOUNT>
<ACTUALQTY>{item['quantity']:.3f} KG</ACTUALQTY>
</ALLINVENTORYENTRIES.LIST>"""

        dest_item = f"""
<ALLINVENTORYENTRIES.LIST>
<STOCKITEMNAME>{self._xml_escape(produced.get('item_name', ''))}</STOCKITEMNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<RATE>{produced.get('rate', 0):.4f}/KG</RATE>
<AMOUNT>-{produced.get('amount', 0):.2f}</AMOUNT>
<ACTUALQTY>{produced.get('quantity', 0):.3f} KG</ACTUALQTY>
</ALLINVENTORYENTRIES.LIST>"""

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
<BODY><IMPORTDATA>
<REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>{self._xml_escape(self.company)}</SVCURRENTCOMPANY>
</STATICVARIABLES>
</REQUESTDESC>
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="Stock Journal" ACTION="Create">
<DATE>{date_str}</DATE>
<VOUCHERTYPENAME>Stock Journal</VOUCHERTYPENAME>
<NARRATION>{self._xml_escape(narration)}</NARRATION>
{source_items}
{dest_item}
</VOUCHER>
</TALLYMESSAGE>
</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>"""

    # ── HTTP Transport ─────────────────────────────────────────────────────────

    async def _post_xml(self, xml: str) -> dict:
        """POST XML to TallyPrime HTTP server and parse response."""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                self.url,
                content=xml.encode("utf-8"),
                headers={"Content-Type": "text/xml; charset=utf-8"},
            )
            response.raise_for_status()
            response_text = response.text

            # Parse Tally response — check for errors
            if "LINEERROR" in response_text:
                raise TallyError(f"Tally error: {response_text[:500]}")
            if "IMPORTRESULT" in response_text:
                return {"success": True, "tally_response": response_text[:200]}

            return {"success": True, "raw": response_text[:200]}

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _format_tally_date(d) -> str:
        """Convert date to Tally format: YYYYMMDD."""
        if isinstance(d, date):
            return d.strftime("%Y%m%d")
        if isinstance(d, str) and len(d) == 10:
            return d.replace("-", "")
        return ""

    @staticmethod
    def _xml_escape(text: str) -> str:
        """Escape special XML characters."""
        if not text:
            return ""
        return (
            str(text)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&apos;")
        )


class TallyError(Exception):
    pass
