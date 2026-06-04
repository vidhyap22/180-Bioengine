// NasalanceProcessor.js
// notes:
//   - No MP3 conversion
//   - Trim silence + Butterworth bandpass filter (500-3500 Hz) applied
//   - Windowed nasalance scoring (50 ms windows, -30 dB drop threshold)
//   - File I/O uses expo-file-system

import * as FileSystem from 'expo-file-system/legacy';

// Butterworth bandpass, order=4, 500-3500 Hz @ 22050 Hz sample rate.
//only valid for 22050 Hz audio
const BANDPASS_SOS = [
    [ 0.013501284824368347,  0.027002569648736693,  0.013501284824368347,  1.0, -0.8582841174657424,  0.24250272338596285],
    [ 1.0,                   2.0,                   1.0,                   1.0, -0.8966587248633373,  0.6022222404433237 ],
    [ 1.0,                  -2.0,                   1.0,                   1.0, -1.7077186825751491,  0.7361536837835373 ],
    [ 1.0,                  -2.0,                   1.0,                   1.0, -1.896083399528094,   0.916473926170475  ],
];

function sosfilt (sos, samples) {
    const numSections = sos.length;

    const state = Array.from({ length: numSections }, () => [0, 0]);
    const output = new Float32Array(samples.length);

    for (let n = 0; n < samples.length; n++) {
        let x = samples[n];

        for (let s = 0; s < numSections; s++){
            const [b0, b1, b2, , a1, a2] = sos[s]; // skip a0

            const y = b0 * x + state[s][0];
            state[s][0] = b1 * x - a1 * y + state[s][1];
            state[s][1] = b2 * x -a2 * y;

            x = y;
        }
        output[n] = x;

    }
    return output;

}

function applyBandpassFilter(samples){
    const floatSamples = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++){
        floatSamples[i] = samples[i] / 32768;
    }
    return sosfilt(BANDPASS_SOS, floatSamples);
}

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

function trimSilence(samples, sampleRate, thresholdDb = -40, windowMs = 20) {
    const windowSize = Math.floor(sampleRate * windowMs / 1000);
    const thresholdAmp = 10 ** (thresholdDb / 20) * 32768;

    const isSilent = (block) =>{
        if(block.length === 0){
            return true;
        }
        return calculateRms(block) < thresholdAmp;
    }

    let begin = 0;
    for (let i = 0; i < samples.length - windowSize; i += windowSize){
        if (!isSilent(samples.subarray(i, i + windowSize))){
            begin = i;
            break;
        }
    }

    let end = samples.length;
    for (let i = samples.length - windowSize; i > begin; i -= windowSize){
        if (!isSilent(samples.subarray(i, i + windowSize))){
            end = i + windowSize;
            break;
        }
    }

    return samples.subarray(begin, end);
}

function windowedNasalance(nasalSamples, oralSamples, sampleRate, windowMs = 50, dropThresholdDb = -45){
    const windowSize = Math.floor(sampleRate * windowMs / 1000);
    const scores = [];
    const maxStart  = Math.min(nasalSamples.length, oralSamples.length) - windowSize;

    for (let start = 0; start < maxStart; start += windowSize) {

        const nBlock = nasalSamples.subarray(start, start + windowSize);
        const oBlock = oralSamples.subarray(start, start + windowSize);

        const nRms = calculateRms(nBlock);
        const oRms = calculateRms(oBlock);

        const totalRms = nRms + oRms;
        if (totalRms <= 0){
            continue;
        }

        const totalNorm = totalRms / 2;
        if (totalNorm <= 0){
            continue;
        }

        const db = 20 * Math.log10(totalNorm + 1e-12);
        if (db < dropThresholdDb){
            continue;
        }

        const score = nRms / (nRms + oRms ) * 100;
        scores.push(score);
    }

    if (scores.length === 0){
        return 0.0;
    }
    
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}


function calculateWaveForm(samples, bars = 80, alreadyNormalized = false){  

    const scale = alreadyNormalized ? 1.0 : 32768;
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
function calculatePressure(rmsVal, alreadyNormalized = false){
    if (rmsVal <= 0){
        return 0.0;
    }

    //noramlize
    const normalizedRms = alreadyNormalized ? rmsVal : rmsVal / 32768.0;
    const splDb = 94 + 20 * Math.log10(normalizedRms);
    const pressure = 20e-6 * (10 ** (splDb / 20.0));

    const pressureKpa = pressure / 1000.0;
    return Math.round(pressureKpa * 1e8) / 1e8; 
}

//assume filter is negative
async function processAudio(nasalWavPath, oralWavPath, patientId ) {
    //need to add error checking wav paths

    const WINDOW_MS = 50;
    const DROP_THRESHOLD_DB = -30;
    const FILTER_LOWER_HZ = 500;
    const FILTER_UPPER_HZ = 3500;

    //run the asyn functions in parellell
    const[nasal,oral] = await Promise.all([readWavSamples(nasalWavPath), readWavSamples(oralWavPath)]);

    const {samples: nasalSamples, sampleRate: nasalRate} = nasal;
    const {samples: oralSamples, sampleRate: oralRate} = oral;

    if (nasalRate !== oralRate) {
        throw new Error(`Sample rate mismatch: nasal ${nasalRate} vs oral ${oralRate}`);
    }
    const sampleRate = nasalRate;

    const duration = Math.round((nasalSamples.length / sampleRate) * 100) / 100;

    const nasalTrimmed = trimSilence(nasalSamples, sampleRate, DROP_THRESHOLD_DB, WINDOW_MS);
    const oralTrimmed  = trimSilence(oralSamples,  sampleRate, DROP_THRESHOLD_DB, WINDOW_MS);

    const nasalFiltered = applyBandpassFilter(nasalTrimmed);
    const oralFiltered  = applyBandpassFilter(oralTrimmed);

    const nasalanceScore = windowedNasalance(nasalFiltered,
        oralFiltered,sampleRate,WINDOW_MS,DROP_THRESHOLD_DB
    );

    const nasalRms = calculateRms(nasalFiltered);
    const oralRms = calculateRms(oralFiltered);

    const nasalWaveform = calculateWaveForm(nasalFiltered, 80, true);
    const oralWaveform = calculateWaveForm(oralFiltered, 80, true);

    const nasalPressure = calculatePressure(nasalRms, true);
    const oralPressure = calculatePressure(oralRms, true);

    const nasalBasename = nasalWavPath.split('/').pop();
    const oralBasename  = oralWavPath.split('/').pop();

    const result = {
        mrn: patientId,
        avg_nasalance_score: Math.round(nasalanceScore * 10) / 10,
        nasal_audio_file: nasalBasename,
        oral_audio_file: oralBasename,
        nasalance_data: {
            duration,
            nasal_device: "External (icspeech)",
            oral_device: "External (icspeech)",
            source_nasal_file: nasalBasename,
            source_oral_file: oralBasename,
            filter_applied: true,
            filter_range_hz: [FILTER_LOWER_HZ, FILTER_UPPER_HZ],
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

export {
  processAudio,
  readWavSamples,
  calculateRms,
  calculateWaveForm,
  calculatePressure,
  trimSilence,
  applyBandpassFilter,
  windowedNasalance,
  sosfilt,
};