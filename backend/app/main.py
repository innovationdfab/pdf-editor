
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.documents import router as documents_router


app = FastAPI(
    title="PDF Editor API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents_router)


@app.get("/")
def root():
    return {
        "status": "success",
        "message": "PDF Editor backend is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }