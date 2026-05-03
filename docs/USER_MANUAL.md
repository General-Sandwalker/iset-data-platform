# ISET Tozeur Digital Observatory — User Manual

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Admin Guide](#2-admin-guide)
3. [Responsable Observatoire Guide](#3-responsable-observatoire-guide)
4. [Teacher Guide](#4-teacher-guide)
5. [Student Guide](#5-student-guide)
6. [Alumni Guide](#6-alumni-guide)
7. [Public Access](#7-public-access)

---

## 1. Getting Started

### Logging In

1. Open your browser and navigate to the platform URL (e.g., `http://localhost:3000`)
2. Click **Login** on the landing page
3. Enter your **CIN** (8-digit national ID) or **username** (for super admin) and your **password**
4. On first login with a temporary password, you will be prompted to change it
5. After login, you are redirected to your role-specific dashboard

### Password Management

- **Change password:** Click your name in the top-right corner, then navigate to your profile page
- **Password reset:** Contact an administrator to reset your password. They will provide a new temporary password

### Navigation

Each role has its own sidebar menu. The sidebar can be collapsed/expanded using the toggle button in the header. A breadcrumb at the top shows your current location within the application.

### Theme

Toggle between light and dark mode using the sun/moon switch in the header bar.

---

## 2. Admin Guide

Admins (super_admin and admin) have full access to all platform features.

### 2.1 Dashboard

The admin dashboard at `/admin` shows:
- **Platform statistics:** Total Users, Active Surveys, Data Tables, Dashboards
- **Quick actions:** Create User, Import Data, New Survey, New Chart
- **Recent activity:** Latest platform actions

### 2.2 User Management

Navigate to **Users** in the sidebar.

**Create a single user:**
1. Click **Add User**
2. Fill in: CIN, Email, First Name, Last Name, Role, Phone (optional)
3. Click **Create** — a temporary password is generated automatically
4. Share the temporary password with the user

**Bulk import users:**
1. Click **Import Users**
2. Upload a CSV or Excel file with columns matching the user fields
3. Preview and confirm the import

**Edit a user:**
1. Find the user in the table (search by CIN or name, filter by role)
2. Click the edit icon
3. Update any field (role, email, active status, etc.)

**Reset password:**
1. Find the user in the table
2. Click the key/reset icon
3. A new temporary password is generated — share it with the user

**Deactivate a user:**
1. Edit the user
2. Toggle **Active** to off
3. The user cannot log in until reactivated

### 2.3 Visual Database Manager

Navigate to **Database** in the sidebar.

**Create a new table:**
1. Click **New Table**
2. Enter: Name (lowercase, underscores only), Display Name, Description
3. Toggle **User Linked** if this table should track data per-user by CIN
4. Click **Create** — the physical table `dt_<name>` is created in PostgreSQL

**Add fields to a table:**
1. Select the table from the list
2. Click **Add Field**
3. Choose a field type (text, number, decimal, date, datetime, boolean, select, multiselect, email, phone, file, user_link)
4. For select/multiselect: add options in the config
5. Set whether the field is required
6. Click **Add** — the column is added to the physical table

**Define relationships:**
1. In the table view, click the **Relationships** tab
2. Click **Add Relationship**
3. Select source table, source field, target table, relationship type (one_to_many or many_to_one)

**Browse and edit data:**
1. Select a table
2. Click the **Data** tab
3. Browse records with pagination, search, and filters
4. Click a row to edit, or click **Add Record** to insert new data
5. Inline editing is available for individual cells

**Delete a table (super_admin only):**
1. Select the table
2. Click **Delete Table**
3. Confirm — this drops the physical table and all data permanently

### 2.4 Data Import

Navigate to **Import** in the sidebar.

**Import workflow:**
1. **Upload:** Drag and drop or select a CSV, Excel (.xlsx/.xls), or JSON file (max 50MB)
2. **Preview:** See detected columns and sample rows
3. **Map:** Assign each file column to a target table field, optionally select a transform (uppercase, lowercase, trim, date_iso, date_fr, number, boolean)
4. **Validate:** Preview which rows will import successfully and which have errors
5. **Execute:** Click **Import** to insert valid rows. Review the summary (imported, errors)

**Create table from import:**
- Click **Auto-generate table with AI** to have Groq suggest a table structure based on the file's columns and sample data
- Or manually create a new table and import in one step using **Create Table and Import**

**Import history:**
- Switch to the **History** tab to see all past imports with their status and error counts

### 2.5 Survey Builder

Navigate to **Surveys** in the sidebar.

**Create a survey:**
1. Click **New Survey**
2. Enter title, description, access type (public or authenticated), and whether multiple responses are allowed
3. Optionally link to a dynamic table (survey responses will be stored there)

**Add questions:**
1. Click on the survey to open the builder
2. Click **Add Question** or use the **AI Generate** button (robot icon) to auto-generate questions
3. For each question, set:
   - **Type:** multiple_choice, text, rating, dropdown, checkbox, date, number
   - **Label:** The question text
   - **Options:** For choice-type questions, add the available options
   - **Required:** Whether the question must be answered
4. Drag questions to reorder them
5. Optionally map questions to database fields (for table-linked surveys)

**Publish a survey:**
1. Click **Publish** — the survey becomes accessible via a public URL
2. Share the URL with respondents

**View results:**
1. Click **Stats** on the survey card
2. See response count, per-question breakdowns, and distribution charts

**Close a survey:**
- Click **Close** to stop accepting responses

### 2.6 Chart and Dashboard Builder

Navigate to **Visualizations > Charts** in the sidebar.

**Create a chart:**
1. Click **New Chart**
2. Select a source table
3. Write a SQL query or use the **AI Suggest** button to generate one from a description
4. Choose a chart type (bar, line, pie, donut, area, scatter, table, metric, horizontal_bar, radar)
5. Click **Execute** to preview
6. Save the chart

**Build a dashboard:**
1. Navigate to **Visualizations > Dashboards**
2. Click **New Dashboard**
3. Enter title and description
4. Click on the dashboard, then **Add Chart**
5. Select charts, set their grid position (X, Y) and size (width, height from 1-12)
6. **Publish** the dashboard to make it publicly accessible via a URL

**Execute raw SQL:**
- In the chart editor, use the **SQL Editor** tab to write and test SELECT queries against dynamic tables
- Queries are validated (SELECT only) and run in read-only transactions with a 10-second timeout

### 2.7 Report Center

Navigate to **Reports** in the sidebar.

**Create a report template:**
1. Click **New Template**
2. Enter name, description, and prompt template (use `{{cin}}` placeholder for the student's CIN)
3. Optionally link to a target table
4. The prompt template instructs the AI on what to include in the report

**Generate a single report:**
1. Select a template
2. Click **Generate Report**
3. Enter the student's CIN
4. The AI fetches the student's data from all linked tables and generates a structured report
5. Preview the report, then export as PDF or Excel

**Batch generate reports:**
1. Click **Batch Generate**
2. Enter multiple CINs (up to 50)
3. Reports are generated for each student
4. Download all as a ZIP file

### 2.8 Analytics

Navigate to **Analytics** in the sidebar.

**Academic Analytics:**
- Enrollment statistics by year, filiere, niveau, genre
- Success rates
- Teacher statistics
- Formation statistics
- Event statistics

**Insertion Analytics:**
- Professional insertion rates by promotion, filiere, year
- Employment delay analysis
- Sector distribution
- Contract type breakdown

**Setup:** Before analytics work, you must map dynamic tables to analytics categories in **Analytics > Mappings**. Map each key (students, teachers, formations, events, alumni) to the corresponding dynamic table.

### 2.9 Partnerships

Navigate to **Partnerships** in the sidebar.

**Manage companies:**
1. Add companies with name, sector, address, and contact info
2. View details in a slide-out drawer showing the company timeline

**Manage offers:**
1. Add internship (stage) or employment (emploi) offers
2. Set publish and expiry dates
3. Toggle active/inactive

**Manage collaborations:**
1. Record collaboration events with companies
2. Track by academic year

### 2.10 System Settings

Navigate to **Settings** in the sidebar.

**Academic Years:**
- Create, edit, delete academic years
- Set the current academic year (only one can be current at a time)

**System Settings:**
- Key-value configuration pairs for platform behavior

**Activity Logs:**
- View a paginated log of all platform actions (who did what, when, from where)
- Filter by user or action type

---

## 3. Responsable Observatoire Guide

The Responsable Observatoire has access to data management and analytics features but cannot manage users, database schema, or system settings.

### Access via Admin Area

Navigate to `/admin`. Available sidebar items:

- **Dashboard** — Platform overview
- **Import** — Import data into dynamic tables
- **Surveys** — Create, edit, publish surveys; view stats
- **Visualizations** — Charts and Dashboards (create, edit, publish)
- **Reports** — Report templates, AI generation, exports
- **Analytics** — Academic and insertion analytics
- **Partnerships** — Companies, offers, collaborations

### Access via Observatoire Portal

Navigate to `/observatoire`. Available sidebar items:

- **Dashboard** — Observatory-specific stats
- **Academic Analytics** — Same analytics as admin area
- **Insertion Analytics** — Same analytics as admin area
- **Surveys** — Same survey builder as admin area
- **Charts** — Same chart builder as admin area
- **Reports** — Same report center as admin area
- **Profile** — Edit personal information and change password

### Not Available

- User Management
- Database Schema Management
- System Settings / Activity Logs
- Batch report generation (single CIN only)
- Raw SQL execution

---

## 4. Teacher Guide

Teachers have read-only access to surveys, dashboards, and their own profile.

### Dashboard

Navigate to `/teacher/dashboard`:
- Available surveys count
- Data tables count
- Published dashboards count

### Surveys

1. Browse available surveys at `/teacher/surveys`
2. Click on a survey to fill it out
3. Submit your responses

### Dashboards

1. Browse published dashboards at `/teacher/dashboards`
2. View interactive charts with live data

### Profile

- Edit first name, last name, email at `/teacher/profile`
- Change your password

---

## 5. Student Guide

Students can view their personal data, take surveys, and view dashboards.

### Dashboard

Navigate to `/student/dashboard`:
- Available surveys count
- Your records count (across all tables)
- Published dashboards count

### Surveys

1. Browse available surveys at `/student/surveys`
2. Click on a survey to fill it out
3. Submit your responses

### My Data

Navigate to `/student/my-data`:
- See all database records linked to your CIN across all user-linked tables
- Records are organized by table in collapsible sections

### Dashboards

1. Browse published dashboards at `/student/dashboards`
2. View interactive charts

### Profile

- Edit first name, last name, email at `/student/profile`
- Change your password
- View your CIN and role information

---

## 6. Alumni Guide

Alumni can manage their professional profile, take surveys, and view insertion dashboards.

### Dashboard

Navigate to `/alumni/dashboard`:
- Available surveys count
- Your records count
- Insertion dashboards count

### Professional Profile

Navigate to `/alumni/profile`:
- **Personal Information:** Edit first name, last name, email, change password
- **Professional Situation:** View your data from insertion-related surveys and dynamic tables (employment status, career info, etc.)
- This data is automatically pulled from all user-linked tables where your CIN appears

### Surveys

1. Browse surveys at `/alumni/surveys` (especially insertion tracking surveys)
2. Fill out and submit responses

### Dashboards

1. Browse insertion dashboards at `/alumni/dashboards`
2. View professional insertion statistics and trends

---

## 7. Public Access

The platform has several public-facing pages that don't require authentication:

### Landing Page

- Visit the platform root URL
- See platform features, live statistics, and links to public dashboards
- Click **Login** to access your portal

### Public Dashboards

- Access published dashboards via their public URL (`/public/dashboards/<slug>`)
- View interactive charts with live data
- No login required

### Public Surveys

- Access published surveys via their public URL (`/public/surveys/<slug>`)
- Fill out and submit responses
- No login required for public surveys
- Authenticated surveys (access type = `authenticated`) require login before submission
