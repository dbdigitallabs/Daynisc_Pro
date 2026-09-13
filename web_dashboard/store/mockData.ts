// src/store/mockData.ts

export const DEMO_EXTRACTIONS = [
  {
    id: "doc-demo-01",
    status: "extracted",
    document_type: "purchase",
    language: "en",
    confidence_score: 0.96,
    is_duplicate: false,
    created_at: new Date(Date.now() - 1800000).toISOString(),
    extracted_data: {
      document_type: "purchase",
      invoice_number: "RIL/2026/8941",
      party_name: "Reliance Polymers Limited",
      party_gstin: "24AAACR1234F1Z1",
      invoice_date: "2026-09-12",
      total_amount: 147500,
      subtotal: 125000,
      total_cgst: 11250,
      total_sgst: 11250,
      total_igst: 0,
      payment_terms: "30 Days Net",
      amount_in_words: "One Lakh Forty Seven Thousand Five Hundred Only",
      line_items: [
        {
          item_name: "PP Granules Grade H110MA",
          quantity: 2500,
          unit: "KGS",
          rate: 50,
          gst_rate: 18,
          total: 147500,
          hsn_code: "39021000",
          description_full: "Prime Virgin Polymer Pellets 25kg Bags",
        },
      ],
    },
  },
  {
    id: "doc-demo-02",
    status: "extracted",
    document_type: "transport_lr",
    language: "en",
    confidence_score: 0.92,
    is_duplicate: false,
    created_at: new Date(Date.now() - 5400000).toISOString(),
    extracted_data: {
      document_type: "transport_lr",
      lr_number: "VRL-GJ-90214",
      transporter_name: "VRL Logistics Ltd",
      vehicle_number: "GJ-06-AX-4821",
      party_name: "Gujarat Masterbatches Pvt Ltd",
      total_amount: 18500,
      invoice_date: "2026-09-11",
      line_items: [
        {
          item_name: "Freight Charges - Ahmedabad to Vadodara",
          quantity: 1,
          unit: "TRIP",
          rate: 18500,
          gst_rate: 5,
          total: 19425,
          hsn_code: "996511",
        },
      ],
    },
  },
  {
    id: "doc-demo-03",
    status: "verified",
    document_type: "purchase",
    language: "en",
    confidence_score: 0.98,
    is_duplicate: false,
    created_at: new Date(Date.now() - 14400000).toISOString(),
    extracted_data: {
      document_type: "purchase",
      invoice_number: "SUP-2026-441",
      party_name: "Supreme Petrochem Ltd",
      party_gstin: "27AAACS4321A1Z8",
      invoice_date: "2026-09-10",
      total_amount: 88500,
      subtotal: 75000,
      total_cgst: 0,
      total_sgst: 0,
      total_igst: 13500,
      line_items: [
        {
          item_name: "Polystyrene GPPS Grade 500",
          quantity: 1000,
          unit: "KGS",
          rate: 75,
          gst_rate: 18,
          total: 88500,
          hsn_code: "39031100",
        },
      ],
    },
  },
];

export const DEMO_VOUCHERS = [
  {
    id: "vch-001",
    voucher_number: "PUR/2026/089",
    voucher_type: "Purchase",
    date: "2026-09-12",
    party_name: "Reliance Polymers Limited",
    total: 147500,
    tally_synced: false,
    line_items: [
      { item_name: "PP Granules Grade H110MA", quantity: 2500, rate: 50, amount: 125000 },
    ],
  },
  {
    id: "vch-002",
    voucher_number: "PUR/2026/090",
    voucher_type: "Purchase",
    date: "2026-09-11",
    party_name: "Supreme Petrochem Ltd",
    total: 88500,
    tally_synced: false,
    line_items: [
      { item_name: "Polystyrene GPPS Grade 500", quantity: 1000, rate: 75, amount: 75000 },
    ],
  },
];

export const DEMO_STATEMENTS = [
  {
    id: "stmt-hdfc-01",
    bank_account: "HDFC Bank Current A/c - 50200012345",
    statement_period: "01-Sep-2026 to 12-Sep-2026",
    total_transactions: 14,
    opening_balance: 750000,
    closing_balance: 1125000,
  },
];

export const DEMO_RECON = {
  statement_id: "stmt-hdfc-01",
  reconciliation: {
    stats: {
      total_transactions: 8,
      exact_match_count: 3,
      suggested_match_count: 2,
      missing_count: 3,
      matched_percentage: 62.5,
    },
    exact_matches: [
      {
        id: "tx-ex-1",
        date: "2026-09-11",
        narration: "NEFT/RELIANCE POLYMERS/009124",
        reference_no: "NEFT009124",
        withdrawal: 147500,
        deposit: 0,
        balance: 924500,
        matched_voucher: {
          voucher_number: "PUR/2026/089",
          party_name: "Reliance Polymers Limited",
          total: 147500,
        },
      },
    ],
    suggested_matches: [
      {
        id: "tx-sug-1",
        date: "2026-09-10",
        narration: "RTGS/SUPREME PETRO/44812",
        reference_no: "RTGS44812",
        withdrawal: 88500,
        deposit: 0,
        balance: 1072000,
        confidence: 94,
        suggested_party: "Supreme Petrochem Ltd",
        suggested_voucher: {
          voucher_number: "PUR/2026/090",
          party_name: "Supreme Petrochem Ltd",
          total: 88500,
        },
      },
    ],
    missing_in_books: [
      {
        id: "tx-mis-1",
        date: "2026-09-12",
        narration: "UPI/9859855998/CUSTOMER_ADV",
        reference_no: "UPI884210",
        withdrawal: 0,
        deposit: 45000,
        balance: 1125000,
        suggested_party: "Customer Advance",
        suggested_ledger: "Sundry Debtors",
        suggested_voucher_type: "receipt",
      },
      {
        id: "tx-mis-2",
        date: "2026-09-12",
        narration: "CHG/BANK CHARGES/MONTHLY",
        reference_no: "CHG112",
        withdrawal: 1180,
        deposit: 0,
        balance: 1123820,
        suggested_party: "Bank Charges",
        suggested_ledger: "Indirect Expenses",
        suggested_voucher_type: "payment",
      },
    ],
    unpresented_vouchers: [],
  },
  brs: {
    bank_balance: 1125000,
    book_balance: 1081180,
    difference: 43820,
  },
};

export function getMockDataForUrl(url: string, params?: any): any {
  const cleanUrl = url.split("?")[0].replace(/^\/api\/v1/, "");

  if (cleanUrl.startsWith("/documents")) {
    const status = params?.status || "extracted";
    const filtered = DEMO_EXTRACTIONS.filter((d) => d.status === status);
    return {
      items: filtered.length > 0 ? filtered : DEMO_EXTRACTIONS,
      total: DEMO_EXTRACTIONS.length,
    };
  }

  if (cleanUrl.startsWith("/accounting/vouchers")) {
    return { items: DEMO_VOUCHERS, total: DEMO_VOUCHERS.length };
  }

  if (cleanUrl === "/bank/statements") {
    return { items: DEMO_STATEMENTS, total: DEMO_STATEMENTS.length };
  }

  if (cleanUrl.startsWith("/bank/reconcile")) {
    return DEMO_RECON;
  }

  if (cleanUrl.includes("/connection/test/tally")) {
    return {
      connected: false,
      tally_online: false,
      message: "TallyPrime Offline (Local Port 9000)",
    };
  }

  if (cleanUrl === "/health") {
    return { status: "ok", mode: "demo", lan_url: "http://localhost:8000/api/v1" };
  }

  return { items: [], message: "Demo mode response" };
}
