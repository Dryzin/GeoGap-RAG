
import chromadb
import os
from dotenv import load_dotenv
import google.generativeai as generativeai

load_dotenv()

chave_secreta = os.environ.get('GEMINI_API_KEY', '')
if not chave_secreta:
    raise ValueError("GOOGLE_API_KEY environment variable is not set. Please set it with your Gemini API key.")

generativeai.configure(api_key=chave_secreta)

client = None
collection = None

def get_collection():
    global client, collection
    if collection is None:
        client = chromadb.PersistentClient(path="./chroma_db")
        collection = client.get_or_create_collection(name="geogap")
    return collection

# Função para gerar resposta a partir da consulta
def buscar_contexto(consulta):
    model = 'models/gemini-embedding-001'
    embedding_consulta = generativeai.embed_content(
        model=model,
        content=consulta,
        task_type="retrieval_query"
    )['embedding']
    collection = get_collection()
    resultados = collection.query(
        query_embeddings=[embedding_consulta],
        n_results=2
    )
    return resultados


def melhorarResposta(inputText):
    system_instruction = """
    Você é o GEOGAP, um assistente virtual de análise socioespacial e geomarketing para pequenos empreendedores e franqueados.
    Utilize estritamente as informações fornecidas no contexto do banco de dados vetorial para responder às perguntas de viabilidade de negócios, localização e demanda local.
    Responda de forma clara, objetiva, profissional e amigável, usando Markdown quando apropriado.
    Se a informação não estiver presente no contexto, admita educadamente que não possui essa informação específica e sugira que o usuário valide os dados localmente.
    """
    
    # Usando o SDK google-generativeai já configurado
    model_names = ['gemini-1.5-pro', 'gemini-1.5', 'gemini-2.5-flash']
    last_exception = None

    for model_name in model_names:
        try:
            model = generativeai.GenerativeModel(
                model_name=model_name,
                system_instruction=system_instruction
            )
            response = model.generate_content(inputText)
            return response.text
        except Exception as e:
            print(f"Modelo {model_name} falhou: {e}")
            last_exception = e

    raise RuntimeError(f"Nenhum modelo Gemini disponível: {last_exception}")



