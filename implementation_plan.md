# Multi-Role Authentication & License Management Plan

This document outlines the implementation plan for adding Super Admin features, user authentication, device approval workflows, and license expiration handling to the existing Mockup Dashboard.

## 1. Authentication & Role Management

### Goal
Implement secure login (registration is disabled; only Super Admins can add users) with distinct roles for `Super Admin` and `User`.

### Approach
- **Provider**: Integrating an authentication provider (e.g., NextAuth.js or a BaaS like Supabase/Clerk).
- **Database Schema**: 
  - `User` model with fields for `role` (ADMIN, USER), `licenseExpiresAt` (DateTime).
  - `License` model to track assigned plans (e.g., 1 Year) and statuses.

## 2. Super Admin Dashboard

### Goal
A dedicated dashboard for Super Admins to manage users, licenses, and global device configurations.

### Approach
- **User Management**: Pages to list, add, edit, and disable user accounts. Users cannot register themselves; the Super Admin provisions all accounts.
- **License Management**: Ability to assign specific time-bound licenses (e.g., 1 year) to existing users in the system.
- **Middleware**: Introduce Next.js Middleware to protect `/admin/*` routes strictly for Super Admins.

## 3. Custom Device Workflow

### Goal
Allow users to add new phone/laptop mockup devices. Devices added by a user are immediately available to them locally, but require Super Admin approval to become globally available to everyone.

### Approach
- **Database Schema**:
  - `Device` model with an `ownerId` (User who added it or null for global) and an `isGlobal` boolean field.
- **User Flow**: User clicks "Add Custom Device" and enters details. The device is instantly available in *their* personal list. The user can then click "Request Global Access", which sends a notification to the Super Admin.
- **Admin Notification**: Super Admin receives an in-app notification when a device is requested to be made global.
- **Admin Flow**: Admin reviews the requested device and clicks "Approve" (makes it visible to all users by setting `isGlobal=true`) or "Reject/Keep Private".

## 4. License Expiration & Notifications

### Goal
Notify users before their license expires and restrict access once expired.

### Approach
- **Access Control Rule**: If `currentDate > user.licenseExpiresAt`, redirect the user to a "Subscription Expired" page and disable mockup creation features.
- **Notification System**: Include an in-app banner or warning for users whose license expires within the next 30 days.
- **Automated Checks**: A background cron job or daily scheduled function to check for licenses expiring soon and sending out email notifications.

---

> [!IMPORTANT]
> User Review Required:
> - **Authentication Standard**: Do you have a preferred authentication provider (NextAuth, Supabase, Firebase) or database (PostgreSQL vs MongoDB)?

## Verification Plan
1. **Auth Verification**: Test Login and verify that no self-registration endpoint exists. Verify Middleware redirects by attempting to access protected admin pages as a regular user.
2. **Device Flow Verification**: Add a device as a User, verify it *only* appears in that specific user's list. Request global access, approve it as Admin, and verify it becomes globally accessible to other users.
3. **Expiration Verification**: Manually set a test user's `licenseExpiresAt` to a past date and confirm they are locked out of the editor. Set to a future date within 30 days and confirm the warning banner appears.
