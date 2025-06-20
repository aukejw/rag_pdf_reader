from typing import List
from langchain.schema import Document
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings

from pdf_reader.core.retrieval.datatypes import Context, RetrievedDocument


class ChromaRetriever:
    """Retrieval based on Chroma vector store."""
    def __init__(
        self,
        collection_name: str,
        embedding_model_id: str,
        persist_directory: str,
        max_num_retrieved_chunks: int = 5,
    ):
        self.collection_name = collection_name
        self.embedding_function = OllamaEmbeddings(model=embedding_model_id)
        self.persist_directory = persist_directory
        self.max_num_retrieved_chunks = max_num_retrieved_chunks

        self.vector_store = Chroma(
            embedding_function=self.embedding_function,
            persist_directory=self.persist_directory,
            collection_name=self.collection_name,
        )

    def add_documents(
        self,
        documents: List[Document],
    ):
        self.vector_store.reset_collection()
        self.vector_store.add_documents(documents)

    def retrieve(
        self,
        query: str,
    ) -> Context:
        retrieved_docs = self.vector_store.similarity_search_with_relevance_scores(
            query=query,
            k=self.max_num_retrieved_chunks,
        )
        context = Context()
        for doc, relevance_score in retrieved_docs:
            page_content = doc.page_content

            # minor data cleaning
            page_content = page_content.replace("-\n", "").strip()

            context.append(
                RetrievedDocument(
                    content=page_content,
                    metadata=doc.metadata,
                    relevance_score=relevance_score,
                )
            )

        return context