import psycopg2
import os
import requests
from dotenv import load_dotenv

# .env dosyasını yükle
load_dotenv()

# Ortam değişkenlerini al
DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASS")
DB_PORT = os.getenv("DB_PORT")
TMDB_API_KEY = os.getenv("TMDB_API_KEY")

# TMDB'den film bilgilerini al
def get_movie_info(movie_id):
    base_url = "https://api.themoviedb.org/3/movie/"
    url = f"{base_url}{movie_id}?api_key={TMDB_API_KEY}&language=en-US"

    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        return {
            "title": data.get("title"),
            "url": f"https://www.themoviedb.org/movie/{movie_id}"
        }
    except requests.exceptions.RequestException as e:
        print(f"[TMDB] Hata (movie_id: {movie_id}):", e)
        return None

# Veritabanından yorumları ve movie_id'leri çek
def get_comments():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT
        )

        cursor = conn.cursor()
        cursor.execute("SELECT comment, movie_id FROM comments")
        veriler = cursor.fetchall()

        return veriler

    except Exception as e:
        print("[DB] Hata:", e)
        return []

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

# Ana akış
def main():
    yorumlar = get_comments()

    for comment, movie_id in yorumlar:
        movie_info = get_movie_info(movie_id)
        if movie_info:
            print("🎬 Film:", movie_info['title'])
            print("📝 Yorum:", comment)
            print("🔗 TMDB URL:", movie_info['url'])
            print("-" * 60)

if __name__ == "__main__":
    main()
