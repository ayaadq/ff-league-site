"""Stadium crowd, take three: put the building in.

Take two fixed the texture (granular voices instead of noise) but the
claps read as firecrackers, and the measurement agreed — crest factor
33 dB, which is what isolated dry transients look like. Three causes,
all addressed here:

  * No room. A stadium is a huge reverberant bowl; every clap arrives
    smeared by a couple of seconds of tail, which is most of what makes
    applause sound like applause rather than popcorn. Convolving with a
    synthesised impulse response does more for realism than any amount
    of tweaking the claps themselves.
  * Too sparse, too loud. Individual claps were audible as individuals.
    Real applause is far denser and each clap far quieter, so they fuse.
  * Too sharp. Instant onsets and a bright band. Distance softens both.

Also louder overall: the old bed sat near -59 dBFS once the player's
gain was applied, which is close to inaudible. Levels are now set by
target RMS rather than peak, because RMS is what loudness actually
tracks.
"""

import numpy as np
from scipy import signal

SR = 44100
FORMANTS = [(700, 110, 1.0), (1220, 130, 0.55), (2600, 190, 0.28)]

# What a dense crowd should measure. Firecrackers live up near 30.
TARGET_CREST_DB = 16.0


def voice_grain(dur, f0, rng):
    n = max(int(SR * dur), 32)
    t = np.arange(n) / SR
    drift = 1.0 + 0.04 * np.sin(2 * np.pi * rng.uniform(0.6, 2.0) * t + rng.uniform(0, 6.28))
    phase = 2 * np.pi * np.cumsum(f0 * drift) / SR
    src = signal.sawtooth(phase) * 0.8 + rng.standard_normal(n) * 0.2
    out = np.zeros(n)
    for fc, bw, gain in FORMANTS:
        b, a = signal.iirpeak(fc / (SR / 2), fc / bw)
        out += gain * signal.lfilter(b, a, src)
    attack = max(int(n * rng.uniform(0.1, 0.3)), 1)
    env = np.ones(n)
    env[:attack] = np.linspace(0, 1, attack)
    env[attack:] = np.linspace(1, 0, n - attack) ** rng.uniform(1.0, 2.2)
    return out * env


def applause(n, rng, per_second):
    """Dense, soft, slightly dull. Individually inaudible by design — the
    point is the wash they fuse into, not any one of them."""
    out = np.zeros(n + 2048)
    count = int(per_second * n / SR)
    starts = rng.integers(0, max(n - 2048, 1), count)
    # One filter for all of them: per-clap filtering was the expensive part
    # and the variation that mattered is in length and level, not band.
    b, a = signal.butter(2, [900 / (SR / 2), 5000 / (SR / 2)], btype="band")
    lengths = rng.integers(200, 700, count)
    levels = rng.uniform(0.08, 0.34, count)
    for s, length, level in zip(starts, lengths, levels):
        burst = signal.lfilter(b, a, rng.standard_normal(length))
        t = np.linspace(0, 1, length)
        # A short ramp instead of an instant onset — distance has no
        # infinitely sharp edges.
        attack = max(int(length * 0.06), 2)
        env = np.exp(-t * 8.5)
        env[:attack] *= np.linspace(0, 1, attack)
        out[s : s + length] += burst * env * level
    return out[:n]


def stadium_ir(seconds=2.4, seed=5):
    """A big concrete bowl: a few early reflections, then a diffuse tail
    that decays exponentially and loses its top end as it goes (air
    absorbs high frequencies faster than low)."""
    rng = np.random.default_rng(seed)
    n = int(SR * seconds)
    t = np.arange(n) / SR
    tail = rng.standard_normal(n) * np.exp(-t * (6.9 / seconds))  # ~RT60
    # Progressive high-frequency loss across the tail, in four bands.
    out = np.zeros(n)
    edges = [(0, 400), (400, 1500), (1500, 4000), (4000, 9000)]
    damping = [1.0, 0.85, 0.55, 0.3]
    for (lo, hi), d in zip(edges, damping):
        b, a = signal.butter(2, [max(lo, 20) / (SR / 2), min(hi, 20000) / (SR / 2)], btype="band")
        band = signal.filtfilt(b, a, tail)
        out += band * np.exp(-t * (1 - d) * 3.0)
    # Early reflections — the walls, before the tail diffuses.
    for delay_ms, gain in [(11, 0.5), (19, 0.38), (29, 0.3), (47, 0.22), (71, 0.16)]:
        idx = int(SR * delay_ms / 1000)
        out[idx] += gain
    out[0] += 0.6  # direct sound
    return out / (np.abs(out).max() + 1e-9)


def crowd_dry(seconds, rng, voices_per_sec, claps_per_sec, pitch_lo=110, pitch_hi=430):
    n = int(SR * seconds)
    out = np.zeros(n + SR * 2)
    total = int(voices_per_sec * seconds)
    for _ in range(total):
        g = voice_grain(rng.uniform(0.18, 1.1), rng.uniform(pitch_lo, pitch_hi), rng)
        start = rng.integers(0, n)
        out[start : start + len(g)] += g * rng.uniform(0.25, 1.0)
    out = out[:n] / np.sqrt(total)
    return out + applause(n, rng, claps_per_sec) * 0.9


def reverberate(dry, ir, wet=0.78):
    wet_sig = signal.fftconvolve(dry, ir)[: len(dry)]
    wet_sig /= np.abs(wet_sig).max() + 1e-9
    dry_n = dry / (np.abs(dry).max() + 1e-9)
    return wet * wet_sig + (1 - wet) * dry_n


def air(x, cutoff=6500):
    b, a = signal.butter(2, cutoff / (SR / 2), btype="low")
    x = signal.filtfilt(b, a, x)
    b, a = signal.butter(2, 85 / (SR / 2), btype="high")
    return signal.filtfilt(b, a, x)


def set_rms(x, target_dbfs):
    x = x - x.mean(axis=0, keepdims=True)
    rms = np.sqrt((x**2).mean())
    x = x * (10 ** (target_dbfs / 20) / (rms + 1e-12))
    peak = np.abs(x).max()
    if peak > 0.95:  # keep headroom without squashing the dynamics
        x = x * (0.95 / peak)
    return x


def stats(x):
    mono = x.mean(axis=1) if x.ndim > 1 else x
    peak = 20 * np.log10(np.abs(mono).max() + 1e-12)
    rms = 20 * np.log10(np.sqrt((mono**2).mean()) + 1e-12)
    return peak, rms, peak - rms


def make_bed(seconds=15.0, seed=21):
    rng = np.random.default_rng(seed)
    ir_l, ir_r = stadium_ir(seed=5), stadium_ir(seed=6)
    left = reverberate(crowd_dry(seconds, rng, 110, 260), ir_l)
    right = reverberate(crowd_dry(seconds, rng, 110, 260), ir_r)
    x = np.stack([air(left), air(right)], axis=1)
    fade = int(SR * 1.2)
    ramp = np.linspace(0, 1, fade)[:, None]
    head, tail = x[:fade].copy(), x[-fade:].copy()
    x = x[:-fade]
    x[:fade] = head * ramp + tail * (1 - ramp)
    # Loud enough to actually hear under the page, which the last one
    # was not.
    return set_rms(x, -30.0)


def make_roar(seconds=9.0, seed=33):
    rng = np.random.default_rng(seed)
    ir_l, ir_r = stadium_ir(seconds=2.8, seed=7), stadium_ir(seconds=2.8, seed=8)
    left = reverberate(crowd_dry(seconds, rng, 230, 620, pitch_hi=520), ir_l)
    right = reverberate(crowd_dry(seconds, rng, 230, 620, pitch_hi=520), ir_r)
    x = np.stack([air(left, 7500), air(right, 7500)], axis=1)
    t = np.linspace(0, 1, x.shape[0])
    peak = 0.34
    rise = np.clip(t / peak, 0, 1) ** 1.7
    fall = np.exp(-np.clip(t - peak, 0, None) * 3.1)
    return set_rms(x * (rise * (0.30 + 0.70 * fall))[:, None], -24.0)


def burble_depth(x):
    mono = x.mean(axis=1) if x.ndim > 1 else x
    env = np.abs(signal.hilbert(mono))
    b, a = signal.butter(2, 40 / (SR / 2), btype="low")
    env = signal.filtfilt(b, a, env)
    env_ds = signal.resample_poly(env, 400, SR)
    f, p = signal.welch(env_ds - env_ds.mean(), 400, nperseg=1024)
    band = (f >= 2) & (f <= 8)
    return float(np.sqrt(p[band].sum()) / (env_ds.mean() + 1e-9))


if __name__ == "__main__":
    import sys
    from scipy.io import wavfile

    out = sys.argv[1]
    for name, data in (("ambience", make_bed()), ("roar", make_roar())):
        p, r, crest = stats(data)
        print(
            f"{name}: {data.shape[0]/SR:.1f}s stereo  peak {p:.1f}  rms {r:.1f}  "
            f"crest {crest:.1f} dB (target <= {TARGET_CREST_DB})  burble {burble_depth(data):.3f}"
        )
        wavfile.write(f"{out}/{name}.wav", SR, (np.clip(data, -1, 1) * 32767).astype(np.int16))
