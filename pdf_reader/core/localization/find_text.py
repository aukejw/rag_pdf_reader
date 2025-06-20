import re

from pdf_reader.core.localization.datatypes import Localization
from pdf_reader.core.retrieval.datatypes import Context



def normalize_whitespace(s: str) -> str:
    return re.sub(r'\s+', ' ', s).strip().lower()


def localize_text_in_context(
    text: str,
    context: Context,
) -> Localization:

    page_index = -1
    chunk_index = -1

    if text:
        norm_relevant_text = normalize_whitespace(text)
        for chunk_index_in_context, doc in enumerate(context):
            norm_content = normalize_whitespace(doc.content)
            norm_start = norm_content.find(norm_relevant_text)

            if norm_start != -1:
                page_index = doc.metadata.get('page', -1)
                chunk_index = chunk_index_in_context
                break
        
    return Localization(
        relevant_text=text,
        page_index=page_index,
        chunk_index=chunk_index,
    )