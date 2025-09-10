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
- In the utility, choose the target user set.
- Verify the set name, ID, and size of the set is correct.

3) Choose a Meta Action
- Delete All: Permanently delete all notes for users in the selected set.
- Modify/Delete: Proceed to menu-based options to selectively modify or delete matching notes.

4) Menu-Based Modification (when using Modify/Delete)
- Select matching criteria:
  - Text match
      - This is a simple text string match. You can choose to only use a Case-Sensitive match.
  - Date match
    
- Choose what to do with matches:
  - Toggle popup (Yes/No)
  - Toggle user-viewable (Yes/No)
  - Change note type
  - Delete only the matched notes

5) Run the Job
- Click 'Execute Job' and wait for completion. Larger sets will take longer... don't navigate away.
- Review the on-screen results for successes and errors.

## Export Results as CSV
- After a run, export job results as a CSV for auditing or record-keeping.
- The CSV includes a job header (start/end time, configuration, counts) and detailed rows per note (modified or deleted).
- Use the “Export CSV” action to download the file.
