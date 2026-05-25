/**
 * Google Gemini API Integration for MovieHub Chatbot
 */

// We expect the user to set their API key in a .env file:
// VITE_GEMINI_API_KEY=your_api_key_here
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Using the recommended gemini-2.0-flash model for general text chat
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

const SYSTEM_INSTRUCTION = `
Bạn là trợ lý ảo thân thiện của ứng dụng web phim MOVIEHUB.
Nhiệm vụ của bạn là tư vấn, gợi ý phim dựa trên tâm trạng, sở thích hoặc yêu cầu của người dùng.
- Hãy trả lời ngắn gọn, súc tích (dưới 4-5 câu).
- Luôn thân thiện, đồng cảm với tâm trạng của họ.
- Khi gợi ý phim, cố gắng đưa ra 2-3 tên phim cụ thể (có thể là phim nổi tiếng có thật) kèm theo thể loại phù hợp.
- Sử dụng tiếng Việt chuẩn, format chữ đậm (**) cho tên phim để dễ nhìn.
`;

/**
 * Gửi tin nhắn tới Gemini API
 * @param {Array<{role: string, parts: Array<{text: string}>}>} history - Lịch sử trò chuyện định dạng của Gemini
 * @returns {Promise<string>} - Câu trả lời từ AI
 */
export async function generateChatResponse(history) {
    if (!API_KEY || API_KEY === 'your_api_key_here') {
        return "💡 Tính năng Chatbot đang tạm chờ thiết lập. Bạn (nhà phát triển) cần thêm `VITE_GEMINI_API_KEY` vào file hệt thống `.env` để tôi có thể hoạt động nhé!";
    }

    try {
        const payload = {
            system_instruction: {
                parts: [{ text: SYSTEM_INSTRUCTION }]
            },
            contents: history,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 256, // Giữ câu trả lời ngắn gọn
            }
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error:", errorData);
            return "Xin lỗi, hiện tại hệ thống AI đang quá tải hoặc cấu hình chưa đúng. Vui lòng thử lại sau nhé!";
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Failed to fetch Gemini:", error);
        return "Xin lỗi, tôi không thể kết nối tới máy chủ lúc này. Vui lòng kiểm tra kết nối mạng!";
    }
}
