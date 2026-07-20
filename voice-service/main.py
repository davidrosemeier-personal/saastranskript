import io
import os

import torch
import torchaudio
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from speechbrain.inference.speaker import EncoderClassifier

INTERNAL_SECRET = os.environ["VOICE_SERVICE_SECRET"]

app = FastAPI()

# Loaded once at process start; kept warm across requests.
classifier = EncoderClassifier.from_hparams(
    source="speechbrain/spkrec-ecapa-voxceleb",
    savedir="/tmp/spkrec-ecapa-voxceleb",
)


def require_internal_secret(x_internal_secret: str | None) -> None:
    if x_internal_secret != INTERNAL_SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing internal secret")


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/embed")
async def embed(
    file: UploadFile = File(...),
    x_internal_secret: str | None = Header(default=None),
):
    require_internal_secret(x_internal_secret)

    raw = await file.read()
    try:
        waveform, sample_rate = torchaudio.load(io.BytesIO(raw))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not decode audio: {exc}") from exc

    if waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0, keepdim=True)
    if sample_rate != 16000:
        waveform = torchaudio.functional.resample(waveform, sample_rate, 16000)

    with torch.no_grad():
        embedding = classifier.encode_batch(waveform).squeeze().tolist()

    return {"embedding": embedding}
