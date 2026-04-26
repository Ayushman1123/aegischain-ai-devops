"""Quick HF connectivity test - run: python test_hf.py"""

import os
import traceback
import sys

from dotenv import load_dotenv
from huggingface_hub import InferenceClient

load_dotenv()
HF_TOKEN = os.getenv("HF_TOKEN", "")
HF_MODEL = os.getenv("HF_MODEL", "meta-llama/Llama-3.3-70B-Instruct")
HF_PROVIDER = os.getenv("HF_PROVIDER", "together")

print(f"Token    : {'SET (' + HF_TOKEN[:8] + '...)' if HF_TOKEN else 'NOT SET'}")
print(f"Model    : {HF_MODEL}")
print(f"Provider : {HF_PROVIDER}")
print("-" * 50)

if not HF_TOKEN:
    print("HF_TOKEN is empty in .env. Add your token and rerun.")
    sys.exit(1)

messages = [
    {"role": "system", "content": "You are a helpful assistant. Reply with valid JSON only."},
    {"role": "user", "content": 'Respond with exactly: {"status": "ok"}'},
]

try:
    client = InferenceClient(provider=HF_PROVIDER, token=HF_TOKEN)
    completion = client.chat.completions.create(
        model=HF_MODEL,
        messages=messages,
        max_tokens=40,
        temperature=0.1,
    )
    result = completion.choices[0].message.content
    print("SUCCESS:", repr(result))
except Exception:
    # Fallback for providers/models that only expose text-generation.
    try:
        formatted_prompt = (
            "<|begin_of_text|>"
            "<|start_header_id|>system<|end_header_id|>\\n\\n"
            "You are a helpful assistant. Reply with valid JSON only.<|eot_id|>"
            "<|start_header_id|>user<|end_header_id|>\\n\\n"
            'Respond with exactly: {"status": "ok"}<|eot_id|>'
            "<|start_header_id|>assistant<|end_header_id|>\\n\\n"
        )
        result = client.text_generation(
            formatted_prompt,
            model=HF_MODEL,
            max_new_tokens=30,
            temperature=0.1,
            do_sample=True,
            return_full_text=False,
        )
        print("SUCCESS:", repr(result))
    except Exception as e:
        print(f"ERROR TYPE : {type(e).__name__}")
        print(f"ERROR MSG  : {e}")
        print("\\nFULL TRACE:")
        traceback.print_exc()
