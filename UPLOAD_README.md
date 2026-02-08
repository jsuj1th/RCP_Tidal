# Quick Start Guide

## Start the Upload API Server

```bash
cd /Users/sujithjulakanti/Desktop/RCP_Tidal-1
./start_api.sh
```

The API will be available at `http://localhost:5000`

## Start the Viewer (in a new terminal)

```bash
cd /Users/sujithjulakanti/Desktop/RCP_Tidal-1/viewer
npm run dev
```

## Test the Upload Feature

1. Open the viewer in your browser
2. Drag and drop `test_data/sample_upload.csv` onto the upload box
3. Wait for "File processed successfully!" message
4. Click "Process & Visualize"
5. Explore your data in 3D!

## Supported File Formats

- Excel: `.xlsx`, `.xls`
- CSV: `.csv`
- JSON: `.json`
- TSV: `.tsv`, `.txt`

Maximum file size: 50MB

## Your File Should Contain

At minimum:
- **distance** column (location along pipeline in feet)
- **event_type** column (type of anomaly)

Optional but recommended:
- **depth** (wall loss percentage)
- **orientation** (degrees or o'clock)
- **joint_number** (pipe joint ID)

The system will automatically map your column names using fuzzy matching!

## Need Help?

See `upload_guide.md` for detailed instructions and troubleshooting.
