import os
import argparse
import subprocess
import math
import json
import struct
import wave

def run_command(command):
    try:
        subprocess.run(command, check=True, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {command}")
        print(e.stderr.decode())
        raise

def calculate_rms(file_path):
    with wave.open(file_path, 'rb') as wf:
        n_channels = wf.getnchannels()
        sample_width = wf.getsampwidth()
        frame_rate = wf.getframerate()
        n_frames = wf.getnframes()
        data = wf.readframes(n_frames)

    if sample_width == 2:
        fmt = f"<{n_frames * n_channels}h"
    else:
        raise ValueError("Only 16-bit audio supported for RMS calc")

    samples = struct.unpack(fmt, data)
    sum_squares = sum(s**2 for s in samples)
    rms = math.sqrt(sum_squares / len(samples))
    return rms

def calculate_waveform(file_path, bars=80):
    with wave.open(file_path, 'rb') as wf:
        n_channels = wf.getnchannels()
        sample_width = wf.getsampwidth()
        n_frames = wf.getnframes()
        data = wf.readframes(n_frames)

    if sample_width != 2:
        raise ValueError("Only 16-bit audio supported")

    fmt = f"<{n_frames * n_channels}h"
    samples = struct.unpack(fmt, data)

    # If stereo, take only first channel
    if n_channels > 1:
        samples = samples[::n_channels]

    block_size = len(samples) // bars
    waveform = []

    for i in range(bars):
        start = i * block_size
        end = start + block_size
        block = samples[start:end]

        if not block:
            waveform.append(0)
            continue

        sum_squares = sum(s**2 for s in block)
        rms = math.sqrt(sum_squares / len(block))

        # Normalize (16-bit max = 32768)
        waveform.append(rms / 32768)

    return waveform

def process_audio(input_file, patient_id):
    base_name = os.path.splitext(os.path.basename(input_file))[0]
    output_dir = os.path.dirname(input_file)
    
    # 1. Convert WMA to WAV (if needed) and split stereo to mono
    # Left channel = Nasal, Right channel = Oral (Based on app logic)
    nasal_wav = os.path.join(output_dir, f"{patient_id}_nasal_{base_name}.wav")
    oral_wav = os.path.join(output_dir, f"{patient_id}_oral_{base_name}.wav")
    
    print(f"Processing {input_file}...")
    
    # ffmpeg command to split channels
    # Channel 0 (Left) -> Nasal
    cmd_nasal = f'ffmpeg -y -i "{input_file}" -af "pan=mono|c0=c0" "{nasal_wav}"'
    run_command(cmd_nasal)
    
    # Channel 1 (Right) -> Oral
    cmd_oral = f'ffmpeg -y -i "{input_file}" -af "pan=mono|c0=c1" "{oral_wav}"'
    run_command(cmd_oral)
    
    # 2. Convert to MP3 for upload (optional but good for size/compatibility)
    nasal_mp3 = nasal_wav.replace('.wav', '.mp3')
    oral_mp3 = oral_wav.replace('.wav', '.mp3')
    
    run_command(f'ffmpeg -y -i "{nasal_wav}" -b:a 128k "{nasal_mp3}"')
    run_command(f'ffmpeg -y -i "{oral_wav}" -b:a 128k "{oral_mp3}"')

    # 3. Calculate Nasalance Score and waveform values
    # We use the WAV files for calculation as they are raw PCM
    nasal_rms = calculate_rms(nasal_wav)
    nasal_waveform = calculate_waveform(nasal_wav)

    oral_rms = calculate_rms(oral_wav)
    oral_waveform = calculate_waveform(oral_wav)

    # Calculate Nasalance Score

    if nasal_rms + oral_rms > 0:
        nasalance_score = (nasal_rms / (nasal_rms + oral_rms)) * 100
    else:
        nasalance_score = 0

    print("-" * 30)
    print(f"Results for Patient MRN: {patient_id}")
    print(f"File: {base_name}")
    print(f"Nasal RMS: {nasal_rms:.2f}")
    print(f"Oral RMS: {oral_rms:.2f}")
    print(f"Calculated Nasalance Score: {nasalance_score:.2f}%")
    print("-" * 30)

    # 4. Generate JSON data for Supabase
    result_data = {
        "mrn": patient_id,
        "avg_nasalance_score": round(nasalance_score, 1),
        "nasal_audio_file": os.path.basename(nasal_mp3),
        "oral_audio_file": os.path.basename(oral_mp3),
        "waveform_data" : {
            "nasal_waveform" : nasal_waveform,
            "oral_waveform" : oral_waveform
        }
        "nasalance_data": {
            "duration": 0, # You might want to get actual duration
            "nasal_device": "External (icspeech)",
            "oral_device": "External (icspeech)",
            "source_file": base_name
        }
    }

    print("JSON for Supabase (manual entry):")
    print(json.dumps(result_data, indent=2))

    # Clean up WAV files if only MP3s are needed
    os.remove(nasal_wav)
    os.remove(oral_wav)
    print(f"\nCreated files:\n- {nasal_mp3}\n- {oral_mp3}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process WMA audio for NasomEATR")
    parser.add_argument("input_file", help="Path to input WMA file")
    parser.add_argument("patient_id", help="Patient MRN")

    args = parser.parse_args()
    process_audio(args.input_file, args.patient_id)