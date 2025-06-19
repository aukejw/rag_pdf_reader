import json
from fastapi import FastAPI, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import shutil
import tempfile

from pdf_reader import REPO_ROOT
from pdf_reader.core.search_agent import setup_graph
from pdf_reader.api.schemas import Question, Answer

app = FastAPI()

# Configure CORS to enable document upload
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)


# Load config, initialize search agent and graph
with open(REPO_ROOT / "config.json") as f:
    config = json.load(f)

agent, graph = setup_graph(**config)


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload and process a PDF file."""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = Path(tmp.name)
        
        agent.load_pdf(
            tmp_path, chunk_overlap=200, chunk_size=2000,
        )
        return {"message": "PDF processed successfully"}
    except Exception as e:
        return {"error": str(e)}


@app.post("/ask", response_model=Answer)
async def ask_question(question: Question):
    """Ask a question about the uploaded PDF."""
    try:
        result = graph.invoke({"question": question.text})
        return Answer(
            answer=result["answer"],
            relevant_text=result["relevant_text"],
            context=result["context"],
        )
    except Exception as e:
        return Answer(
            answer=f"Error: {str(e)}",
            relevant_text={},
            context=[],
        )


@app.get("/config")
def get_config():
    with open(REPO_ROOT / "config.json") as f:
        return json.load(f)


@app.post("/config")
async def update_config(request: Request):
    data = await request.json()
    with open(REPO_ROOT / "config.json", "w") as f:
        json.dump(data, f, indent=2)
    return {"message": "Config updated. Please restart the backend for changes to take effect."} 
