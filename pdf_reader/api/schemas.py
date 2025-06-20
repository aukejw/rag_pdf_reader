from typing import List
from pydantic import BaseModel

from pdf_reader.core.evaluation.datatypes import Evaluation
from pdf_reader.core.localization.datatypes import Localization
from pdf_reader.core.retrieval.datatypes import RetrievedDocument


class Question(BaseModel):
    """Question"""
    text: str


class Answer(BaseModel):
    """Answer to questions"""
    answer: str
    context: List[RetrievedDocument]
    localization: Localization
    evaluation: Evaluation
