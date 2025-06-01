const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const axios = require("axios");
require("dotenv").config();

// Şifre sıfırlama isteği (Şifremi Unuttum)
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (user.rows.length === 0) return res.status(404).json({ message: "Bu e-posta adresi sistemde kayıtlı değil." });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpire = Date.now() + 3600000; // 1 saat geçerli
    await pool.query("UPDATE users SET reset_token = $1, reset_token_expire = $2 WHERE email = $3", [resetToken, resetTokenExpire, email]);
    
    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Şifre Sıfırlama Talebi",
      text: `Şifrenizi sıfırlamak için aşağıdaki linke tıklayın:\n${resetLink}\nBu bağlantı 1 saat içinde geçerliliğini yitirecektir.`,
    });
    res.json({ message: "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi." });
  } catch (err) {
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// Şifre sıfırlama işlemi
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const user = await pool.query("SELECT * FROM users WHERE reset_token = $1 AND reset_token_expire > $2", [token, Date.now()]);
    if (user.rows.length === 0) return res.status(400).json({ message: "Geçersiz veya süresi dolmuş token." });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password = $1, reset_token = NULL, reset_token_expire = NULL WHERE id = $2", [hashedPassword, user.rows[0].id]);
    res.json({ message: "Şifreniz başarıyla sıfırlandı." });
  } catch (err) {
    res.status(500).send("Sunucu hatası");
  }
});

// Kullanıcı kaydı
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await pool.query("SELECT * FROM users WHERE email = $1 OR username = $2", [email, username]);
    if (existingUser.rows.length > 0) return res.status(400).json({ message: "Bu e-posta veya kullanıcı adı zaten kayıtlı!" });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query("INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *", [username, email, hashedPassword]);
    res.json(newUser.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// Kullanıcı girişi
router.post("/login", async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    const user = await pool.query("SELECT * FROM users WHERE username = $1 OR email = $1", [usernameOrEmail]);
    if (user.rows.length === 0) return res.status(401).json({ message: "Geçersiz kullanıcı adı veya e-posta" });
    
    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) return res.status(401).json({ message: "Geçersiz şifre" });
    
    const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ 
      token, 
      user_id: user.rows[0].id,
      username: user.rows[0].username 
    });
  } catch (err) {
    res.status(500).send("Server hatası");
  }
});

// Filmin yorumlarını getirme
router.get("/comments/:movie_id", async (req, res) => {
  try {
    const { movie_id } = req.params;
    const comments = await pool.query("SELECT comments.*, users.username FROM comments INNER JOIN users ON comments.user_id = users.id WHERE movie_id = $1 ORDER BY created_at DESC", [movie_id]);
    res.json(comments.rows);
  } catch (err) {
    res.status(500).send("Server hatası");
  }
});

// Filme yorum ekleme
router.post("/comments", async (req, res) => {
  try {
    const { movie_id, comment, user_id } = req.body;
    
    // Kullanıcı giriş yapmış mı kontrol et
    if (!user_id) {
      return res.status(401).json({ message: "Yorum yapmak için giriş yapmalısınız." });
    }

    // Yorumu veritabanına ekle
    const newComment = await pool.query(
      "INSERT INTO comments (movie_id, user_id, comment) VALUES ($1, $2, $3) RETURNING *",
      [movie_id, user_id, comment]
    );

    // Kullanıcı bilgilerini de ekleyerek dön
    const commentWithUser = await pool.query(
      "SELECT comments.*, users.username FROM comments INNER JOIN users ON comments.user_id = users.id WHERE comments.id = $1",
      [newComment.rows[0].id]
    );

    res.json(commentWithUser.rows[0]);
  } catch (err) {
    console.error("Yorum ekleme hatası:", err);
    res.status(500).json({ message: "Yorum eklenirken bir hata oluştu." });
  }
});

// Kullanıcı bilgilerini getir
router.get("/user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Kullanıcı ID:", id);
    
    // created_at sütunu olmadığı için sadece temel bilgileri getir
    const user = await pool.query(
      "SELECT id, username, email, is_admin FROM users WHERE id = $1", 
      [id]
    );
    
    if (user.rows.length === 0) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    console.log("Kullanıcı bulundu:", user.rows[0]);
    res.json(user.rows[0]);
  } catch (err) {
    console.error("Kullanıcı bilgileri alınırken hata:", err);
    res.status(500).json({ 
      message: "Sunucu hatası",
      error: err.message
    });
  }
});

// Kullanıcının yorumlarını getir
router.get("/user/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Yorumlar için kullanıcı ID:", id);
    
    // Kullanıcının yorumlarını getir
    const comments = await pool.query(
      "SELECT id, movie_id, comment, created_at FROM comments WHERE user_id = $1 ORDER BY created_at DESC",
      [id]
    );
    
    console.log("Bulunan yorum sayısı:", comments.rows.length);

    // Her yorum için film bilgilerini TMDB API'sinden çek
    const commentsWithMovies = await Promise.all(
      comments.rows.map(async (comment) => {
        try {
          const movieResponse = await axios.get(
            `https://api.themoviedb.org/3/movie/${comment.movie_id}`,
            {
              params: {
                api_key: process.env.TMDB_API_KEY,
                language: "tr-TR"
              },
              headers: {
                'Authorization': `Bearer ${process.env.TMDB_ACCESS_TOKEN}`
              }
            }
          );

          return {
            ...comment,
            movie: {
              id: movieResponse.data.id,
              title: movieResponse.data.title,
              poster_path: movieResponse.data.poster_path,
              release_date: movieResponse.data.release_date
            }
          };
        } catch (error) {
          console.error(`Film bilgisi alınırken hata (ID: ${comment.movie_id}):`, error.message);
          return {
            ...comment,
            movie: {
              id: comment.movie_id,
              title: "Film bilgisi alınamadı",
              poster_path: null,
              release_date: null
            }
          };
        }
      })
    );
    
    res.json(commentsWithMovies);
  } catch (err) {
    console.error("Kullanıcı yorumları alınırken hata:", err);
    res.status(500).json({ 
      message: "Sunucu hatası",
      error: err.message
    });
  }
});

// Yorum silme
router.delete("/comments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    // Kullanıcının admin olup olmadığını kontrol et
    const user = await pool.query(
      "SELECT is_admin FROM users WHERE id = $1",
      [user_id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    const isAdmin = user.rows[0].is_admin;

    // Yorumun kullanıcıya ait olup olmadığını kontrol et
    const comment = await pool.query(
      "SELECT * FROM comments WHERE id = $1",
      [id]
    );

    if (comment.rows.length === 0) {
      return res.status(404).json({ message: "Yorum bulunamadı." });
    }

    // Eğer kullanıcı admin değilse ve yorum kendisine ait değilse silme yetkisi yok
    if (!isAdmin && comment.rows[0].user_id !== parseInt(user_id)) {
      return res.status(403).json({ message: "Bu yorumu silme yetkiniz yok." });
    }

    // Yorumu sil
    await pool.query("DELETE FROM comments WHERE id = $1", [id]);
    res.json({ message: "Yorum başarıyla silindi." });
  } catch (err) {
    console.error("Yorum silme hatası:", err);
    res.status(500).json({ message: "Yorum silinirken bir hata oluştu." });
  }
});
router.get("/comments/analyze/:movieId", async (req, res) => {
    try {
        const { movieId } = req.params;
        console.log("🎯 Analiz isteği alındı, film ID:", movieId);
        
        // Python script'inin tam yolunu belirt
        const scriptPath = require('path').join(__dirname, '..', 'commentAnalyzer.py');
        console.log("📜 Python script yolu:", scriptPath);
        
        // Python script'ini çalıştır
        const pythonProcess = spawn('python', [scriptPath, movieId]);
        console.log("🚀 Python script'i başlatıldı");
        
        let result = '';
        let errorOutput = '';
        
        pythonProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log("📤 Python çıktısı:", output);
            result += output;
        });
        
        pythonProcess.stderr.on('data', (data) => {
            const error = data.toString();
            console.error("❌ Python hatası:", error);
            errorOutput += error;
        });
        
        pythonProcess.on('close', (code) => {
            console.log("🔚 Python script'i kapandı, çıkış kodu:", code);
            
            if (code !== 0) {
                console.error("❌ Python script'i hata ile kapandı");
                return res.status(500).json({
                    status: "error",
                    message: "Yorum analizi sırasında bir hata oluştu",
                    error: errorOutput
                });
            }
            
            try {
                console.log("📝 Python çıktısı işleniyor:", result);
                const analysisResult = JSON.parse(result);
                console.log("✅ Analiz sonuçları:", analysisResult);
                res.json(analysisResult);
            } catch (err) {
                console.error("❌ JSON ayrıştırma hatası:", err);
                res.status(500).json({
                    status: "error",
                    message: "Sonuç işlenirken bir hata oluştu",
                    error: err.message,
                    rawOutput: result
                });
            }
        });
    } catch (err) {
        console.error("❌ Analiz sırasında hata:", err);
        res.status(500).json({ 
            status: "error",
            message: "Sunucu hatası",
            error: err.message 
        });
    }
});

module.exports = router;

