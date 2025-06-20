from dataclasses import dataclass



@dataclass
class Localization:
    relevant_text: str
    page_index: int
    chunk_index: int
