// ... existing code ...
const CommentAnalyzer = require('../nlpAnalyzer');

// ... existing code ...

router.get("/analyze/:movieId", async (req, res) => {
    try {
        const { movieId } = req.params;
        
        // Yorumları veritabanından çek
        const comments = await pool.query(
            "SELECT comment FROM comments WHERE movie_id = $1",
            [movieId]
        );

        if (comments.rows.length === 0) {
            return res.json({
                status: "warning",
                message: "Bu film için henüz yorum bulunmuyor."
            });
        }

        // Yorumları analiz et
        const analyzer = new CommentAnalyzer();
        const analysisResult = analyzer.analyzeComments(
            comments.rows.map(row => row.comment)
        );

        res.json(analysisResult);
    } catch (err) {
        console.error("Analiz sırasında hata:", err);
        res.status(500).json({ 
            status: "error",
            message: "Sunucu hatası",
            error: err.message 
        });
    }
});

// ... existing code ...
