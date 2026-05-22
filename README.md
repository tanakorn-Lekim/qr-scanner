# Store App with GitHub Pages Scanner

This project splits the Store App into two parts:

- `github-store-app/`: static frontend for GitHub Pages. It opens the camera, scans QR codes, and calls the backend.
- `appscript-backend/`: Apps Script backend API. It reads and writes the Store Google Sheets database.

## Store DB Sheets

Create these sheets in the Store DB spreadsheet.

### STORE_STOCK

```text
TAG_ID | PART | ORIGINAL_QTY | BALANCE_QTY | LOCATION | STATUS | UPDATED_AT | TO_LOCATION
```

### STORE_TRANSFER

```text
TRANSFER_ID | TAG_ID | FROM | TO | QTY | STATUS | TRANSFER_BY | TRANSFER_AT | RECEIVE_BY | RECEIVE_AT
```

### STORE_MOVEMENT

```text
MOVE_ID | TAG_ID | DATE | TYPE | FROM | TO | QTY | BALANCE_AFTER | REF_ID | ACTION_BY | CREATED_AT
```

## Setup

1. Copy `appscript-backend/Code.gs` into an Apps Script project.
2. Set `STORE_DB_ID` and `API_TOKEN` in `Code.gs`.
3. Deploy the Apps Script as a Web App:
   - Execute as: Me
   - Who has access: Anyone
4. Copy the Web App `/exec` URL.
5. Set `API_URL` and `API_TOKEN` in `github-store-app/app.js`.
6. Publish `github-store-app/` with GitHub Pages.

## Notes

The frontend uses JSONP instead of normal `fetch()` to avoid Apps Script CORS issues from GitHub Pages.
