"""
TallyPrime XML Connector
Pushes vouchers, stock entries, and ledgers to TallyPrime via its built-in
XML HTTP server (default port 9000).
Supports full Educational Mode date & period compatibility.
"""
from __future__ import annotations
import html
import re
import socket
from datetime import date
from urllib.parse import urlparse
from typing import Any
# pyrefly: ignore [missing-import]
import httpx

from shared.config import settings


class TallyError(Exception):
    pass


class TallyConnector:
    """
    Converts platform data to TallyPrime XML and POSTs to Tally's HTTP server.
    Tally must have the HTTP server enabled: F12 > Advanced Config > Enable HTTP.
    """

    def __init__(self, tally_url: str = "", company_name: str = ""):
        self.url = (tally_url or settings.TALLY_DEFAULT_URL).rstrip("/")
        self.company = company_name.strip()
        self.timeout = 4.0  # Fast 4-second timeout to prevent UI freezing
        self._cached_dates: dict | None = None

    def _static_vars_block(self) -> str:
        """Only emit SVCURRENTCOMPANY when a company name is explicitly specified."""
        if self.company:
            return f"""<STATICVARIABLES>
<SVCURRENTCOMPANY>{self._xml_escape(self.company)}</SVCURRENTCOMPANY>
</STATICVARIABLES>"""
        return ""

    async def get_company_dates(self) -> dict:
        """Query Tally to discover active company's BooksFrom and financial year period."""
        if self._cached_dates:
            return self._cached_dates

        xml = """<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>CustomCompanyCol</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES><TDL><TDLMESSAGE><COLLECTION NAME='CustomCompanyCol'><TYPE>Company</TYPE><FETCH>Name,StartingFrom,EndingAt,BooksFrom</FETCH></COLLECTION></TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>"""
        try:
            async with httpx.AsyncClient(timeout=2.5) as client:
                r = await client.post(
                    self.url,
                    content=xml.encode("utf-8"),
                    headers={"Connection": "close", "Content-Type": "text/xml"}
                )
                m_books = re.search(r"<BOOKSFROM[^>]*>(\d+)</BOOKSFROM>", r.text)
                m_start = re.search(r"<STARTINGFROM[^>]*>(\d+)</STARTINGFROM>", r.text)
                m_end = re.search(r"<ENDINGAT[^>]*>(\d+)</ENDINGAT>", r.text)
                self._cached_dates = {
                    "books_from": m_books.group(1) if m_books else "20270331",
                    "start_from": m_start.group(1) if m_start else "20260401",
                    "end_at": m_end.group(1) if m_end else "20270331",
                }
                return self._cached_dates
        except Exception:
            return {"books_from": "20270331", "start_from": "20260401", "end_at": "20270331"}

    def _clean_tally_date(self, d: Any, company_dates: dict | None = None) -> tuple[str, str]:
        """
        Formats date to Tally YYYYMMDD format.
        Handles TallyPrime Educational Mode and BooksFrom restrictions:
        In Tally EDU mode, vouchers can only be entered on 1st, 2nd, or 31st of the month,
        and cannot be dated before the BooksFrom date.
        Returns: (safe_tally_date, original_date_str)
        """
        orig_str = str(d or "").strip()
        clean = orig_str.replace("-", "").replace("/", "").strip()
        if len(clean) >= 8:
            clean = clean[:8]
        else:
            clean = date.today().strftime("%Y%m%d")

        books_from = (company_dates or {}).get("books_from", "20270331")
        
        # If date is prior to Books Beginning From date, adapt to books_from
        try:
            if int(clean) < int(books_from):
                return books_from, orig_str
        except Exception:
            pass

        # Educational mode check: allowed days are 01, 02, or 30/31 (last day)
        try:
            day = int(clean[6:8])
            if day not in (1, 2, 30, 31):
                clean = clean[:6] + "01"
                if int(clean) < int(books_from):
                    clean = books_from
        except Exception:
            clean = books_from

        return clean, orig_str

    async def _ensure_masters(self, ledgers: list[dict]) -> None:
        """Create party and account masters in Tally before pushing vouchers."""
        static_vars = self._static_vars_block()
        desc_block = f"""<REQUESTDESC>
<REPORTNAME>All Masters</REPORTNAME>
{static_vars}
</REQUESTDESC>"""
        msgs = ""
        for lg in ledgers:
            name = lg.get("name", "").strip()
            parent = lg.get("parent", "Sundry Creditors")
            if not name:
                continue
            msgs += f"""
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<LEDGER NAME="{self._xml_escape(name)}" ACTION="Create">
<NAME>{self._xml_escape(name)}</NAME>
<PARENT>{self._xml_escape(parent)}</PARENT>
</LEDGER>
</TALLYMESSAGE>"""
        if not msgs:
            return

        xml = f"""<ENVELOPE>
<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
<BODY>
<IMPORTDATA>
{desc_block}
<REQUESTDATA>
{msgs}
</REQUESTDATA> 
</IMPORTDATA>
</BODY>
</ENVELOPE>"""
        try:
            await self._post_xml(xml)
        except Exception:
            pass  # Non-fatal if already exists

    # ── High-level methods ────────────────────────────────────────────────────

    async def push_purchase_voucher(self, voucher: dict) -> dict:
        """Create a Purchase voucher in Tally from platform data."""
        c_dates = await self.get_company_dates()
        party = voucher.get("party_name", "").strip() or "Sundry Creditor"
        await self._ensure_masters([
            {"name": party, "parent": "Sundry Creditors"},
            {"name": "Purchase Account", "parent": "Purchase Accounts"},
            {"name": "CGST", "parent": "Duties & Taxes"},
            {"name": "SGST", "parent": "Duties & Taxes"},
            {"name": "IGST", "parent": "Duties & Taxes"},
        ])
        xml = self._build_purchase_xml(voucher, c_dates)
        return await self._post_xml(xml)

    async def push_sales_voucher(self, voucher: dict) -> dict:
        """Create a Sales voucher in Tally."""
        c_dates = await self.get_company_dates()
        party = voucher.get("party_name", "").strip() or "Sundry Debtor"
        await self._ensure_masters([
            {"name": party, "parent": "Sundry Debtors"},
            {"name": "Sales Account", "parent": "Sales Accounts"},
            {"name": "CGST", "parent": "Duties & Taxes"},
            {"name": "SGST", "parent": "Duties & Taxes"},
            {"name": "IGST", "parent": "Duties & Taxes"},
        ])
        xml = self._build_sales_xml(voucher, c_dates)
        return await self._post_xml(xml)

    async def push_payment_voucher(self, voucher: dict) -> dict:
        """Create a Payment voucher in Tally."""
        c_dates = await self.get_company_dates()
        party = voucher.get("party_name", "").strip() or "Sundry Creditor"
        bank = voucher.get("bank_ledger", "").strip() or "HDFC Bank"
        await self._ensure_masters([
            {"name": party, "parent": "Sundry Creditors"},
            {"name": bank, "parent": "Bank Accounts"},
        ])
        xml = self._build_payment_xml(voucher, c_dates)
        return await self._post_xml(xml)

    async def push_receipt_voucher(self, voucher: dict) -> dict:
        """Create a Receipt voucher in Tally."""
        c_dates = await self.get_company_dates()
        party = voucher.get("party_name", "").strip() or "Sundry Debtor"
        bank = voucher.get("bank_ledger", "").strip() or "HDFC Bank"
        await self._ensure_masters([
            {"name": party, "parent": "Sundry Debtors"},
            {"name": bank, "parent": "Bank Accounts"},
        ])
        xml = self._build_receipt_xml(voucher, c_dates)
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
        Test connectivity with TallyPrime HTTP server and dynamically discover open companies on this PC.
        """
        parsed = urlparse(self.url)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or 9000

        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2.0)
            sock.connect((host, port))
            sock.close()
        except Exception:
            return {
                "connected": False,
                "tally_online": False,
                "error": f"Cannot connect to {self.url} — Is TallyPrime running with HTTP Server enabled (Port {port})?",
            }

        # Query Tally to find currently opened company names on this PC
        open_companies: list[str] = []
        xml = """<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>ListofCompanies</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES><TDL><TDLMESSAGE><COLLECTION NAME='ListofCompanies'><TYPE>Company</TYPE><FETCH>Name</FETCH></COLLECTION></TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>"""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                r = await client.post(
                    self.url,
                    content=xml.encode("utf-8"),
                    headers={"Connection": "close", "Content-Type": "text/xml"}
                )
                if r.status_code == 200:
                    open_companies = [c.strip() for c in re.findall(r"<NAME[^>]*>([^<]+)</NAME>", r.text) if c.strip()]
        except Exception:
            pass

        if not open_companies:
            if self.company:
                return {
                    "connected": True,
                    "tally_online": True,
                    "company_open": True,
                    "company_name": self.company,
                    "message": f"Connected to TallyPrime (Target: {self.company})",
                }
            return {
                "connected": False,
                "tally_online": True,
                "company_open": False,
                "error": "TallyPrime is online, but NO Company is currently open. Please open your company in TallyPrime.",
            }

        # Select the active company from what is actually open on this PC:
        # If user specified a company and it is open, use it. Otherwise, use the first open company (e.g. 'TCS').
        active_company = self.company if (self.company and self.company in open_companies) else open_companies[0]
        self.company = active_company

        return {
            "connected": True,
            "tally_online": True,
            "company_open": True,
            "company_name": active_company,
            "open_companies": open_companies,
            "message": f"Connected to TallyPrime (Active Company: {active_company})",
        }

    # ── XML Builders ──────────────────────────────────────────────────────────

    def _build_purchase_xml(self, v: dict, company_dates: dict | None = None) -> str:
        """Build Tally Purchase Voucher XML."""
        tally_date, orig_date = self._clean_tally_date(v.get("voucher_date"), company_dates)
        ref = v.get("reference_number", "") or v.get("voucher_number", "")
        party = v.get("party_name", "").strip() or "Sundry Creditor"
        narration = v.get("narration", f"Purchase Bill {ref}")
        if orig_date and orig_date != tally_date:
            narration = f"{narration} (Actual Date: {orig_date})"

        total = float(v.get("total") or 0)
        items = v.get("line_items", [])

        taxable_total = 0.0
        cgst_total = float(v.get("total_cgst") or 0)
        sgst_total = float(v.get("total_sgst") or 0)
        igst_total = float(v.get("total_igst") or 0)

        if items:
            for it in items:
                taxable_total += float(it.get("taxable_amount") or (float(it.get("rate", 0)) * float(it.get("quantity", 1))))
                if not cgst_total and not igst_total:
                    cgst_total += float(it.get("cgst", 0))
                    sgst_total += float(it.get("sgst", 0))
                    igst_total += float(it.get("igst", 0))

        if taxable_total <= 0:
            taxable_total = float(v.get("subtotal") or 0)
        if taxable_total <= 0:
            taxable_total = round(total / 1.18, 2)
            if cgst_total <= 0 and igst_total <= 0:
                cgst_total = round((total - taxable_total) / 2, 2)
                sgst_total = round(total - taxable_total - cgst_total, 2)

        tax_lines = ""
        if cgst_total > 0:
            tax_lines += f"""
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>CGST</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-{cgst_total:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>"""
        if sgst_total > 0:
            tax_lines += f"""
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>SGST</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-{sgst_total:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>"""
        if igst_total > 0:
            tax_lines += f"""
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>IGST</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-{igst_total:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>"""

        static_vars = self._static_vars_block()
        desc_block = f"""<REQUESTDESC>
<REPORTNAME>Vouchers</REPORTNAME>
{static_vars}
</REQUESTDESC>"""

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
<BODY>
<IMPORTDATA>
{desc_block}
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="Purchase" ACTION="Create">
<DATE>{tally_date}</DATE>
<EFFECTIVEDATE>{tally_date}</EFFECTIVEDATE>
<VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
<VOUCHERNUMBER>{self._xml_escape(ref)}</VOUCHERNUMBER>
<REFERENCE>{self._xml_escape(ref)}</REFERENCE>
<PARTYLEDGERNAME>{self._xml_escape(party)}</PARTYLEDGERNAME>
<NARRATION>{self._xml_escape(narration)}</NARRATION>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>{self._xml_escape(party)}</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>{total:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>Purchase Account</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-{taxable_total:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
{tax_lines}
</VOUCHER>
</TALLYMESSAGE>
</REQUESTDATA>
</IMPORTDATA>
</BODY>
</ENVELOPE>"""

    def _build_sales_xml(self, v: dict, company_dates: dict | None = None) -> str:
        """Build Tally Sales Voucher XML."""
        tally_date, orig_date = self._clean_tally_date(v.get("voucher_date"), company_dates)
        ref = v.get("reference_number", "") or v.get("voucher_number", "")
        party = v.get("party_name", "").strip() or "Sundry Debtor"
        narration = v.get("narration", f"Sales Invoice {ref}")
        if orig_date and orig_date != tally_date:
            narration = f"{narration} (Actual Date: {orig_date})"

        total = float(v.get("total") or 0)
        items = v.get("line_items", [])

        taxable_total = 0.0
        cgst_total = float(v.get("total_cgst") or 0)
        sgst_total = float(v.get("total_sgst") or 0)
        igst_total = float(v.get("total_igst") or 0)

        if items:
            for it in items:
                taxable_total += float(it.get("taxable_amount") or (float(it.get("rate", 0)) * float(it.get("quantity", 1))))
                if not cgst_total and not igst_total:
                    cgst_total += float(it.get("cgst", 0))
                    sgst_total += float(it.get("sgst", 0))
                    igst_total += float(it.get("igst", 0))

        if taxable_total <= 0:
            taxable_total = float(v.get("subtotal") or 0)
        if taxable_total <= 0:
            taxable_total = round(total / 1.18, 2)
            if cgst_total <= 0 and igst_total <= 0:
                cgst_total = round((total - taxable_total) / 2, 2)
                sgst_total = round(total - taxable_total - cgst_total, 2)

        tax_lines = ""
        if cgst_total > 0:
            tax_lines += f"""
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>CGST</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>{cgst_total:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>"""
        if sgst_total > 0:
            tax_lines += f"""
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>SGST</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>{sgst_total:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>"""
        if igst_total > 0:
            tax_lines += f"""
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>IGST</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>{igst_total:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>"""

        static_vars = self._static_vars_block()
        desc_block = f"""<REQUESTDESC>
<REPORTNAME>Vouchers</REPORTNAME>
{static_vars}
</REQUESTDESC>"""

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
<BODY>
<IMPORTDATA>
{desc_block}
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="Sales" ACTION="Create">
<DATE>{tally_date}</DATE>
<EFFECTIVEDATE>{tally_date}</EFFECTIVEDATE>
<VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
<VOUCHERNUMBER>{self._xml_escape(ref)}</VOUCHERNUMBER>
<REFERENCE>{self._xml_escape(ref)}</REFERENCE>
<PARTYLEDGERNAME>{self._xml_escape(party)}</PARTYLEDGERNAME>
<NARRATION>{self._xml_escape(narration)}</NARRATION>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>{self._xml_escape(party)}</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-{total:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>Sales Account</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>{taxable_total:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
{tax_lines}
</VOUCHER>
</TALLYMESSAGE>
</REQUESTDATA>
</IMPORTDATA>
</BODY>
</ENVELOPE>"""

    def _build_payment_xml(self, v: dict, company_dates: dict | None = None) -> str:
        """Build Payment voucher XML."""
        tally_date, orig_date = self._clean_tally_date(v.get("voucher_date"), company_dates)
        amount = float(v.get("amount") or v.get("total") or 0)
        party = v.get("party_name", "").strip() or "Sundry Creditor"
        bank = v.get("bank_ledger", "").strip() or "HDFC Bank"
        ref = v.get("reference_number", "") or v.get("voucher_number", "")
        narration = v.get("narration", f"Payment to {party}")
        if orig_date and orig_date != tally_date:
            narration = f"{narration} (Statement Date: {orig_date})"

        static_vars = self._static_vars_block()
        desc_block = f"""<REQUESTDESC>
<REPORTNAME>Vouchers</REPORTNAME>
{static_vars}
</REQUESTDESC>"""

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
<BODY>
<IMPORTDATA>
{desc_block}
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="Payment" ACTION="Create">
<DATE>{tally_date}</DATE>
<EFFECTIVEDATE>{tally_date}</EFFECTIVEDATE>
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
<BANKALLOCATIONS.LIST>
<DATE>{tally_date}</DATE>
<INSTRUMENTDATE>{tally_date}</INSTRUMENTDATE>
<INSTRUMENTNUMBER>{self._xml_escape(ref)}</INSTRUMENTNUMBER>
<TRANSACTIONTYPE>Others</TRANSACTIONTYPE>
<PAYMENTFAVOURING>{self._xml_escape(party)}</PAYMENTFAVOURING>
<AMOUNT>{amount:.2f}</AMOUNT>
</BANKALLOCATIONS.LIST>
</ALLLEDGERENTRIES.LIST>
</VOUCHER>
</TALLYMESSAGE>
</REQUESTDATA>
</IMPORTDATA>
</BODY>
</ENVELOPE>"""

    def _build_receipt_xml(self, v: dict, company_dates: dict | None = None) -> str:
        """Build Receipt voucher XML."""
        tally_date, orig_date = self._clean_tally_date(v.get("voucher_date"), company_dates)
        amount = float(v.get("amount") or v.get("total") or 0)
        party = v.get("party_name", "").strip() or "Sundry Debtor"
        bank = v.get("bank_ledger", "").strip() or "HDFC Bank"
        ref = v.get("reference_number", "") or v.get("voucher_number", "")
        narration = v.get("narration", f"Receipt from {party}")
        if orig_date and orig_date != tally_date:
            narration = f"{narration} (Statement Date: {orig_date})"

        static_vars = self._static_vars_block()
        desc_block = f"""<REQUESTDESC>
<REPORTNAME>Vouchers</REPORTNAME>
{static_vars}
</REQUESTDESC>"""

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
<BODY>
<IMPORTDATA>
{desc_block}
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="Receipt" ACTION="Create">
<DATE>{tally_date}</DATE>
<EFFECTIVEDATE>{tally_date}</EFFECTIVEDATE>
<VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
<VOUCHERNUMBER>{self._xml_escape(ref)}</VOUCHERNUMBER>
<NARRATION>{self._xml_escape(narration)}</NARRATION>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>{self._xml_escape(bank)}</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-{amount:.2f}</AMOUNT>
<BANKALLOCATIONS.LIST>
<DATE>{tally_date}</DATE>
<INSTRUMENTDATE>{tally_date}</INSTRUMENTDATE>
<INSTRUMENTNUMBER>{self._xml_escape(ref)}</INSTRUMENTNUMBER>
<TRANSACTIONTYPE>Others</TRANSACTIONTYPE>
<PAYMENTFAVOURING>{self._xml_escape(party)}</PAYMENTFAVOURING>
<AMOUNT>-{amount:.2f}</AMOUNT>
</BANKALLOCATIONS.LIST>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>{self._xml_escape(party)}</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>{amount:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
</VOUCHER>
</TALLYMESSAGE>
</REQUESTDATA>
</IMPORTDATA>
</BODY>
</ENVELOPE>"""

    def _build_ledger_master_xml(self, ledger: dict) -> str:
        """Create a new ledger (party) in Tally."""
        static_vars = self._static_vars_block()
        desc_block = f"""<REQUESTDESC>
<REPORTNAME>All Masters</REPORTNAME>
{static_vars}
</REQUESTDESC>"""
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
<BODY>
<IMPORTDATA>
{desc_block}
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<LEDGER NAME="{self._xml_escape(ledger['name'])}" ACTION="Create">
<NAME>{self._xml_escape(ledger['name'])}</NAME>
<PARENT>{self._xml_escape(ledger.get('group', 'Sundry Debtors'))}</PARENT>
<ISBILLWISEON>Yes</ISBILLWISEON>
<PARTYGSTIN>{self._xml_escape(ledger.get('gstin', ''))}</PARTYGSTIN>
<PINCODE>{self._xml_escape(ledger.get('pincode', ''))}</PINCODE>
</LEDGER>
</TALLYMESSAGE>
</REQUESTDATA>
</IMPORTDATA>
</BODY>
</ENVELOPE>"""

    def _build_stock_journal_xml(self, entry: dict) -> str:
        """Build Stock Journal for production consumption."""
        tally_date, _ = self._clean_tally_date(entry.get("date"))
        narration = entry.get("narration", "Production voucher")

        source_items = ""
        for it in entry.get("source_items", []):
            source_items += f"""
<ALLINVENTORYENTRIES.LIST>
<STOCKITEMNAME>{self._xml_escape(it['item_name'])}</STOCKITEMNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<RATE>{it.get('rate', 0):.4f}/KG</RATE>
<AMOUNT>{it.get('amount', 0):.2f}</AMOUNT>
<ACTUALQTY>{it.get('quantity', 0):.3f} KG</ACTUALQTY>
</ALLINVENTORYENTRIES.LIST>"""

        dest_item = ""
        produced = entry.get("produced_item")
        if produced:
            dest_item = f"""
<ALLINVENTORYENTRIES.LIST>
<STOCKITEMNAME>{self._xml_escape(produced['item_name'])}</STOCKITEMNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<RATE>{produced.get('rate', 0):.4f}/KG</RATE>
<AMOUNT>-{produced.get('amount', 0):.2f}</AMOUNT>
<ACTUALQTY>{produced.get('quantity', 0):.3f} KG</ACTUALQTY>
</ALLINVENTORYENTRIES.LIST>"""

        static_vars = self._static_vars_block()
        desc_block = f"""<REQUESTDESC>
<REPORTNAME>Vouchers</REPORTNAME>
{static_vars}
</REQUESTDESC>"""

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
<BODY>
<IMPORTDATA>
{desc_block}
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="Stock Journal" ACTION="Create">
<DATE>{tally_date}</DATE>
<EFFECTIVEDATE>{tally_date}</EFFECTIVEDATE>
<VOUCHERTYPENAME>Stock Journal</VOUCHERTYPENAME>
<NARRATION>{self._xml_escape(narration)}</NARRATION>
{source_items}
{dest_item}
</VOUCHER>
</TALLYMESSAGE>
</REQUESTDATA>
</IMPORTDATA>
</BODY>
</ENVELOPE>"""

    # ── HTTP Transport ─────────────────────────────────────────────────────────

    async def _post_xml(self, xml: str) -> dict:
        """POST XML to TallyPrime HTTP server and parse response with clean error messaging."""
        headers = {
            "Content-Type": "text/xml; charset=utf-8",
            "Connection": "close",
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    self.url,
                    content=xml.encode("utf-8"),
                    headers=headers,
                )
                response.raise_for_status()
                response_text = response.text

                # Parse Tally response — check for errors
                if "LINEERROR" in response_text:
                    m = re.findall(r"<LINEERROR>(.*?)</LINEERROR>", response_text, re.S)
                    if m:
                        clean_errors = [html.unescape(e.strip()) for e in m if e.strip()]
                        error_msg = "; ".join(clean_errors)
                        if "Could not find Company" in error_msg or "SVCurrentCompany" in error_msg:
                            error_msg = "No Company is open in TallyPrime! Please open your company in TallyPrime."
                        raise TallyError(error_msg)
                    raise TallyError(f"Tally rejected voucher: {response_text[:300]}")

                if "<CREATED>0</CREATED>" in response_text and "<ALTERED>0</ALTERED>" in response_text:
                    raise TallyError("Tally did not import voucher. Please ensure a Company is open in TallyPrime.")

                return {"success": True, "tally_response": response_text[:200]}
        except (httpx.TimeoutException, httpx.ReadTimeout):
            raise TallyError(f"Tally server did not respond within {self.timeout}s. Check if TallyPrime is on 'Gateway of Tally' with no pop-up dialog open.")
        except httpx.ConnectError:
            raise TallyError(f"Cannot connect to Tally server at {self.url}. Ensure TallyPrime is running with HTTP Server enabled on Port 9000.")

    # ── Helpers ───────────────────────────────────────────────────────────────

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
