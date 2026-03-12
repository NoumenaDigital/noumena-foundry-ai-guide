# Business Logic – [Application Name]

## 1. Purpose and Scope

This document describes the business logic, functional scope, and role model for a **[brief description of application domain]** built using the **Noumena Protocol Language (NPL)**.

The application is intended to **[describe the primary purpose and target use case]**.

The focus is explicitly on *business logic and domain modeling*, not UI or infrastructure concerns.

> **Guidance:** 
> - Clearly state what problem the application solves
> - Define the target users or use cases
> - Keep it focused on business logic, not technical implementation details

---

## 2. Core Domain Concepts

### 2.1 [Primary Entity 1]
A **[Entity Name]** represents **[what it represents in the business domain]**.

Typical attributes:
- **[Attribute 1]** - [Description]
- **[Attribute 2]** - [Description]
- **[Attribute 3]** - [Description]
- **[State/Status attributes]** - [List possible states]

**[Additional context about the entity - relationships, lifecycle, constraints, etc.]**

### 2.2 [Primary Entity 2]
A **[Entity Name]** represents **[what it represents in the business domain]**.

Attributes:
- **[Attribute 1]** - [Description]
- **[Attribute 2]** - [Description]
- **[State/Status attributes]** - [List possible states]

**[Additional context about the entity]**

### 2.3 [Aggregate/Composite Entity]
The **[Entity Name]** is **[aggregate view or composite concept]**.

Key concepts:
- **[Concept 1]** - [Description]
- **[Concept 2]** - [Description]
- **[Derived/calculated concepts]** - [Description]

**[How state is derived or maintained]**

### 2.4 [Policy/Rule Entity]
A **[Entity Name]** defines **[what rules or policies it represents]**.

Examples:
- **[Policy type 1]** - [Description]
- **[Policy type 2]** - [Description]
- **[Policy type 3]** - [Description]

Policies can be:
- **[Scope 1]** (e.g., global, per-user, per-entity)
- **[Scope 2]** (e.g., role-based, time-based)

This is a critical domain object in NPL terms.

> **Guidance:**
> - Identify 3-5 core domain entities that represent the main business concepts
> - For each entity, list key attributes and their types
> - Describe relationships between entities
> - Identify entities that represent policies, rules, or configurations
> - Consider lifecycle and state transitions for each entity

---

## 3. Functional Capabilities

### 3.1 [Core Functionality Area 1]
- **[Capability 1]** - [Brief description]
- **[Capability 2]** - [Brief description]
- **[Capability 3]** - [Brief description]

### 3.2 [Core Functionality Area 2]
- **[Capability 1]** - [Brief description]
- **[Capability 2]** - [Brief description]
- **[Workflow/process description]** - [If applicable]

### 3.3 [Knowledge/Data Management]
- **[Data capture capability]** - [Description]
- **[Data enrichment capability]** - [Description]
- **[External integration]** - [If applicable]

### 3.4 [Automation/Intelligence]
- **[Automated process 1]** - [Description]
- **[Automated process 2]** - [Description]
- **[Decision support]** - [If applicable]

### 3.5 Reporting & Insights
- **[Report type 1]** - [Description]
- **[Report type 2]** - [Description]
- **[Analytics/insights]** - [If applicable]

### 3.6 Audit & Compliance
- Immutable event log for:
  - **[Event type 1]**
  - **[Event type 2]**
  - **[Event type 3]**
- Exportable reports
- Read-only audit views

> **Guidance:**
> - Break down functionality into logical areas (typically 4-6 areas)
> - Think about CRUD operations, workflows, reporting, and compliance
> - Consider what automated processes or intelligence the system should provide
> - Always include audit/compliance if state changes occur

---

## 4. Role Model

Roles should be implemented as **permission bundles** in NPL, not as hard-coded logic.

### 4.1 [Primary Authority Role]
The ultimate authority over **[domain/scope]**.

Capabilities:
- **[Capability 1]** - [Description]
- **[Capability 2]** - [Description]
- **[Administrative capability]** - [Description]

### 4.2 [Operational Role]
**[Role description - typically day-to-day operations]**.

Capabilities:
- **[Operational capability 1]** - [Description]
- **[Operational capability 2]** - [Description]
- **[Limited administrative capability]** - [Description]

Restrictions:
- **[Restriction 1]** - [What they cannot do]
- **[Restriction 2]** - [What requires approval]

### 4.3 [Standard User Role]
A regular **[domain]** user.

Capabilities:
- **[User capability 1]** - [Description]
- **[User capability 2]** - [Description]

Restrictions:
- **[Restriction 1]** - [What they cannot do]
- **[Restriction 2]** - [What is limited]

### 4.4 [Limited Access Role]
A limited-access role.

Capabilities:
- **[Limited capability 1]** - [Description]
- **[Request capability]** - [If applicable]

Restrictions:
- **[Restriction 1]** - [What they cannot do directly]
- **[Restriction 2]** - [What requires approval]

### 4.5 Auditor (Optional)
Read-only oversight role.

Capabilities:
- View **[data/entities]**, logs, and reports
- Export data

Restrictions:
- No state-changing actions

### 4.6 System Admin
Technical administration role.

Capabilities:
- Manage system configuration
- Manage integrations and service accounts
- Backup and restore

Restrictions:
- No implicit **[domain]** rights

### 4.7 Service Account
Non-human actor.

Capabilities:
- **[Automated capability 1]** - [Description]
- **[Automated capability 2]** - [Description]

Restrictions:
- No human-facing permissions

> **Guidance:**
> - Define 3-7 roles based on your domain
> - For each role, clearly list capabilities (what they can do)
> - For each role, list restrictions (what they cannot do or what requires approval)
> - Consider: Owner/Admin, Manager/Operator, User, Guest, Auditor, System Admin, Service Account
> - Roles should map to parties in NPL protocols

---

## 5. Key Business Rules

- **[Rule 1]** - [Critical business rule that must be enforced]
- **[Rule 2]** - [State transition or validation rule]
- **[Rule 3]** - [Policy evaluation rule]
- **[Rule 4]** - [Access control or permission rule]
- **[Rule 5]** - [Data integrity or audit rule]

> **Guidance:**
> - List 3-7 critical business rules that must be enforced
> - These should be rules that the NPL protocols will enforce
> - Consider: state transitions, validations, policy evaluations, access control, audit requirements
> - Rules should be specific and enforceable

---

## 6. Fit with Noumena Protocol Language

This domain is well-suited for NPL because:
- Strongly typed domain objects ([Entity 1], [Entity 2], [Entity 3])
- Explicit permissions and role-based authority
- Event-sourced state transitions
- Deterministic evaluation of **[rules/policies]**
- Clear separation between human and system actors

The application logic should primarily live in NPL definitions, with UI and integrations acting as thin adapters.

> **Guidance:**
> - Explain why NPL is a good fit for this domain
> - Highlight aspects like: strong typing, permissions, state management, event sourcing, actor separation
> - This section validates that the domain is appropriate for NPL

---

## 7. Out of Scope (for Initial Version)

- **[Feature 1]** - [Why it's out of scope]
- **[Feature 2]** - [Why it's out of scope]
- **[Feature 3]** - [Why it's out of scope]
- **[Integration 1]** - [If applicable]

> **Guidance:**
> - List features that are explicitly NOT part of the initial version
> - Helps scope the project and avoid scope creep
> - Consider: advanced features, integrations, compliance beyond basics, etc.

---

## Additional Sections (Optional)

### 8. Integration Points
- **[External system 1]** - [How it integrates]
- **[External system 2]** - [How it integrates]

### 9. Data Model Relationships
- **[Entity 1]** → **[Entity 2]** - [Relationship type]
- **[Entity 2]** → **[Entity 3]** - [Relationship type]

### 10. Workflow Diagrams
**[If complex workflows exist, describe them here]**

> **Guidance:**
> - Add sections as needed for your specific domain
> - Consider: integrations, data relationships, workflows, compliance requirements, etc.