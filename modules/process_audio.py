import os
import argparse
import subprocess
import math
import json
import struct
import wave
import audio_db # local module for saving results to SQLite

try:
    from scipy.signal import butter, filtfilt, sosfilt
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    print("WARNING: Scipy not available. Bandpass filtering will be skipped.")
    print("Install scipy with 'pip install scipy'")
    
    
def run_command(command):
    try:
        subprocess.run(command, check=True, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {command}")
        print(e.stderr.decode())
        raise
    
# remove leading and trailing silence in audio samples
def trim_silence(samples, sample_rate, threshold_db=-40, window_ms=20):
    """
    threshold_db = db level below is considered silence (default)
    window_ms = how many ms per analysis window
    """
    window_size = int(sample_rate * window_ms / 1000)
    threshold_amp = 10 ** (threshold_db / 20) * 32768.0
    
    def is_silent(block):
        if len(block) == 0:
            return True
        rms = math.sqrt(sum(s**2 for s in block) / len(block))
        return rms < threshold_amp
    
    begin = 0
    for i in range(0, len(samples) - window_size, window_size):
        if not is_silent(samples[i:i+window_size]):
            begin = i
            break
        
    end = len(samples)
    for i in range(len(samples) - window_size, begin, -window_size):
        if not is_silent(samples[i+i + window_size]):
            end = i + window_size
            break
        
    return samples[begin:end]
    
def bandpass_filter(lower_freq, upper_freq, sample_rate, order=4):
    nyquist = 0.5 * sample_rate
    lower_bound = lower_freq / nyquist
    upper_bound = upper_freq / nyquist
    sos_filter = butter(order, [lower_bound, upper_bound], btype='band', output='sos')
    return sos_filter

def apply_bandpass_filter(samples, sample_rate, lower_range=300, upper_range=4500):
    if not SCIPY_AVAILABLE:
        print("Bandpass filter skipped due to missing scipy.")
        return [s / 32768.0 for s in samples] # just normalize if no filter
    
    sos = bandpass_filter(lower_range, upper_range, sample_rate)
    float_samples = [s / 32768.0 for s in samples] # mormalize to [-1, 1]
    filtered_samples = sosfilt(sos, float_samples)
    
    return filtered_samples

def read_wav_samples(file_path):
    with wave.open(file_path, 'rb') as wf:
        n_channels = wf.getnchannels()
        sample_width = wf.getsampwidth()
        frame_rate = wf.getframerate()
        n_frames = wf.getnframes()
        data = wf.readframes(n_frames)

    if sample_width != 2:
        raise ValueError(f"Only 16-bit audio supported, got {sample_width * 8}-bit: {file_path}")

    fmt = f"<{n_frames * n_channels}h" 
    samples = struct.unpack(fmt, data)
    
    if n_channels > 1:
        samples = samples[::n_channels] # take only first channel to process if stereo
        
    return samples, n_channels, sample_width, frame_rate, n_frames
    

def calculate_rms(samples):
    if len(samples) == 0:
        return 0.0
    
    sum_squares = sum(s**2 for s in samples)
    rms = math.sqrt(sum_squares / len(samples))
    return rms

def calculate_waveform(samples, bars=80, already_normalized=False):
    scale = 1.0 if already_normalized else 32768.0
    block_size = max(1, len(samples) // bars)
    waveform = []

    for i in range(bars):
        start = i * block_size
        end = (i + 1) * block_size if i < bars - 1 else len(samples)
        # end = start + block_size
        block = samples[start:end]

        if len(block) == 0:
            waveform.append(0.0)
            continue

        sum_squares = sum(s**2 for s in block)
        rms = math.sqrt(sum_squares / len(block))

        # Normalize (16-bit max = 32768)
        waveform.append(rms / scale)

    return waveform

# rough estimate of pressure in kpa based on rms value 
# uses spl db = 94 + 20 * log10(normalized_rms)
def calculate_pressure(rms_value, already_normalized=False):
    if rms_value <= 0:
        return 0.0
    
    # normalize rms [0,1] for 16 bit audio
    normalized_rms = rms_value if already_normalized else rms_value / 32768.0
    
    # spl dB = 94 + 20 * log10(normalized_rms)
    spl_db = 94 + 20 * math.log10(normalized_rms)
    pressure = 20e-6 * (10 ** (spl_db / 20.0))
    
    pressure_kpa = pressure / 1000.0
    return round(pressure_kpa, 8)

# return length of wav file in seconds
def get_audio_length(file_path):
    with wave.open(file_path, 'rb') as wf:
        frame_rate = wf.getframerate()
        n_frames = wf.getnframes()
        duration_seconds = round(n_frames / float(frame_rate), 2)
    return duration_seconds

def convert_wav_to_mp3(wav_path):
    mp3_path = wav_path.replace('.wav', '.mp3')
    run_command(f'ffmpeg -y -i "{wav_path}" -b:a 128k "{mp3_path}"')
    return mp3_path

def process_audio(nasal_wav : str, oral_wav : str, patient_id : str, apply_filter: bool =False) -> dict:
    for path in(nasal_wav, oral_wav):
        if not os.path.exists(path):
            raise FileNotFoundError(f"Required WAV file not found: {path}")
    
    print(f"Processing Nasal WAV: {nasal_wav}")
    print(f"Processing Oral WAV: {oral_wav}")
    
    # 1. Convert WAVs to MP3 for upload / storage
    nasal_mp3 = convert_wav_to_mp3(nasal_wav)
    oral_mp3 = convert_wav_to_mp3(oral_wav)
    
    # 2. Read raw samples from WAV files
    nasal_samples, _, _, nasal_rate, _ = read_wav_samples(nasal_wav)
    oral_samples, _, _, oral_rate, _ = read_wav_samples(oral_wav)
    
    # 3. Apply bandpass filter before scoring
    filter_status = apply_filter and SCIPY_AVAILABLE
    
    if apply_filter:
        if SCIPY_AVAILABLE:
            print("Applying 300-4500 Hz bandpass filter...")
            nasal_samples_filtered = apply_bandpass_filter(nasal_samples, nasal_rate)
            oral_samples_filtered = apply_bandpass_filter(oral_samples, oral_rate)
        else:
            print("scipy not available, skipping filter")
            nasal_samples_filtered = [s / 32768.0 for s in nasal_samples]
            oral_samples_filtered = [s / 32768.0 for s in oral_samples]     
    else:
        nasal_samples_filtered = nasal_samples
        oral_samples_filtered = oral_samples
        
    
    # 4. Compute RMS and Nasalance Score
    nasal_rms = calculate_rms(nasal_samples_filtered)
    oral_rms = calculate_rms(oral_samples_filtered)
    
    nasalance_score = (nasal_rms / (nasal_rms + oral_rms)) * 100 if (nasal_rms + oral_rms) > 0 else 0.0
    
    nasal_waveform = calculate_waveform(nasal_samples_filtered, already_normalized=filter_status)
    oral_waveform = calculate_waveform(oral_samples_filtered, already_normalized=filter_status)
    
    nasal_pressure_kpa = calculate_pressure(nasal_rms, already_normalized=filter_status)
    oral_pressure_kpa = calculate_pressure(oral_rms, already_normalized=filter_status)
    
    duration = get_audio_length(nasal_wav)  # assuming both have same duration
    
    # 5. Print summary 
    print("-" * 40)
    print(f"Results for Patient MRN: {patient_id}")
    print(f"Filter applied: {filter_status}")
    print(f"Nasal RMS: {nasal_rms:.4f}")
    print(f"Oral RMS: {oral_rms:.4f}")
    print(f"Nasalance Score: {nasalance_score:.2f}%")
    print(f"Nasal Pressure: {nasal_pressure_kpa:.6f} kPa")
    print(f"Oral Pressure:  {oral_pressure_kpa:.6f} kPa")
    print("-" * 40)
    
    # 6. Results dict for sqlite
    result_data = {
        "mrn": patient_id,
        "avg_nasalance_score": round(nasalance_score, 1),
        "nasal_audio_file": os.path.basename(nasal_mp3),
        "oral_audio_file": os.path.basename(oral_mp3),
        "nasalance_data": {
            "duration": duration, 
            "nasal_device": "External (icspeech)",
            "oral_device": "External (icspeech)",
            "source_nasal_file": os.path.basename(nasal_wav),
            "source_oral_file": os.path.basename(oral_wav),
            "filter_applied": filter_status,
            "filter_range_hz": [300, 4500] if filter_status else None
        },
        "waveform_data" : {
            "nasal_waveform" : nasal_waveform,
            "oral_waveform" : oral_waveform
        },
        "pressure_data" : {
            "oral_pressure_avg_kpa" : oral_pressure_kpa,
            "nasal_pressure_avg_kpa" : nasal_pressure_kpa
        },
    }
    
    print("JSON for SQLite:")
    print(json.dumps(result_data, indent=2))
    
    print(f"\nCreated files:\n- {nasal_mp3}\n- {oral_mp3}") 
    return result_data


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process WMA audio for NasomEATR")
    parser.add_argument("nasal_wav", help="Path to nasal WAV file")
    parser.add_argument("oral_wav", help="Path to oral WAV file")
    parser.add_argument("patient_id", help="Patient MRN")
    parser.add_argument("--apply_filter", action="store_true",
                        help="Apply 300–3000 Hz bandpass filter before computing scores (recommended)")

    args = parser.parse_args()
    result_data = process_audio(args.nasal_wav, args.oral_wav, args.patient_id, apply_filter=args.apply_filter)
    print("\nProcessing complete. Result data ready for upload.")
    # save_result(result_data)
    