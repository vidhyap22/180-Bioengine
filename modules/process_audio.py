import os
import argparse
import subprocess
import math
import json
import struct
import wave
# import audio_db # local module for saving results to SQLite
import numpy as np
import os
try:
    from scipy.signal import butter, filtfilt, sosfilt
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    print("WARNING: Scipy not available. Bandpass filtering will be skipped.")
    print("Install scipy with 'pip install scipy'")
      
try:
    import parselmouth
    PARSEL_AVAILABLE = True
except ImportError:
    PARSEL_AVAILABLE = False
    print("WARNING: Parselmouth not available. Voice segment extraction will be skipped.")
    print("Install with: pip install praat-parselmouth")
    
### Audio processing functions ###
def run_command(command):
    try:
        subprocess.run(command, check=True, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {command}")
        print(e.stderr.decode())
        raise

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

### Signal Processing ###
def bandpass_filter(lower_freq, upper_freq, sample_rate, order=4):
    nyquist = 0.5 * sample_rate
    lower_bound = lower_freq / nyquist
    upper_bound = upper_freq / nyquist
    sos_filter = butter(order, [lower_bound, upper_bound], btype='band', output='sos')
    return sos_filter

def apply_bandpass_filter(samples, sample_rate, lower_range=300, upper_range=700):
    float_samples = np.array(samples, dtype=np.float64) / 32768.0 # normalize to [-1, 1]
    
    if not SCIPY_AVAILABLE:
        print("Bandpass filter skipped due to missing scipy.")
        return float_samples
    
    sos = bandpass_filter(lower_range, upper_range, sample_rate)
    # float_samples = [s / 32768.0 for s in samples] # mormalize to [-1, 1]
    filtered_samples = sosfilt(sos, float_samples)
    
    return filtered_samples

def extract_voiced_segments(float_samples, sample_rate):
    """ 
    Use Praat to detect voiced frames.
    Voiced frames - frams where vocal fold vibration is present.
    Frames where Praat cannot find speech are thrown away (unvoiced, silence, breathing).
    """
    if not PARSEL_AVAILABLE:
        print("Voice segment extraction skipped due to missing parselmouth.")
        return float_samples
    
    # create Sound object from numPy array
    sound = parselmouth.Sound(float_samples, sampling_frequency=sample_rate)

    # run Praat pitch tracker to get voiced/unvoiced frames
    pitch = sound.to_pitch(time_step=0.01, # 10ms frame step
                           pitch_floor=75.0, 
                           pitch_ceiling=600.0) # 75 - 600 Hz-  typical human voice range
    
    n_samples = len(float_samples)
    voiced_mask = np.zeros(n_samples, dtype=bool)
    pitch_times = pitch.xs()
    pitch_values = pitch.selected_array['frequency'] # 0.0 = unvoiced
    
    for t, f in zip(pitch_times, pitch_values):
        if f > 0: # voiced frame
            # mark 10ms window as voiced
            half_window = int(0.005 * sample_rate) # 5ms on either side
            center_sample = int(t * sample_rate)
            start = max(0, center_sample - half_window)
            end = min(n_samples, center_sample + half_window)
            voiced_mask[start:end] = True
            
    voiced_samples = float_samples[voiced_mask]
    
    if len(voiced_samples) == 0:
        print("WARNING: No voiced segments detected. Returning original samples.")
        return float_samples
    
    kept_audio_pct = 100 * len(voiced_samples) / n_samples
    print(f"Extracted {len(voiced_samples)} voiced samples ({kept_audio_pct:.1f}% of original)")
    return voiced_samples
    
### Metrics ###
def calculate_rms(samples):
    arr = np.array(samples, dtype=np.float64)
    if arr.size == 0:
        return 0.0
    return float(np.sqrt(np.mean(arr**2)))

def calculate_waveform(samples, bars=80, already_normalized=False):
    arr = np.array(samples, dtype=np.float64)
    scale = 1.0 if already_normalized else 32768.0
    block_size = max(1, len(arr) // bars)
    waveform = []

    for i in range(bars):
        start = i * block_size
        end = (i + 1) * block_size if i < bars - 1 else len(arr)
        block = samples[start:end]

        if block.size == 0:
            waveform.append(0.0)
            continue

        rms = float(np.sqrt(np.mean(block**2)))
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
    if normalized_rms <= 0:
        return 0.0
    
    # spl dB = 94 + 20 * math.log10(normalized_rms)
    spl_db = 94 + 20 * math.log10(normalized_rms)
    pressure = 20e-6 * (10 ** (spl_db / 20.0))
    pressure_kpa = pressure / 1000.0
    
    return round(pressure_kpa, 8)

### Main pipeline ###
def process_audio(nasal_wav : str, oral_wav : str, patient_id : str, apply_filter: bool =False, extract_voiced: bool = False, filter_low: int = 300, filter_high: int = 700) -> dict:
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
    
    # nasal_trimmed = trim_silence(nasal_samples, nasal_rate)
    # oral_trimmed = trim_silence(oral_samples, oral_rate)
    
    # 3. Apply bandpass filter before scoring
    filter_status = apply_filter and SCIPY_AVAILABLE
    
    if apply_filter:
        if SCIPY_AVAILABLE:
            nasal_samples_filtered = apply_bandpass_filter(nasal_samples, nasal_rate, filter_low, filter_high)
            oral_samples_filtered = apply_bandpass_filter(oral_samples, oral_rate, filter_low, filter_high) 
        else:
            print("scipy not available, skipping filter")
            nasal_samples_filtered = np.array(nasal_samples, dtype=np.float64) / 32768.0
            oral_samples_filtered = np.array(oral_samples, dtype=np.float64) / 32768.0    
    else:
        nasal_samples_filtered = nasal_samples
        oral_samples_filtered = oral_samples
        
    voiced_status = extract_voiced and PARSEL_AVAILABLE
    
    if extract_voiced:
        if PARSEL_AVAILABLE:
            print("Extracting voiced segments based on energy...")
            nasal_float = (np.asarray(nasal_samples_filtered, dtype=np.float64) if filter_status else np.array(nasal_samples_filtered, dtype=np.float64) / 32768.0)
            oral_float = (np.asarray(oral_samples_filtered, dtype=np.float64) if filter_status else np.array(oral_samples_filtered, dtype=np.float64) / 32768.0)
            
            print("   Nasal:")
            nasal_samples_filtered = extract_voiced_segments(nasal_float, nasal_rate)
            print("   Oral:")
            oral_samples_filtered = extract_voiced_segments(oral_float, oral_rate)
            filter_status = True # samples are now always normalized
            
        else:
            print("parselmouth not available, skipping voiced segment extraction")
    # 4. Compute RMS and Nasalance Score
    nasal_rms = calculate_rms(nasal_samples_filtered)
    oral_rms = calculate_rms(oral_samples_filtered)
    
    # nasalance_score = (nasal_rms / (nasal_rms + oral_rms)) * 100 if (nasal_rms + oral_rms) > 0 else 0.0
    nasal_energy = nasal_rms ** 2
    oral_energy = oral_rms ** 2
    
    nasalance_score = (nasal_energy / (nasal_energy + oral_energy)) * 100 if (nasal_energy + oral_energy) > 0 else 0.0
    
    nasal_waveform = calculate_waveform(nasal_samples_filtered, already_normalized=filter_status)
    oral_waveform = calculate_waveform(oral_samples_filtered, already_normalized=filter_status)
    nasal_pressure_kpa = calculate_pressure(nasal_rms, already_normalized=filter_status)
    oral_pressure_kpa = calculate_pressure(oral_rms, already_normalized=filter_status)
    duration = get_audio_length(nasal_wav)  # assuming both have same duration
    
    # 5. Print summary 
    print("-" * 40)
    print(f"Results for Patient MRN: {patient_id}")
    print(
    f"Filter applied: {filter_status} "
    f"{filter_low}-{filter_high} Hz"
    )
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
            "filter_range_hz": [filter_low, filter_high] if filter_status else None
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
                        help="Apply bandpass filter before computing scores (recommended)")
    parser.add_argument("--extract_voiced", action="store_true",
                        help="Extract voiced segments based on energy before scoring (requires librosa)")
    parser.add_argument("--filter_low", type=int, default=300, help="Low cutoff frequency for bandpass filter (default: 300 Hz)")
    parser.add_argument("--filter_high", type=int, default=700, help="High cutoff frequency for bandpass filter (default: 3000 Hz)")

    args = parser.parse_args()
    result_data = process_audio(args.nasal_wav, args.oral_wav, args.patient_id, apply_filter=args.apply_filter, extract_voiced=args.extract_voiced, filter_low=args.filter_low, filter_high=args.filter_high)
    print("\nProcessing complete.")
    # save_result(result_data)