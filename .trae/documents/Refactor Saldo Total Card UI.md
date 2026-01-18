I will modify `pages/Dashboard.tsx` to reorganize the "Saldo Total" card elements as requested:

1.  **Hide Values Button (Eye Icon):**
    *   Move the existing "Hide Values" button **inside** the "Saldo Total" section.
    *   **Style:** Remove all borders, backgrounds, and shadows. It will be a transparent clickable element containing only the image.
    *   **Position:** Absolute positioning in the **top-left** corner (`top-6 left-6` to align with card padding).
    *   **Interaction:** Ensure `cursor-pointer` and hover opacity effects are preserved.

2.  **"Este Mês" Button:**
    *   Move the date/picker button **inside** the "Saldo Total" section.
    *   **Style:** Remove pills, backgrounds, and borders. Convert to simple bold text.
    *   **Content:** Set the text strictly to **"Este Mês"** as requested.
    *   **Position:** Absolute positioning in the **top-right** corner (`top-6 right-6` to align with card padding).
    *   **Interaction:** Retain the click action to open the Month Picker.

3.  **Cleanup:**
    *   Remove the external container bar that previously held these buttons above the card.

**Code Reference:** `pages/Dashboard.tsx`
