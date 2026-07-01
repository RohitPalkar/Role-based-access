# Map & Convert Flow

This document explains the complete flow required to map a unit after creating an EOI/Voucher.

Follow the steps in the exact order mentioned below.

---

## Step 1: Create EOI / Voucher
Create an EOI or Voucher and complete the payment.

Expected Result:
- `formStatus` becomes **Form Submitted**

---

## Step 2: Approve Payment
Approve the payment through the **Finance Portal**.

---

## Step 3: MIS Approval
Approve the form through the **MIS Portal**.

---

## Step 4: CRM Approval
Approve the form through the **CRM Portal**.

---

## Step 5: Assign RM
Assign the following roles to the EOI:

- Closing RM
- Sourcing RM

---

## Step 6: Campaign & Lead Creation
Go to the **Admin Portal**.

Select the campaign for the EOI and perform the following actions:

1. Create Leads on **SFDC**
2. Convert Leads on **SFDC**

---

## Step 7: Map Unit
Once an **Opportunity ID (`oppId`)** is generated for the EOI, you can proceed to **map the unit**.

---

## Important Notes

- Steps must be executed **in the exact order**.
- Unit mapping will only be available **after the Opportunity ID is generated**.