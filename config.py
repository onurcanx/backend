import os
from dotenv import load_dotenv

# .env dosyasını yükle
load_dotenv()

# PostgreSQL bağlantı ayarları
DB_CONFIG = {
    'dbname': os.getenv('DB_NAME', 'your_database'),
    'user': os.getenv('DB_USER', 'your_username'),
    'password': os.getenv('DB_PASS', 'your_password'),
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432')
}

# Model yapılandırması
MODEL_CONFIG = {
    'model_name': 'bert-base-multilingual-cased',  # Çok dilli BERT modeli
    'max_length': 512,
    'batch_size': 16,
    'learning_rate': 2e-5,
    'epochs': 3
}

# Veri işleme ayarları
DATA_CONFIG = {
    'train_split': 0.8,
    'validation_split': 0.1,
    'test_split': 0.1,
    'random_state': 42
} 
