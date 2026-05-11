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

def apply_bandpass_filter(samples, sample_rate, lower_range=350, upper_range=650):
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

def calculate_nasalance_per_frame(nasal_samples, oral_samples, sample_rate,
                                   frame_ms=25, hop_ms=10,
                                   voicing_threshold_db=-25,
                                   score_mode="energy",
                                   already_normalized=False):
    """
    Per-frame, voiced-only nasalance.

    1. Split both channels into overlapping frames (frame_ms / hop_ms).
    2. Find peak_combined = max(peak_nasal_rms, peak_oral_rms) across all frames.
    3. Discard a frame only if BOTH channels are quiet, i.e.
           max(n_rms, o_rms) < peak_combined * 10^(voicing_threshold_db/20)
       This keeps nasal consonants (loud nasal, quiet oral) which a pure
       oral-only gate would incorrectly drop.
    4. For each surviving frame, compute per-frame nasalance:
         - score_mode="energy"    -> N^2 / (N^2 + O^2) * 100   (Kay/Fletcher classical)
         - score_mode="amplitude" -> N   / (N   + O)   * 100   (simple RMS ratio)
    5. Return the mean of frame nasalances.
    """
    n_total_samples = min(len(nasal_samples), len(oral_samples))
    frame_size = max(1, int(sample_rate * frame_ms / 1000))
    hop_size = max(1, int(sample_rate * hop_ms / 1000))

    if n_total_samples < frame_size:
        return {"mean_score": 0.0, "frame_scores": [],
                "voiced_frames": 0, "total_frames": 0}

    n_frames = 1 + (n_total_samples - frame_size) // hop_size

    nasal_rms_per_frame = []
    oral_rms_per_frame = []
    for i in range(n_frames):
        start = i * hop_size
        end = start + frame_size
        n_block = nasal_samples[start:end]
        o_block = oral_samples[start:end]

        n_mean_sq = sum(s * s for s in n_block) / frame_size
        o_mean_sq = sum(s * s for s in o_block) / frame_size

        nasal_rms_per_frame.append(math.sqrt(n_mean_sq))
        oral_rms_per_frame.append(math.sqrt(o_mean_sq))

    peak_nasal = max(nasal_rms_per_frame) if nasal_rms_per_frame else 0.0
    peak_oral = max(oral_rms_per_frame) if oral_rms_per_frame else 0.0
    peak_combined = max(peak_nasal, peak_oral)

    if peak_combined <= 0:
        return {"mean_score": 0.0, "frame_scores": [],
                "voiced_frames": 0, "total_frames": n_frames}

    threshold = peak_combined * (10 ** (voicing_threshold_db / 20.0))

    frame_scores = []
    sum_nasal = 0.0      # sum of nasal "magnitudes" (RMS or RMS^2 depending on mode)
    sum_oral = 0.0       # sum of oral  "magnitudes"
    for n_rms, o_rms in zip(nasal_rms_per_frame, oral_rms_per_frame):
        # Drop only if BOTH channels are quiet
        if max(n_rms, o_rms) < threshold:
            continue

        if score_mode == "amplitude":
            denom = n_rms + o_rms
            if denom <= 0:
                continue
            frame_scores.append((n_rms / denom) * 100.0)
            sum_nasal += n_rms
            sum_oral += o_rms
        else:  # "energy" (default)
            n_e = n_rms * n_rms
            o_e = o_rms * o_rms
            denom = n_e + o_e
            if denom <= 0:
                continue
            frame_scores.append((n_e / denom) * 100.0)
            sum_nasal += n_e
            sum_oral += o_e

    if not frame_scores:
        return {"mean_score": 0.0, "weighted_score": 0.0, "frame_scores": [],
                "voiced_frames": 0, "total_frames": n_frames,
                "score_mode": score_mode}

    # Arithmetic mean of per-frame ratios (each frame counts equally)
    mean_score = sum(frame_scores) / len(frame_scores)

    # Energy/amplitude-weighted ratio across all voiced frames
    # (equivalent to classical Kay Pentax sum-ratio formulation)
    total = sum_nasal + sum_oral
    weighted_score = (sum_nasal / total) * 100.0 if total > 0 else 0.0

    return {"mean_score": mean_score, "weighted_score": weighted_score,
            "frame_scores": frame_scores,
            "voiced_frames": len(frame_scores), "total_frames": n_frames,
            "score_mode": score_mode,
            "nasal_rms_per_frame": nasal_rms_per_frame,
            "oral_rms_per_frame": oral_rms_per_frame}


def estimate_noise_floor(nasal_rms_per_frame, oral_rms_per_frame, percentile=5):
    """
    Estimate per-channel noise floor from the quietest frames.

    Take the bottom `percentile`% of frames by (nasal_rms + oral_rms) and
    average their per-channel RMS. Those frames are the ones most likely to be
    silence/breath/baseline-noise — their mean RMS approximates the noise floor.
    """
    n = len(nasal_rms_per_frame)
    if n == 0 or n != len(oral_rms_per_frame):
        return None

    combined = sorted(
        [(nasal_rms_per_frame[i] + oral_rms_per_frame[i], i) for i in range(n)]
    )
    cutoff = max(1, int(n * percentile / 100.0))
    bottom_idxs = [combined[i][1] for i in range(cutoff)]

    nasal_floor = sum(nasal_rms_per_frame[i] for i in bottom_idxs) / cutoff
    oral_floor = sum(oral_rms_per_frame[i] for i in bottom_idxs) / cutoff

    return {
        "nasal_noise_floor": nasal_floor,
        "oral_noise_floor": oral_floor,
        "n_frames_used": cutoff,
        "percentile": percentile,
    }


def calculate_nasalance_envelope(nasal_samples, oral_samples, sample_rate,
                                  envelope_cutoff_hz=80,
                                  voicing_threshold_db=-25):
    """
    Envelope-based nasalance, Kay Pentax style.

    1. Rectify each (already-bandpassed) channel: |x|.
    2. Low-pass at envelope_cutoff_hz (~80 Hz) to get the amplitude envelope.
    3. Voicing gate at sample resolution: keep samples where combined envelope
       is above peak * 10^(threshold_db/20).
    4. Report three aggregations of the surviving envelope samples:
         - pointwise mean of |N|/(|N|+|O|)
         - sum-ratio   sum|N| / (sum|N| + sum|O|)        (classical Kay-style amplitude)
         - sum-ratio² sum(N²)/(sum(N²) + sum(O²))         (energy variant)
    """
    if not SCIPY_AVAILABLE:
        return None

    try:
        import numpy as np
    except ImportError:
        return None

    n_arr = np.asarray(nasal_samples, dtype=np.float64)
    o_arr = np.asarray(oral_samples, dtype=np.float64)

    n = int(min(len(n_arr), len(o_arr)))
    if n == 0:
        return None
    n_arr = n_arr[:n]
    o_arr = o_arr[:n]

    # Rectify + low-pass to get amplitude envelopes
    n_rect = np.abs(n_arr)
    o_rect = np.abs(o_arr)

    nyq = sample_rate / 2.0
    cutoff = envelope_cutoff_hz / nyq
    sos = butter(4, cutoff, btype='low', output='sos')
    n_env = sosfilt(sos, n_rect)
    o_env = sosfilt(sos, o_rect)

    # Sample-resolution voicing gate (drop silent / breath samples)
    combined = n_env + o_env
    peak = float(combined.max()) if len(combined) > 0 else 0.0
    if peak <= 0:
        return None
    threshold = peak * (10 ** (voicing_threshold_db / 20.0))
    mask = combined > threshold
    voiced_count = int(mask.sum())
    if voiced_count == 0:
        return None

    n_v = n_env[mask]
    o_v = o_env[mask]

    # Three aggregations
    ratios = n_v / (n_v + o_v)
    pointwise_mean = float(np.mean(ratios)) * 100.0

    sum_n = float(n_v.sum())
    sum_o = float(o_v.sum())
    sum_ratio_amp = (sum_n / (sum_n + sum_o)) * 100.0 if (sum_n + sum_o) > 0 else 0.0

    sum_n2 = float((n_v ** 2).sum())
    sum_o2 = float((o_v ** 2).sum())
    sum_ratio_eng = (sum_n2 / (sum_n2 + sum_o2)) * 100.0 if (sum_n2 + sum_o2) > 0 else 0.0

    return {
        "envelope_pointwise_mean": pointwise_mean,
        "envelope_sum_ratio_amplitude": sum_ratio_amp,
        "envelope_sum_ratio_energy": sum_ratio_eng,
        "voiced_samples": voiced_count,
        "total_samples": n,
        "envelope_cutoff_hz": envelope_cutoff_hz,
    }


def print_frame_score_diagnostics(frame_scores, label=""):
    """
    Print percentile stats and a 10-bin histogram for per-frame nasalance scores.
    Helps see WHERE the score is coming from (e.g. long tail of high-nasal frames
    vs concentrated low-nasal frames).
    """
    if not frame_scores:
        print(f"[diagnostics{(' ' + label) if label else ''}] no voiced frames")
        return

    sorted_scores = sorted(frame_scores)
    n = len(sorted_scores)

    def pct(p):
        idx = max(0, min(n - 1, int(round((p / 100.0) * (n - 1)))))
        return sorted_scores[idx]

    mean_v = sum(sorted_scores) / n
    min_v = sorted_scores[0]
    p25 = pct(25)
    median_v = pct(50)
    p75 = pct(75)
    p90 = pct(90)
    max_v = sorted_scores[-1]

    print(f"\n[diagnostics{(' ' + label) if label else ''}] frame-score distribution (n={n})")
    print(f"  min={min_v:5.1f}%  P25={p25:5.1f}%  median={median_v:5.1f}%  "
          f"P75={p75:5.1f}%  P90={p90:5.1f}%  max={max_v:5.1f}%  mean={mean_v:5.1f}%")

    # 10-bin histogram (0..100% in 10pp bins)
    bins = [0] * 10
    for s in sorted_scores:
        idx = min(9, int(s // 10))
        bins[idx] += 1
    width = 40
    max_count = max(bins) if bins else 1
    print("  histogram (% of voiced frames in each 10pp band):")
    for i, count in enumerate(bins):
        lo, hi = i * 10, (i + 1) * 10
        share = (count / n) * 100.0
        bar = "#" * max(0, int(round((count / max_count) * width)))
        print(f"    {lo:3d}-{hi:3d}% | {share:5.1f}% {bar}")


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
    
    # spl dB = 94 + 20 * math.log10(normalized_rms)
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

def process_audio(nasal_wav : str, oral_wav : str, patient_id : str, apply_filter: bool =False, score_mode: str ="energy", debug: bool =False) -> dict:
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
            print("Applying 350-650 Hz bandpass filter...")
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

    legacy_whole_recording_score = (nasal_rms / (nasal_rms + oral_rms)) * 100 if (nasal_rms + oral_rms) > 0 else 0.0

    # Per-frame, voiced-only scoring (clinical-style), gated on max(nasal, oral)
    sample_rate = nasal_rate
    per_frame = calculate_nasalance_per_frame(
        nasal_samples_filtered,
        oral_samples_filtered,
        sample_rate,
        frame_ms=25,
        hop_ms=10,
        voicing_threshold_db=-25,
        score_mode=score_mode,
        already_normalized=filter_status,
    )
    nasalance_score = per_frame["weighted_score"]

    # Also compute the other score_mode for side-by-side comparison
    other_mode = "amplitude" if score_mode == "energy" else "energy"
    per_frame_other = calculate_nasalance_per_frame(
        nasal_samples_filtered,
        oral_samples_filtered,
        sample_rate,
        frame_ms=25,
        hop_ms=10,
        voicing_threshold_db=-25,
        score_mode=other_mode,
        already_normalized=filter_status,
    )
    
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
    print(f"Nasalance Score (energy-weighted, mode={score_mode}): {nasalance_score:.2f}%")
    print(f"  arithmetic mean of frame ratios: {per_frame['mean_score']:.2f}%")
    print(f"  voiced frames: {per_frame['voiced_frames']} / {per_frame['total_frames']}")
    print(f"Other mode ({other_mode}): weighted={per_frame_other['weighted_score']:.2f}%, mean={per_frame_other['mean_score']:.2f}%")
    print(f"Legacy whole-recording score: {legacy_whole_recording_score:.2f}%")

    if debug:
        # Diagnostic: distribution of per-frame nasalance scores (primary mode)
        print_frame_score_diagnostics(per_frame["frame_scores"], label=f"{patient_id} / {score_mode}")

        # Noise-floor estimate from the quietest 5% of frames
        noise = estimate_noise_floor(per_frame["nasal_rms_per_frame"],
                                      per_frame["oral_rms_per_frame"],
                                      percentile=5)
        if noise is not None:
            nf_total = noise["nasal_noise_floor"] + noise["oral_noise_floor"]
            nf_ratio = (noise["nasal_noise_floor"] / nf_total * 100.0) if nf_total > 0 else 0.0
            print(f"\n[noise floor, quietest {noise['percentile']}% of frames "
                  f"= {noise['n_frames_used']} frames]")
            print(f"  nasal noise floor RMS: {noise['nasal_noise_floor']:.6f}")
            print(f"  oral  noise floor RMS: {noise['oral_noise_floor']:.6f}")
            print(f"  baseline nasal share: {nf_ratio:.2f}%   "
                  f"(if >>0, baseline contributes to the score floor)")

        # Envelope-based nasalance (Kay Pentax style)
        env = calculate_nasalance_envelope(nasal_samples_filtered,
                                            oral_samples_filtered,
                                            sample_rate,
                                            envelope_cutoff_hz=80,
                                            voicing_threshold_db=-25)
        if env is not None:
            print(f"\n[envelope nasalance, {env['envelope_cutoff_hz']} Hz cutoff, "
                  f"voiced samples {env['voiced_samples']}/{env['total_samples']}]")
            print(f"  pointwise mean |N|/(|N|+|O|):           "
                  f"{env['envelope_pointwise_mean']:.2f}%")
            print(f"  sum-ratio   sum|N|/(sum|N|+sum|O|):     "
                  f"{env['envelope_sum_ratio_amplitude']:.2f}%   (Kay-style amplitude)")
            print(f"  sum-ratio²  sum(N^2)/(sum(N^2)+sum(O^2)): "
                  f"{env['envelope_sum_ratio_energy']:.2f}%   (energy variant)")

    print(f"\nNasal Pressure: {nasal_pressure_kpa:.6f} kPa")
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
            "filter_range_hz": [350, 650] if filter_status else None,
            "scoring_method": f"per_frame_voiced_{score_mode}_weighted_sum_ratio",
            "voicing_gate": "max(nasal, oral) vs max(peak_nasal, peak_oral)",
            "frame_ms": 25,
            "hop_ms": 10,
            "voicing_threshold_db": -25,
            "voiced_frames": per_frame["voiced_frames"],
            "total_frames": per_frame["total_frames"],
            "arithmetic_mean_of_frame_ratios": round(per_frame["mean_score"], 2),
            f"score_{other_mode}_mode_weighted": round(per_frame_other["weighted_score"], 2),
            f"score_{other_mode}_mode_mean": round(per_frame_other["mean_score"], 2),
            "legacy_whole_recording_score": round(legacy_whole_recording_score, 2)
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
                        help="Apply 300–4500 Hz bandpass filter before computing scores (recommended)")
    parser.add_argument("--score_mode", choices=["energy", "amplitude"], default="energy",
                        help="Per-frame ratio formula: 'energy' (RMS^2, classical) or 'amplitude' (RMS)")
    parser.add_argument("--debug", action="store_true",
                        help="Print extra diagnostics (frame-score histogram, noise floor, envelope variants)")

    args = parser.parse_args()
    result_data = process_audio(args.nasal_wav, args.oral_wav, args.patient_id,
                                apply_filter=args.apply_filter,
                                score_mode=args.score_mode,
                                debug=args.debug)
    print("\nProcessing complete. Result data ready for upload.")
    # save_result(result_data)
    