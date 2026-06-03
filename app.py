from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import subprocess
from dotenv import load_dotenv
from rag import buscar_contexto, melhorarResposta

load_dotenv()

app = Flask(__name__)
# Permitir CORS apenas nas rotas da API para que o frontend React consiga acessar o backend
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.route("/", methods=["GET"])
@app.route("/api/status", methods=["GET"])
def status():
    """Rota de status para verificar se o backend está ativo."""
    return jsonify({
        "status": "online",
        "message": "Servidor Flask do GEOGAP RAG está ativo!",
        "database": "ChromaDB",
        "project": "GEOGAP"
    })

@app.route("/api/chat", methods=["POST"])
def chat():
    """
    Rota principal do Chatbot RAG.
    Recebe a pergunta do usuário, faz a busca semântica no ChromaDB,
    combina a pergunta com os contextos e gera a resposta final refinada usando o Gemini 1.5 Flash.
    """
    data = request.json
    if not data or "message" not in data:
        return jsonify({"error": "O campo 'message' é obrigatório no corpo da requisição."}), 400

    user_message = data["message"]

    try:
        # 1. Faz a busca semântica no ChromaDB para resgatar os contextos mais relevantes
        resultados_busca = buscar_contexto(user_message)
        
        # 2. Processa os resultados de busca e extrai as fontes para retornar ao frontend
        sources = []
        documents_text = []
        
        if resultados_busca and "documents" in resultados_busca and len(resultados_busca["documents"]) > 0:
            docs = resultados_busca["documents"][0]
            metadatas = resultados_busca["metadatas"][0] if "metadatas" in resultados_busca and len(resultados_busca["metadatas"]) > 0 else []
            
            for i in range(len(docs)):
                doc_content = docs[i]
                doc_title = metadatas[i].get("titulo", f"Fonte {i+1}") if i < len(metadatas) else f"Fonte {i+1}"
                
                # Armazena as fontes formatadas para o frontend
                sources.append({
                    "title": doc_title,
                    "content": doc_content
                })
                # Monta a string do contexto consolidada para o prompt do LLM
                documents_text.append(f"[Título: {doc_title}]\nConteúdo: {doc_content}")
        
        # Consolidar contexto recuperado
        contexto_consolidado = "\n\n---\n\n".join(documents_text) if documents_text else "Nenhum contexto encontrado."

        # 3. Montar o prompt rico mesclando a consulta com o contexto do RAG
        prompt = f"""
Consulta do Usuário: {user_message}

Contexto Recuperado da Base de Conhecimento (GEOGAP):
{contexto_consolidado}

Por favor, elabore uma resposta amigável e direta que atenda a essa consulta, seguindo as diretrizes dadas.
"""

        # 4. Envia o prompt para melhorarResposta (Gemini 1.5 Flash)
        resposta_final = melhorarResposta(prompt)

        return jsonify({
            "response": resposta_final,
            "sources": sources
        })

    except Exception as e:
        print(f"Erro ao processar requisição de chat: {str(e)}")
        return jsonify({
            "error": "Ocorreu um erro ao processar a resposta do chatbot.",
            "details": str(e)
        }), 500

@app.route("/api/rebuild-db", methods=["POST"])
def rebuild_db():
    """
    Rota administrativa para recarregar o banco de dados ChromaDB
    rodando o script gerarEmbeddings.py.
    """
    try:
        # Executa o script python gerarEmbeddings.py em segundo plano ou aguarda
        result = subprocess.run(
            ["python", "gerarEmbeddings.py"],
            capture_output=True,
            text=True,
            check=True
        )
        return jsonify({
            "status": "success",
            "message": "Banco de dados ChromaDB reconstruído com sucesso!",
            "output": result.stdout
        })
    except subprocess.CalledProcessError as e:
        return jsonify({
            "status": "error",
            "message": "Erro ao reconstruir o banco de dados ChromaDB.",
            "error": e.stderr
        }), 500
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == "__main__":
    # O servidor roda na porta 5005 por padrão para evitar conflitos no Windows
    port = int(os.environ.get("PORT", 5005))
    app.run(host="0.0.0.0", port=port, debug=True)
