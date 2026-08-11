# ERP Audit Plan - Kasa Hub

This plan outlines a comprehensive functional and security audit of the ERP system to ensure all existing features are working correctly, data is persisting properly, and user experience is stable.

## Phase 1: Mapping & Discovery (Current)
- [x] Map all routes and pages.
- [x] Identify core modules (CRM, Proposals, Clients, Projects, Jobs, Finance, Calendar, Reports, Kasa AI).
- [ ] Map database schema and relationships.
- [ ] List all main forms and action buttons in each module.

## Phase 2: Functional Audit (Module by Module)

### 1. Navigation & Auth
- [ ] Test all menu items and submenus.
- [ ] Verify auth redirects and role-based access.
- [ ] Check for broken links (404s).

### 2. CRM & Proposals
- [ ] Create, Edit, Delete Leads.
- [ ] Verify Funnel visualization.
- [ ] Create Proposal from Lead.
- [ ] Test Proposal Editor (Scopes, Services, Schedule).
- [ ] Public Proposal link: Signature flow and validation.

### 3. Clients & Projects
- [ ] Create/Edit Client.
- [ ] Verify alphabetical sorting and billing toggle.
- [ ] Create/Edit Project (linked to Client).
- [ ] Launch Grid: Product creation and duplication.

### 4. Jobs & Editorial Calendar
- [ ] Create Job from scratch.
- [ ] **Critical**: Convert Editorial Post to Job (mapping: Title, Briefing, Deadline, Image).
- [ ] Job Checklist: Reordering (DND) and completion.
- [ ] Attachments: Upload/Download (filename preservation) and viewing.
- [ ] Status sync between Job and Launch Grid Product.

### 5. Finance (DMEs & Transactions)
- [ ] Create DME (Extra Demand).
- [ ] Consolidate DMEs into batches.
- [ ] Verify Transaction creation and link to DMEs.
- [ ] Trigger check: Auto-complete DME when transaction is paid.
- [ ] PDF Recibo: Detailed descriptions of consolidated DMEs.

### 6. Reports & Scripts
- [ ] Report Builder: Slide insertion, image scaling, and notes.
- [ ] Scripts: Scene management and branded PDF export.

### 7. Kasa AI
- [ ] Chat threads persistence.
- [ ] Contextual knowledge base integration.

## Phase 3: Technical Audit
- [ ] **RLS & Security**: Verify every table has correct RLS policies.
- [ ] **Persistence Check**: Audit frontend "success" vs actual DB state.
- [ ] **Error Monitoring**: Check console for React loop errors (Maximum update depth) and API failures.
- [ ] **Responsiveness**: Mobile/Tablet/Desktop audit of core views.

## Phase 4: Fix & Report
- [ ] Fix identified bugs in place.
- [ ] Re-test fixed flows.
- [ ] Generate final report (Critical, High, Medium, Low).
