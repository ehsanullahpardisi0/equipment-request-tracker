# Priority Filter Specification

## Goal and user need

Managers need a faster way to focus on equipment requests needing attention. High-priority requests are the main focus, but managers must also be able to view Normal, Low, or all priorities without losing existing requests.

## Functional requirements and business rules

- Provide one visibly labeled, keyboard-accessible Priority filter dropdown with exactly these choices: All priorities, Low, Normal, High.
- Select All priorities on initial page load and after every refresh.
- All priorities displays every request. Low, Normal, and High display only requests with that priority.
- Treat an older request with no saved priority as Normal for filtering and display. Preserve its other data.
- Update the displayed list and matching request count as soon as the dropdown selection changes, without a submit button or page reload.
- Keep matching requests in the existing newest-first order. Filtering must not sort by priority or needed-by date.
- Display the number of requests matching the active filter, including zero.
- When a selected priority has no matches, display exactly: "No requests match this priority". Display no request rows.
- When there are no saved requests and All priorities is selected, retain the existing no-requests empty state and show a count of zero.
- Filtering changes only the visible list and count. It must not delete requests, change their fields or saved priorities, or replace the full saved collection with a filtered subset.
- Preserve existing request creation, validation, priority defaults, and browser storage behavior.
- After successful request creation, retain the active filter. Show the new request first if it matches, and increase the matching count by one. If it does not match, keep it saved without changing the visible matches or matching count.

## Constraints

- Work without login, a database, or external services; continue using existing browser storage.
- Do not persist the filter selection.
- Preserve all existing requests and their saved information.
- Use the existing plain HTML, CSS, and JavaScript structure. Add no frameworks, build tools, or production dependencies.
- Retain visible labels, keyboard operation, and focus indicators.
- Keep the change limited to priority filtering and its verification.

## Numbered acceptance criteria

### Manual verification setup

Use a disposable browser profile or test storage, keeping any real saved data intact. Prepare four valid requests in this known newest-first order: H-new (High), N-new (Normal), L-old (Low), H-old (High). Use different submission times and needed-by dates that do not follow the same order. Record every request's ID and field values before testing. Use a separate older valid record with its priority property absent for criterion 7.

Each criterion passes only when every stated result is observed.

1. **Initial state:** Open the application with the four setup requests saved. All priorities is selected, all four requests appear in the setup order, and the matching count is 4.
2. **Filter control:** The dropdown has a visible label and exactly All priorities, Low, Normal, and High choices. Using only the keyboard, focus the dropdown with a visible focus indicator and change its selection.
3. **High filter:** Select High. Without submitting or refreshing, only H-new and H-old appear in that order, and the matching count is 2.
4. **Normal filter:** Select Normal. Without submitting or refreshing, only N-new appears, and the matching count is 1.
5. **Low filter:** Select Low. Without submitting or refreshing, only L-old appears, and the matching count is 1.
6. **Restore all:** After filtering, select All priorities. All four original requests reappear in their original order with their recorded field values, and the matching count is 4.
7. **Older request fallback:** Load a valid older record without a saved priority. It displays Normal and appears under Normal and All priorities, but not Low or High. Counts include it only when it matches; its ID and other fields remain unchanged.
8. **No matching requests:** In test data with saved requests but no High requests, select High. No request rows appear, the matching count is 0, and "No requests match this priority" is visible. Select All priorities; all saved requests reappear.
9. **No saved requests:** With empty test storage, load the application. All priorities is selected, the count is 0, and the existing no-requests empty state appears. Select any specific priority; the count remains 0 and "No requests match this priority" appears.
10. **Refresh and preservation:** With the original setup data, select Low and refresh. All priorities is selected again, all four requests reappear in their original order with unchanged recorded values and priorities, and the count is 4.
11. **Create a matching request:** With High selected, add a valid High request. It is saved and appears first immediately; High remains selected and the matching count increases by one.
12. **Create a nonmatching request:** With High selected, add a valid Low request. High remains selected; the visible requests and matching count do not change. Select All priorities and confirm the new Low request appears first. Refresh and confirm it and all earlier requests remain saved.
13. **Existing creation behavior:** The request form initially defaults to Normal and resets to Normal after successful submission. Low, Normal, and High can still be saved and displayed correctly. Submitting with an existing required field blank shows the existing validation behavior, creates no request, and does not increase the count.
14. **No login or database:** Complete filtering and request creation in the existing browser-only application without signing in or configuring a database or external service.

## Completion

Implementation is complete when every numbered acceptance criterion is marked Pass during manual verification, applicable automated tests cover filtering and older-record behavior, and the full existing automated test suite passes. Record observed results; do not mark unperformed checks as passed.

## Explicit out-of-scope items

- Selecting multiple priorities at once.
- Sorting by priority or needed-by date, or changing newest-first ordering.
- Search or filters for other fields.
- Persisting the selected filter across refreshes.
- Login, user roles, databases, external services, or cross-device synchronization.
- Changing saved priority choices, adding priority editing, or automatically assigning urgency.
- Deleting or modifying existing requests as a consequence of filtering.
- Unrelated interface redesigns or application fixes.
