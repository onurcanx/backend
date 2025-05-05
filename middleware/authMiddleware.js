const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // "Bearer TOKEN" formatını alıyoruz

    if (!token) {
        return res.status(401).json({ message: "Yetkisiz erişim! Token eksik." });
    }

    try {
        const secretKey = process.env.JWT_SECRET || "gizli_anahtar"; // Eğer .env yoksa, default bir key kullan
        const decoded = jwt.verify(token, secretKey);
        req.user = decoded; // Kullanıcıyı request'e ekle
        next();
    } catch (err) {
        return res.status(403).json({ message: "Geçersiz veya süresi dolmuş token!" });
    }
};

module.exports = authenticateToken;
