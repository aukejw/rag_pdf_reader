from pathlib import Path
from langchain.schema import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langgraph.graph import START, StateGraph
from typing import Dict, Any, List, Tuple, TypedDict
from langchain_ollama.llms import OllamaLLM
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter


from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
import re


class State(TypedDict):
    """Graph state object"""
    # Question
    question: str

    # Context
    context: List[Dict[str, Any]]

    # Answer 
    answer: str

    # Where did we find the answer
    relevant_text: Dict[str, Any]


def normalize_whitespace(s: str) -> str:
    return re.sub(r'\s+', ' ', s).strip().lower()


class DocSearch:
    """RAG search agent.

    Args:
        prompt_model_id: The model to use for the prompt.
        embedding_model_id: The model to use for the embedding.
        retrieval_prompt_template: The prompt to use for the retrieval.
        location_prompt_template: The prompt to use for the location.
        vector_store_path: The path to the vector store.
        num_ctx: The context size for the model.
        seed: The seed for random number generation.

    Graph:
        retrieve -> generate -> localize

    """
    def __init__(
        self, 
        generation_model_config: Dict[str, Any],
        embedding_model_id: str,
        retrieval_prompt_template: str,
        location_prompt_template: str,
        vector_store_path: str,
        max_num_retrieved_chunks: int = 5,
    ):
        self.llm = OllamaLLM(
            model=generation_model_config["model_id"], 
            num_ctx=generation_model_config["num_ctx"], 
            seed=generation_model_config["seed"],
        )
        self.retrieval_prompt = retrieval_prompt_template
        self.location_prompt = location_prompt_template

        self.vector_store = Chroma(
            collection_name="pdf_collection",
            embedding_function=OllamaEmbeddings(model=embedding_model_id),
            persist_directory=Path(vector_store_path).as_posix(),
        )

        # Placeholder for messages, will be used to continue the conversation
        self.messages_history = []
        self.max_num_retrieved_chunks = max_num_retrieved_chunks

    def load_pdf(
        self,
        pdf_file: Path,
        chunk_size: int = 2000,
        chunk_overlap: int = 200,
    ):
        documents = PyPDFLoader(str(pdf_file)).load()
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size, 
            chunk_overlap=chunk_overlap,
            add_start_index=True,  
        )
        chunks: List[Document] = splitter.split_documents(documents)

        self.vector_store.reset_collection()
        self.vector_store.add_documents(documents=chunks)

    def retrieve(
        self, 
        state: State,
    ) -> Dict[str, Any]:

        retrieved_docs = self.vector_store.similarity_search_with_relevance_scores(
            query=state["question"],
            k=self.max_num_retrieved_chunks,
        )

        context = []
        for doc, relevance_score in retrieved_docs:
            page_content = doc.page_content

            # some small data cleaning
            page_content = page_content.replace("-\n", "").strip()

            context.append(
                dict(
                    content=page_content,
                    metadata=doc.metadata,
                    relevance_score=relevance_score,
                )
            )

        return dict(
            context=context,
        )

    def generate(
        self, 
        state: State, 
    ) -> Dict[str, Any]:

        context_string = "\n".join([
            doc["content"] for doc in state["context"]
        ])
        prompt = self.retrieval_prompt.format(
            context_string=context_string, **state
        )

        # (re)set the message history
        self.messages_history = [
            ("user", prompt),
        ]
        response = self.llm.invoke(self.messages_history)

        self.messages_history += [
            ("assistant", response),
        ]
        return dict(
            answer=response,
        )

    def localize(
        self, 
        state: State,
    ) -> Dict[str, Any]:

        context_string = "\n".join([
            doc["content"] for doc in state["context"]
        ])

        prompt = self.location_prompt.format(context_string=context_string, **state)

        self.messages_history += [
            ("user", prompt),
        ]
        response = self.llm.invoke(self.messages_history)

        # Defaults indicate: no text found
        page_index = -1
        chunk_index = -1

        # Try to localize
        relevant_text = response
        if relevant_text:
            norm_relevant_text = normalize_whitespace(relevant_text)
            for chunk_index_in_context, doc in enumerate(state["context"]):
                norm_content = normalize_whitespace(doc['content'])
                norm_start = norm_content.find(norm_relevant_text)

                if norm_start != -1:
                    page_index = doc['metadata']['page']
                    chunk_index = chunk_index_in_context
                    break

        return dict(
            relevant_text=dict(
                text=relevant_text,
                page_index=page_index,
                chunk_index=chunk_index,
            )
        )

    def setup_graph(
        self,
    ) -> StateGraph:
        graph_builder = StateGraph(State).add_sequence([
            self.retrieve, 
            self.generate,
            self.localize,
        ])
        graph_builder.add_edge(START, "retrieve")
        return graph_builder.compile()


def setup_graph(
    embedding_model_id: str,
    generation_model_config: Dict[str, Any],
    retrieval_prompt_template: str,
    location_prompt_template: str,
    vector_store_path: str,
) -> Tuple[DocSearch, StateGraph]:
    """Set up the agent and graph."""
    agent = DocSearch(
        embedding_model_id=embedding_model_id,
        generation_model_config=generation_model_config,
        retrieval_prompt_template=retrieval_prompt_template,
        location_prompt_template=location_prompt_template,
        vector_store_path=vector_store_path,
    )

    graph_builder = StateGraph(State).add_sequence([
        agent.retrieve, 
        agent.generate,
        agent.localize,
    ])
    graph_builder.add_edge(START, "retrieve")
    graph = graph_builder.compile()
    return agent, graph
