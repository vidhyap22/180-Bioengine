import os
import itertools
import math
from process_audio import read_wav_samples, apply_bandpass_filter, trim_silence, calculate_rms

AUDIO_DIR = "./test_audio"

EXPECTED = {
    "maria": 17.5,
    "jadelynn": 19.5,
    "christian": 25.2,
    "kelly": 29.1,
    "emily": 30.1,
}

PAIRS = {
    "maria": (
        "maria_spanish_v2_right_top.wav",
        "maria_spanish_v2_left_bottom.wav",
    ),
    "jadelynn": (
        "jadelynn_v2_right_top.wav",
        "jadelynn_v2_left_bottom.wav",
    ),
    "christian": (
        "christian_v2_right_top.wav",
        "christian_v2_left_bottom.wav",
    ),
    "kelly": (
        "kelly_v2_right_top.wav",
        "kelly_v2_left_bottom.wav",
    ),
    "emily": (
        "emily_v2_right_top.wav",
        "emily_v2_left_bottom.wav",
    ),
}


def windowed_nasalance(
    nasal_samples,
    oral_samples,
    sample_rate,
    window_ms=50,
    drop_threshold_db=-45,
):
    window_size = int(sample_rate * window_ms / 1000)
    scores = []

    for start in range(0, min(len(nasal_samples), len(oral_samples)) - window_size, window_size):
        n_block = nasal_samples[start:start + window_size]
        o_block = oral_samples[start:start + window_size]

        n_rms = calculate_rms(n_block)
        o_rms = calculate_rms(o_block)

        total_rms = n_rms + o_rms
        if total_rms <= 0:
            continue

        # Convert total RMS to rough dBFS-like threshold
        total_norm = total_rms / 2
        if total_norm <= 0:
            continue

        db = 20 * math.log10(total_norm + 1e-12)

        if db < drop_threshold_db:
            continue

        score = n_rms / (n_rms + o_rms) * 100
        scores.append(score)

    if not scores:
        return 0.0

    return sum(scores) / len(scores)


def whole_file_nasalance(nasal_samples, oral_samples):
    nasal_rms = calculate_rms(nasal_samples)
    oral_rms = calculate_rms(oral_samples)

    if nasal_rms + oral_rms == 0:
        return 0.0

    return nasal_rms / (nasal_rms + oral_rms) * 100


def score_patient(
    patient,
    lower_hz,
    upper_hz,
    window_ms,
    drop_threshold_db,
    use_filter,
    use_trim,
    use_windowed,
):
    nasal_file, oral_file = PAIRS[patient]

    nasal_path = os.path.join(AUDIO_DIR, nasal_file)
    oral_path = os.path.join(AUDIO_DIR, oral_file)

    nasal_samples, _, _, nasal_rate, _ = read_wav_samples(nasal_path)
    oral_samples, _, _, oral_rate, _ = read_wav_samples(oral_path)

    if nasal_rate != oral_rate:
        raise ValueError(f"Sample rate mismatch for {patient}")

    sample_rate = nasal_rate

    if use_trim:
        nasal_samples = trim_silence(nasal_samples, sample_rate, threshold_db=drop_threshold_db, window_ms=window_ms)
        oral_samples = trim_silence(oral_samples, sample_rate, threshold_db=drop_threshold_db, window_ms=window_ms)

    if use_filter:
        nasal_samples = apply_bandpass_filter(nasal_samples, sample_rate, lower_hz, upper_hz)
        oral_samples = apply_bandpass_filter(oral_samples, sample_rate, lower_hz, upper_hz)

    if use_windowed:
        return windowed_nasalance(
            nasal_samples,
            oral_samples,
            sample_rate,
            window_ms=window_ms,
            drop_threshold_db=drop_threshold_db,
        )

    return whole_file_nasalance(nasal_samples, oral_samples)


def run_sweep():
    window_values = [20, 50, 100, 200]
    threshold_values = [-55, -50, -45, -40, -35, -30]
    hz_ranges = [
        (100, 5000),
        (200, 4500),
        (300, 4500),
        (300, 3500),
        (500, 3500),
        (700, 3000),
    ]

    configs = list(itertools.product(
        window_values,
        threshold_values,
        hz_ranges,
        [False, True],  # use_trim
        [False, True],  # use_windowed
    ))

    results = []

    for window_ms, threshold_db, hz_range, use_trim, use_windowed in configs:
        lower_hz, upper_hz = hz_range

        patient_outputs = {}
        errors = []

        for patient in EXPECTED:
            output = score_patient(
                patient=patient,
                lower_hz=lower_hz,
                upper_hz=upper_hz,
                window_ms=window_ms,
                drop_threshold_db=threshold_db,
                use_filter=True,
                use_trim=use_trim,
                use_windowed=use_windowed,
            )

            patient_outputs[patient] = output
            errors.append(abs(output - EXPECTED[patient]))

        epsilon = 1e-6

        mae = math.exp(
            sum(math.log(e + epsilon) for e in errors) / len(errors)
        )
        

        results.append({
            "mae": mae,
            "window_ms": window_ms,
            "threshold_db": threshold_db,
            "lower_hz": lower_hz,
            "upper_hz": upper_hz,
            "use_trim": use_trim,
            "use_windowed": use_windowed,
            "outputs": patient_outputs,
        })

    results.sort(key=lambda x: x["mae"])

    print("\nTOP CONFIGS")
    print("=" * 100)

    for rank, result in enumerate(results[:20], start=1):
        print(f"\n#{rank} MAE={result['mae']:.2f}")
        print(
            f"window_ms={result['window_ms']}, "
            f"threshold_db={result['threshold_db']}, "
            f"hz={result['lower_hz']}-{result['upper_hz']}, "
            f"trim={result['use_trim']}, "
            f"windowed={result['use_windowed']}"
        )

        print(f"{'Patient':<12} {'IC Speech':<12} {'Output':<12} {'Error':<12}")
        for patient, expected in EXPECTED.items():
            output = result["outputs"][patient]
            error = abs(output - expected)
            print(f"{patient:<12} {expected:<12.1f} {output:<12.1f} {error:<12.1f}")


if __name__ == "__main__":
    run_sweep()
