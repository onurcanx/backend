import os
from dotenv import load_dotenv

# .env dosyasını yükle
load_dotenv()

# PostgreSQL bağlantı ayarları
DB_CONFIG = {
    'dbname': os.getenv('DB_NAME', 'users_db_152v'),
    'user': os.getenv('DB_USER', 'users_db_152v_user'),
    'password': os.getenv('DB_PASS', 'xzo5rAYNBbSS1CVrzEtzFu38sv5FE4pg'),
    'host': os.getenv('DB_HOST', 'dpg-d0chm2euk2gs739927sg-a'),
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
