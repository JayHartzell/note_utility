# User Note Utility

A lightweight tool to bulk modify or delete user notes.

## Disclaimer

- All actions on notes are permanent and cannot be undone.
- Review your selections carefully before running any job.
- Test on a few users first to verify the date or text match.
- It is recommended to run this on sets of a few hundred users or less.

## Workflow

1) Open the Cloud App
- Click the Pin button at the top-right of the screen so that the window doesn't minimize.
  
1) Navigate to a Valid User Set
- Navigate to *Admin* > *Manage Sets* and locate the Users set you want to modify. You'll probably use Analytics to build the set.

2) Select the Set
- In the utility, choose the target User set.
- Verify the set name, ID, and size of the set is correct.

3) Choose a Meta Action
- Delete All: Permanently delete all notes for users in the selected set.
- Modify/Delete: Proceed to menu-based options to selectively modify or delete matching notes.

4) Menu-Based Modification (when using Modify/Delete)
- Select matching criteria:
  - **Text match**
      - Enter the text to match on
      - From the dropdown, select the match mode:
        
        **Substring Mode (Default)**
        - Matches if the search text appears anywhere within the note
        - Case-insensitive and accent-insensitive by default
        - Examples with search text `"tech"`:
          - ✅ "Technology request submitted"
          - ✅ "User needs technical support"
          - ✅ "Contact biotech department"
          - ❌ "User prefers email communication"
        
        **Whole Word Mode**
        - Matches only complete words, not partial matches
        - Respects word boundaries (spaces, punctuation)
        - Case-insensitive and accent-insensitive by default
        - Examples with search text `"tech"`:
          - ✅ "Need tech support immediately"
          - ✅ "Contact tech department"
          - ❌ "Technology request submitted" (partial match)
          - ❌ "User needs technical support" (partial match)
        
        **Exact Mode**
        - Matches only when the entire note text is identical to search text
        - Case-insensitive and accent-insensitive by default
        - Examples with search text `"User has a phone charger in Lost and Found"`:
          - ✅ "User has a phone charger in Lost and Found"
          - ✅ "USER HAS A PHONE CHARGER IN LOST AND FOUND" (case differences ignored)
          - ✅ "Usér has a phoné chargér in Lost and Found" (accent differences ignored)
          - ❌ "User has a phone charger in Lost and Found - picked up" (extra text)
          - ❌ "Note: User has a phone charger in Lost and Found" (extra text)
      
      - **Advanced Options:**
        - **Case Sensitive**: When enabled, "Tech" will not match "tech"
        - **Ignore Accents**: When enabled (default), "resume" matches "résumé"
        
  - **Date match**
    - Select notes created within a specific date range
    - Use start date, end date, or both to define the range
    - Dates are inclusive (notes created on the boundary dates are included)
    
- Choose what to do with matches:
  - Toggle popup (Yes/No)
  - Toggle user-viewable (Yes/No)
  - Change note type
  - Delete only the matched notes

5) Run the Job
- Click 'Execute Job' and wait for completion. Larger sets will take longer... don't navigate away.
- Review the on-screen results for successes and errors.

## Important Note Filtering

**Only Internal Segment Notes Are Processed**
- The utility automatically filters to process only notes with "Internal" segment type
- Notes with "External" segment type are left unchanged

## Text Matching Examples

### Substring Examples
Search for `"request"`:
- ✅ "Technology request submitted"
- ✅ "Urgent request for access"
- ✅ "User requesting password reset"
- ✅ "Special accommodation request needed"

### Whole Word Examples  
Search for `"ID"`:
- ✅ "Student ID: 12345"
- ✅ "Update user ID information"
- ❌ "User needs guidance" (partial match in "guidance")
- ❌ "Invalid credentials" (partial match in "Invalid")

### Exact Match Examples
Search for `"User has a phone charger in Lost and Found"`:
- ✅ "User has a phone charger in Lost and Found"
- ✅ "USER HAS A PHONE CHARGER IN LOST AND FOUND"
- ❌ "User has a phone charger in Lost and Found - picked up"
- ❌ "Note: User has a phone charger in Lost and Found"

## Export Results as CSV
- After a run, export job results as a CSV for auditing or record-keeping.
- The CSV includes a job header (start/end time, configuration, counts) and detailed rows per note (modified or deleted).
- Use the "Export CSV" action to download the file.

## Performance Recommendations

- **Small Sets**: Sets under 100 users process quickly (under 1 minute)
- **Medium Sets**: Sets of 100-500 users may take 2-5 minutes
- **Large Sets**: Sets over 500 users should be broken down for better performance
- Always test with a small subset first to verify your search criteria work as expected
