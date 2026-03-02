# How to Upload MP3 Files to ESP32 SPIFFS

## Step-by-Step Instructions

### Prerequisites
1. Arduino IDE installed
2. ESP32 board support installed in Arduino IDE
3. Your two MP3 files ready:
   - `1234567_nasal_JakobRandomRecording.mp3`
   - `1234567_oral_JakobRandomRecording.mp3`

### Step 1: Rename Your Files

ESP32 SPIFFS expects specific filenames. Rename your files to:
- `nasal_audio.mp3` (from `1234567_nasal_JakobRandomRecording.mp3`)
- `oral_audio.mp3` (from `1234567_oral_JakobRandomRecording.mp3`)

**Important**: Keep the original files as backup!

### Step 2: Install ESP32 Sketch Data Upload Tool

1. Open Arduino IDE
2. Go to **Tools > Manage Libraries**
3. Search for "ESP32 Sketch Data Upload" or install manually:
   - Download from: https://github.com/me-no-dev/arduino-esp32fs-plugin
   - Or use Arduino IDE's Library Manager

### Step 3: Prepare Your Sketch Folder

1. Open the ESP32 code file: `ESP32_MP3_Server.ino` in Arduino IDE
2. Create a folder called `data` in the same directory as your `.ino` file
   - If your sketch is in: `/path/to/ESP32_MP3_Server/`
   - Create: `/path/to/ESP32_MP3_Server/data/`
3. Copy your renamed MP3 files into the `data` folder:
   ```
   ESP32_MP3_Server/
   ├── ESP32_MP3_Server.ino
   └── data/
       ├── nasal_audio.mp3
       └── oral_audio.mp3
   ```

### Step 4: Upload Files to SPIFFS

1. **Close Arduino IDE Serial Monitor** (if open)
2. In Arduino IDE, go to **Tools > ESP32 Sketch Data Upload**
3. Wait for upload to complete (this may take a few minutes for large MP3 files)
4. You should see "SPIFFS Image Uploaded" message

### Step 5: Upload the Code

1. Select your ESP32 board: **Tools > Board > ESP32 Dev Module** (or your specific board)
2. Select the correct port: **Tools > Port > [Your ESP32 Port]**
3. Click **Upload** button (or Ctrl+U)
4. Wait for upload to complete

### Step 6: Verify Files Are Uploaded

1. Open **Serial Monitor** (Tools > Serial Monitor)
2. Set baud rate to **115200**
3. Reset ESP32 (press reset button)
4. You should see:
   ```
   Files in SPIFFS:
     - /nasal_audio.mp3 (XXXX bytes)
     - /oral_audio.mp3 (XXXX bytes)
   ```

## Alternative Method: Using PlatformIO

If you prefer PlatformIO:

1. Create `data` folder in your project root
2. Place MP3 files in `data/` folder
3. Use PlatformIO's upload filesystem feature:
   ```bash
   pio run --target uploadfs
   ```

## Troubleshooting

### "SPIFFS Mount Failed"
- Make sure you uploaded files to SPIFFS first
- Check that files are named correctly: `nasal_audio.mp3` and `oral_audio.mp3`
- Try formatting SPIFFS: Use ESP32 Sketch Data Upload tool with "Erase Flash" option

### Files Not Showing in Serial Monitor
- Verify files are in the `data/` folder
- Check file names match exactly: `nasal_audio.mp3` and `oral_audio.mp3`
- Try re-uploading SPIFFS data

### File Size Issues
- ESP32 SPIFFS has limited space (typically 1.5MB)
- If files are too large, you may need to:
  - Compress MP3 files
  - Use smaller bitrate
  - Or use external SD card instead

### Upload Takes Too Long
- Large MP3 files take time to upload
- Be patient, don't interrupt the upload
- Check Serial Monitor for progress

## File Size Recommendations

- Keep each MP3 file under **500KB** if possible
- Total SPIFFS space: ~1.5MB
- If files are larger, consider:
  - Reducing MP3 bitrate (128kbps is usually sufficient)
  - Shortening recording duration
  - Using compression tools

## Testing After Upload

1. Connect to ESP32 WiFi network (`esp32` / `1234567`)
2. Open browser and go to: `http://192.168.4.1/nasal_audio`
3. File should download or play in browser
4. Test: `http://192.168.4.1/oral_audio`
5. Both should work before testing with mobile app
