import numpy as np
import scipy.io.wavfile as wavfile

sr = 44100
duration = 3  # seconds
t = np.linspace(0, duration, sr * duration)

# nasal: 500 Hz tone, oral: 1000 Hz tone
nasal = (np.sin(2 * np.pi * 500 * t) * 32767).astype(np.int16)
oral  = (np.sin(2 * np.pi * 1000 * t) * 32767).astype(np.int16)

wavfile.write("test_nasal.wav", sr, nasal)
wavfile.write("test_oral.wav",  sr, oral)
print("Generated test_nasal.wav and test_oral.wav with 500 Hz and 1000 Hz tones respectively.")