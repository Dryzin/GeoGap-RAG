import argparse

import chromadb
from chromadb.config import Settings
import chromadb

client = chromadb.PersistentClient(path="./chroma_db")

collection = client.get_or_create_collection(
    name="geogap"
)
dados = collection.get()
print(dados)

dados = collection.get(include=['embeddings'])
print(dados)