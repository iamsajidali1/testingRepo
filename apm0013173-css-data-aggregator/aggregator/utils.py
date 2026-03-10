from os.path import join
from aggregator.settings import DOC_PATH


def get_readme(filename: str) -> str:
    """Open the readme file and return the contents."""
    with open(join(DOC_PATH, filename), encoding='utf8') as file:
        return file.read()
    