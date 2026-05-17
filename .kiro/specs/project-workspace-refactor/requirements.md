# Requirements Document

## Introduction

Sharebuild ERP is a project-first construction/real estate ERP built with Next.js and Prisma. The current implementation has a partially-complete project workspace that still relies on global navigation patterns and a kanban-first phase view. This refactor restructures the project workspace so that daily work happens entirely within a project context, with a compact purpose-built sidebar, a table-first phase view, grouped Money and Vendors sections, a proper Units & Buyers page, project-scoped buyer documents, and a command-center overview with quick actions. Global/legacy pages remain functional but are no longer the primary workflow entry point.

## Glossary

- **Project_Workspace**: The set of pages and layout under `/projects/[id]/*` that provide a self-contained working environment for a single construction project
- **Global_Sidebar**: The company-level sidebar navigation rendered by the `(app)/layout.tsx` for non-project routes (Dashboard, Projects, Buyers, Suppliers, etc.)
- **Project_Sidebar**: The compact project-scoped sidebar rendered inside the Project_Workspace layout, replacing the Global_Sidebar for project routes
- **Phase**: A construction stage within a project (e.g., Piling, Basement, 1st Floor Slab) tracked by the `Phase` model
- **Phase_List_View**: A tabular default view of phases showing financial and status columns
- **Phase_Board_View**: An optional kanban-style board showing active phases grouped by operational status columns
- **Unit**: A sellable portion of a project building (flat, commercial space, parking, roof, land share) tracked by the `Unit` model
- **Buyer**: A person or entity purchasing one or more units, tracked by the `Buyer` model with project association via `ProjectBuyer`
- **Co_Buyer**: Multiple buyers sharing ownership of a single unit via `UnitBuyer` records with `sharePercent`
- **Demand**: A payment notice issued to a buyer for a phase, tracked by the `Demand` model
- **Collection**: A payment received from a buyer, tracked by the `Collection` model
- **Expense**: A cost incurred during construction, tracked by the `Expense` model
- **Supplier**: A material vendor tracked by the `Supplier` model with `supplierType = MATERIAL_SUPPLIER`
- **Subcontractor**: A work/service provider tracked by the `Supplier` model with `supplierType = LABOUR_CONTRACTOR` or `SERVICE_PROVIDER`
- **Supplier_Payable**: A bill from a supplier or subcontractor, tracked by the `SupplierPayable` model
- **Top_Sheet**: A financial summary report showing total income, expense, and balance for a project
- **Buyer_Document**: A file (NID, agreement, payment proof, registration paper, mutation paper, or other PDF/image) associated with a buyer within a project context
- **Quick_Action**: A prominent button on the project overview page that navigates to a frequently-used form or view
- **Seed_Data**: The reference dataset seeded from the Relax Tower Excel workbook with known totals (income 100,143,800 / expense 104,659,890.40 / balance -4,516,090.40)

## Requirements

### Requirement 1: Project Workspace Navigation Isolation

**User Story:** As a project manager, I want the project workspace to have its own dedicated navigation that hides the global sidebar, so that I feel fully immersed in the selected project without distraction from company-wide menus.

#### Acceptance Criteria

1. WHEN a user navigates to any route under `/projects/[id]/*`, THE Project_Workspace layout SHALL render only the Project_Sidebar and SHALL NOT render the Global_Sidebar.
2. IF the project ID in the route does not correspond to an existing project accessible by the current user, THEN THE Project_Workspace layout SHALL display a not-found page and SHALL NOT render the Project_Sidebar.
3. THE Project_Sidebar SHALL display top-level navigation items in this fixed order: Overview, Units & Buyers, Phases, Money, Vendors, Documents, Reports, Audit.
4. WHEN the user clicks "Money" in the Project_Sidebar, THE Project_Sidebar SHALL expand an inline sub-item list beneath "Money" showing: Collections, Expenses, Demands, Due Follow-up. WHEN the user clicks "Money" again while it is already expanded, THE Project_Sidebar SHALL collapse the sub-item list.
5. WHEN the user clicks "Vendors" in the Project_Sidebar, THE Project_Sidebar SHALL expand an inline sub-item list beneath "Vendors" showing: Suppliers, Supplier Bills, Supplier Payments, Subcontractors, Subcontractor Bills. WHEN the user clicks "Vendors" again while it is already expanded, THE Project_Sidebar SHALL collapse the sub-item list.
6. WHEN the user navigates to a route that matches a navigation item or sub-item href, THE Project_Sidebar SHALL visually highlight that item as active, distinguishing it from non-active items.
7. THE Project_Sidebar SHALL display a "Back to All Projects" link that navigates to `/projects`.
8. THE Project_Sidebar SHALL display a "Company Dashboard" link that navigates to `/dashboard`.
9. THE Project_Sidebar SHALL display the project name (truncated with ellipsis if exceeding 30 characters), the project status as a color-coded badge, and the project code (if available) in a header section positioned above the navigation items.

### Requirement 2: Phase List as Default View

**User Story:** As a site engineer, I want the default phase page to be a clean table showing all phases with financial columns, so that I can quickly assess phase status and take action without navigating a kanban board.

#### Acceptance Criteria

1. WHEN a user navigates to `/projects/[id]/phases`, THE Phase_List_View SHALL render a table of all phases belonging to that project.
2. THE Phase_List_View table SHALL display the following columns in order: Phase Name, Status (displaying the PhaseStatus enum value as a human-readable label), Progress (displaying the percentage of approved expenses against total phase expenses as an integer from 0 to 100 followed by "%"), Collection Total (sum of all Collection.amount for the phase), Expense Total (sum of all Expense.amount for the phase), Balance (Collection Total minus Expense Total), Buyer Due (sum of Demand.amount where Demand.status is not FULLY_PAID and not CANCELLED for the phase), Payable (sum of SupplierPayable.dueAmount for the phase), and Actions.
3. THE Phase_List_View Actions column SHALL provide buttons or links for: View, Add Expense, Record Collection, Issue Demand, Edit, and Report.
4. THE Phase_List_View SHALL only display phases where `phase.projectId` matches the current project ID.
5. THE Phase_List_View SHALL order phases by their `sequence` field in ascending order.
6. IF the project has zero phases, THEN THE Phase_List_View SHALL display an empty-state message indicating no phases exist and providing a link to create a new phase.
7. THE Phase_List_View SHALL display all monetary values formatted in BDT currency with two decimal places.
8. WHEN a financial aggregate (Collection Total, Expense Total, Balance, Buyer Due, or Payable) has no underlying records, THE Phase_List_View SHALL display the value as "0.00" in BDT format.

### Requirement 3: Board View as Optional Secondary View

**User Story:** As a project manager, I want an optional kanban board view for phases, so that I can visually track operational progress of active phases when needed.

#### Acceptance Criteria

1. WHEN a user navigates to `/projects/[id]/phases/board`, THE Phase_Board_View SHALL render a kanban-style board displaying phases as draggable-appearance cards organized into vertical columns.
2. THE Phase_Board_View SHALL display exactly 5 columns in this fixed order: "Planned" (phases with no demands issued and no expenses recorded), "Demand Issued" (phases with at least one demand but no approved expenses), "Running" (phases with at least one approved expense), "Final Bill Pending" (phases where all expenses exist but at least one expense has status PENDING_APPROVAL), "Ready for Audit" (phases where all expenses are APPROVED and all expenses have at least one associated document).
3. THE Phase_Board_View SHALL only display phases with status DRAFT or ACTIVE, excluding phases with status CANCELLED, DUPLICATE, or EXCLUDED_FROM_SUMMARY.
4. EACH phase card on the Phase_Board_View SHALL display: phase name, a progress indicator showing the ratio of approved expenses to total expenses as a percentage (0–100%), collection percentage calculated as total collections divided by total demand amount for that phase expressed as a percentage (0–100%, or "No Demand" when demand total is zero), expense total as a currency sum, balance calculated as total collections minus total expenses, and a warning icon with count when one or more expenses with status APPROVED or PENDING_APPROVAL have no associated document records.
5. THE Phase_List_View SHALL include a navigation link or button labeled "Board View" that navigates to `/projects/[id]/phases/board`.
6. IF no phases with status DRAFT or ACTIVE exist for the current project, THEN THE Phase_Board_View SHALL display an empty state message indicating no operational phases are available, with a link back to the Phase_List_View.
7. WHEN a user navigates to `/projects/[id]/phases/board` and the project does not exist or the user lacks access, THE Phase_Board_View SHALL return a 404 not-found page.

### Requirement 4: Project Overview Command Center

**User Story:** As a company admin, I want the project overview page to serve as a command center with KPIs and quick action buttons, so that I can see the project health at a glance and jump to common tasks immediately.

#### Acceptance Criteria

1. WHEN a user navigates to `/projects/[id]`, THE Project_Workspace SHALL render the overview page as a command center displaying KPI metrics and Quick_Action buttons.
2. THE overview page SHALL display the following KPI metrics calculated from the project's data: total collection (sum of all Collection amounts for the project), total expense (sum of all Expense amounts for the project), net balance (total collection minus total expense), buyer due (sum of issued Demand amounts minus sum of Collection amounts linked to those demands, per buyer, floored at zero per buyer), supplier payable (sum of SupplierPayable.dueAmount where the linked supplier's supplierType is MATERIAL_SUPPLIER, EQUIPMENT_SUPPLIER, or SERVICE_PROVIDER), subcontractor payable (sum of SupplierPayable.dueAmount where the linked supplier's supplierType is LABOUR_CONTRACTOR), active phase count (count of phases with status ACTIVE), missing voucher count (count of expenses with status APPROVED or PENDING_APPROVAL that have no linked Document), and pending approval count (count of expenses with status PENDING_APPROVAL).
3. THE overview page SHALL display Quick_Action buttons for: Add Expense, Record Collection, Issue Demand, Add Supplier Bill, Add Subcontractor Bill, Add Buyer/Assign Unit, Upload Document, View Due, and Top Sheet.
4. WHEN a user clicks a Quick_Action button, THE Project_Workspace SHALL navigate to the corresponding project-scoped page under `/projects/[id]/*` (e.g., Add Expense navigates to `/projects/[id]/expenses/new`, Record Collection to `/projects/[id]/collections/new`, Add Supplier Bill to `/projects/[id]/payables/new`, View Due to `/projects/[id]/due-followup`, Top Sheet to `/projects/[id]/reports/top-sheet`).
5. THE overview page SHALL calculate "subcontractor payable" separately from "supplier payable" by filtering SupplierPayable records: records whose linked supplier has supplierType = LABOUR_CONTRACTOR are summed as subcontractor payable; all other supplierType values (MATERIAL_SUPPLIER, EQUIPMENT_SUPPLIER, SERVICE_PROVIDER, CONSULTANT) are summed as supplier payable.
6. IF the project has no Collection, Expense, or SupplierPayable records, THEN THE overview page SHALL display zero (0) for all financial KPI metrics and zero for all count-based metrics.

### Requirement 5: Units and Buyers Page

**User Story:** As an accounts officer, I want a combined Units & Buyers page within the project workspace, so that I can see unit allocation, buyer ownership shares, and financial status in one place.

#### Acceptance Criteria

1. WHEN a user navigates to `/projects/[id]/units-buyers`, THE Project_Workspace SHALL render the Units & Buyers page.
2. THE Units & Buyers page SHALL display a summary section with: total units (all units belonging to the project regardless of status), sold/booked units (units with status SOLD, BOOKED, or REGISTERED), available units (units with status AVAILABLE), buyer count (distinct buyers linked via ProjectBuyer), co-owned unit count (units with more than one UnitBuyer record), and total buyer due (sum of all Due/Advance values across all buyers in the project, formatted in BDT).
3. THE Units & Buyers page SHALL display a buyer table with columns: Buyer Name, Unit(s) (unit numbers allocated to the buyer in this project), Ownership/Share percentage (sharePercent from UnitBuyer), Total Demand, Total Paid, Due/Advance, Document Count (number of Document records associated with the buyer within this project), and Actions.
4. THE buyer table SHALL calculate "Total Demand" as the sum of all `Demand.amount` records for that buyer within the current project, excluding demands with status CANCELLED.
5. THE buyer table SHALL calculate "Total Paid" as the sum of all `Collection.amount` records for that buyer within the current project where transactionType is COLLECTION, minus the sum of collections where transactionType is REFUND.
6. THE buyer table SHALL calculate "Due/Advance" as Total Demand minus Total Paid, displaying positive values as "Due" and negative values as "Advance".
7. WHEN a unit has multiple buyers (co-ownership), THE buyer table SHALL display each co-buyer as a separate row showing their `sharePercent` from the `UnitBuyer` record, with the unit number repeated in each co-buyer's row.
8. THE Actions column in the buyer table SHALL provide a link to view the buyer's detail page and a link to record a new collection for that buyer.
9. IF the project has no buyers linked via ProjectBuyer, THEN THE Units & Buyers page SHALL display an empty state message indicating no buyers have been added and providing a link to add a buyer.

### Requirement 6: Buyer Document Management

**User Story:** As a document officer, I want to upload and manage buyer-specific documents within the project context, so that all buyer paperwork (NID, agreements, payment proofs) is organized per project.

#### Acceptance Criteria

1. WHEN a user navigates to the buyer documents section, THE Project_Workspace SHALL display documents filtered by both `projectId` and `buyerId`, sorted by upload date descending.
2. THE Buyer_Document upload form SHALL accept these document types: NID front, NID back, agreement, payment proof, registration paper, mutation/kharij paper, other.
3. THE Buyer_Document upload form SHALL accept file formats: PDF, JPG, JPEG, PNG, with a maximum file size of 5 MB per file.
4. WHEN a document is uploaded, THE system SHALL store the document with associations to both the project and the buyer via the `Document` model's `projectId` and `buyerId` fields, and record the `fileName`, `fileType`, and `fileSize`.
5. THE Units & Buyers page "Document Count" column SHALL display the count of documents where both `projectId` matches the current project AND `buyerId` matches the buyer, showing "0" when no documents exist.
6. IF a document upload fails due to invalid file format or file size exceeding 5 MB, THEN THE system SHALL reject the upload and display an error message indicating the reason for rejection without navigating away from the upload form.
7. WHEN a user selects the delete action on a document, THE system SHALL remove the document record and its associated file, and decrement the document count on the Units & Buyers page accordingly.

### Requirement 7: Vendor Area with Supplier and Subcontractor Separation

**User Story:** As a project manager, I want suppliers (material vendors) and subcontractors (work/service providers) to be clearly separated in the project workspace, so that I can manage material purchases and service contracts independently.

#### Acceptance Criteria

1. WHEN a user navigates to `/projects/[id]/vendors`, THE Project_Workspace SHALL render a Vendors area with two tabs labelled "Suppliers" and "Subcontractors", with the "Suppliers" tab active by default.
2. THE Suppliers tab SHALL display a table of suppliers linked to the project via `SupplierPayable` records where the supplier's `supplierType` is `MATERIAL_SUPPLIER` or `EQUIPMENT_SUPPLIER`, showing at minimum: supplier name, supplier type, total billed amount, paid amount, and outstanding due amount.
3. THE Subcontractors tab SHALL display a table of suppliers linked to the project via `SupplierPayable` records where the supplier's `supplierType` is `LABOUR_CONTRACTOR` or `SERVICE_PROVIDER`, showing at minimum: supplier name, supplier type, total billed amount, paid amount, and outstanding due amount.
4. IF no `SupplierPayable` records exist for the active tab's supplier types within the project, THEN THE Project_Workspace SHALL display an empty-state message indicating no suppliers or subcontractors are linked and providing a link to record a new bill.
5. WHEN a user navigates to `/projects/[id]/subcontractors`, THE Project_Workspace SHALL render a dedicated subcontractor listing page showing only suppliers with `supplierType` of `LABOUR_CONTRACTOR` or `SERVICE_PROVIDER` linked to the project via `SupplierPayable` records.
6. THE Vendors area SHALL display navigation links to Supplier Bills, Supplier Payments, and Subcontractor Bills as sub-pages accessible from within the vendors section.
7. THE Vendors area SHALL exclude suppliers with `supplierType` of `CONSULTANT` from both the Suppliers and Subcontractors sections.

### Requirement 8: Project-Scoped Money Structure

**User Story:** As an accountant, I want all financial operations (collections, expenses, demands, due follow-up) to be accessible from a unified Money section within the project workspace, so that daily financial work is project-first.

#### Acceptance Criteria

1. THE Project_Workspace SHALL provide project-scoped routes for: `/projects/[id]/collections`, `/projects/[id]/expenses`, `/projects/[id]/demands`, `/projects/[id]/due-followup`.
2. WHEN a user accesses any Money sub-page, THE page SHALL display only records scoped to the current project (filtering by `phase.projectId` or direct `projectId` foreign key), ordered by date descending, limited to the 200 most recent records per page.
3. THE `/projects/[id]/reports/top-sheet` route SHALL display the Top_Sheet report calculated exclusively from the current project's collections and expenses.
4. WHEN a user creates a new collection, expense, or demand from within the project workspace, THE form SHALL pre-populate the project context and restrict the phase dropdown to phases belonging to the current project and the buyer dropdown to buyers linked to the current project, without displaying a project selector dropdown.
5. THE global legacy routes (`/collections`, `/expenses`, `/demands`, `/buyers/dues`) SHALL continue to function and display company-wide data.
6. IF the project ID in the URL does not exist or the authenticated user does not belong to the same company as the project, THEN THE system SHALL return a 404 Not Found page without revealing whether the project exists.
7. WHEN a user accesses a Money sub-page and no records exist for the current project, THE page SHALL display an empty state message and a call-to-action link to create the first record of that type.

### Requirement 9: System Stability and Data Integrity

**User Story:** As a developer, I want the refactor to maintain full backward compatibility with existing pages, seed data, and UI components, so that no regressions are introduced.

#### Acceptance Criteria

1. WHEN the seed script is executed against a clean database, THE Seed_Data SHALL produce totals matching income 100,143,800, expense 104,659,890.40, and balance -4,516,090.40 with a maximum tolerance of ±1.00 per aggregate.
2. THE refactor SHALL NOT create new Prisma migration folders beyond the existing `0001_init` baseline unless a new acceptance criterion in this specification explicitly requires a schema change.
3. THE refactor SHALL NOT modify the Prisma schema file (`prisma/schema.prisma`) unless a new acceptance criterion in this specification explicitly requires a model change.
4. WHEN any global legacy page is accessed (`/dashboard`, `/projects`, `/buyers`, `/collections`, `/expenses`, `/phases`, `/suppliers`, `/reports/top-sheet`, `/reports/phase-summary`, `/reports/expenses`, `/reports/due-report`, `/reports/buyer-statement`), THE page SHALL return an HTTP 200 response and render without uncaught runtime exceptions or React error boundaries being triggered.
5. THE refactor SHALL NOT introduce Radix UI Select components with empty string values that cause console errors.
6. WHEN any Project_Workspace page is loaded (`/projects/[id]`, `/projects/[id]/buyers`, `/projects/[id]/collections`, `/projects/[id]/demands`, `/projects/[id]/documents`, `/projects/[id]/due-followup`, `/projects/[id]/expenses`, `/projects/[id]/payables`, `/projects/[id]/phases`, `/projects/[id]/reports`), THE page SHALL return an HTTP 200 response and render without uncaught runtime exceptions or React error boundaries being triggered.
7. WHEN the refactored codebase is compiled using `next build`, THE build SHALL complete with zero TypeScript errors and zero build-time failures.

### Requirement 10: Excluded Scope Boundaries

**User Story:** As a product owner, I want clear boundaries on what this refactor does NOT include, so that scope creep is prevented.

#### Acceptance Criteria

1. THE refactor SHALL NOT add SaaS billing, subscription, or payment gateway functionality including recurring charge processing, plan management, or third-party payment provider integration.
2. THE refactor SHALL NOT add a buyer-facing portal or buyer login system where buyers authenticate independently to view their own data.
3. THE refactor SHALL NOT add external messaging or notification integrations including SMS, WhatsApp, email dispatch services, or push notification services; standard in-app UI feedback such as toast messages, inline validation, and status badges is not considered a notification integration.
4. THE refactor SHALL NOT add mobile application code, platform-native wrappers, or new mobile-specific layout components; existing Tailwind responsive utility classes (sm:, md:, lg: breakpoints) SHALL be preserved unchanged but no new mobile-only breakpoint layouts or mobile-first component redesigns SHALL be introduced.
5. THE refactor SHALL NOT add inventory reconciliation, stock-level tracking, warehouse management, or reorder-point features; existing material catalog and expense-category tracking used for cost recording is not considered stock management.
