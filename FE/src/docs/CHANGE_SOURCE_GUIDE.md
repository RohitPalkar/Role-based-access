# EOI Record's Change Request Workflow

## Overview

The **Change Request Action** is used in the Expression of Interest (EOI) module to manage source change requests for EOI records. It allows RM(Relationship Manager)  to request changes to a EOI's primary and secondary source information and MIS to approve / reject these changes.

---

### Core Functionality

1. **Create Change Requests** - RM can initiate requests through change request action menu for each EOI record by selectively swaping current and new field values before submission
2. **Edit Existing Requests** - RM (Relationship Manager) can modify pending requests
3. **View Request Details** - MIS can preview source change requests with current and new data comparison
4. **Approve/Reject Requests** - MIS can review and approve or reject submitted requests with appropriate approval proof while approving.

---


### Key Features

- **Three Operation Modes:**
  - `create` - New source change request  ( RM )
  - `edit` - Modify existing request  ( RM )
  - `view and approve or reject` - view and approve or reject change request  ( MIS )


## User Workflows

### 1. Creating a New Source Change Request

```
Flow:
1. RM navigates to Change Request (create mode) from action menu for perticular EOI record
2. System loads current voucher data
3. RM selects "Change Source To" option
4. RM enters/fetches new data based on selection
5. System auto-fills fields from fetched record based on selected change source to options.
6. RM reviews current vs. new data
7. RM swaps minimum one field
8. RM provides reason for change
9. RM submits request
10. System creates request and redirects to EOI Records list
```

### 2. Editing a Pending Request

```
Flow:
1. RM navigates to Change Request tab and opens existing request (edit mode)
2. System loads current and new data
3. RM can modify new data fields
4. RM can select different fields to swap
5. RM can update change reason
6. RM submits updated request
7. System updates request and redirects
```

### 3. Reviewing/Approving a Request

```
Flow:
1. MIS opens submitted request (view mode)
2. MIS reviews current vs. new data
3. MIS reviews change reason
4. To Approve:
   a. MIS uploads approval proof (mandatory)
   b. MIS provides reviewer remark (mandatory)
   c. MIS clicks "Approve Request Button"
5. To Reject:
   a. MIS provides reviewer remark (mandatory)
   b. MIS clicks "Reject" button
```
