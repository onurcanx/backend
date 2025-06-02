const natural = require('natural');
const tokenizer = new natural.WordTokenizer();

// Türkçe stop words listesi
const stopwords = new Set([
    'acaba', 'ama', 'aslında', 'az', 'bazı', 'belki', 'biri', 'birkaç', 'birşey', 'biz', 'bu',
    'çok', 'çünkü', 'da', 'daha', 'de', 'defa', 'diye', 'eğer', 'en', 'gibi', 'hem', 'hep',
    'hepsi', 'her', 'hiç', 'için', 'ile', 'ise', 'kez', 'ki', 'kim', 'mı', 'mu', 'mü', 'nasıl',
    'ne', 'neden', 'nerde', 'nerede', 'nereye', 'niçin', 'niye', 'o', 'sanki', 'şey', 'siz',
    'şu', 'tüm', 've', 'veya', 'ya', 'yani', 'yine', 'yok', 'zaten', 'şöyle', 'böyle', 'öyle',
    'şu', 'bu', 'şey', 'şeyler', 'şeyi', 'şeyin', 'şeyden', 'şeye', 'şeyde', 'şeylerin',
    'şeylerden', 'şeylere', 'şeylerde', 'şeyleri', 'şeylerle', 'şeylerin', 'şeylerden',
    'şeylere', 'şeylerde', 'şeyleri', 'şeylerle', 'şeylerin', 'şeylerden', 'şeylere',
    'şeylerde', 'şeyleri', 'şeylerle', 'şeylerin', 'şeylerden', 'şeylere', 'şeylerde',
    'şeyleri', 'şeylerle', 'şeylerin', 'şeylerden', 'şeylere', 'şeylerde', 'şeyleri',
    'şeylerle', 'şeylerin', 'şeylerden', 'şeylere', 'şeylerde', 'şeyleri', 'şeylerle'
]);

class CommentAnalyzer {
    constructor() {
        // Pozitif ve negatif kelimeler
        this.positiveWords = new Set([
            'harika', 'mükemmel', 'güzel', 'iyi', 'süper', 'muhteşem', 'etkileyici',
            'başarılı', 'tavsiye', 'beğendim', 'sevdiğim', 'hoş', 'kaliteli',
            'öneririm', 'öneriyorum', 'tavsiye ederim', 'tavsiye ediyorum',
            'çok', 'gerçekten', 'kesinlikle', 'mutlaka', 'kesin', 'tam', 'tamamen',
            'müthiş', 'olağanüstü', 'fevkalade', 'olağanüstü', 'fevkalade',
            'beğendim', 'sevdiğim', 'hoşuma gitti', 'çok beğendim', 'çok sevdim',
            'tavsiye ederim', 'tavsiye ediyorum', 'öneririm', 'öneriyorum',
            'başarılı', 'kaliteli', 'iyi', 'güzel', 'süper', 'harika', 'mükemmel'
        ]);

        this.negativeWords = new Set([
            'kötü', 'berbat', 'rezil', 'vasat', 'sıkıcı', 'beğenmedim',
            'sevmedim', 'hoş değil', 'kalitesiz', 'önermem', 'önerilmez',
            'tavsiye etmem', 'tavsiye etmiyorum', 'hayal kırıklığı',
            'berbat', 'rezil', 'kötü', 'vasat', 'sıkıcı', 'beğenmedim',
            'sevmedim', 'hoş değil', 'kalitesiz', 'önermem', 'önerilmez',
            'tavsiye etmem', 'tavsiye etmiyorum', 'hayal kırıklığı',
            'beğenmedim', 'sevmedim', 'hoşuma gitmedi', 'beğenmedim',
            'sevmedim', 'hoşuma gitmedi', 'beğenmedim', 'sevmedim'
        ]);

        this.minWordLength = 2;
    }

    cleanText(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    isValidWord(word) {
        return word.length >= this.minWordLength &&
            /^[a-zA-ZğüşıöçĞÜŞİÖÇ]+$/.test(word) &&
            !/\d/.test(word);
    }

    preprocessText(text) {
        const cleanedText = this.cleanText(text);
        const tokens = tokenizer.tokenize(cleanedText);
        return tokens.filter(token => 
            this.isValidWord(token) && 
            !stopwords.has(token)
        );
    }

    analyzeSentiment(text) {
        const cleanedText = this.cleanText(text);
        const validWords = cleanedText.split(' ').filter(word => this.isValidWord(word));

        if (validWords.length === 0) return null;

        const positiveCount = validWords.filter(word => this.positiveWords.has(word)).length;
        const negativeCount = validWords.filter(word => this.negativeWords.has(word)).length;
        const total = positiveCount + negativeCount;

        if (total === 0) return null;

        const positiveScore = positiveCount / total;
        const negativeScore = negativeCount / total;

        return {
            positive: positiveScore,
            negative: negativeScore,
            sentiment: positiveScore > negativeScore ? "positive" : "negative"
        };
    }

    extractKeywords(tokens, topN = 5) {
        const wordFreq = {};
        tokens.forEach(token => {
            wordFreq[token] = (wordFreq[token] || 0) + 1;
        });

        const minFreq = 2;
        const filteredWords = Object.entries(wordFreq)
            .filter(([_, count]) => count >= minFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, topN);

        return filteredWords.map(([word, count]) => ({ word, count }));
    }

    analyzeComments(comments) {
        if (!comments || comments.length === 0) {
            return {
                status: "warning",
                message: "Analiz edilecek yorum bulunamadı."
            };
        }

        const allTokens = [];
        const sentiments = [];
        let validComments = 0;

        for (const comment of comments) {
            const tokens = this.preprocessText(comment);
            if (tokens.length === 0) continue;

            allTokens.push(...tokens);
            const sentiment = this.analyzeSentiment(comment);
            if (sentiment === null) continue;

            sentiments.push(sentiment);
            validComments++;
        }

        if (validComments === 0) {
            return {
                status: "warning",
                message: "Analiz edilebilecek geçerli yorum bulunamadı."
            };
        }

        const positiveComments = sentiments.filter(s => s.sentiment === "positive").length;
        const negativeComments = validComments - positiveComments;
        const keywords = this.extractKeywords(allTokens);

        return {
            status: "success",
            message: `Yorum analizi tamamlandı. ${validComments} geçerli yorum analiz edildi.`,
            analysis: {
                total_comments: validComments,
                positive_comments: positiveComments,
                negative_comments: negativeComments,
                positive_ratio: positiveComments / validComments,
                keywords: keywords,
                sentiment_distribution: {
                    positive: positiveComments,
                    negative: negativeComments
                }
            }
        };
    }
}

module.exports = CommentAnalyzer;
