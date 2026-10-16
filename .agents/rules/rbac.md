# Role-Based Access Control (RBAC)

## 1. Purpose

This document defines the Role-Based Access Control (RBAC) model for the internal Property Management & CRM application.

The application is used by internal teams to manage:

- Projects
- Products
- Housing units
- Customers
- Leads / prospects
- Sales activities
- Daily reports
- Users
- Audit logs

RBAC controls both:
1. Which modules a user can access.
2. Which actions a user can perform inside each module.

> Menu visibility is not security. All permissions must also be enforced on the server side.

---

## 2. Roles

The application uses six primary roles:

| Role | Purpose |
|---|---|
| `ADMIN` | System and master-data administration |
| `MARKETING` | Customer, lead, sales activity, and operational sales management |
| `DIGITAL_MARKETING` | Digital marketing, lead-source, lead, activity, and reporting operations |
| `FIELD_SUPERVISOR` | Field/project/unit construction progress management |
| `MANAGER` | Business monitoring and management oversight |
| `DIRECTOR` | Executive-level business monitoring |

Do not use a generic `MANAGEMENT` role. `MANAGER` and `DIRECTOR` have different responsibilities.

---

## 3. Role Responsibilities

### 3.1 ADMIN

Admin manages the application and master data.

Typical responsibilities:

- Manage users
- Manage projects and blocks
- Manage product categories and product types
- Manage units
- Manage system-level configuration
- View audit logs
- View all operational data
- Perform authorized administrative corrections

Admin has the broadest access.

### 3.2 MARKETING

Marketing manages the sales pipeline and customer-facing operational data.

Typical responsibilities:

- View, create, and update customers
- Create and manage leads
- Add activities to leads
- Update lead status, sales stage, and follow-up
- View units
- Perform authorized unit actions such as Hold / Release Hold
- Submit daily reports
- View projects and products

A Marketing user normally acts as the primary PIC for assigned leads.

### 3.3 DIGITAL_MARKETING

Digital Marketing focuses on digital acquisition and digital-originated leads.

Typical responsibilities:

- View leads
- Create leads when authorized
- Add activities
- Monitor lead sources
- Monitor campaign-related prospects
- View relevant customers
- View units and products
- Submit daily reports
- Monitor digital marketing performance

The exact edit scope can be configured according to company policy.

### 3.4 FIELD_SUPERVISOR

Field Supervisor manages physical project and construction progress.

Typical responsibilities:

- View projects, blocks, and units
- Update construction progress
- Add field progress notes
- Upload progress documentation/photos
- Submit daily field reports

Field Supervisor should not access customer and sales CRM operations unless explicitly authorized.

### 3.5 MANAGER

Manager provides business monitoring and management oversight.

Typical responsibilities:

- View dashboards
- View projects, products, units, customers, leads, and activities
- View daily reports
- Monitor sales and construction performance
- Approve operational changes where company policy requires approval

Manager is not automatically a system administrator.

### 3.6 DIRECTOR

Director provides executive-level business visibility.

Typical responsibilities:

- View dashboards
- View projects, products, units, customers, leads, activities, and reports
- Monitor overall company/project performance

Director is not automatically a system administrator.

---

## 4. Navigation / Menu Visibility

| Module | Admin | Marketing | Digital Marketing | Field Supervisor | Manager | Director |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | Yes | Yes | Yes | Yes | Yes | Yes |
| Unit | Yes | Yes | Read | Yes | Read | Read |
| Customer | Yes | Yes | Read/Edit* | No | Read | Read |
| Leads | Yes | Yes | Read/Edit* | No | Read | Read |
| Activities | Yes | Yes | Yes | No | Read | Read |
| Daily Reports | Yes | Yes | Yes | Yes | Read | Read |
| Projects | Yes | Read | Read | Read | Read | Read |
| Products | Yes | Read | Read | Read | Read | Read |
| Users | Yes | No | No | No | No | No |
| Audit Logs | Yes | No | No | No | No | No |

`*` Exact edit permissions should be controlled by explicit permissions and company policy.

---

## 5. Role vs Permission

A role answers:

> Who is this user?

A permission answers:

> What is this user allowed to do?

Example:

```text
MARKETING
    |
    +-- customer.view
    +-- customer.create
    +-- customer.update
    +-- lead.view
    +-- lead.create
    +-- lead.update
    +-- lead.activity.create
    +-- unit.view
    +-- unit.hold
    +-- unit.release_hold
```

Do not implement security only through role checks scattered throughout the application. Use a centralized permission system.

---

## 6. Permission Catalog

### Dashboard

```text
dashboard.view
```

### Projects

```text
project.view
project.create
project.update
project.delete
project.progress.update
```

### Products

```text
product.view
product.create
product.update
product.delete
```

### Units

```text
unit.view
unit.create
unit.update
unit.bulk_create
unit.hold
unit.release_hold
unit.book
unit.cancel_booking
unit.update_construction
```

### Customers

```text
customer.view
customer.create
customer.update
customer.delete
```

### Leads

```text
lead.view
lead.create
lead.update
lead.assign
lead.activity.create
lead.status.update
lead.stage.update
lead.followup.update
```

### Activities

```text
activity.view
activity.create
```

### Reports

```text
report.view
report.create
report.update
report.export
```

### Users

```text
user.view
user.create
user.update
user.deactivate
```

### Audit

```text
audit.view
```

---

## 7. Project Permissions

Projects represent physical developments.

Example:

```text
Project
└── New Puri Kencana
    ├── Block G
    ├── Block H
    └── Units
```

Default permissions:

| Permission | Admin | Marketing | Digital Marketing | Field Supervisor | Manager | Director |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `project.view` | Yes | Yes | Yes | Yes | Yes | Yes |
| `project.create` | Yes | No | No | No | No | No |
| `project.update` | Yes | No | No | No | No | No |
| `project.delete` | Yes | No | No | No | No | No |
| `project.progress.update` | Yes | No | No | Yes | No | No |

Field Supervisor may update construction-related progress without being allowed to modify project master data.

---

## 8. Product Permissions

Products define the company's property product structure.

```text
Product Category
├── SUBSIDI
├── KOMERSIAL
└── RUKO

Product Type
├── Subsidi 30/60
├── Subsidi 30/72
├── Komersial A
└── Ruko A
```

Product Type contains standard specifications such as:

- Land area
- Building area
- Bedrooms
- Bathrooms
- Ceiling height
- Wall material
- Roof material
- Flooring
- Doors/windows
- Electricity
- Water
- Other company-defined specifications
- Base/default price

The Unit stores the actual selling price.

Default permissions:

| Permission | Admin | Marketing | Digital Marketing | Field Supervisor | Manager | Director |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `product.view` | Yes | Yes | Yes | Yes | Yes | Yes |
| `product.create` | Yes | No | No | No | No | No |
| `product.update` | Yes | No | No | No | No | No |
| `product.delete` | Yes | No | No | No | No | No |

---

## 9. Unit Permissions

A Unit represents an individual inventory/sales unit. A Unit is not necessarily a completed building.

Example:

```text
Project
└── New Puri Kencana
    └── Block G
        ├── G-01
        ├── G-02
        └── G-03
```

Ruko must be treated as a product category/type that requires construction according to the company's model/specification. It must not be modeled as generic vacant land/kavling.

Default permissions:

| Permission | Admin | Marketing | Digital Marketing | Field Supervisor | Manager | Director |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `unit.view` | Yes | Yes | Read | Yes | Read | Read |
| `unit.create` | Yes | No | No | No | No | No |
| `unit.update` | Yes | Limited | No | Limited | No | No |
| `unit.bulk_create` | Yes | No | No | No | No | No |
| `unit.hold` | Yes | Policy | No | No | Policy | Read |
| `unit.release_hold` | Yes | Policy | No | No | Policy | Read |
| `unit.book` | Yes | Policy | No | No | Policy | Read |
| `unit.cancel_booking` | Yes | Policy | No | No | Policy | Read |
| `unit.update_construction` | Yes | No | No | Yes | No | No |

Marketing Hold/Release permissions must follow company policy.

---

## 10. Unit Availability

Availability belongs to the Unit, not the Lead.

Recommended statuses:

```text
AVAILABLE
HOLD
BOOKED
AKAD
SOLD
CANCELLED
```

Do not provide every role with an unrestricted status dropdown.

Prefer explicit actions:

```text
AVAILABLE
    |
    +-- [Hold Unit] --> HOLD
    |
    +-- [Book Unit] --> BOOKED
```

And controlled transitions:

```text
HOLD --> AVAILABLE
BOOKED --> CANCELLED
BOOKED --> AKAD
AKAD --> SOLD
```

Important transitions should be validated by server-side business rules and recorded in the audit log.

---

## 11. Unit Reservation

A stronger model uses a reservation entity:

```text
Lead
  |
  v
UnitReservation
  |
  v
Unit
```

Suggested fields:

```text
id
leadId
unitId
type
startAt
expiresAt
createdBy
status
createdAt
updatedAt
```

Reservation types:

```text
HOLD
BOOKING
```

This keeps Lead status and Unit availability separate.

---

## 12. Customer Permissions

Customer represents the person's identity.

Customer should not contain sales-process state.

Customer fields:

```text
Full Name
Phone / WhatsApp
Email
Date of Birth
KTP Number
Address
Notes
```

Do not place these in Customer:

```text
Project
Product Type
Lead Status
Sales Stage
Marketing PIC
Next Follow Up
```

Those belong to Lead.

Default permissions:

| Permission | Admin | Marketing | Digital Marketing | Field Supervisor | Manager | Director |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `customer.view` | Yes | Yes | Policy | No | Read | Read |
| `customer.create` | Yes | Yes | Policy | No | No | No |
| `customer.update` | Yes | Yes | Policy | No | No | No |
| `customer.delete` | Yes | Policy | No | No | No | No |

---

## 13. Lead Permissions

Lead represents a sales opportunity/process.

Recommended relationship:

```text
Customer
   |
   v
Lead
   |
   v
Unit (optional)
```

A Lead can exist without a specific Unit.

Recommended permissions:

```text
lead.view
lead.create
lead.update
lead.assign
lead.activity.create
lead.status.update
lead.stage.update
lead.followup.update
```

Default access:

| Permission | Admin | Marketing | Digital Marketing | Field Supervisor | Manager | Director |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `lead.view` | Yes | Yes | Yes | No | Read | Read |
| `lead.create` | Yes | Yes | Policy | No | No | No |
| `lead.update` | Yes | Yes | Policy | No | No | No |
| `lead.assign` | Yes | Policy | Policy | No | Approval | No |
| `lead.activity.create` | Yes | Yes | Policy | No | No | No |
| `lead.status.update` | Yes | Yes | Policy | No | Approval | No |
| `lead.stage.update` | Yes | Yes | Policy | No | Approval | No |
| `lead.followup.update` | Yes | Yes | Policy | No | No | No |

---

## 14. Lead Creation Rules

New Lead creation should contain:

```text
Customer *
Project *
Product Type *
Unit optional
Source *
Marketing / PIC
Status = NEW
Stage = INQUIRY
Next Follow Up optional
Notes optional
```

The creator should not freely choose an advanced status/stage such as:

```text
CLOSED
AKAD
REALIZATION
```

A new Lead starts at:

```text
Status = NEW
Stage = INQUIRY
```

Later changes are handled from Lead Detail.

---

## 15. Lead Status

Recommended status model:

```text
NEW
ACTIVE
BOOKED
CLOSED
LOST
```

Status represents the general condition of the opportunity.

Avoid using status values that duplicate every sales stage.

---

## 16. Lead Sales Stage

Recommended stages:

```text
INQUIRY
VISIT
FOLLOW_UP
DOCUMENTATION
KPR
SLIK
OTS
AKAD
REALIZATION
CANCELLED
```

Stage represents the current position in the sales process.

Example:

```text
Status = ACTIVE
Stage  = KPR
```

---

## 17. Lead Sources

Use detailed sources instead of a redundant generic `SOCIAL_MEDIA`.

Recommended values:

```text
WALK_IN
REFERRAL
FACEBOOK
INSTAGRAM
TIKTOK
WHATSAPP
ADVERTISEMENT
WEBSITE
MARKETING
OTHER
```

This supports source-level reporting.

---

## 18. Activity Model

Activity represents a real interaction or business event.

Recommended activity types:

```text
NOTE
CALL
WHATSAPP
VISIT
FOLLOW_UP
DOCUMENT
KPR
SLIK
OTS
AKAD
REALIZATION
PAYMENT
OTHER
```

An Activity should contain:

```text
Type
Date / Time
Notes
User / Author
Lead
```

Activity should not have its own independent sales stage.

---

## 19. Adding Activities

The Lead Detail page should provide:

```text
+ Add Activity
```

Form:

```text
Activity Type
Date / Time
Notes

Optional:
Update Lead
    [ ] Status
    [ ] Sales Stage
    [ ] Next Follow Up
```

An Activity may be created without changing the Lead.

Example:

```text
Activity: WHATSAPP
Notes: Customer asked about monthly installment.

Lead:
Status = ACTIVE
Stage = INQUIRY
Next Follow Up = unchanged
```

---

## 20. Activity Author

The Activity author must be the authenticated user who performed the activity.

Do not automatically use the Lead's primary PIC.

Example:

```text
Lead PIC = Marketing A

Activity 1 = Marketing A
Activity 2 = Marketing B
Activity 3 = Digital Marketing
```

The Lead PIC remains unchanged.

---

## 21. Lead PIC

A Lead should have one primary Marketing/PIC:

```text
Lead.marketingId
```

The Activity records its own author:

```text
Activity.userId
```

This separates ownership from actual activity execution.

---

## 22. Lead Continuity

Do not create a new Lead for every interaction.

If the customer is still pursuing the same sales opportunity/process:

```text
Same Lead
    |
    +-- New Activity
```

Example:

```text
Customer Budi
Lead L-101
Product: Subsidi 30/60

Day 1 -> WhatsApp
Day 3 -> Call
Day 5 -> Visit
Day 8 -> Follow Up
```

All remain under Lead L-101.

Create a new Lead when there is a genuinely new sales opportunity/process.

Example:

```text
Old Lead:
Subsidi 30/60
Status: LOST

Customer returns:
Interested in Ruko A

-> Create a new Lead
```

The same customer does not automatically mean the same Lead.

---

## 23. Activities Global Page

`/activities` is the global activity history.

It should not be an Agenda/Task page.

It should show:

- Activity type
- Customer
- Lead
- Unit
- Description
- Date/time
- User/author

Recommended filters:

```text
Search
Activity Type
Marketing/User
Date
```

Activities are primarily created from:

```text
/leads/[id]
```

If task management is required later, create a separate `Tasks / Agenda` module.

---

## 24. Daily Reports

Permissions:

```text
report.view
report.create
report.update
report.export
```

Recommended scope:

| Permission | Admin | Marketing | Digital Marketing | Field Supervisor | Manager | Director |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `report.view` | All | Own/authorized | Own/authorized | Own/authorized | All | All |
| `report.create` | Yes | Yes | Yes | Yes | No | No |
| `report.update` | Yes | Own | Own | Own | No | No |
| `report.export` | Yes | Policy | Policy | Policy | Yes | Yes |

Reports should derive metrics from Leads and Activities where possible instead of requiring duplicate manual input.

---

## 25. Users

Users are application accounts.

Users module is Admin-only.

Permissions:

```text
user.view
user.create
user.update
user.deactivate
```

Admin can:

- Create users
- Assign roles
- Activate/deactivate users
- Manage account credentials according to the authentication design

Deactivating a user must not delete historical Activities or Audit Logs.

---

## 26. Audit Logs

Audit Logs are Admin-only.

Permission:

```text
audit.view
```

Recommended model:

```text
AuditLog
├── userId
├── entity
├── entityId
├── action
├── oldData
├── newData
└── createdAt
```

Example:

```text
User: marketing01
Entity: Unit
Entity ID: G-05
Action: HOLD
Old Status: AVAILABLE
New Status: HOLD
```

### Activity vs Audit Log

**Activity** = business/sales history.

Example:

```text
Customer called about KPR.
```

**Audit Log** = technical/system change.

Example:

```text
Unit G-05 changed from AVAILABLE to HOLD.
```

---

## 27. Data Scope

Role permission and data scope are different concepts.

A user may have permission to view a module but should not necessarily see every record.

Recommended default scopes:

| Role | Default Scope |
|---|---|
| Admin | All data |
| Marketing | Assigned/authorized customers and leads |
| Digital Marketing | Authorized digital-related leads/customers |
| Field Supervisor | Assigned project/unit data |
| Manager | All business data |
| Director | All business data |

Examples:

```text
Marketing A
    |
    +-- Can view Leads
    +-- Only assigned/authorized leads
```

While:

```text
Manager
    |
    +-- Can view Leads
    +-- All leads
```

Data scope must be enforced server-side.

---

## 28. Role Permission Map

For the first version, permissions can be defined in code.

Example:

```ts
const ROLE_PERMISSIONS = {
  ADMIN: [
    "dashboard.view",
    "project.view",
    "project.create",
    "project.update",
    "project.delete",
    "product.view",
    "product.create",
    "product.update",
    "product.delete",
    "unit.view",
    "unit.create",
    "unit.update",
    "unit.bulk_create",
    "unit.hold",
    "unit.release_hold",
    "unit.book",
    "unit.cancel_booking",
    "unit.update_construction",
    "customer.view",
    "customer.create",
    "customer.update",
    "customer.delete",
    "lead.view",
    "lead.create",
    "lead.update",
    "lead.assign",
    "lead.activity.create",
    "lead.status.update",
    "lead.stage.update",
    "lead.followup.update",
    "activity.view",
    "activity.create",
    "report.view",
    "report.create",
    "report.update",
    "report.export",
    "user.view",
    "user.create",
    "user.update",
    "user.deactivate",
    "audit.view",
  ],

  MARKETING: [
    "dashboard.view",
    "project.view",
    "product.view",
    "unit.view",
    "unit.hold",
    "unit.release_hold",
    "customer.view",
    "customer.create",
    "customer.update",
    "lead.view",
    "lead.create",
    "lead.update",
    "lead.activity.create",
    "lead.status.update",
    "lead.stage.update",
    "lead.followup.update",
    "activity.view",
    "activity.create",
    "report.view",
    "report.create",
    "report.update",
  ],

  DIGITAL_MARKETING: [
    "dashboard.view",
    "project.view",
    "product.view",
    "unit.view",
    "customer.view",
    "lead.view",
    "lead.create",
    "lead.activity.create",
    "activity.view",
    "activity.create",
    "report.view",
    "report.create",
  ],

  FIELD_SUPERVISOR: [
    "dashboard.view",
    "project.view",
    "project.progress.update",
    "product.view",
    "unit.view",
    "unit.update_construction",
    "report.view",
    "report.create",
    "report.update",
  ],

  MANAGER: [
    "dashboard.view",
    "project.view",
    "product.view",
    "unit.view",
    "customer.view",
    "lead.view",
    "activity.view",
    "report.view",
    "report.export",
  ],

  DIRECTOR: [
    "dashboard.view",
    "project.view",
    "product.view",
    "unit.view",
    "customer.view",
    "lead.view",
    "activity.view",
    "report.view",
    "report.export",
  ],
};
```

The exact list can be adjusted after the company's real authorization policy is finalized.

---

## 29. Central Permission Checker

Create a central authorization helper such as:

```text
lib/auth/permissions.ts
```

Conceptually:

```ts
hasPermission(user, "lead.update")
```

Avoid repeating raw role checks throughout the codebase.

A permission helper should be reusable by:

- Sidebar
- Buttons
- Pages
- Server actions
- API routes
- Business services

---

## 30. Frontend Authorization

Frontend navigation should hide modules the user cannot access.

Example:

```ts
const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    permission: "dashboard.view",
  },
  {
    name: "Customers",
    href: "/customers",
    permission: "customer.view",
  },
  {
    name: "Leads",
    href: "/leads",
    permission: "lead.view",
  },
];
```

Then filter using:

```ts
navigation.filter(item =>
  hasPermission(currentUser, item.permission)
)
```

The frontend is only a UX layer. It is not the security boundary.

---

## 31. Server-Side Authorization

Every protected server operation must verify:

1. User is authenticated.
2. User has the required permission.
3. User has access to the specific record/data scope.
4. The requested state transition is valid.

Examples:

```text
POST /api/leads
PATCH /api/leads/:id
POST /api/leads/:id/activities
POST /api/units/:id/hold
POST /api/units/:id/release-hold
POST /api/users
```

Conceptually:

```ts
requirePermission(user, "unit.hold");
requireDataAccess(user, unit);
```

---

## 32. State Transition Authorization

Important business processes need more than generic `update` permission.

Example:

```text
AVAILABLE -> HOLD
```

may be allowed for Marketing.

But:

```text
HOLD -> SOLD
```

should not be allowed simply because the user can update a Unit.

Validate transitions with business rules:

```ts
canTransitionUnitStatus(
  currentStatus,
  nextStatus,
  userRole
)
```

This protects inventory integrity.

---

## 33. Lead + Activity Transaction

When an Activity and Lead update are submitted together, the backend should use a database transaction.

Example:

```text
Create Activity
+
Update Lead Status
+
Update Lead Stage
+
Update Next Follow Up
```

These operations should succeed or fail together.

Conceptually:

```ts
prisma.$transaction([
  createActivity(),
  updateLead(),
]);
```

This prevents partial CRM updates.

---

## 34. Prisma Role Enum

The recommended Prisma role enum is:

```prisma
enum Role {
  ADMIN
  MARKETING
  DIGITAL_MARKETING
  FIELD_SUPERVISOR
  MANAGER
  DIRECTOR
}
```

Do not keep a generic `STAFF` or `MANAGEMENT` role if the application adopts this six-role structure.

If the existing database contains old roles, migrate existing users before removing old enum values.

---

## 35. Sidebar Configuration

The current sidebar can use the six roles:

```ts
const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    roles: [
      "ADMIN",
      "MARKETING",
      "DIGITAL_MARKETING",
      "FIELD_SUPERVISOR",
      "MANAGER",
      "DIRECTOR",
    ],
  },
  {
    name: "Unit Perumahan",
    href: "/units",
    roles: [
      "ADMIN",
      "MARKETING",
      "DIGITAL_MARKETING",
      "FIELD_SUPERVISOR",
      "MANAGER",
      "DIRECTOR",
    ],
  },
  {
    name: "Customer",
    href: "/customers",
    roles: [
      "ADMIN",
      "MARKETING",
      "DIGITAL_MARKETING",
      "MANAGER",
      "DIRECTOR",
    ],
  },
  {
    name: "Leads / Prospek",
    href: "/leads",
    roles: [
      "ADMIN",
      "MARKETING",
      "DIGITAL_MARKETING",
      "MANAGER",
      "DIRECTOR",
    ],
  },
  {
    name: "Activities",
    href: "/activities",
    roles: [
      "ADMIN",
      "MARKETING",
      "DIGITAL_MARKETING",
      "MANAGER",
      "DIRECTOR",
    ],
  },
  {
    name: "Laporan Harian",
    href: "/reports",
    roles: [
      "ADMIN",
      "MARKETING",
      "DIGITAL_MARKETING",
      "FIELD_SUPERVISOR",
      "MANAGER",
      "DIRECTOR",
    ],
  },
  {
    name: "Projects",
    href: "/projects",
    roles: [
      "ADMIN",
      "MARKETING",
      "DIGITAL_MARKETING",
      "FIELD_SUPERVISOR",
      "MANAGER",
      "DIRECTOR",
    ],
  },
  {
    name: "Products",
    href: "/products",
    roles: [
      "ADMIN",
      "MARKETING",
      "DIGITAL_MARKETING",
      "FIELD_SUPERVISOR",
      "MANAGER",
      "DIRECTOR",
    ],
  },
  {
    name: "Users",
    href: "/users",
    roles: ["ADMIN"],
  },
  {
    name: "Audit Log",
    href: "/audit-logs",
    roles: ["ADMIN"],
  },
];
```

Long-term, migrate navigation from raw roles to permissions.

---

## 36. Profile and Settings

Profile and Settings are separate from operational modules.

Header menu:

```text
Profile
Settings
Logout
```

### Profile

Recommended:

- Name
- Username
- Email
- Phone
- Role
- Change password

### Settings

General application/user preferences and system settings appropriate to the user's role.

Product management remains under:

```text
Products
```

and should not be moved into Settings.

---

## 37. URL Architecture

All roles use the same application routes.

Do not create separate route trees such as:

```text
/admin/*
/marketing/*
/staff/*
```

Use common routes:

```text
/dashboard
/projects
/products
/units
/customers
/leads
/activities
/reports
/users
/audit-logs
```

Authorization determines what the current user can see and do.

---

## 38. Security Rules

The following rules are mandatory:

1. Never trust the frontend to enforce authorization.
2. Never rely only on hidden navigation items.
3. Validate permissions on the server.
4. Validate data scope on the server.
5. Validate important state transitions on the server.
6. Record important operational changes in Audit Logs.
7. Use the authenticated user's ID as the Activity author.
8. Do not allow users to impersonate another Activity author.
9. Validate Lead status/stage transitions.
10. Validate Unit availability transitions.
11. Passwords must never be stored as plaintext in production.
12. Deactivating a user must not delete historical Activities or Audit Logs.

---

## 39. Implementation Order

### Phase 1 — Roles

Update Prisma:

```prisma
enum Role {
  ADMIN
  MARKETING
  DIGITAL_MARKETING
  FIELD_SUPERVISOR
  MANAGER
  DIRECTOR
}
```

Run the appropriate database migration.

### Phase 2 — Authentication

Ensure the authenticated session contains:

```text
user.id
user.username
user.name
user.role
user.isActive
```

### Phase 3 — Permission Map

Create:

```text
lib/auth/permissions.ts
```

with:

```text
ROLE_PERMISSIONS
hasPermission()
```

### Phase 4 — Route Protection

Protect pages, API routes, and server actions.

### Phase 5 — Navigation

Filter sidebar navigation based on permissions.

### Phase 6 — Action-Level Controls

Control buttons such as:

```text
+ Add Customer
+ Add Lead
+ Add Unit
Hold Unit
Release Hold
Edit Product
Update Progress
```

### Phase 7 — Data Scope

Implement record-level access:

```text
Marketing -> assigned leads
Field Supervisor -> assigned projects
Manager -> all business data
Director -> all business data
Admin -> all data
```

### Phase 8 — Audit

Add AuditLog entries to important mutations:

```text
Create User
Deactivate User
Create Product
Update Product
Create Unit
Hold Unit
Release Unit
Book Unit
Cancel Booking
Update Lead Status
Update Lead Stage
Assign Lead
```

---

## 40. Target Authorization Architecture

```text
                    +-------------------+
                    | Authenticated User|
                    +---------+---------+
                              |
                              v
                    +-------------------+
                    |       Role        |
                    +---------+---------+
                              |
                              v
                    +-------------------+
                    |    Permissions    |
                    +---------+---------+
                              |
              +---------------+---------------+
              |               |               |
              v               v               v
         Menu Access     Action Access    Data Scope
              |               |               |
              +---------------+---------------+
                              |
                              v
                    +-------------------+
                    | Server-Side Auth  |
                    +---------+---------+
                              |
                              v
                    +-------------------+
                    | Business Rules    |
                    +---------+---------+
                              |
                              v
                    +-------------------+
                    |     Database      |
                    +-------------------+
```

The system should keep these concepts separate:

- **Role** — who the user is
- **Permission** — what the user can do
- **Data Scope** — which records the user can access
- **Business Rules** — whether an operation is valid
- **Audit Log** — what actually changed

This separation should be maintained as the application grows.
