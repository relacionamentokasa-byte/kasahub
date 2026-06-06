The goal is to implement a native integration between KASA HUB's Agenda module and Google Calendar. This includes bidirectionalsync, connection management, and automatic event creation for jobs, contracts, finance, etc.

### Database Changes
*   **google_calendar_connections**: Store user-specific connection info (user_id, google_account_email, selected_calendar_id, sync_enabled, etc.).
*   **calendar_events**: Add `google_event_id` column to track external events and avoid duplicates.
*   **google_sync_logs**: Track synchronization history for debugging.

### Edge Functions
*   **google-calendar-sync**:
    *   Handle OAuth flow/token refresh (via Lovable Connectors).
    *   `sync-to-google`: Push local events (jobs, contracts, manual) to Google.
    *   `sync-from-google`: Pull events from Google into KASA HUB.
    *   `webhook-handler`: (Optional/Future) Listen for Google Calendar push notifications.

### Frontend Components
*   **Configurações > Integrações > Google Calendar**:
    *   Connection toggle using `standard_connectors--connect`.
    *   Settings for selecting main calendar and enabling auto-sync.
    *   Button to "Import Existing Events".
*   **Agenda (Calendário)**:
    *   Add filters: "Todos", "Apenas Google", "Apenas Sistema", "Jobs", etc.
    *   Ensure responsiveness across mobile/tablet/desktop.
*   **Dashboard**:
    *   New "Agenda de Hoje" widget showing upcoming events.

### Automated Events
*   Modify `createJob`, `createApproval`, and finance/contract functions to ensure they emit calendar events or that a trigger handles them.
*   Implement background sync for bidirectionality.

### Technical Details
*   Use `standard_connectors` for Google Calendar authentication.
*   React Query for state management.
*   Tailwind CSS for responsive UI.
*   Supabase triggers/functions for automatic event generation on system entities.
