# PulseSync AI - User Manual

**by tsworks**

**Application URL:** [https://pulse-tsworks.replit.app/](https://pulse-tsworks.replit.app/)

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [User Roles](#user-roles)
4. [Employee Guide](#1-employee)
5. [Manager Guide](#2-manager)
6. [Senior Management Guide](#3-senior-management)
7. [Admin Guide](#4-admin)
8. [Sample Login Credentials](#sample-login-credentials)
9. [Common Features](#common-features)

---

## Overview

PulseSync AI is a Performance Intelligence platform that helps organizations monitor employee satisfaction, detect burnout risks, and facilitate manager-employee accountability. The platform uses AI-powered sentiment analysis (displayed as a "Wellness Score" on a 0-10 scale) to analyze employee feedback and surface actionable insights across the organization.

### Key Capabilities

- Monthly employee feedback collection with AI-powered sentiment analysis
- Role-based dashboards for Employees, Managers, Senior Management, and Admins
- Burnout detection and wellness tracking
- Manager review workflow with per-field commenting
- Action items management for accountability
- Peer recognition (Kudos) system with leaderboard
- Anonymous manager feedback by employees (visible only to senior management)
- Department, Project, and Employee-level analytics
- AI-analyzed blocker themes across teams

---

## Getting Started

1. Open the application at [https://pulse-tsworks.replit.app/](https://pulse-tsworks.replit.app/)
2. Log in with your email and password
3. New users can register via the Sign Up form (registration requires admin approval before access is granted)
4. Once logged in, the sidebar on the left provides navigation to all features available for your role
5. If you forget your password, use the "Forgot Password" link on the login page to request a reset (admin must approve the reset)

---

## User Roles

PulseSync AI has four types of users. Each role sees a different set of features based on their responsibilities:

| Role | Description | Key Permissions |
|------|-------------|----------------|
| **Employee** | Individual contributors who submit feedback | Submit monthly feedback, view personal dashboard, give/receive kudos, submit anonymous manager feedback |
| **Manager** | Team leads who oversee employees | Everything an Employee can do, plus: view team radar, conduct 1-on-1 reviews, manage action items, track employee progress |
| **Senior Management** | Executives who oversee the organization | View all dashboards, department/project/manager/employee analytics, burnout alerts, anonymous manager feedback from employees |
| **Admin** | System administrator | Full user management: create, approve, edit, delete users, assign roles, approve password resets |

---

## 1. Employee

### Dashboard (Home)

When an Employee logs in, they see their personal dashboard with:
- **Wellness Score** - Their latest AI-analyzed sentiment score (0-10)
- **Satisfaction Trend** - A chart showing how their satisfaction scores have changed over time
- **Recent Feedback Summary** - AI-generated summary of their latest submission
- **Action Items** - Tasks assigned to them by their manager, with status tracking

### Submit Feedback

Accessible from the **"Submit Feedback"** link in the sidebar.

Employees submit monthly feedback covering three categories:

**Execution & Impact:**
- Satisfaction Score (1-10 slider)
- Accomplishments (what went well)
- Disappointments (what didn't go well)
- Goal Progress (progress toward current goals)

**Well-being & Stability:**
- Mood (Great, Good, Neutral, Challenged, Burned Out)
- Workload Level (1-5 scale)
- Work-Life Balance (1-5 scale)
- PTO Coverage (adequate time off coverage)

**Support & Growth:**
- Blockers (what's slowing you down)
- Mentoring Culture (quality of mentoring)
- Support Needs (what support would help)
- Process Suggestions (ideas for improvement)

**Important rules:**
- Feedback is submitted once per month per period (duplicate prevention)
- You can select the submission period (current or backdated)
- Once a manager reviews your feedback, it becomes locked and cannot be edited
- Un-reviewed feedback can be edited

After submission, the AI automatically analyzes your text and generates:
- A **Wellness Score** (0-10) based on sentiment analysis
- A brief **AI Summary** of your feedback

### Recognition Wall (Kudos)

Accessible from the **"Recognition Wall"** link in the sidebar.

- **Give Kudos** - Recognize a colleague with a message and category (Teamwork, Innovation, Leadership, etc.)
- **Wall View** - See all recent kudos across the organization
- **My Kudos** - View kudos you've received
- **Leaderboard** - See who has received the most recognition

### Anonymous Manager Feedback

Employees can submit anonymous feedback about their manager. This feedback is:
- Completely anonymous (no identifying information is stored)
- Visible only to Senior Management through the Manager Insights page
- Submitted once per period per manager

---

## 2. Manager

Managers have access to everything an Employee can, plus additional team management features.

### Dashboard (Home)

The Manager dashboard shows:
- **Team Overview** - Summary KPIs for their direct reports
- **Team Wellness** - Average wellness score across the team
- **Recent Team Feedback** - Latest submissions from team members
- **Action Items Overview** - Pending tasks assigned to team members

### Submit Feedback

Managers also submit their own monthly feedback, just like employees.

### Team Radar

Accessible from the **"Team Radar"** link in the sidebar.

This is the primary team management view:
- **Burnout Radar** - Visual indicator showing which team members may be at risk based on wellness scores
- **Team Feedback Table** - Filterable table of all team feedback with period selection
- **Action Items Management** - Create, edit, complete, and delete action items for team members
- Click **"View Responses"** on any feedback entry to see the full submission details
- Click **"Review"** to start a 1-on-1 review of that feedback

### 1-on-1 Review

When a Manager clicks "Review" on a team member's feedback:
- They see the employee's feedback side-by-side with comment fields
- Each of the 12 feedback fields has its own comment box
- The review is organized into three sections: Execution & Impact, Well-being & Stability, Support & Growth
- Once the review is saved, the employee's feedback becomes locked (cannot be edited)

### Employee Progress

Click on any employee's name or use the **"View"** button to see their detailed progress:
- **Engagement Trajectory** - Chart showing satisfaction and mood trends over time
- **Goal Momentum** - Recent goal progress entries
- **Action Items** - Full CRUD management (create, update, toggle status, delete)
- **Feedback History** - All past feedback entries with expandable details showing both the employee's responses and the manager's review comments

---

## 3. Senior Management

Senior Management has the broadest view of the organization with access to all analytics and drill-down tools.

### Dashboard (Home - Organization Overview)

The Senior Management dashboard shows:
- **Organization KPIs** - Total employees, average wellness score, satisfaction scores, feedback participation rate, pending action items across the org
- **Department Summary Cards** - Quick view of each department's metrics
- **Trend Charts** - Organization-wide satisfaction and wellness trends

### Team Radar

Same as the Manager view but with visibility across all teams in the organization.

### Departments

Accessible from the **"Departments"** link in the sidebar.

- **Department Cards** - Click any department to drill down
- **Period Filter** - Select the time period (last 12 months)
- **Comparison Mode** - Compare current period vs. last month, last quarter, or view 12-month trends
- **Sentiment Distribution** - Stacked bar chart showing the distribution of Excellent/Good/Fair/Low wellness scores per department
- **AI-Analyzed Blocker Themes** - AI-identified recurring themes from employee-reported blockers, grouped by department, with severity indicators and drill-down to individual blockers
- **Employee Drill-Down** - Click a department to see individual employee performance within that department

### Projects

Accessible from the **"Projects"** link in the sidebar.

Same structure as Departments but organized by project:
- Project overview cards with satisfaction scores
- Period and comparison filters
- Sentiment distribution by project
- AI-analyzed blocker themes by project
- Employee drill-down by project

### Manager Insights

Accessible from the **"Manager Insights"** link in the sidebar.

- **Manager Performance Table** - All managers listed with their team metrics (team size, avg wellness, satisfaction, feedback rate)
- **Anonymous Employee Feedback** - View anonymous feedback that employees have submitted about their managers
- Click on any manager to see detailed team analytics

### Employees

Accessible from the **"Employees"** link in the sidebar.

- **KPI Summary Cards** - Total employees, average wellness, average satisfaction, at-risk count, employees with no feedback, pending action items
- **Search Bar** - Search by name, email, department, or project
- **Period Filter** - Filter metrics by submission period
- **Department & Role Filters** - Narrow down by department or role
- **Sortable Table** - Sort by any column (name, wellness, satisfaction, submissions, workload, work-life balance, actions)
- **Clickable Rows** - Click any employee row to navigate to their detailed progress view
- **View Button** - Quick link to the employee's full progress page

### Burnout Alerts

Accessible from the **"Burnout Alerts"** link in the sidebar.

- Lists employees who have experienced significant sentiment drops
- Highlights those at risk of burnout based on declining wellness scores
- Shows trend indicators comparing recent periods

### Recognition Wall (Kudos)

Same as the Employee view - organization-wide kudos wall, leaderboard, and personal kudos.

---

## 4. Admin

The Admin role is a special flag that can be combined with any role. Admin users see only the **User Management** page (no analytics dashboards).

### User Management

Accessible from the **"User Management"** link in the sidebar.

**User Approval:**
- New user registrations require admin approval
- View pending registrations and approve or reject them

**User Creation:**
- Create new users directly with all fields: first name, last name, email, password, role, department, project, manager email
- Users created by admin are automatically approved

**User Editing:**
- Update any user's details: name, email, role, department, project, manager assignment
- Change user passwords
- Toggle admin privileges

**User Deletion:**
- Remove users from the system

**Password Reset Approval:**
- View pending password reset requests
- Approve resets so users can set a new password

**Role Assignment:**
- Assign users to one of three roles: Employee, Manager, Senior Management
- Grant or revoke admin access

---

## Sample Login Credentials

Use these accounts to explore the application with different roles:

| Role | Email | Password | Name | Department |
|------|-------|----------|------|------------|
| **Employee** | `emp1.dea@tsworks.io` | `PulseSync@2025` | Rahul Desai | DEA |
| **Manager** | `mgr.dea1@tsworks.io` | `PulseSync@2025` | Arjun Patel | DEA |
| **Senior Management** | `sr.mgmt@tsworks.io` | `PulseSync@2025` | Sanjay Raghavan | - |
| **Admin** | `admin@pulsesync.com` | `PulseSync@2025` | System Admin | ADMIN |

> **Note:** The Admin account has the admin flag enabled and sees only the User Management page. To explore both admin and analytics features, log in separately with the Senior Management and Admin accounts.

---

## Common Features

### Navigation

- The **sidebar** on the left shows only the pages available for your role
- The **tsworks logo** appears at the top of the sidebar
- Your **name and role** appear at the bottom of the sidebar
- Click **Log Out** to sign out

### Password Reset

1. On the login page, click **"Forgot Password"**
2. Enter your registered email address
3. A reset request is sent to the Admin for approval
4. Once approved, you will receive a reset link/token to set a new password

### Feedback Periods

- Feedback is organized by month (e.g., "Feb-2026", "Jan-2026")
- Each employee can submit one feedback entry per period
- Backdated submissions are supported (submit feedback for previous months)
- Period filters are available on most analytics pages to view data for specific months

### AI-Powered Analysis

PulseSync AI uses OpenAI to provide:
- **Wellness Scores (0-10)** - Automated sentiment analysis of feedback text
- **AI Summaries** - Brief natural-language summaries of each feedback submission
- **Blocker Theme Analysis** - Groups and categorizes recurring blockers across departments and projects, identifying themes with severity ratings (high/medium/low)

### Data Privacy

- Employee feedback is visible to their direct manager and senior management
- Anonymous manager feedback cannot be traced back to the submitting employee
- Admin users manage accounts but do not have access to feedback analytics
- All passwords are securely hashed and never stored in plain text
