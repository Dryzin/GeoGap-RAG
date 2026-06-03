import chromadb
import os
from dotenv import load_dotenv
import pandas as pd
import numpy as np
import google.generativeai as generativeai


load_dotenv()

chave_secreta = os.environ.get('GEMINI_API_KEY', '')
if not chave_secreta:
    raise ValueError("GOOGLE_API_KEY environment variable is not set. Please set it with your Gemini API key.")

generativeai.configure(api_key=chave_secreta)

client = chromadb.PersistentClient(path="./chroma_db")

# Remove a coleção se ela já existir para garantir uma carga limpa sem duplicatas
try:
    client.delete_collection(name="geogap")
    print("Coleção anterior 'geogap' removida com sucesso para recarga.")
except Exception:
    print("Nenhuma coleção anterior encontrada, criando uma nova...")

collection = client.get_or_create_collection(
    name="geogap"
)

# Caminho do dataset local GeoGap
local_csv = 'GeoGap.csv'
if os.path.exists(local_csv):
    print(f"Carregando dataset local: {local_csv}")
    df = pd.read_csv(local_csv)
else:
    raise FileNotFoundError(f"Dataset local não encontrado: {local_csv}")

print("Visualizando as primeiras linhas do dataset carregado:")
print(df.head())

# Função para gerar os embeddings usando o SDK do Google AI / Gemini
def gerarEmbeddings(title, text):
    model = 'models/gemini-embedding-001'
    result = generativeai.embed_content(
        model=model,
        content=text,
        task_type="retrieval_document",
        title=title
    )
    return result['embedding']

print(f"Gerando embeddings para {len(df)} registros e inserindo no ChromaDB...")

# Aplicando a função para gerar os embeddings e inserir no banco
for index, row in df.iterrows():
    titulo = f"{row['nome_local']} ({row['categoria']})"
    texto = row['contexto_socioeconomico_rag']
    embedding = gerarEmbeddings(
        titulo,
        texto
    )
    collection.add(
        ids=[str(row['id'])],
        documents=[texto],
        metadatas=[{
            "titulo": titulo,
            "categoria": row['categoria'],
            "nome_local": row['nome_local'],
            "endereco_regiao": row['endereco_regiao'],
            "latitude": row['latitude'],
            "longitude": row['longitude']
        }],
        embeddings=[embedding]
    )

print("Todos os embeddings foram gerados e salvos no ChromaDB com sucesso!")
