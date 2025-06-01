import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
import numpy as np
from collections import Counter
import re

# NLTK gerekli dosyaları indir
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

class CommentAnalyzer:
    def __init__(self):
        # Türkçe stop words
        self.stop_words = set(stopwords.words('turkish'))
        
        # Pozitif ve negatif kelimeler
        self.positive_words = {
            'harika', 'mükemmel', 'güzel', 'iyi', 'süper', 'muhteşem', 'etkileyici',
            'başarılı', 'tavsiye', 'beğendim', 'sevdiğim', 'hoş', 'kaliteli',
            'öneririm', 'öneriyorum', 'tavsiye ederim', 'tavsiye ediyorum',
            'çok', 'gerçekten', 'kesinlikle', 'mutlaka', 'kesin', 'tam', 'tamamen',
            'müthiş', 'olağanüstü', 'fevkalade', 'olağanüstü', 'fevkalade',
            'beğendim', 'sevdiğim', 'hoşuma gitti', 'çok beğendim', 'çok sevdim',
            'tavsiye ederim', 'tavsiye ediyorum', 'öneririm', 'öneriyorum',
            'başarılı', 'kaliteli', 'iyi', 'güzel', 'süper', 'harika', 'mükemmel'
        }
        
        self.negative_words = {
            'kötü', 'berbat', 'rezil', 'vasat', 'sıkıcı', 'beğenmedim',
            'sevmedim', 'hoş değil', 'kalitesiz', 'önermem', 'önerilmez',
            'tavsiye etmem', 'tavsiye etmiyorum', 'hayal kırıklığı',
            'berbat', 'rezil', 'kötü', 'vasat', 'sıkıcı', 'beğenmedim',
            'sevmedim', 'hoş değil', 'kalitesiz', 'önermem', 'önerilmez',
            'tavsiye etmem', 'tavsiye etmiyorum', 'hayal kırıklığı',
            'beğenmedim', 'sevmedim', 'hoşuma gitmedi', 'beğenmedim',
            'sevmedim', 'hoşuma gitmedi', 'beğenmedim', 'sevmedim'
        }
        
        # Anlamsız kelimeler ve karakterler
        self.nonsense_patterns = {
            '...', '..', '....', '.....', '......',  # Çoklu nokta
            '!!!', '!!', '!!!!', '!!!!!',  # Çoklu ünlem
            '???', '??', '????', '?????',  # Çoklu soru işareti
            '...', '..', '....', '.....',  # Çoklu nokta
            '...', '..', '....', '.....'   # Çoklu nokta
        }
        
        # Minimum kelime uzunluğu
        self.min_word_length = 2
        
    def clean_text(self, text):
        # Küçük harfe çevir
        text = text.lower()
        
        # Özel karakterleri temizle
        text = re.sub(r'[^\w\s]', ' ', text)
        
        # Fazla boşlukları temizle
        text = re.sub(r'\s+', ' ', text)
        
        # Anlamsız kelimeleri temizle
        for pattern in self.nonsense_patterns:
            text = text.replace(pattern, ' ')
        
        return text.strip()
    
    def is_valid_word(self, word):
        # Kelime uzunluğu kontrolü
        if len(word) < self.min_word_length:
            return False
            
        # Sadece harf içeren kelimeler
        if not word.isalpha():
            return False
            
        # Sayı içeren kelimeler
        if any(char.isdigit() for char in word):
            return False
            
        return True
        
    def preprocess_text(self, text):
        # Metni temizle
        text = self.clean_text(text)
        
        # Tokenize et
        tokens = word_tokenize(text)
        
        # Geçerli kelimeleri filtrele
        tokens = [token for token in tokens if self.is_valid_word(token)]
        
        # Stop words'leri kaldır
        tokens = [token for token in tokens if token not in self.stop_words]
        
        return tokens
    
    def analyze_sentiment(self, text):
        # Metni temizle
        text = self.clean_text(text)
        
        # Geçerli kelimeleri bul
        valid_words = [word for word in text.split() if self.is_valid_word(word)]
        
        if not valid_words:
            return None  # Geçerli kelime yoksa None dön
        
        # Pozitif ve negatif kelime sayılarını hesapla
        positive_count = sum(1 for word in valid_words if word in self.positive_words)
        negative_count = sum(1 for word in valid_words if word in self.negative_words)
        
        # Toplam skor
        total = positive_count + negative_count
        
        if total == 0:
            return None  # Pozitif veya negatif kelime yoksa None dön
        
        # Normalize et
        positive_score = positive_count / total
        negative_score = negative_count / total
        
        return {
            "positive": positive_score,
            "negative": negative_score,
            "sentiment": "positive" if positive_score > negative_score else "negative"
        }
    
    def extract_keywords(self, tokens, top_n=5):
        # En sık geçen kelimeleri bul
        word_freq = Counter(tokens)
        
        # Minimum frekans kontrolü
        min_freq = 2
        filtered_words = {word: count for word, count in word_freq.items() if count >= min_freq}
        
        return Counter(filtered_words).most_common(top_n)
    
    def analyze_comments(self, comments):
        if not comments:
            return {
                "status": "warning",
                "message": "Analiz edilecek yorum bulunamadı."
            }
        
        all_tokens = []
        sentiments = []
        valid_comments = 0  # Geçerli yorum sayısı
        
        for comment in comments:
            # Metin ön işleme
            tokens = self.preprocess_text(comment)
            
            # Eğer geçerli token yoksa bu yorumu atla
            if not tokens:
                continue
                
            all_tokens.extend(tokens)
            
            # Duygu analizi
            sentiment = self.analyze_sentiment(comment)
            
            # Eğer duygu analizi sonucu None ise bu yorumu atla
            if sentiment is None:
                continue
                
            sentiments.append(sentiment)
            valid_comments += 1
        
        # Eğer geçerli yorum yoksa uyarı dön
        if valid_comments == 0:
            return {
                "status": "warning",
                "message": "Analiz edilebilecek geçerli yorum bulunamadı."
            }
        
        # Genel istatistikler
        positive_comments = sum(1 for s in sentiments if s["sentiment"] == "positive")
        negative_comments = valid_comments - positive_comments
        
        # Anahtar kelimeler
        keywords = self.extract_keywords(all_tokens)
        
        return {
            "status": "success",
            "message": f"Yorum analizi tamamlandı. {valid_comments} geçerli yorum analiz edildi.",
            "analysis": {
                "total_comments": valid_comments,
                "positive_comments": positive_comments,
                "negative_comments": negative_comments,
                "positive_ratio": positive_comments / valid_comments if valid_comments > 0 else 0,
                "keywords": [{"word": word, "count": count} for word, count in keywords],
                "sentiment_distribution": {
                    "positive": positive_comments,
                    "negative": negative_comments
                }
            }
        }

