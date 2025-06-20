from pathlib import Path
from langgraph.graph import StateGraph, END
from langchain.schema import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langgraph.graph import START, StateGraph
from typing import Dict, Any, List, TypedDict
from langchain_ollama.llms import OllamaLLM
from langchain_text_splitters import RecursiveCharacterTextSplitter


from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader

from pdf_reader.core.evaluation.datatypes import Evaluation
from pdf_reader.core.localization.find_text import localize_text_in_context
from pdf_reader.core.localization.datatypes import Localization
from pdf_reader.core.retrieval.chroma import ChromaRetriever
from pdf_reader.core.retrieval.datatypes import Context


class State(TypedDict):
    question: str
    answer: str

    context: Context
    evaluation: Evaluation
    localization: Localization



class DocSearch:
    """RAG search agent.

    Args:
        prompt_model_id: The model to use for the prompt.
        embedding_model_id: The model to use for the embedding.
        generation_prompt_template: The prompt to use for the retrieval.
        location_prompt_template: The prompt to use for the location.
        num_ctx: The context size for the model.
        seed: The seed for random number generation.

    Graphe
        retrieve -> generate -> localize

    """
    def __init__(
        self, 
        generation_model_config: Dict[str, Any],
        retrieval_config: Dict[str, Any],
        generation_prompt_template: str,
        location_prompt_template: str,
        evaluation_prompt_template: str,
    ):
        self.llm = OllamaLLM(
            model=generation_model_config["model_id"], 
            num_ctx=generation_model_config["num_ctx"], 
            seed=generation_model_config["seed"],
        )
        self.retriever = ChromaRetriever(
            collection_name="pdf_collection",
            **retrieval_config,
        )
        self.generation_prompt = generation_prompt_template
        self.location_prompt = location_prompt_template
        self.evaluation_prompt = evaluation_prompt_template

        # Placeholder for messages, will be used to continue the conversation
        self.messages_history = []

    def _call_llm(
        self,
        prompt: str,
    ):
        self.messages_history += [("user", prompt)]
        response = self.llm.invoke(self.messages_history)
        self.messages_history += [("assistant", response)]
        return response

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

        self.retriever.add_documents(documents=chunks)

    def retrieve(
        self, 
        state: State,
    ) -> Dict[str, Any]:

        context: Context = self.retriever.retrieve(
            query=state["question"],
        )
        if len(context) == 0:
            raise ValueError("No context found")

        return dict(
            context=context,
        )

    def generate(
        self, 
        state: State, 
    ) -> Dict[str, Any]:

        context_string = state['context'].to_string()
        prompt = self.generation_prompt.format(
            context_string=context_string, 
            **state,
        )

        # (re)set the message history
        self.messages_history = []

        response = self._call_llm(prompt=prompt)

        return dict(
            answer=response,
        )
    
    def evaluate(
        self,
        state: State,
    ) -> Dict[str, Any]:
        evaluation_prompt = self.evaluation_prompt.format(
            **state,
        )
        response = self._call_llm(prompt=evaluation_prompt)

        if response.lower().startswith("yes"):
            is_correct = True
        else:
            is_correct = False

        return dict(
            evaluation=Evaluation(
                is_correct=is_correct, 
                evaluation=response,
            ),
        )

    def localize(
        self, 
        state: State,
    ) -> Dict[str, Any]:

        context_string = state["context"].to_string()

        prompt = self.location_prompt.format(
            context_string=context_string, 
            **state,
        )
        response = self._call_llm(prompt=prompt)

        # Try to localize the answer in the context
        localization: Localization = localize_text_in_context(
            text=response, 
            context=state["context"],
        )
        return dict(
            localization=localization,
        )

    def setup_workflow(
        self,
    ) -> StateGraph:
        workflow = StateGraph(State)
        workflow.add_sequence([
            ('retrieve', self.retrieve), 
            ('generate', self.generate),
            ('evaluate', self.evaluate),
        ])
        workflow.add_conditional_edges(
            'evaluate',
            lambda state: state['evaluation'].is_correct,
            {
                True: 'localize',
                False: END
            }
        )
        workflow.add_node('localize', self.localize)
        workflow.add_edge(START, "retrieve")
        workflow.add_edge('localize', END)
        return workflow.compile()
