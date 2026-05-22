// NasalanceProcessor.js
//
// JS port of modules/process_audio.py for on-device scoring.
// Reads two 16-bit mono PCM WAV files (nasal + oral), computes RMS,
// nasalance score, per-bin waveform, and estimated pressure (kPa),
// and returns a result dict matching the Python script's schema.
//
// Scope notes (v1):
//   - No bandpass filter (scipy port deferred).
//   - No MP3 conversion (WAV-only on-device).
//   - File I/O uses expo-file-system; pure scoring functions are
//     environment-agnostic so they can also be exercised from Node
//     for parity testing against the Python implementation.

import * as FileSystem from 'expo-file-system/legacy';

/*
example call:
const peak = await findPeakAmplitude(FileSystem.documentDirectory + 'recording.wav');
function takes the wav file and converts it into a binary string. Stores it in a byte array.
use DataView for tools to read the bytes, skip 44 bytes (all the metaData)
*/
async function readWav(wavPath) {
    //turn the wav into a base64 string
    const base64 = await FileSystem.readAsStringAsync(wavPath, {encoding:FileSystem.EncodingType.Base64});
    const binStr = atob(base64); //this is the data to be read
    const bytes = new Uint8Array(binStr.length);

    //convert to bytes so that we can then store each byte inside the bytes arr
    for (let i = 0; i < bytes.length; ++i){
        bytes[i] = binStr.charCodeAt(i); 
    }
    const view = new DataView(bytes.buffer);

    let peak = 0;
    for (let offset = 44; offset < bytes.length; offset +=2){
        //skip metaData header (44bytes), true to read as little edian
        const sample = view.getInt16(offset, true);

        if (Math.abs(sample) > peak){
            peak = Math.abs(sample);
        }
    }

    //normalize
    return peak / 32768;
}
