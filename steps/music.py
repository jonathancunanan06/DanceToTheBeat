import io
from typing import IO

import ffmpeg
import librosa
import matplotlib.pyplot as plt


def analyze_audio(video_file: IO[bytes]):
    out, _ = (
        ffmpeg.input("pipe:0")
        .output("pipe:1", format="wav", acodec="pcm_s16le", ar="44100")
        .run(input=video_file.read(), capture_stdout=True, capture_stderr=True)
    )

    audio_bytes = io.BytesIO(out)
    audio_bytes.seek(0)

    y, sr = librosa.load(audio_bytes, sr=None)
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)

    return (tempo, beat_times, y, sr)


def plot_beats(path: str):
    with open(path, "rb") as file:
        tempo, beat_times, y, sr = analyze_audio(file)

    print(f"Estimated Tempo: {tempo} BPM")
    print("Beat Times:", beat_times)

    plt.figure(figsize=(10, 4))
    librosa.display.waveshow(y, sr=sr, alpha=0.6)
    plt.vlines(beat_times, -1, 1, color="r", linestyle="--", label="Beats")
    plt.title("Waveform with Beats")
    plt.legend()
    plt.show()
