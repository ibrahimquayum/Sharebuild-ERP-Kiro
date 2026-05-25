# Universal Print, Phase, And Report Document Pass

**Date:** May 26, 2026  
**Branch:** `feat/erp-v1`

## Current Visual / Report / Export Issues

- Complete Project Report print output still looked like a dashboard compressed onto A4.
- Cover page spacing was too loose and used web-style blocks instead of document framing.
- Print route still depended on screen-oriented report cards and rounded dashboard surfaces.
- Phase page overemphasized service charge as a separate metric instead of part of the phase-cost footing.
- Workbook quality was strong but still needed clearer sheet naming, filters, and totals rows.
- Business documents were present, but the shared print foundation still needed a more universal document language.

## Phase Page UX Issue

The previous side-by-side mental model was better for real project teams:

- left side: income / collections
- right side: expenses / project cost
- bottom line: total collection vs total phase cost vs phase balance

The newer fragmented layout made the page less readable because service charge became a major focus instead of a footer line inside cost calculation.

## Service Charge Issue

Service charge must follow this business formula:

```text
Actual Construction Cost
= direct expenses
+ supplier bill items
+ subcontractor bills
+ adjustments

Company Service Charge / Supervision Fee
= Actual Construction Cost x phase service charge %

Total Phase Cost
= Actual Construction Cost + Company Service Charge

Phase Balance
= Total Collection - Total Phase Cost
```

UX correction:

- service charge is not a main headline KPI
- it appears in the project-cost panel footer
- total phase cost includes service charge
- phase balance uses total phase cost

## Supplier Bill Reporting Logic

Accounting rule preserved:

- supplier bill items appear in Daily Project Cost Details
- supplier bill categories appear in Phase Expense Breakdown
- supplier payments do **not** appear as project cost rows
- Supplier Ledger remains separate for billed / paid / payable status

## Print / PDF Issue

The print route needed a dedicated document system rather than inherited screen cards. The production fix is:

- a print-specific component foundation in `src/components/reports/print-document.tsx`
- compact document tables instead of KPI cards
- section-driven page breaks
- A4-safe layout classes in global print CSS
- full separation between screen report controls and printable report document

Server PDF is still future work. Browser Print / Save as PDF remains the supported PDF path.

## Excel Workbook Gaps Addressed

Complete Project Report workbook now has stronger production polish:

- clearer per-phase tab naming
- auto-filter on table sheets
- totals rows on key amount sheets
- preserved consolidated sheets plus per-phase drilldown sheets
- supplier bill items remain inside daily cost detail sheets
- supplier ledger remains separate

## Invoice / Receipt / Voucher Gaps

Document routes already existed from the prior pass and remain in place:

- Demand Notice / Phase Bill
- Buyer Money Receipt
- Supplier Bill / Invoice
- Supplier Payment Voucher
- Direct Expense Voucher
- Retention Release Voucher
- Final Reconciliation Demand Notice
- subcontractor invoice / payment-voucher aliases

This pass focuses on making the shared print system more universally document-oriented so those routes can continue converging toward the same print grammar.

## Implementation Plan

1. Introduce universal print document primitives.
2. Refactor Complete Project Report print route to use document tables instead of dashboard cards.
3. Expand print CSS with universal print classes and page-break controls.
4. Restore the phase page to a side-by-side collection vs project-cost layout.
5. Keep all phase/report totals driven by the existing unified project cost builder.
6. Tighten workbook naming, totals, and drilldown behavior.
7. Re-run validate, generate, build, and seed verification without changing Relax Tower totals.

## QA Checklist

- [ ] Phase detail page restores side-by-side collection vs expense layout
- [ ] Service charge appears inside expense footing, not as a dominant KPI
- [ ] Total Phase Cost includes service charge
- [ ] Phase Balance uses total phase cost
- [ ] Complete Project Report print route uses compact document tables
- [ ] Cover page spacing is tighter and client-presentable
- [ ] Print preview shows multi-page A4 document without app shell
- [ ] Workbook keeps index + consolidated + per-phase sheets
- [ ] Supplier bill items appear inside daily cost details
- [ ] Supplier ledger remains separate
- [ ] Relax Tower Top Sheet totals remain exact

## Known Limitations

- Server-generated PDF is still future scope.
- Complete Project Report remains the only native XLSX workbook export.
- Not every individual report has been fully converted to the new print-document foundation in this pass.

## Service Charge Follow-up - May 26, 2026

- Added `SERVICE_CHARGE_PHASE_PAGE_FIX.md`.
- Corrected service-charge fallback so phase detail, complete project report data, print route, and workbook all use:
  - phase override if explicitly set
  - otherwise project default
  - otherwise company default setting
  - otherwise `0`
- Removed schema-default `0` values from project and phase service-charge fields so `NULL` can mean "inherit."
- Restored the phase detail page's side-by-side collection vs project-cost layout and moved service charge back into the expense footer calculation.
