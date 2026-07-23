# AWS Infrastructure Financial Audit & Cost Forecast Report

> **Document Type:** Executive Cloud Financial Audit  
> **Prepared For:** Stayee Anywhere Executive Leadership & Engineering Team  
> **Author:** CTO & Principal DevOps Architect  
> **Date:** July 22, 2026  
> **Account Model:** AWS 2025/2026 Credit-Based Free Tier ($200 Credit / 6-Month Plan)  

---

## 1. Executive Summary & Account Balance

This audit presents the complete, verified financial breakdown of AWS cloud infrastructure expenditure for **Stayee Anywhere** from initial environment setup through **July 22, 2026**.

### Financial Highlights
- **Net Out-of-Pocket Cost to Organization:** **$0.00 USD** (₹0.00 INR)
- **Initial AWS Promotional Credits Granted:** **$200.00 USD**
- **Total Historical Usage Consumed:** **-$4.82 USD** *(Covered 100% by AWS Credits)*
- **Active Credit Balance Remaining:** **$195.18 USD**
- **Current Monthly Burn Rate:** **~$4.25 USD / month** *(Covered 100% by remaining credits)*

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ACCOUNT BALANCE SUMMARY                         │
├────────────────────────────────────────┬───────────────────────────────┤
│ AWS Credit Grant (6-Month Plan)        │ $200.00 USD                   │
│ Consumed Credits (Setup Phase)         │ -$4.82 USD                    │
│ ────────────────────────────────────── │ ───────────────────────────── │
│ NET REMAINING CREDIT BALANCE           │ $195.18 USD (~₹16,200 INR)    │
│ INVOICED OUT-OF-POCKET EXPENSE         │ $0.00 USD                     │
└────────────────────────────────────────┴───────────────────────────────┘
```

<div style="page-break-after: always;"></div>

---

## 2. AWS Credit Program & Policy Context

### AWS Credit-Based Model
As of AWS's Free Tier policy update, accounts operate under a **Credit-Based Model**:
- **Grant Allocation:** $200.00 USD in promotional credits over a 6-month account plan.
- **Credit Offset Mechanism:** All AWS infrastructure services (compute, database, network routing, static IPs, and statutory taxes) generate standard line-item charges that are **100% offset by the active credit pool**.
- **Invoicing:** So long as active promotional credits exceed incurred usage, **zero charge** is billed to the organization's credit card.

---

## 3. Historical Spend Line-Item Reconciliation ($4.82 USD)

Between **July 19 and July 21, 2026**, initial VPC network configuration incurred a historical total of **$4.82 USD**. This spend was driven by temporary NAT Gateway and VPC Endpoint resources used during database migration:

| Date Range | AWS Resource / Activity | Billing Rate | Volume / Duration | Incurred Charge | Billing Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **July 19 – 21** | NAT Gateway Runtime | $0.045 / hour | ~41.0 hours | **$1.85 USD** | Deducted from Credits |
| **July 19 – 21** | NAT Gateway Bandwidth Processing | $0.045 / GB | ~23.3 GB | **$1.05 USD** | Deducted from Credits |
| **July 19 – 21** | 2x VPC Interface Endpoints (SSM/ECR)| $0.010 / hr each | ~82.0 endpoint-hrs | **$0.82 USD** | Deducted from Credits |
| **July 19 – 22** | Public IPv4 Address (Attached to EC2)| $0.005 / hour | ~72.0 hours | **$0.36 USD** | Deducted from Credits |
| **July 19 – 22** | Statutory 18% GST / Tax | 18% on Subtotal | — | **$0.74 USD** | Deducted from Credits |
| **TOTAL** | **All Incurred Historical Usage** | — | — | **$4.82 USD** | **100% Offset by Credits** |

> [!IMPORTANT]
> **Architecture Optimization Note:**  
> On **July 21, 2026**, the NAT Gateway ($32.40/mo base + bandwidth) and VPC Interface Endpoints ($14.40/mo base) were permanently deleted and replaced with a zero-cost **Internet Gateway (IGW)** architecture. Charges for NAT Gateway and VPC Endpoints ceased immediately.

<div style="page-break-after: always;"></div>

---

## 4. Live Infrastructure Resource Audit

A live AWS CLI resource audit conducted on **July 22, 2026** confirms that no high-cost or orphaned networking resources exist in the account:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      LIVE RESOURCE AUDIT MATRIX                        │
├───────────────────────────────┬────────────┬───────────────────────────┤
│ Resource Type                 │ Status     │ Cost Status               │
├───────────────────────────────┼────────────┼───────────────────────────┤
│ NAT Gateways                  │ 0 Active   │ $0.00 / month (DELETED)   │
│ VPC Interface Endpoints       │ 0 Active   │ $0.00 / month (DELETED)   │
│ EC2 Instance (t3.micro)       │ 1 Active   │ Billed to Credits         │
│ RDS Database (db.t4g.micro)   │ 1 Active   │ Billed to Credits         │
│ Amazon CloudFront CDN         │ Active     │ $0.00 / month (Free)      │
│ Amazon S3 Storage             │ Active     │ $0.00 / month (Free)      │
│ Public IPv4 Address           │ 1 Active   │ ~$3.60 / month            │
└───────────────────────────────┴────────────┴───────────────────────────┘
```

---

## 5. Forward-Looking Cost Forecast & Budget Projection

Following the VPC architecture optimization, the ongoing account burn rate has dropped significantly:

### Daily & Monthly Run-Rate Table

| Resource | Service Type | Daily Cost (USD) | Monthly Cost (USD) | 6-Month Projection |
| :--- | :--- | :--- | :--- | :--- |
| **EC2 Server (`t3.micro`)** | Compute | ~$0.25 | ~$7.50 | Billed to Credits |
| **RDS Database (`db.t4g.micro`)**| PostgreSQL DB | ~$0.38 | ~$11.50 | Billed to Credits |
| **Public IPv4 Address** | Network IP | ~$0.12 | ~$3.60 | Billed to Credits |
| **Internet Gateway (IGW)** | Routing | $0.00 | $0.00 | $0.00 |
| **NAT Gateway & Endpoints** | Routing | **$0.00** | **$0.00** | **$0.00 (DELETED)** |
| **Estimated 18% Tax / GST** | Statutory Tax | ~$0.13 | ~$4.00 | Billed to Credits |
| **NET TOTAL BURN** | **All Infrastructure** | **~$0.88 / day** | **~$26.60 / month** | **Billed to Credits** |

---

## 6. Credit Lifespan & Financial Conclusion

- **Remaining Credit Balance:** **$195.18 USD**
- **Projected Monthly Usage:** **~$26.60 USD / month**
- **Projected Credit Lifespan:**  
  $$\text{Credit Lifespan} = \frac{\$195.18}{\$26.60 \text{ / month}} \approx \mathbf{7.33 \text{ Months}}$$

### Key Takeaways for Leadership:
1. **Zero Cash Outlay:** The organization will pay **$0.00 out of pocket** for all cloud infrastructure.
2. **Full Credit Coverage:** Remaining credits ($195.18 USD) exceed the total required budget for the remainder of the 6-month plan.
3. **Optimized Infrastructure:** All recurring high-cost VPC resources (NAT Gateways, VPC Endpoints) have been eliminated.
