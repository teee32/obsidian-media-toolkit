# Temporary Regression Checklist

Temporary file for external test machines.
Delete this file after the regression pass is confirmed.

## Goal

Verify the latest media-processing and trash-view changes on a real Obsidian desktop build before keeping them in the main line.

## Test Environment

- Branch: `master`
- Target commit: `4604374` (`fix: stabilize media processing rename flow`)
- Build: run `npm ci` and `npm run build`
- Obsidian: desktop app, preferably 1.12.x or newer
- Vault: use a disposable test vault, not a production vault

## Test Data

Prepare at least these files in the test vault:

- `img1.png`
- `img2.png`
- `img1_copy.png`
- `img_anim.gif`
- `vector.svg`
- `old-large-unref.png`
- `doc1.pdf`
- `video1.mp4`

Create at least these notes:

- `note-process.md` referencing `img1.png`
- `note-batch.md` referencing multiple images
- `note-duplicate.md` referencing `img1.png` and `img1_copy.png`

## Priority Regression Focus

These two checks are the current release blockers. Run them first.

1. Cross-extension single-file processing must finish cleanly.
   Expected:
   - the process action returns promptly
   - the original file path disappears
   - the new file path exists with the converted extension
   - note links are rewritten to the new path/extension

2. Batch processing must not stall on the first renamed file.
   Expected:
   - batch processing continues past the first file when formats change
   - output files appear for each supported file
   - the final success notice appears
   - linked notes render all converted files correctly

## Checklist

- [ ] Plugin loads and the media library view opens normally.
  Expected: no startup error, media library renders, commands are registered.

- [ ] Single-file processing keeps links valid when the extension changes.
  Steps:
  1. In `note-process.md`, embed `img1.png`.
  2. From the media library, process `img1.png` with an output format different from the original.
  Expected:
  - the process finishes without hanging on rename/link-update
  - the note link updates automatically
  - the image still renders in the note
  - the old path does not stay broken in the note body
  - the vault contains only the new converted file, not both old and new names

- [ ] Batch processing works on multiple static images.
  Steps:
  1. Select 5 to 10 PNG/JPG/WebP/BMP files in media library multi-select mode.
  2. Run batch processing.
  Expected:
  - processing completes without crash
  - processing does not stop after the first cross-extension rename
  - supported files are processed
  - output files are written to disk for each processed item
  - the completion notice appears after the last file
  - notes that referenced them still render correctly

- [ ] GIF and SVG do not expose the processing action.
  Steps:
  1. Open the media library context menu for `img_anim.gif`.
  2. Open the media library context menu for `vector.svg`.
  Expected:
  - no destructive image-processing action is shown for these files

- [ ] Duplicate detection still works.
  Steps:
  1. Open duplicate detection.
  2. Scan the vault.
  Expected:
  - `img1.png` and `img1_copy.png` are detected as duplicates
  - isolating duplicates does not crash the plugin

- [ ] Trash management opens with reasonable performance.
  Steps:
  1. Open trash management.
  2. Refresh once.
  Expected:
  - view opens without obvious long blocking delay
  - file list, dashboard, and reference badges render normally

- [ ] Safe scan still works.
  Steps:
  1. Ensure `old-large-unref.png` is old enough and not referenced.
  2. Run safe scan.
  Expected:
  - the file is detected by the scan
  - confirm flow works
  - file is moved to trash when confirmed

- [ ] Restore from trash works after processing/scan operations.
  Steps:
  1. Restore one file from trash.
  Expected:
  - file returns to the original path
  - link and preview still work

- [ ] Image alignment command still works.
  Steps:
  1. In a note, select `![[img2.png]]`.
  2. Run left alignment.
  Expected:
  - editor content becomes `![[img2.png|left]]`

## Result Format

Record results as:

- PASS: all checklist items passed
- FAIL: include the failed item, the observed behavior, and the vault file involved
- If the failure involves processing/rename/link updates, also include:
  - whether the output file was created
  - whether the note link text changed
  - whether the UI appeared to hang and for roughly how long

## Cleanup

After external regression is confirmed:

- remove this file in a follow-up commit
- push the deletion so the repository returns to its normal state
