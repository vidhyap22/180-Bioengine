import sounddevice as sd
import scipy.io.wavfile as wavfile 
import numpy as np
import threading
import time
from typing import Dict, List, Optional

class AudioRecorder:
    def __init__(self, sample_rate: int = 44100):
        self.sample_rate = sample_rate
        self.recordings: Dict[int, List] = {}
        self.recording_threads: Dict[int, threading.Thread] = {}
        self.stop_flags: Dict[int, threading.Event] = {}
        self.available_devices = [
            device for device in sd.query_devices()
            if device['max_input_channels'] > 0
        ]
        
    def validate_mic_indices(self, mic_indices: List[int]) -> List[int]:
        """Validate that provided indices correspond to input devices"""
        valid_indices = []
        for idx in mic_indices:
            try:
                device = sd.query_devices(idx)
                if device['max_input_channels'] > 0:
                    valid_indices.append(idx)
                else:
                    print(f"Device {idx} is not an input device")
            except ValueError:
                print(f"Invalid device index: {idx}")
        return valid_indices
        
    def record_from_mic(self, mic_idx: int) -> None:
        """Record from a single microphone continuously until stopped"""
        self.recordings[mic_idx] = []
        try:
            with sd.InputStream(device=mic_idx, channels=1, 
                              samplerate=self.sample_rate) as stream:
                while not self.stop_flags[mic_idx].is_set():
                    data, _ = stream.read(1024)
                    self.recordings[mic_idx].append(data)
        except Exception as e:
            print(f"Error recording from mic {mic_idx}: {str(e)}")
            
    def list_devices(self) -> None:
        """List all available audio input devices"""
        print("Available Audio Input Devices:")
        for device in self.available_devices:
            print(f"Index: {device['index']}, Name: {device['name']}, "
                  f"Channels: {device['max_input_channels']}")
        print()

    def start_recording(self, mic_indices: Optional[List[int]] = None) -> None:
        """Start recording from specified microphones"""
        if mic_indices is None:
            mic_indices = [device['index'] for device in self.available_devices]
        
        valid_indices = self.validate_mic_indices(mic_indices)
        if not valid_indices:
            print("No valid input devices specified")
            return
            
        for mic_idx in valid_indices:
            if mic_idx in self.recording_threads:
                print(f"Already recording from mic {mic_idx}")
                continue
                
            self.stop_flags[mic_idx] = threading.Event()
            self.recording_threads[mic_idx] = threading.Thread(
                target=self.record_from_mic,
                args=(mic_idx,)
            )
            self.recording_threads[mic_idx].start()
            print(f"Started recording from mic {mic_idx}")
            
    def stop_recording(self, mic_indices: Optional[List[int]] = None) -> None:
        """Stop recording from specified microphones"""
        if mic_indices is None:
            mic_indices = list(self.recording_threads.keys())
            
        for mic_idx in mic_indices:
            if mic_idx in self.recording_threads:
                self.stop_flags[mic_idx].set()
                self.recording_threads[mic_idx].join()
                del self.recording_threads[mic_idx]
                del self.stop_flags[mic_idx]
                print(f"Stopped recording from mic {mic_idx}")
                
    def save_recordings(self, prefix: str = "recording") -> None:
        """Save all recordings to WAV files"""
        for mic_idx, frames in self.recordings.items():
            if frames:
                filename = f"{prefix}_mic_{mic_idx}.wav"
                data = np.concatenate(frames)
                wavfile.write(filename, self.sample_rate, data)
                print(f"Saved recording to {filename}")
                
    def clear_recordings(self) -> None:
        """Clear all stored recordings"""
        self.recordings.clear()

if __name__ == "__main__":
    recorder = AudioRecorder(sample_rate=44100)
    recorder.list_devices()
    
    recorder.start_recording(mic_indices=[0, 1])
    time.sleep(5)
    recorder.stop_recording()
    recorder.save_recordings()
    recorder.clear_recordings()