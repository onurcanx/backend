import psycopg2
import os
import sys
import json
from dotenv import load_dotenv
from nlp_analyzer import CommentAnalyzer

# .env dosyasını yükle
load_dotenv()

def analyze_comments(movie_id):
    try:
        # Veritabanı bağlantısı
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            database=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASS"),
            port=os.getenv("DB_PORT")
        )
        
        cursor = conn.cursor()
        
        # Belirli bir filmin yorumlarını çek
        cursor.execute(
            "SELECT comment FROM comments WHERE movie_id = %s",
            (movie_id,)
        )
        
        comments = cursor.fetchall()
        
        if not comments:
            return {
                "status": "warning",
                "message": "Bu film için henüz yorum bulunmuyor."
            }
        
        # Yorumları listeye çevir
        comment_texts = [comment[0] for comment in comments]
        
        # Dil işleme analizi yap
        analyzer = CommentAnalyzer()
        analysis_result = analyzer.analyze_comments(comment_texts)
        
        # Sonuçları birleştir
        result = {
            "status": "success",
            "message": f"Yorumlar başarıyla analiz edildi. Toplam {len(comments)} yorum bulundu.",
            "comment_count": len(comments),
            "analysis": analysis_result["analysis"]
        }
        
        return result
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Yorumlar analiz edilirken bir hata oluştu: {str(e)}"
        }
    
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({
            "status": "error",
            "message": "Film ID parametresi gerekli"
        }))
        sys.exit(1)
    
    try:
        movie_id = int(sys.argv[1])
        result = analyze_comments(movie_id)
        print(json.dumps(result))
    except ValueError:
        print(json.dumps({
            "status": "error",
            "message": "Geçersiz film ID formatı"
        }))
        sys.exit(1) 
