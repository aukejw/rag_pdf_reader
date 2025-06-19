# RAG-pdf-reader

RAG often doesn't work, and it's not always clear why. Is it the retrievals fault? Is the prompt incorrect? 

To better understand the failures, we provide a simple workflow:

    1. A user asks a question.
    2. Retrieve, based on embeddings from a Chroma vector store
    3. Generate, based on a Ollama-hosted model
    4. Evaluate, check correctness using the same model
    5. Localize, to find out which part of the context helped us answer the question

## Installation

You will need 

- [uv](https://github.com/astral-sh/uv) for backend dependencies
- nvm for frontend dependencies
- make, if you want to use the Makefile

First, install dependencies:
```
make install
```

To run the application in development mode, use:
```
make dev
```

This will start frontend and backend, and will show the address and port in terminal.
