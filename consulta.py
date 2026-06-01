from rag import buscar_contexto, melhorarResposta
consulta = "Qual região tem melhor viabilidade para abrir uma franquia de alimentação rápida em Machado?"
resposta = buscar_contexto(consulta)
print(resposta['documents'][0],"\n\n")
prompt = f"Consulta: {consulta}\nContexto: {resposta['documents'][0]}"
print(prompt,"\n\n")
print("Melhorando resposta...")
response = melhorarResposta(prompt)
print(response)

