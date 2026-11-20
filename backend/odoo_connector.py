"""
Odoo ERP XML-RPC Connector
Connects Daynisc Pro with Odoo ERP (Community & Enterprise, v14 - v18+)
Supports:
- Connection verification & DB info query
- Partner (Vendor / Customer) search & auto-creation with GSTIN
- Purchase Bill (in_invoice) creation & auto-posting
- Sales Invoice (out_invoice) creation & auto-posting
- Payments & Receipts (account.payment) with automatic Journal selection
- Automatic default Expense/Income account detection
- Comprehensive SSL tolerance for local self-signed setups and cloud Odoo
"""
from __future__ import annotations
import socket
import logging
import ssl
import xmlrpc.client
from datetime import date, datetime
from typing import Any
from urllib.parse import urlparse

logger = logging.getLogger("odoo_connector")


class TimeoutTransport(xmlrpc.client.Transport):
    def __init__(self, timeout: float = 12.0, use_datetime: bool = False):
        super().__init__(use_datetime=use_datetime)
        self.timeout = timeout

    def make_connection(self, host):
        conn = super().make_connection(host)
        conn.timeout = self.timeout
        return conn


class SafeTimeoutTransport(xmlrpc.client.SafeTransport):
    def __init__(self, timeout: float = 12.0, use_datetime: bool = False, context: ssl.SSLContext | None = None):
        if context is None:
            # Tolerant SSL context to support LAN/local self-signed certificates without blocking
            context = ssl.create_default_context()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
        super().__init__(use_datetime=use_datetime, context=context)
        self.timeout = timeout

    def make_connection(self, host):
        conn = super().make_connection(host)
        conn.timeout = self.timeout
        return conn


class OdooError(Exception):
    pass


class OdooConnector:
    """
    Connects to Odoo XML-RPC endpoints:
    - /xmlrpc/2/common (authentication, server version)
    - /xmlrpc/2/object (execute_kw for models)
    """

    def __init__(
        self,
        url: str = "http://localhost:8069",
        db: str = "",
        username: str = "",
        password: str = "",
        timeout: float = 10.0
    ):
        clean_url = (url or "http://localhost:8069").rstrip("/")
        if not clean_url.startswith("http://") and not clean_url.startswith("https://"):
            clean_url = "http://" + clean_url
        self.url = clean_url
        self.db = db.strip()
        self.username = username.strip()
        self.password = password.strip()
        self.timeout = timeout
        self.uid: int | None = None

    def _get_transport(self):
        parsed = urlparse(self.url)
        if parsed.scheme == "https":
            return SafeTimeoutTransport(timeout=self.timeout)
        return TimeoutTransport(timeout=self.timeout)

    def _get_common_proxy(self):
        transport = self._get_transport()
        return xmlrpc.client.ServerProxy(f"{self.url}/xmlrpc/2/common", transport=transport, allow_none=True)

    def _get_object_proxy(self):
        transport = self._get_transport()
        return xmlrpc.client.ServerProxy(f"{self.url}/xmlrpc/2/object", transport=transport, allow_none=True)

    def authenticate(self) -> int:
        """Authenticate with Odoo and return UID."""
        if self.uid:
            return self.uid

        if not self.db or not self.username or not self.password:
            raise OdooError("Odoo Database, Username/Email, and Password/API Key are required.")

        try:
            common = self._get_common_proxy()
            uid = common.authenticate(self.db, self.username, self.password, {})
            if not uid:
                raise OdooError("Authentication failed. Please verify Odoo Database, Username, and Password/API Key.")
            self.uid = int(uid)
            return self.uid
        except (socket.timeout, TimeoutError):
            raise OdooError(f"Connection to Odoo at {self.url} timed out.")
        except xmlrpc.client.Fault as fault:
            raise OdooError(f"Odoo XML-RPC Error: {fault.faultString}")
        except Exception as e:
            raise OdooError(f"Cannot connect to Odoo server: {str(e)}")

    def test_connection(self) -> dict[str, Any]:
        """Test server reachability and credentials."""
        try:
            common = self._get_common_proxy()
            version_info = common.version()
            server_version = version_info.get("server_version", "Unknown")

            if self.db and self.username and self.password:
                uid = self.authenticate()
                company_name = self.get_company_name()
                return {
                    "connected": True,
                    "server_version": server_version,
                    "authenticated": True,
                    "uid": uid,
                    "company_name": company_name,
                    "message": f"Successfully connected to Odoo v{server_version} ({company_name})"
                }
            else:
                return {
                    "connected": True,
                    "server_version": server_version,
                    "authenticated": False,
                    "message": f"Odoo server reached (v{server_version}), credentials needed for full sync"
                }
        except Exception as e:
            return {
                "connected": False,
                "authenticated": False,
                "error": str(e),
                "message": f"Failed to connect to Odoo: {str(e)}"
            }

    def execute(self, model: str, method: str, *args, **kwargs) -> Any:
        """
        Executes an operation via /xmlrpc/2/object.
        Handles both positional kwargs dict and keyword arguments transparently.
        """
        uid = self.authenticate()
        try:
            models = self._get_object_proxy()

            call_args = list(args)
            call_kwargs = dict(kwargs)

            # If caller passed a dict as the last positional argument, treat it as kwargs struct
            if call_args and isinstance(call_args[-1], dict) and not call_kwargs:
                call_kwargs = call_args.pop()

            return models.execute_kw(self.db, uid, self.password, model, method, call_args, call_kwargs)
        except xmlrpc.client.Fault as fault:
            logger.error(f"Odoo Fault [{model}.{method}]: {fault.faultString}")
            raise OdooError(f"Odoo Error [{model}.{method}]: {fault.faultString}")
        except Exception as e:
            logger.error(f"Odoo Error [{model}.{method}]: {str(e)}")
            raise OdooError(f"Odoo operation failed: {str(e)}")

    def get_company_name(self) -> str:
        """Get the current user's default company name."""
        try:
            res = self.execute("res.company", "search_read", [], {"fields": ["name"], "limit": 1})
            if res and len(res) > 0:
                return res[0].get("name", "Odoo Company")
        except Exception:
            pass
        return "Odoo Company"

    def get_default_journal(self, journal_type: str = "bank") -> int | None:
        """Find default journal for bank/cash payments or purchase/sale invoices."""
        try:
            types = [journal_type]
            if journal_type in ("bank", "cash"):
                types = [journal_type, "bank", "cash"]
            journals = self.execute(
                "account.journal",
                "search_read",
                [[("type", "in", types)]],
                {"fields": ["id", "name", "type"], "limit": 1}
            )
            if journals and len(journals) > 0:
                jid = journals[0]["id"]
                return int(jid[0] if isinstance(jid, (list, tuple)) else jid)
        except Exception:
            pass
        return None

    def get_default_expense_account(self) -> int | None:
        """Find default expense account for vendor bill lines."""
        try:
            # 1. Standard modern Odoo (v15 - v18+) account_type
            accounts = self.execute(
                "account.account",
                "search_read",
                [[("account_type", "in", ["expense", "expense_direct", "expense_depreciation"])]],
                {"fields": ["id", "name", "code"], "limit": 1}
            )
            if accounts and len(accounts) > 0:
                aid = accounts[0]["id"]
                return int(aid[0] if isinstance(aid, (list, tuple)) else aid)

            # 2. Legacy Odoo (v14) internal_group
            accounts = self.execute(
                "account.account",
                "search_read",
                [[("internal_group", "=", "expense")]],
                {"fields": ["id", "name", "code"], "limit": 1}
            )
            if accounts and len(accounts) > 0:
                aid = accounts[0]["id"]
                return int(aid[0] if isinstance(aid, (list, tuple)) else aid)
        except Exception:
            pass
        return None

    def get_default_income_account(self) -> int | None:
        """Find default income account for customer invoice lines."""
        try:
            # 1. Standard modern Odoo (v15 - v18+) account_type
            accounts = self.execute(
                "account.account",
                "search_read",
                [[("account_type", "in", ["income", "income_other"])]],
                {"fields": ["id", "name", "code"], "limit": 1}
            )
            if accounts and len(accounts) > 0:
                aid = accounts[0]["id"]
                return int(aid[0] if isinstance(aid, (list, tuple)) else aid)

            # 2. Legacy Odoo (v14) internal_group
            accounts = self.execute(
                "account.account",
                "search_read",
                [[("internal_group", "=", "income")]],
                {"fields": ["id", "name", "code"], "limit": 1}
            )
            if accounts and len(accounts) > 0:
                aid = accounts[0]["id"]
                return int(aid[0] if isinstance(aid, (list, tuple)) else aid)
        except Exception:
            pass
        return None

    def get_country_id(self, code: str = "IN") -> int | None:
        """Get country ID by 2-letter ISO code."""
        try:
            countries = self.execute(
                "res.country",
                "search_read",
                [[("code", "=", code.upper())]],
                {"fields": ["id"], "limit": 1}
            )
            if countries and len(countries) > 0:
                cid = countries[0]["id"]
                return int(cid[0] if isinstance(cid, (list, tuple)) else cid)
        except Exception:
            pass
        return None

    def get_or_create_partner(
        self,
        name: str,
        gstin: str = "",
        phone: str = "",
        email: str = "",
        is_vendor: bool = False
    ) -> int:
        """
        Search for existing partner by GSTIN (vat) or Name.
        If not found, create a new res.partner.
        """
        clean_name = (name or "").strip()
        clean_gstin = (gstin or "").strip()

        # 1. Search by GSTIN / vat if provided
        if clean_gstin:
            try:
                partners = self.execute(
                    "res.partner",
                    "search_read",
                    [[("vat", "=", clean_gstin)]],
                    {"fields": ["id", "name", "vat"], "limit": 1}
                )
                if partners and len(partners) > 0:
                    pid = partners[0]["id"]
                    return int(pid[0] if isinstance(pid, (list, tuple)) else pid)
            except Exception as e:
                logger.warning(f"Odoo partner search by vat failed: {e}")

        # 2. Search by Name
        if clean_name:
            try:
                partners = self.execute(
                    "res.partner",
                    "search_read",
                    [[("name", "=ilike", clean_name)]],
                    {"fields": ["id", "name"], "limit": 1}
                )
                if partners and len(partners) > 0:
                    pid = partners[0]["id"]
                    return int(pid[0] if isinstance(pid, (list, tuple)) else pid)
            except Exception as e:
                logger.warning(f"Odoo partner search by name failed: {e}")

        # 3. Create Partner
        partner_vals = {
            "name": clean_name or (f"Vendor {clean_gstin}" if is_vendor else f"Customer {clean_gstin}"),
            "is_company": True,
        }
        if clean_gstin:
            partner_vals["vat"] = clean_gstin
            if len(clean_gstin) == 15:
                cid = self.get_country_id("IN")
                if cid:
                    partner_vals["country_id"] = cid
        if phone:
            partner_vals["phone"] = phone
        if email:
            partner_vals["email"] = email

        try:
            partner_id = self.execute("res.partner", "create", [partner_vals])
            if isinstance(partner_id, (list, tuple)):
                partner_id = partner_id[0]
            if isinstance(partner_id, dict):
                partner_id = partner_id.get("id")
            logger.info(f"Created new Odoo partner: {clean_name} (ID: {partner_id})")
            return int(partner_id)
        except Exception as e:
            # Fallback with minimal required fields
            logger.warning(f"Odoo create partner with full fields failed ({e}), retrying with minimal fields")
            minimal_vals = {"name": clean_name or "Valued Partner", "is_company": True}
            partner_id = self.execute("res.partner", "create", [minimal_vals])
            if isinstance(partner_id, (list, tuple)):
                partner_id = partner_id[0]
            return int(partner_id)

    def _format_date(self, d: Any) -> str:
        """Ensure date is formatted as YYYY-MM-DD for Odoo."""
        if not d:
            return date.today().strftime("%Y-%m-%d")
        if isinstance(d, (date, datetime)):
            return d.strftime("%Y-%m-%d")
        d_str = str(d).strip().replace("/", "-")
        try:
            # Handle YYYYMMDD
            if len(d_str) == 8 and d_str.isdigit():
                return f"{d_str[:4]}-{d_str[4:6]}-{d_str[6:]}"
            # Handle standard date string
            parsed = datetime.fromisoformat(d_str[:10])
            return parsed.strftime("%Y-%m-%d")
        except Exception:
            return date.today().strftime("%Y-%m-%d")

    def push_purchase_voucher(self, voucher: dict) -> dict[str, Any]:
        """
        Creates a Vendor Bill in Odoo:
        - Model: account.move
        - move_type: 'in_invoice'
        """
        party_name = voucher.get("party_name") or "Sundry Creditor"
        party_gstin = voucher.get("party_gstin") or ""
        partner_id = self.get_or_create_partner(party_name, party_gstin, is_vendor=True)

        inv_date = self._format_date(voucher.get("voucher_date"))
        ref_no = voucher.get("reference_number") or voucher.get("voucher_number") or ""
        line_items = voucher.get("line_items") or []

        # Find default expense account to prevent "Account is required on invoice line" error
        default_account_id = self.get_default_expense_account()

        invoice_line_ids = []
        if line_items:
            for item in line_items:
                item_name = item.get("name") or item.get("item_name") or item.get("description") or "Item / Service"
                qty = float(item.get("qty") or item.get("quantity") or 1.0)
                rate = float(item.get("rate") or item.get("price_unit") or item.get("amount") or 0.0)
                if rate == 0.0 and voucher.get("total"):
                    rate = float(voucher.get("total")) / max(qty, 1.0)

                line_dict: dict[str, Any] = {
                    "name": item_name,
                    "quantity": qty,
                    "price_unit": rate,
                }
                if default_account_id:
                    line_dict["account_id"] = default_account_id

                invoice_line_ids.append((0, 0, line_dict))
        else:
            total_amt = float(voucher.get("subtotal") or voucher.get("total") or 0.0)
            line_dict = {
                "name": f"Purchase as per Bill #{ref_no}",
                "quantity": 1.0,
                "price_unit": total_amt,
            }
            if default_account_id:
                line_dict["account_id"] = default_account_id
            invoice_line_ids.append((0, 0, line_dict))

        # Look up purchase journal if available
        purchase_journal_id = self.get_default_journal("purchase")

        move_vals: dict[str, Any] = {
            "move_type": "in_invoice",
            "partner_id": partner_id,
            "invoice_date": inv_date,
            "date": inv_date,
            "ref": ref_no,
            "invoice_line_ids": invoice_line_ids,
            "narration": voucher.get("narration") or f"Daynisc Pro Auto-Sync #{ref_no}"
        }
        if purchase_journal_id:
            move_vals["journal_id"] = purchase_journal_id

        try:
            move_id = self.execute("account.move", "create", [move_vals])
        except Exception as e:
            # If narration or journal_id caused validation failure, retry with minimal core fields
            if any(k in str(e).lower() for k in ("narration", "journal", "date")):
                move_vals.pop("narration", None)
                move_vals.pop("journal_id", None)
                move_id = self.execute("account.move", "create", [move_vals])
            else:
                raise

        if isinstance(move_id, (list, tuple)):
            move_id = move_id[0]
        if isinstance(move_id, dict):
            move_id = move_id.get("id")
        move_id = int(move_id)

        # Attempt to confirm / post bill
        move_name = f"BILL/{move_id}"
        is_posted = False
        try:
            self.execute("account.move", "action_post", [[move_id]])
            is_posted = True
        except Exception as e:
            logger.warning(f"Bill created (ID {move_id}) but action_post failed (kept as Draft): {e}")

        # Read actual document reference from Odoo
        try:
            read_info = self.execute("account.move", "read", [[move_id]], {"fields": ["name", "state"]})
            if read_info and len(read_info) > 0:
                raw_name = read_info[0].get("name")
                state = read_info[0].get("state")
                if raw_name and raw_name != "/":
                    move_name = raw_name
                elif state == "draft":
                    move_name = f"BILL/{move_id} (Draft)"
        except Exception:
            pass

        return {
            "success": True,
            "odoo_id": move_id,
            "odoo_ref": move_name,
            "type": "in_invoice",
            "posted": is_posted,
            "message": f"Vendor Bill created in Odoo: {move_name}"
        }

    def push_sales_voucher(self, voucher: dict) -> dict[str, Any]:
        """
        Creates a Customer Invoice in Odoo:
        - Model: account.move
        - move_type: 'out_invoice'
        """
        party_name = voucher.get("party_name") or "Sundry Debtor"
        party_gstin = voucher.get("party_gstin") or ""
        partner_id = self.get_or_create_partner(party_name, party_gstin, is_vendor=False)

        inv_date = self._format_date(voucher.get("voucher_date"))
        ref_no = voucher.get("voucher_number") or voucher.get("reference_number") or ""
        line_items = voucher.get("line_items") or []

        # Find default income account to prevent "Account is required on invoice line" error
        default_account_id = self.get_default_income_account()

        invoice_line_ids = []
        if line_items:
            for item in line_items:
                item_name = item.get("name") or item.get("item_name") or item.get("description") or "Item / Service"
                qty = float(item.get("qty") or item.get("quantity") or 1.0)
                rate = float(item.get("rate") or item.get("price_unit") or item.get("amount") or 0.0)
                if rate == 0.0 and voucher.get("total"):
                    rate = float(voucher.get("total")) / max(qty, 1.0)

                line_dict: dict[str, Any] = {
                    "name": item_name,
                    "quantity": qty,
                    "price_unit": rate,
                }
                if default_account_id:
                    line_dict["account_id"] = default_account_id

                invoice_line_ids.append((0, 0, line_dict))
        else:
            total_amt = float(voucher.get("subtotal") or voucher.get("total") or 0.0)
            line_dict = {
                "name": f"Sales as per Invoice #{ref_no}",
                "quantity": 1.0,
                "price_unit": total_amt,
            }
            if default_account_id:
                line_dict["account_id"] = default_account_id
            invoice_line_ids.append((0, 0, line_dict))

        # Look up sales journal if available
        sales_journal_id = self.get_default_journal("sale")

        move_vals: dict[str, Any] = {
            "move_type": "out_invoice",
            "partner_id": partner_id,
            "invoice_date": inv_date,
            "date": inv_date,
            "ref": ref_no,
            "invoice_line_ids": invoice_line_ids,
            "narration": voucher.get("narration") or f"Daynisc Pro Auto-Sync #{ref_no}"
        }
        if sales_journal_id:
            move_vals["journal_id"] = sales_journal_id

        try:
            move_id = self.execute("account.move", "create", [move_vals])
        except Exception as e:
            if any(k in str(e).lower() for k in ("narration", "journal", "date")):
                move_vals.pop("narration", None)
                move_vals.pop("journal_id", None)
                move_id = self.execute("account.move", "create", [move_vals])
            else:
                raise

        if isinstance(move_id, (list, tuple)):
            move_id = move_id[0]
        if isinstance(move_id, dict):
            move_id = move_id.get("id")
        move_id = int(move_id)

        # Attempt to post invoice
        move_name = f"INV/{move_id}"
        is_posted = False
        try:
            self.execute("account.move", "action_post", [[move_id]])
            is_posted = True
        except Exception as e:
            logger.warning(f"Customer invoice created (ID {move_id}) but action_post failed (kept as Draft): {e}")

        # Read actual document reference from Odoo
        try:
            read_info = self.execute("account.move", "read", [[move_id]], {"fields": ["name", "state"]})
            if read_info and len(read_info) > 0:
                raw_name = read_info[0].get("name")
                state = read_info[0].get("state")
                if raw_name and raw_name != "/":
                    move_name = raw_name
                elif state == "draft":
                    move_name = f"INV/{move_id} (Draft)"
        except Exception:
            pass

        return {
            "success": True,
            "odoo_id": move_id,
            "odoo_ref": move_name,
            "type": "out_invoice",
            "posted": is_posted,
            "message": f"Customer Invoice created in Odoo: {move_name}"
        }

    def push_payment_voucher(self, voucher: dict) -> dict[str, Any]:
        """Creates an Outbound Payment (Payment to Vendor) in Odoo."""
        party_name = voucher.get("party_name") or "Vendor"
        partner_id = self.get_or_create_partner(party_name, voucher.get("party_gstin", ""), is_vendor=True)
        pay_date = self._format_date(voucher.get("voucher_date"))
        amount = float(voucher.get("total") or 0.0)

        journal_id = self.get_default_journal("bank")

        pay_vals: dict[str, Any] = {
            "payment_type": "outbound",
            "partner_type": "supplier",
            "partner_id": partner_id,
            "amount": amount,
            "date": pay_date,
            "ref": voucher.get("voucher_number") or voucher.get("narration") or "Daynisc Payment"
        }
        if journal_id:
            pay_vals["journal_id"] = journal_id

        payment_id = self.execute("account.payment", "create", [pay_vals])
        if isinstance(payment_id, (list, tuple)):
            payment_id = payment_id[0]
        if isinstance(payment_id, dict):
            payment_id = payment_id.get("id")
        payment_id = int(payment_id)

        try:
            self.execute("account.payment", "action_post", [[payment_id]])
        except Exception as e:
            logger.warning(f"Payment created (ID {payment_id}) but post failed: {e}")

        pay_name = f"PAY/{payment_id}"
        try:
            read_info = self.execute("account.payment", "read", [[payment_id]], {"fields": ["name"]})
            if read_info and len(read_info) > 0:
                raw_name = read_info[0].get("name")
                if raw_name and raw_name != "/":
                    pay_name = raw_name
        except Exception:
            pass

        return {
            "success": True,
            "odoo_id": payment_id,
            "odoo_ref": pay_name,
            "type": "payment",
            "message": f"Payment {pay_name} recorded in Odoo"
        }

    def push_receipt_voucher(self, voucher: dict) -> dict[str, Any]:
        """Creates an Inbound Receipt (Receipt from Customer) in Odoo."""
        party_name = voucher.get("party_name") or "Customer"
        partner_id = self.get_or_create_partner(party_name, voucher.get("party_gstin", ""), is_vendor=False)
        pay_date = self._format_date(voucher.get("voucher_date"))
        amount = float(voucher.get("total") or 0.0)

        journal_id = self.get_default_journal("bank")

        pay_vals: dict[str, Any] = {
            "payment_type": "inbound",
            "partner_type": "customer",
            "partner_id": partner_id,
            "amount": amount,
            "date": pay_date,
            "ref": voucher.get("voucher_number") or voucher.get("narration") or "Daynisc Receipt"
        }
        if journal_id:
            pay_vals["journal_id"] = journal_id

        payment_id = self.execute("account.payment", "create", [pay_vals])
        if isinstance(payment_id, (list, tuple)):
            payment_id = payment_id[0]
        if isinstance(payment_id, dict):
            payment_id = payment_id.get("id")
        payment_id = int(payment_id)

        try:
            self.execute("account.payment", "action_post", [[payment_id]])
        except Exception as e:
            logger.warning(f"Receipt created (ID {payment_id}) but post failed: {e}")

        pay_name = f"REC/{payment_id}"
        try:
            read_info = self.execute("account.payment", "read", [[payment_id]], {"fields": ["name"]})
            if read_info and len(read_info) > 0:
                raw_name = read_info[0].get("name")
                if raw_name and raw_name != "/":
                    pay_name = raw_name
        except Exception:
            pass

        return {
            "success": True,
            "odoo_id": payment_id,
            "odoo_ref": pay_name,
            "type": "receipt",
            "message": f"Receipt {pay_name} recorded in Odoo"
        }

    def sync_voucher(self, voucher: dict, voucher_type: str | None = None) -> dict[str, Any]:
        """Unified sync dispatcher based on voucher_type."""
        vtype = (voucher_type or voucher.get("voucher_type") or "purchase").lower()

        if vtype == "purchase":
            return self.push_purchase_voucher(voucher)
        elif vtype == "sales":
            return self.push_sales_voucher(voucher)
        elif vtype == "payment":
            return self.push_payment_voucher(voucher)
        elif vtype == "receipt":
            return self.push_receipt_voucher(voucher)
        else:
            return self.push_purchase_voucher(voucher)
