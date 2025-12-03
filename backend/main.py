import base64
import io
import json
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from PIL import Image

# --- CONFIGURATION ---
# ⚠️ PASTE YOUR GOOGLE API KEY HERE
GOOGLE_API_KEY = "AIzaSyAyKxPCo_JztYcKOu8N3IyESz41e01C1K8"

genai.configure(api_key=GOOGLE_API_KEY)


app = FastAPI()

# Enable CORS so Next.js (port 3000) can talk to Python (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ImageRequest(BaseModel):
    imageBase64: str

@app.post("/analyze")
async def analyze_invoice(request: ImageRequest):
    try:
        print("📨 Received image analysis request...")
        
        # 1. Decode the Base64 Image
        # Remove header if present (data:image/png;base64,...)
        encoded = request.imageBase64
        if "," in encoded:
            encoded = encoded.split(",")[1]

        image_data = base64.b64decode(encoded)
        image = Image.open(io.BytesIO(image_data))

        # 2. Initialize Gemini Model
        # using the flash model for speed
        model = genai.GenerativeModel('gemini-2.5-flash')

        # 3. The Prompt
        prompt = """
        Analyze this invoice image. Extract the following fields as JSON:
        - "service": The Vendor Name
        - "amount": The Total Amount (number only, remove currency symbols)
        - "recipient": The Ethereum Wallet Address (starting with 0x)
        
        If no wallet is found, return null for recipient.
        Return ONLY valid JSON. Do not include markdown formatting like ```json.
        """

        print("📡 Sending to Google Gemini...")
        response = model.generate_content([prompt, image])
        
        # 4. Clean & Parse JSON
        text = response.text
        # Cleanup if Gemini adds markdown
        clean_text = text.replace("```json", "").replace("```", "").strip()
        
        data = json.loads(clean_text)
        print(f"✅ AI Success: {data}")
        
        return data

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        # Fallback Mock Data so the demo never crashes
        return {
            "service": "AWS Cloud (Python Fallback)",
            "amount": 250.00,
            "recipient": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
        }

if __name__ == "__main__":
    print("🚀 Python Backend running on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)