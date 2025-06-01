const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authenticateToken = require("../middleware/authMiddleware");
const { spawn } = require('child_process');

// Belirli bir filmin yorumlarını getir
router.get("/movie/:movieId", async (req, res) => {
    try {
        const { movieId } = req.params;
        
        const comments = await pool.query(
            `SELECT c.id, c.comment, c.created_at, u.username 
             FROM comments c 
             JOIN users u ON c.user_id = u.id 
             WHERE c.movie_id = $1 
             ORDER BY c.created_at DESC`,
            [movieId]
        );

        res.json(comments.rows);
    } catch (err) {
        console.error("Yorumlar alınırken hata:", err);
        res.status(500).json({ 
            message: "Sunucu hatası",
            error: err.message 
        });
    }
});

// Yorum analizi yap
router.get("/analyze/:movieId", async (req, res) => {
    try {
        const { movieId } = req.params;
        
        // Python script'ini çalıştır
        const pythonProcess = spawn('python', ['commentAnalyzer.py', movieId]);
        
        let result = '';
        
        pythonProcess.stdout.on('data', (data) => {
            result += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python Error: ${data}`);
        });
        
        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                return res.status(500).json({
                    status: "error",
                    message: "Yorum analizi sırasında bir hata oluştu"
                });
            }
            
            try {
                const analysisResult = JSON.parse(result);
                res.json(analysisResult);
            } catch (err) {
                res.status(500).json({
                    status: "error",
                    message: "Sonuç işlenirken bir hata oluştu"
                });
            }
        });
    } catch (err) {
        console.error("Analiz sırasında hata:", err);
        res.status(500).json({ 
            status: "error",
            message: "Sunucu hatası",
            error: err.message 
        });
    }
});

// Yeni yorum ekle
router.post("/", authenticateToken, async (req, res) => {
    try {
        const { movieId, comment } = req.body;
        const userId = req.user.id;

        const newComment = await pool.query(
            "INSERT INTO comments (user_id, movie_id, comment) VALUES ($1, $2, $3) RETURNING *",
            [userId, movieId, comment]
        );

        res.json(newComment.rows[0]);
    } catch (err) {
        console.error("Yorum eklenirken hata:", err);
        res.status(500).json({ 
            message: "Sunucu hatası",
            error: err.message 
        });
    }
});

// Test yorumu ekle
router.post("/test-comment", async (req, res) => {
    try {
        // Test kullanıcısı oluştur veya bul
        const userResult = await pool.query(
            "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id",
            ['test_user', 'test@example.com', 'test123']
        );
        
        let userId;
        if (userResult.rows.length > 0) {
            userId = userResult.rows[0].id;
        } else {
            const existingUser = await pool.query(
                "SELECT id FROM users WHERE email = $1",
                ['test@example.com']
            );
            userId = existingUser.rows[0].id;
        }
        
        // Test yorumları
        const testComments = [
            "Bu film gerçekten çok etkileyiciydi, kesinlikle tavsiye ederim.",
            "Beklediğim gibi çıkmadı, biraz hayal kırıklığına uğradım.",
            "Harika bir yapım, oyuncuların performansı muhteşemdi.",
            "Görsel efektler çok başarılıydı ama senaryo biraz zayıftı.",
            "Kesinlikle izlenmesi gereken bir film, çok etkileyici."
        ];
        
        // Yorumları ekle
        const addedComments = [];
        for (const comment of testComments) {
            const commentResult = await pool.query(
                "INSERT INTO comments (user_id, movie_id, comment) VALUES ($1, $2, $3) RETURNING *",
                [userId, 1, comment]
            );
            addedComments.push(commentResult.rows[0]);
        }
        
        res.json({
            status: "success",
            message: "Test yorumları eklendi",
            comments: addedComments
        });
    } catch (err) {
        console.error("Test yorumları eklenirken hata:", err);
        res.status(500).json({ 
            status: "error",
            message: "Sunucu hatası",
            error: err.message 
        });
    }
});

module.exports = router; 