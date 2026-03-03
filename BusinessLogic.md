Business Logic – Customer Feedback, Change Request & Bug Management

1. Purpose and Scope

This document specifies the business logic, domain model, and lifecycle rules for a Customer Feedback, Change Request, and Bug Management System for the Noumena Platform and Noumena Cloud.

The system provides a transparent, auditable mechanism for customers and internal employees to raise, track, and resolve:
	•	Product feedback
	•	Change requests
	•	Bugs / defects

All items progress through a clearly defined lifecycle from creation to rejection or completion. Internal delivery work is explicitly linked to Jira tickets, ensuring end-to-end traceability between customer-facing issues and internal execution.

The specification focuses exclusively on business logic and domain rules, intended to be implemented primarily in Noumena Protocol Language (NPL). UI, infrastructure, and deployment concerns are explicitly out of scope.

⸻

2. Core Domain Concepts

2.1 Issue

An Issue represents a single unit of externally or internally raised input that requires evaluation and potential action.

Issue types:
	•	Feedback – Non-binding product input or suggestions
	•	Change Request – Request for a product or platform change
	•	Bug – Defect or malfunction in Noumena Platform or Cloud

Key attributes:
	•	issue_id – Immutable unique identifier
	•	type – Feedback | ChangeRequest | Bug
	•	title – Short summary
	•	description – Detailed problem or proposal description
	•	reporter – Actor (Customer or Employee)
	•	reported_by_role – Customer | InternalEmployee
	•	created_at – Timestamp
	•	priority – Low | Medium | High | Critical
	•	affected_product – Noumena Platform | Noumena Cloud | Both
	•	visibility – Customer-visible | Internal-only
	•	current_state – See lifecycle below

Lifecycle states:
	•	Draft – Created but not yet submitted (customers only)
	•	Submitted – Officially raised
	•	Triage – Under initial review
	•	Accepted – Approved for execution
	•	Rejected – Explicitly declined
	•	In Progress – Work ongoing
	•	Blocked – Accepted but temporarily blocked
	•	Completed – Work finished and validated
	•	Closed – Final state after completion or rejection

State transitions are strictly controlled by role-based permissions and business rules.

⸻

2.2 Actor

An Actor represents a party interacting with the system.

Actor types:
	•	Customer – External user of Noumena Platform or Cloud
	•	InternalEmployee – Noumena staff member
	•	System – Automated service actor

Attributes:
	•	actor_id – Unique identifier
	•	actor_type – Customer | InternalEmployee | System
	•	organization – Customer organization or internal department

Actors are assigned permissions via roles rather than embedded logic.

⸻

2.3 IssueLifecycle

The IssueLifecycle is the authoritative state machine governing Issue progression.

Key characteristics:
	•	Immutable event history
	•	Deterministic transitions
	•	Explicit rejection and acceptance decisions
	•	No implicit state changes

Lifecycle rules:
	•	Only Submitted issues may enter Triage
	•	Only Accepted issues may enter In Progress
	•	Rejected issues may only transition to Closed
	•	Completed issues must be explicitly Closed after validation

⸻

2.4 JiraLink

A JiraLink represents the explicit association between an Issue and internal delivery work.

Attributes:
	•	jira_ticket_id – External Jira identifier
	•	jira_project – Jira project key
	•	link_type – Primary | Secondary | Related
	•	linked_by – InternalEmployee
	•	linked_at – Timestamp

Rules:
	•	Jira links may only be added by Internal Employees
	•	At least one JiraLink is required before an Issue can move to In Progress
	•	Jira links are immutable once added (can only be superseded)

⸻

2.5 Comment & ActivityLog

All interactions are captured as immutable records.

Comment:
	•	Human-authored contextual discussion
	•	Can be customer-visible or internal-only

ActivityLog:
	•	System-generated event log
	•	Captures state changes, assignments, and links

These form the system’s audit trail.

⸻

3. Functional Capabilities

3.1 Issue Submission
	•	Customers can create and submit Feedback, Change Requests, and Bugs
	•	Internal Employees can create Issues on

⸻

4. Protocol Variable Initialization Contract (Required for Tech Specs)

To ensure deterministic code generation and valid NPL syntax, each tech spec must explicitly define initialization for every protocol variable.

Rule:
	•	Every protocol variable must be either:
		1) initialized at declaration in protocol body, or
		2) provided via protocol constructor parameter

The tech spec must state this explicitly per variable and must not leave initialization implicit.

Recommended spec table per protocol:
	•	variable_name
	•	type
	•	location: constructor | protocol_body
	•	initialization_rule:
		•	if protocol_body -> explicit initializer expression required
		•	if constructor -> marked required at protocol creation
	•	rationale (optional)

Constraint:
	•	The AI guide does not define business default values.
	•	Business/domain defaults must come from the tech spec.