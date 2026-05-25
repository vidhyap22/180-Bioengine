// NasalanceProcessor.js
//
// JS port of modules/process_audio.py for on-device scoring.
// Reads two 16-bit mono PCM WAV files (nasal + oral), computes RMS,
// nasalance score, per-bin waveform, and estimated pressure (kPa),
//
// notes:
//   - No bandpass filter
//   - No MP3 conversion
//   - File I/O uses expo-file-system

import * as FileSystem from 'expo-file-system/legacy';

/*
example call:
const peak = await findPeakAmplitude(FileSystem.documentDirectory + 'recording.wav');
function takes the wav file and converts it into a binary string. Stores it in a byte array.
use DataView for tools to read the bytes, skip 44 bytes (all the metaData)
*/
async function readWavSamples(wavPath) {
    //turn the wav into a base64 string
    const base64 = await FileSystem.readAsStringAsync(wavPath, {encoding:FileSystem.EncodingType.Base64});
    const binStr = atob(base64); //this is the data to be read
    const bytes = new Uint8Array(binStr.length);

    //convert to bytes so that we can then store each byte inside the bytes arr
    for (let i = 0; i < binStr.length; ++i){
        bytes[i] = binStr.charCodeAt(i); 
    }

    const view = new DataView(bytes.buffer);
    //get the metaData
    const numChannels = view.getUint16(22,true); 
    const sampleRate = view.getUint32(24,true);
    const sampleWidth = view.getUint16(34,true) / 8; //conversion needed

    if (sampleWidth !== 2){
        throw new Error(`16 bit audio only, got ${sampleWidth * 8}-bit: ${wavPath}`);
    }

    const start = 44;
    const totalSamples = (bytes.length - start) / 2; //each sample is 2 bytes long
    const allSamples = new Int16Array(totalSamples);

    for (let i = 0; i < totalSamples; i++){
        allSamples[i] = view.getInt16(start + i *2, true);
    }

    let samples;
    if (numChannels > 1){ //just incase to handle stereo
        samples = new Int16Array(Math.floor(totalSamples / numChannels));
        for (let i = 0; i < samples.length; i++){
            samples[i] = allSamples[i * numChannels];
        }
    }else {
        samples = allSamples;
    }

    const numFrames = samples.length;
    return {samples, numChannels, sampleWidth, sampleRate, numFrames};
}

function calculateRms(samples) {
    if (samples.length === 0){
        return 0.0;
    }

    const sumSquares = samples.reduce( (sum, currVal) => sum + currVal ** 2, 0);
    const rms = Math.sqrt(sumSquares / samples.length);
    //console.log(sumSquares);
    //console.log(rms);

    return rms;
}

//doesnt have normalized already flag, assuming false
function calculateWaveForm(samples, bars = 80){  
    const scale = 32768;
    const blockSize = Math.max(1, Math.floor(samples.length / bars));
    let waveForm = [];

    for (let i = 0; i < bars; i++){
        let start = i * blockSize;

        let end;
        if (i < bars - 1){
            end = (i + 1) * blockSize;
        }else{
            end = samples.length;
        }

        let block = samples.slice(start, end);

        if (block.length === 0){
            waveForm.push(0.0);
            continue;
        }

        let rms = calculateRms(block)

        waveForm.push(rms/scale);
    }

    return waveForm;

}

//rough estimate of pressure in kpa based on rms value 
//uses spl db = 94 + 20 * log10(normalized_rms)
//assume false for normalized, function does it inside
function calculatePressure(rmsVal){
    if (rmsVal <= 0){
        return 0.0;
    }

    //noramlize
    const normalizedRms = rmsVal / 32768.0;
    const splDb = 94 + 20 * Math.log10(normalizedRms);
    const pressure = 20e-6 * (10 ** (splDb / 20.0));

    const pressureKpa = pressure / 1000.0;
    return Math.round(pressureKpa * 1e8) / 1e8; 
}

//assume filter is negative
async function processAudio(nasalWavPath, oralWavPath, patientId ) {
    //need to add error checking wav paths

    //run the asyn functions in parellell
    const[nasal,oral] = await Promise.all([readWavSamples(nasalWavPath), readWavSamples(oralWavPath)]);

    const {samples: nasalSamples, sampleRate: nasalRate} = nasal;
    const {samples: oralSamples} = oral;

    const nasalRms = calculateRms(nasalSamples);
    const oralRms = calculateRms(oralSamples);

    const totalRms = nasalRms + oralRms;
    const nasalanceScore = totalRms > 0 ? (nasalRms / totalRms) * 100 : 0;

    const nasalWaveform = calculateWaveForm(nasalSamples);
    const oralWaveform = calculateWaveForm(oralSamples);

    const nasalPressure = calculatePressure(nasalRms);
    const oralPressure = calculatePressure(oralRms);

    const duration = Math.round((nasalSamples.length / nasalRate) * 100) / 100;


    const result = {
        mrn: patientId,
        avg_nasalance_score: Math.round(nasalanceScore * 10) / 10,
        nasal_audio_file: nasalWavPath.split('/').pop(),
        oral_audio_file: oralWavPath.split('/').pop(),
        nasalance_data: {
            duration,
            nasal_device: "External (icspeech)",
            oral_device: "External (icspeech)",
            source_nasal_file: nasalWavPath.split('/').pop(),
            source_oral_file: oralWavPath.split('/').pop(),
            filter_applied: false,
            filter_range_hz: null,
        },
        waveform_data: {
            nasal_waveform: nasalWaveform,
            oral_waveform: oralWaveform,
        },
        pressure_data: {
            oral_pressure_avg_kpa: oralPressure,
            nasal_pressure_avg_kpa: nasalPressure,
        },
    };


    return result;
}

export {processAudio};