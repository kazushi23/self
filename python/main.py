from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello World"}

@app.get("/items/{item_id}")
def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "q": q}

# uvicorn main:app --reload
# git clone <repo-url>
# cd your-project

# python3 -m venv venv
# source venv/bin/activate  # Windows: venv\Scripts\activate

# pip install -r requirements.txt
# python main.py
